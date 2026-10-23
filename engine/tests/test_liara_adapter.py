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


@pytest.mark.anyio
async def test_liara_service_inventory_does_not_treat_created_as_running():
    from engine.providers.liara_adapter import LiaraAdapter
    from httpx import Response

    async def mock_get(self, url, headers=None, params=None):
        if "v1/projects" in str(url):
            return Response(
                status_code=200,
                json={"projects": [{"project_id": "new-app", "status": "created"}]},
            )
        return Response(status_code=200, json={"databases": []})

    with patch("engine.providers.liara_adapter.httpx.AsyncClient.get", new=mock_get):
        services = await LiaraAdapter().get_services("fake-token")

    app = next(service for service in services if service["name"] == "new-app")
    assert app["status"] == "created"


@pytest.mark.anyio
async def test_project_name_preflight_checks_apps_in_the_selected_team():
    from engine.providers.liara_adapter import LiaraAdapter

    captured = {}

    async def mock_get(self, url, headers=None, params=None):
        captured.update(url=str(url), headers=headers, params=params)
        return Response(status_code=200, json={"projects": [{"project_id": "simple-app"}]})

    with patch("engine.providers.liara_adapter.httpx.AsyncClient.get", new=mock_get):
        result = await LiaraAdapter().check_project_name(
            "simple-app", "fake-liara-token", "team-42"
        )

    assert result == {"ok": True, "available": False, "reason": "already_exists"}
    assert captured["params"] == {"teamID": "team-42"}
    assert captured["headers"]["Authorization"] == "Bearer fake-liara-token"


@pytest.mark.anyio
async def test_project_name_preflight_fails_closed_and_redacts_provider_errors():
    from engine.providers.liara_adapter import LiaraAdapter

    async def mock_get(self, url, headers=None, params=None):
        return Response(status_code=401, text="invalid fake-liara-token")

    with patch("engine.providers.liara_adapter.httpx.AsyncClient.get", new=mock_get):
        result = await LiaraAdapter().check_project_name(
            "simple-app", "fake-liara-token", "team-42"
        )

    assert result["ok"] is False
    assert "fake-liara-token" not in str(result)


@pytest.mark.anyio
async def test_project_availability_endpoint_passes_name_and_team_to_adapter():
    from engine.main import app

    observed = {}

    async def check(name, token, team):
        observed.update(name=name, token=token, team=team)
        return {"ok": True, "available": True, "reason": None}

    with patch("engine.main.liara_adapter.check_project_name", new=check):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/liara/projects/availability",
                headers={"X-Internal-Secret": TEST_SECRET},
                json={"name": "simple-app", "api_token": "fake-liara-token", "team_id": "team-42"},
            )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "available": True, "reason": None}
    assert observed == {"name": "simple-app", "token": "fake-liara-token", "team": "team-42"}


@pytest.mark.anyio
async def test_create_project_success():
    from engine.providers.liara_adapter import LiaraAdapter
    from httpx import Response

    adapter = LiaraAdapter()

    captured_requests = []

    async def mock_post(self, url, *args, **kwargs):
        captured_requests.append({"url": str(url), "kwargs": kwargs})
        return Response(status_code=201, json={"status": "created"})

    async def mock_get(self, url, *args, **kwargs):
        captured_requests.append({"url": str(url), "kwargs": kwargs})
        return Response(
            status_code=200,
            json={"project": {"project_id": "my-brand-new-app", "status": "created"}},
        )

    with patch.object(AsyncClient, "post", new=mock_post):
        with patch.object(AsyncClient, "get", new=mock_get):
            result = await adapter.create_project(
                project_id="my-brand-new-app",
                platform="node",
                plan_id="ir-standard-1",
                api_token="valid-token-123",
                team_id="team-xyz",
            )
        assert result["ok"] is True
        assert result["project_id"] == "my-brand-new-app"
        assert result["endpoint"] == "https://my-brand-new-app.liara.run"
        assert result["status"] == "created"
        assert len(captured_requests) == 2
        assert "v1/projects" in captured_requests[0]["url"]
        assert captured_requests[0]["kwargs"]["params"] == {"teamID": "team-xyz"}
        assert captured_requests[0]["kwargs"]["json"] == {
            "name": "my-brand-new-app",
            "platform": "node",
            "planID": "ir-standard-1",
        }
        assert captured_requests[1]["url"].endswith("/v1/projects/my-brand-new-app")


@pytest.mark.anyio
async def test_create_project_does_not_claim_success_until_liara_confirms_app_exists():
    from engine.providers.liara_adapter import LiaraAdapter
    from httpx import Response

    adapter = LiaraAdapter()

    async def mock_post(self, url, *args, **kwargs):
        return Response(status_code=201, json={"status": "created"})

    async def mock_get(self, url, *args, **kwargs):
        return Response(status_code=404, json={"message": "not found"})

    with patch.object(AsyncClient, "post", new=mock_post):
        with patch.object(AsyncClient, "get", new=mock_get):
            result = await adapter.create_project(
                project_id="my-brand-new-app",
                platform="node",
                plan_id="ir-standard-1",
                api_token="valid-token-123",
            )

    assert result["ok"] is False
    assert result["status"] == "unverified"
    assert "تأیید" in result["error"]


@pytest.mark.anyio
async def test_create_project_invalid_name():
    from engine.providers.liara_adapter import LiaraAdapter

    adapter = LiaraAdapter()
    with pytest.raises(ValueError, match="Invalid project name"):
        await adapter.create_project(
            project_id="bad name with spaces!!",
            platform="node",
            plan_id="ir-standard-1",
            api_token="valid-token-123",
        )


@pytest.mark.anyio
async def test_create_project_endpoint_requires_auth():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/liara/projects",
            json={
                "project_id": "test-app",
                "platform": "node",
                "plan_id": "ir-standard-1",
            },
        )
        assert res.status_code == 403


@pytest.mark.anyio
async def test_create_project_endpoint_requires_explicit_approval():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/liara/projects",
            headers={"X-Internal-Secret": TEST_SECRET},
            json={
                "project_id": "test-app",
                "platform": "node",
                "plan_id": "g2-small",
                "api_token": "fake-token",
                "approved": False,
            },
        )

    assert res.status_code == 403
    assert "approval" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_approved_create_api_uses_liara_contract_and_returns_confirmed_service():
    from engine.main import app
    from httpx import Response

    provider_calls = []

    async def mock_post(self, url, *args, **kwargs):
        provider_calls.append(("post", str(url), kwargs))
        return Response(status_code=201, json={"status": "created"})

    async def mock_get(self, url, *args, **kwargs):
        provider_calls.append(("get", str(url), kwargs))
        return Response(
            status_code=200,
            json={"project": {"project_id": "simple-app", "status": "created"}},
        )

    transport = ASGITransport(app=app)
    with patch.object(AsyncClient, "post", new=mock_post):
        with patch.object(AsyncClient, "get", new=mock_get):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.request(
                    "POST",
                    "/liara/projects",
                    headers={"X-Internal-Secret": TEST_SECRET},
                    json={
                        "project_id": "simple-app",
                        "platform": "node",
                        "plan_id": "g2-small",
                        "approved": True,
                        "api_token": "fake-token",
                        "team_id": "team-42",
                    },
                )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["status"] == "created"
    assert provider_calls[0][2]["json"] == {
        "name": "simple-app",
        "platform": "node",
        "planID": "g2-small",
    }
    assert provider_calls[0][2]["params"] == {"teamID": "team-42"}
    assert provider_calls[1][1].endswith("/v1/projects/simple-app")



