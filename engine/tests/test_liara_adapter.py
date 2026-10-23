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


@pytest.mark.anyio
async def test_liara_test_connection_with_team_id():
    from engine.main import app

    transport = ASGITransport(app=app)
    mock_team_apps = [
        {"project_id": "aps-test", "type": "node", "status": "ACTIVE"},
    ]
    mock_teams = [
        {"_id": "6ace4ec3ec13fe0c3c19c4db", "name": "لیارا"}
    ]

    async def mock_get(self, url, headers=None, params=None):
        if "v2/teams" in str(url):
            return Response(status_code=200, json={"teams": mock_teams})
        if "v1/projects" in str(url):
            assert params == {"teamID": "6ace4ec3ec13fe0c3c19c4db"}
            return Response(status_code=200, json={"projects": mock_team_apps})
        return Response(status_code=404)

    with patch("engine.providers.liara_adapter.httpx.AsyncClient.get", new=mock_get):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/liara/test-connection",
                headers={"X-Internal-Secret": TEST_SECRET},
                json={
                    "api_token": "valid-token-123",
                    "team_id": "6ace4ec3ec13fe0c3c19c4db",
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is True
            assert data["app_count"] == 1
            assert data["apps"][0]["project_id"] == "aps-test"
            assert data.get("team_id") == "6ace4ec3ec13fe0c3c19c4db"
            assert len(data.get("teams", [])) == 1
            assert data["teams"][0]["id"] == "6ace4ec3ec13fe0c3c19c4db"


@pytest.mark.anyio
async def test_liara_get_services_requires_internal_secret():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/liara/services?api_token=mock-token-123"
        )
        assert response.status_code == 403


@pytest.mark.anyio
async def test_liara_get_services_returns_apps_and_databases():
    from engine.main import app

    transport = ASGITransport(app=app)
    mock_projects = [
        {"project_id": "my-web-app", "type": "node", "status": "running", "port": 3000},
    ]
    mock_databases = [
        {"hostname": "my-pg-db", "type": "postgres", "status": "running", "port": 5432},
    ]

    orig_get = AsyncClient.get

    async def mock_get(self, url, *args, **kwargs):
        url_str = str(url)
        if "v1/projects" in url_str:
            return Response(status_code=200, json={"projects": mock_projects})
        if "v1/databases" in url_str:
            return Response(status_code=200, json={"databases": mock_databases})
        return await orig_get(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "get", new=mock_get):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/liara/services?api_token=valid-token-123",
                headers={"X-Internal-Secret": TEST_SECRET},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is True
            assert len(data["services"]) == 2
            app_svc = next(s for s in data["services"] if s["type"] == "app")
            assert app_svc["name"] == "my-web-app"
            assert app_svc["endpoint"] == "https://my-web-app.liara.run"
            db_svc = next(s for s in data["services"] if s["type"] == "postgres")
            assert db_svc["name"] == "my-pg-db"
            assert db_svc["port"] == 5432


