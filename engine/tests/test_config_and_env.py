import os
import json
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock

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
async def test_cloud_env_injection_subprocess():
    from engine.services.env_manager import env_manager

    with patch("asyncio.create_subprocess_exec") as mock_exec:
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (b"Environment variables updated.", b"")
        mock_proc.returncode = 0
        mock_exec.return_value = mock_proc

        result = await env_manager.set_cloud_env(
            app_name="my-demo-app",
            env_vars={"DATABASE_URL": "postgres://secret:5432/db"},
            api_token="mock-token-xyz",
            team_id="6ace4ec3ec13fe0c3c19c4db",
        )

        assert result["ok"] is True
        assert result["app_name"] == "my-demo-app"
        assert "mock-token-xyz" not in result.get("output", "")

