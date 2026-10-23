import os
import json
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock

TEST_SECRET = "test-internal-secret-xyz"


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)


@pytest.mark.anyio
async def test_compute_config_diff_and_apply(tmp_path):
    from engine.services.config_manager import ConfigManager

    mgr = ConfigManager(allowed_roots=[str(tmp_path)])

    # Setup initial mock project without liara.json
    (tmp_path / "package.json").write_text('{"name": "demo-app"}', encoding="utf-8")

    diff_result = mgr.generate_diff(
        source_path=str(tmp_path),
        app_name="my-demo-app",
        platform="nodejs",
        port=3000,
        env_vars={"DATABASE_URL": "postgres://test:5432/db"},
    )

    assert "liara.json" in diff_result["files"]
    assert "+  \"platform\": \"node\"" in diff_result["files"]["liara.json"]["diff"]
    assert "+  \"app\": \"my-demo-app\"" in diff_result["files"]["liara.json"]["diff"]

    # Now apply the change
    apply_result = mgr.apply_changes(
        source_path=str(tmp_path),
        apply_liara_json=True,
        apply_local_env=True,
        app_name="my-demo-app",
        platform="nodejs",
        port=3000,
        env_vars={"DATABASE_URL": "postgres://test:5432/db"},
    )
    assert apply_result["ok"] is True

    # Verify liara.json was written
    liara_json_path = tmp_path / "liara.json"
    assert liara_json_path.exists()
    content = json.loads(liara_json_path.read_text(encoding="utf-8"))
    assert content["app"] == "my-demo-app"
    assert content["platform"] == "node"
    assert content["port"] == 3000

    # Verify .env was written
    env_path = tmp_path / ".env"
    assert env_path.exists()
    assert "DATABASE_URL=postgres://test:5432/db" in env_path.read_text(encoding="utf-8")


@pytest.mark.anyio
async def test_config_manager_rejects_path_traversal(tmp_path):
    from engine.services.config_manager import ConfigManager

    mgr = ConfigManager(allowed_roots=[str(tmp_path)])

    with pytest.raises(PermissionError):
        mgr.generate_diff(
            source_path="/etc",
            app_name="test",
            platform="nodejs",
            port=3000,
            env_vars={},
        )


@pytest.mark.anyio
async def test_cloud_env_injection_uses_liara_api_and_redacts_secret_output():
    from engine.services.env_manager import CloudEnvManager

    adapter = AsyncMock()
    adapter.set_environment_variables.return_value = {
        "ok": True,
        "app_name": "my-demo-app",
        "variables_set": ["SERVICE_SECRET"],
        "output": "SERVICE_SECRET=super-secret-value updated.",
    }
    manager = CloudEnvManager(adapter)
    result = await manager.set_cloud_env(
        app_name="my-demo-app",
        env_vars={"SERVICE_SECRET": "super-secret-value"},
        api_token="mock-token-xyz",
        team_id="6ace4ec3ec13fe0c3c19c4db",
    )
    assert result["ok"] is True
    assert result["app_name"] == "my-demo-app"
    assert "mock-token-xyz" not in result.get("output", "")
    assert "super-secret-value" not in result.get("output", "")
    adapter.set_environment_variables.assert_awaited_once()
    assert adapter.set_environment_variables.await_args.kwargs["env_vars"] == {"SERVICE_SECRET": "super-secret-value"}


@pytest.mark.anyio
async def test_cloud_env_injection_redacts_secret_from_provider_errors():
    from engine.services.env_manager import CloudEnvManager

    secret = "private-secret-value"
    adapter = AsyncMock()
    adapter.set_environment_variables.return_value = {"ok": False, "error": f"Failed setting {secret}"}
    manager = CloudEnvManager(adapter)
    result = await manager.set_cloud_env(
        app_name="my-demo-app",
        env_vars={"SERVICE_SECRET": secret},
        api_token="mock-token-xyz",
    )

    assert result["ok"] is False
    assert secret not in result["error"]


@pytest.mark.anyio
async def test_liara_environment_api_preserves_existing_values_and_redacts_new_secret(monkeypatch):
    from engine.providers.liara_adapter import LiaraAdapter

    calls = []

    class Response:
        def __init__(self, status_code, data, text=""):
            self.status_code = status_code
            self._data = data
            self.text = text

        def json(self):
            return self._data

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url, **kwargs):
            calls.append(("get", url, kwargs))
            return Response(200, {"project": {"envs": [{"key": "KEEP", "value": "existing"}]}})

        async def post(self, url, **kwargs):
            calls.append(("post", url, kwargs))
            return Response(200, {}, '"private-secret-value"')

    monkeypatch.setattr("engine.providers.liara_adapter.httpx.AsyncClient", lambda **kwargs: Client())
    result = await LiaraAdapter().set_environment_variables(
        "simple-app", {"SERVICE_SECRET": "private-secret-value"}, "mock-token", "team-1"
    )
    assert result["ok"] is True
    assert "private-secret-value" not in result["output"]
    post = calls[1][2]
    assert post["params"] == {"teamID": "team-1"}
    assert post["json"]["variables"] == [
        {"key": "KEEP", "value": "existing"},
        {"key": "SERVICE_SECRET", "value": "private-secret-value"},
    ]

