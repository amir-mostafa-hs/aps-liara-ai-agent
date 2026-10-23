import pytest
from httpx import ASGITransport, AsyncClient

TEST_SECRET = "test-internal-secret-xyz"


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)


@pytest.mark.anyio
async def test_health_without_secret_header_returns_403():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 403
        assert "Forbidden" in response.json()["detail"]


@pytest.mark.anyio
async def test_health_with_invalid_secret_header_returns_403():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/health", headers={"X-Internal-Secret": "wrong-secret"}
        )
        assert response.status_code == 403
        assert "Forbidden" in response.json()["detail"]


@pytest.mark.anyio
async def test_health_with_valid_secret_header_returns_200():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/health", headers={"X-Internal-Secret": TEST_SECRET}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "liara-agent-engine"

