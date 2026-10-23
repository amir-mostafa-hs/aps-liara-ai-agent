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


@pytest.mark.anyio
async def test_inspect_detects_databases_and_persian_summary(tmp_path):
    from engine.services.inspector import ProjectInspector

    # Setup a mock Node.js project with pg and ioredis
    pkg_json = tmp_path / "package.json"
    pkg_json.write_text(
        '{"name": "test-db-app", "scripts": {"start": "node index.js"}, "dependencies": {"pg": "^8.11.0", "ioredis": "^5.3.0"}}',
        encoding="utf-8",
    )
    (tmp_path / "index.js").write_text("console.log('hello');", encoding="utf-8")

    inspector = ProjectInspector(allowed_roots=[str(tmp_path)])
    analysis = inspector.inspect(str(tmp_path))

    assert analysis.detected_platform == "nodejs"
    db_types = [db.db_type for db in analysis.detected_databases]
    assert "postgres" in db_types
    assert "redis" in db_types

    # Check postgres details
    pg_db = next(d for d in analysis.detected_databases if d.db_type == "postgres")
    assert pg_db.default_port == 5432
    assert "DATABASE_URL" in pg_db.suggested_env_vars

    # Check redis details
    redis_db = next(d for d in analysis.detected_databases if d.db_type == "redis")
    assert redis_db.default_port == 6379
    assert "REDIS_URL" in redis_db.suggested_env_vars

    # Persian summary contains database mention
    assert analysis.persian_summary is not None
    assert "PostgreSQL" in analysis.persian_summary or "پایگاه داده" in analysis.persian_summary


@pytest.mark.anyio
async def test_inspect_detects_python_mysql_project(tmp_path):
    from engine.services.inspector import ProjectInspector

    reqs = tmp_path / "requirements.txt"
    reqs.write_text("fastapi==0.110.0\npymysql==1.1.0\nuvicorn==0.28.0\n", encoding="utf-8")
    (tmp_path / "main.py").write_text("import pymysql", encoding="utf-8")

    inspector = ProjectInspector(allowed_roots=[str(tmp_path)])
    analysis = inspector.inspect(str(tmp_path))

    assert analysis.detected_platform == "python"
    assert len(analysis.detected_databases) == 1
    assert analysis.detected_databases[0].db_type == "mysql"
    assert analysis.detected_databases[0].default_port == 3306
    assert "requirements.txt: pymysql" in analysis.detected_databases[0].evidence
    assert "MySQL" in (analysis.persian_summary or "")


@pytest.mark.anyio
async def test_inspect_detects_prisma_postgresql_schema(tmp_path):
    from engine.services.inspector import ProjectInspector

    pkg_json = tmp_path / "package.json"
    pkg_json.write_text('{"name": "prisma-app", "dependencies": {"@prisma/client": "^5.0.0"}}', encoding="utf-8")
    prisma_dir = tmp_path / "prisma"
    prisma_dir.mkdir()
    (prisma_dir / "schema.prisma").write_text(
        'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}',
        encoding="utf-8",
    )

    inspector = ProjectInspector(allowed_roots=[str(tmp_path)])
    analysis = inspector.inspect(str(tmp_path))

    assert analysis.detected_platform == "nodejs"
    db_types = [db.db_type for db in analysis.detected_databases]
    assert "postgres" in db_types
    pg_db = next(d for d in analysis.detected_databases if d.db_type == "postgres")
    assert pg_db.driver_or_orm in ["prisma", "@prisma/client"]
    assert "DATABASE_URL" in pg_db.suggested_env_vars


@pytest.mark.anyio
async def test_inspect_detects_has_liara_json_and_existing_app(tmp_path):
    from engine.services.inspector import ProjectInspector

    # Case 1: No liara.json
    (tmp_path / "package.json").write_text('{"name": "my-app"}', encoding="utf-8")
    (tmp_path / "index.js").write_text("console.log('test');", encoding="utf-8")

    inspector = ProjectInspector(allowed_roots=[str(tmp_path)])
    analysis = inspector.inspect(str(tmp_path))

    assert analysis.has_liara_json is False
    assert analysis.existing_app_name is None
    assert analysis.suggested_app_name is not None
    assert len(analysis.suggested_app_name) > 0

    # Case 2: liara.json present with app field
    (tmp_path / "liara.json").write_text(
        '{"app": "pre-existing-cloud-app", "platform": "node", "port": 3000}',
        encoding="utf-8",
    )
    analysis2 = inspector.inspect(str(tmp_path))
    assert analysis2.has_liara_json is True
    assert analysis2.existing_app_name == "pre-existing-cloud-app"
    assert analysis2.port == 3000




