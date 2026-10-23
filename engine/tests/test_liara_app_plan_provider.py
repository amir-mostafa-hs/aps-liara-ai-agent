import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch

TEST_SECRET = "test-internal-secret-xyz"


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)


@pytest.mark.anyio
async def test_app_plan_lookup_requires_provider_credentials():
    from engine.providers.liara_app_plan_provider import liara_app_plan_provider

    with pytest.raises(RuntimeError, match="credentials are required"):
        await liara_app_plan_provider.list_plans(None)


@pytest.mark.anyio
async def test_app_plan_lookup_uses_active_team_and_parses_real_provider_values():
    from engine.providers.liara_app_plan_provider import LiaraAppPlanProvider

    provider = LiaraAppPlanProvider()
    captured = {}

    class Process:
        returncode = 0

        async def communicate(self):
            return b'[{"Plan":"app-small","RAM":1,"CPU":0.5,"Disk":10}]', b""

    async def fake_exec(*args, **kwargs):
        captured["args"] = args
        return Process()

    with patch("asyncio.create_subprocess_exec", new=fake_exec):
        plans = await provider.list_plans("fake-liara-token", "team-42")

    assert plans == [{
        "plan_id": "app-small",
        "name_fa": "پلن app-small",
        "ram": "1 GB",
        "cpu": "0.5 هسته",
        "disk": "10 GB",
        "price_monthly": None,
        "is_recommended": True,
    }]
    assert "fake-liara-token" in captured["args"]
    assert captured["args"][captured["args"].index("--team-id") + 1] == "team-42"


@pytest.mark.anyio
async def test_app_plan_lookup_redacts_provider_errors():
    from engine.providers.liara_app_plan_provider import LiaraAppPlanProvider

    class Process:
        returncode = 1

        async def communicate(self):
            return b"", b"authentication failed for fake-liara-token"

    async def fake_exec(*args, **kwargs):
        return Process()

    with patch("asyncio.create_subprocess_exec", new=fake_exec):
        with pytest.raises(RuntimeError) as error:
            await LiaraAppPlanProvider().list_plans("fake-liara-token", "team-42")

    assert "fake-liara-token" not in str(error.value)


@pytest.mark.anyio
async def test_app_plans_endpoint_protects_and_returns_account_scoped_plans():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unauthorized = await client.post("/liara/app-plans", json={"api_token": "fake-token"})
        assert unauthorized.status_code == 403

        class Process:
            returncode = 0

            async def communicate(self):
                return b'[{"Plan":"app-small","RAM":1,"CPU":0.5,"Disk":10}]', b""

        async def fake_exec(*args, **kwargs):
            assert "fake-token" in args
            assert args[args.index("--team-id") + 1] == "team-42"
            return Process()

        with patch("asyncio.create_subprocess_exec", new=fake_exec):
            response = await client.post(
                "/liara/app-plans",
                headers={"X-Internal-Secret": TEST_SECRET},
                json={"api_token": "fake-token", "team_id": "team-42"},
            )
    assert response.status_code == 200
    assert response.json()["plans"][0]["plan_id"] == "app-small"
