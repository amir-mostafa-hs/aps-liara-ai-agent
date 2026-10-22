import os
import pytest
from httpx import ASGITransport, AsyncClient, Response
from unittest.mock import patch, AsyncMock

TEST_SECRET = "test-internal-secret-xyz"


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)


@pytest.mark.anyio
async def test_get_available_plans_returns_sensible_tiers():
    from engine.services.db_provisioner import db_provisioner

    plans = await db_provisioner.get_available_plans(api_token=None)
    assert len(plans) >= 3
    plan_ids = [p["plan_id"] for p in plans]
    assert any("small" in p or "standard-1" in p for p in plan_ids)
    assert any("medium" in p or "standard-2" in p for p in plan_ids)

    # Check recommended plan
    rec = next((p for p in plans if p.get("is_recommended")), None)
    assert rec is not None


@pytest.mark.anyio
async def test_plans_endpoint_requires_internal_secret():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/liara/plans")
        assert response.status_code == 403


@pytest.mark.anyio
async def test_plans_endpoint_success():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/liara/plans",
            headers={"X-Internal-Secret": TEST_SECRET},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert len(data["plans"]) >= 3


@pytest.mark.anyio
async def test_create_database_subprocess_execution():
    from engine.services.db_provisioner import db_provisioner

    # Mock subprocess to avoid real cloud mutation in tests
    with patch("asyncio.create_subprocess_exec") as mock_exec:
        mock_proc = AsyncMock()
        mock_proc.communicate.return_value = (
            b"Database test-postgres created.\nHost: test-postgres\nPort: 5432",
            b"",
        )
        mock_proc.returncode = 0
        mock_exec.return_value = mock_proc

        result = await db_provisioner.provision_database(
            db_name="test-postgres",
            db_type="postgres",
            plan_id="ir-standard-2",
            api_token="test-token-123",
            team_id="6ace4ec3ec13fe0c3c19c4db",
        )

        assert result["ok"] is True
        assert result["db_name"] == "test-postgres"
        assert result["db_type"] == "postgres"
        # Ensure token is not present in logged output
        assert "test-token-123" not in result.get("output", "")

