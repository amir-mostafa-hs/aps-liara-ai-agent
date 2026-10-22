import pytest
from httpx import ASGITransport, AsyncClient, Response
from unittest.mock import patch

TEST_SECRET = "test-internal-secret-xyz"


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)


@pytest.mark.anyio
async def test_liara_test_connection_requires_internal_secret():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/liara/test-connection", json={"api_token": "mock-token-123"}
        )
        assert response.status_code == 403


@pytest.mark.anyio
async def test_liara_test_connection_success():
    from engine.main import app

    transport = ASGITransport(app=app)
    mock_apps = [
        {"project_id": "test-app-1", "type": "nodejs", "status": "running"},
        {"project_id": "test-app-2", "type": "python", "status": "stopped"},
    ]

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = Response(
            status_code=200, json={"projects": mock_apps}
        )

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/liara/test-connection",
                headers={"X-Internal-Secret": TEST_SECRET},
                json={"api_token": "valid-token-123"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is True
            assert data["app_count"] == 2
            assert data["apps"][0]["project_id"] == "test-app-1"


@pytest.mark.anyio
async def test_liara_test_connection_invalid_token():
    from engine.main import app

    transport = ASGITransport(app=app)

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = Response(
            status_code=401, json={"message": "Unauthenticated"}
        )

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/liara/test-connection",
                headers={"X-Internal-Secret": TEST_SECRET},
                json={"api_token": "bad-token-xyz"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is False
            assert "Authentication failed" in data["error"]
            # Ensure token was not reflected in error
            assert "bad-token-xyz" not in str(data)
