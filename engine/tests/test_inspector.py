import os
import pytest
from httpx import ASGITransport, AsyncClient

TEST_SECRET = "test-internal-secret-xyz"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SAMPLE_APP_PATH = os.path.join(REPO_ROOT, "sample-apps/nodejs-demo")


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)


@pytest.mark.anyio
async def test_inspect_endpoint_requires_internal_secret():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/agent/inspect", json={"path": SAMPLE_APP_PATH}
        )
        assert response.status_code == 403


@pytest.mark.anyio
async def test_inspect_rejects_path_traversal():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/agent/inspect",
            headers={"X-Internal-Secret": TEST_SECRET},
            json={"path": "/etc/passwd"},
        )
        assert response.status_code == 400
        data = response.json()
        assert "traversal" in data["detail"].lower() or "boundary" in data["detail"].lower()


@pytest.mark.anyio
async def test_inspect_rejects_nonexistent_path():
    from engine.main import app

    non_existent = os.path.join(REPO_ROOT, "non_existent_folder_xyz_123")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/agent/inspect",
            headers={"X-Internal-Secret": TEST_SECRET},
            json={"path": non_existent},
        )
        assert response.status_code == 400
        data = response.json()
        assert "not exist" in data["detail"].lower() or "does not exist" in data["detail"].lower()


@pytest.mark.anyio
async def test_inspect_sample_nodejs_app_success():
    from engine.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/agent/inspect",
            headers={"X-Internal-Secret": TEST_SECRET},
            json={"path": SAMPLE_APP_PATH},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        analysis = data["analysis"]
        assert analysis["detected_platform"] == "nodejs"
        assert analysis["confidence"] >= 0.9
        assert analysis["start_command"] == "node server.js"
        assert analysis["port"] == 3000
        assert "package.json" in analysis["evidence_files"]
        assert "server.js" in analysis["evidence_files"]
        assert "SERVICE_SECRET" in analysis["required_env_names"]
        assert "PORT" in analysis["required_env_names"]

