import pytest
from engine.domain.models import DiagnosisResult, RemediationAction, ActionApprovalModel
from engine.services.diagnoser import SREDiagnoser


SAMPLE_CRASH_LOGS = """
2026-10-22T10:00:00Z [liara-node-demo] Server initializing on port 3000...
2026-10-22T10:00:01Z [liara-node-demo] Checking required environment configurations...
2026-10-22T10:00:01Z [FATAL] Missing required environment variable: SERVICE_SECRET
2026-10-22T10:00:01Z [FATAL] Process exiting with status code 1.
"""


def test_diagnoser_identifies_missing_env_and_produces_remediation():
    diagnoser = SREDiagnoser()

    result = diagnoser.diagnose_logs(
        logs=SAMPLE_CRASH_LOGS,
        app_id="my-demo-app",
        provider_status="success",
    )

    assert isinstance(result, DiagnosisResult)
    assert "SERVICE_SECRET" in result.root_cause
    assert "SERVICE_SECRET" in result.error_evidence
    assert result.missing_variable == "SERVICE_SECRET"
    assert result.remediation is not None
    assert result.remediation.operation == "set_env"
    assert result.remediation.env_variable == "SERVICE_SECRET"
    assert result.remediation.target == "my-demo-app"
    assert result.verify_digest() is True

    # Tampering check
    tampered = result.model_copy()
    tampered.remediation.env_variable = "WRONG_SECRET"
    assert tampered.verify_digest() is False


def test_diagnoser_handles_empty_logs_without_fabrication():
    diagnoser = SREDiagnoser()
    result = diagnoser.diagnose_logs(
        logs="   ",
        app_id="empty-app",
        provider_status="success",
    )
    assert result.confidence == 0.0
    assert result.remediation is None
    assert "No runtime logs" in result.root_cause


@pytest.mark.anyio
async def test_runtime_log_fetch_reports_provider_failure_and_redacts_token(monkeypatch):
    import asyncio
    captured = []

    class FailedProcess:
        returncode = 1

        async def communicate(self):
            return b"invalid token mock-liara-secret", b""

    async def fake_subprocess(*args, **kwargs):
        captured.extend(args)
        return FailedProcess()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_subprocess)
    result = await SREDiagnoser().fetch_runtime_logs_result(
        "simple-app", api_token="mock-liara-secret", lines=9999,
    )
    assert result["ok"] is False
    assert "mock-liara-secret" not in result["error"]
    assert "--last-lines" in captured
    assert "--timestamps" in captured
    assert captured[captured.index("--since") + 1] == "30 minutes ago"


def test_diagnoser_detects_app_not_found_on_liara():
    diagnoser = SREDiagnoser()
    logs = """
    [AGENT] Initiating deployment for app 'test-app-missing'...
    Error: Could not find the app.
    Please review the following checklist:
      1. If you're deploying to a team, select it via 'liara team:use' or include the --team-id flag.
      2. Make sure you're logged into the correct account.
      3. Confirm that the app has been created.
    """
    result = diagnoser.diagnose_logs(
        logs=logs,
        app_id="test-app-missing",
        provider_status="failed",
    )
    assert isinstance(result, DiagnosisResult)
    assert result.missing_variable is None
    lower_cause = result.root_cause.lower()
    assert "پیدا نشد" in result.root_cause or "یافت نشد" in result.root_cause or "not find" in lower_cause or "not be found" in lower_cause or "not found" in lower_cause
    assert "Could not find the app" in result.error_evidence or "could not find" in result.error_evidence.lower()
    assert result.verify_digest() is True


def test_diagnoser_detects_port_collision():
    diagnoser = SREDiagnoser()
    logs = """
    Server starting on port 3000...
    Error: listen EADDRINUSE: address already in use :::3000
    Process exited with code 1
    """
    result = diagnoser.diagnose_logs(
        logs=logs,
        app_id="port-app",
        provider_status="failed",
    )
    assert isinstance(result, DiagnosisResult)
    assert result.missing_variable is None
    assert "پورت" in result.root_cause or "port" in result.root_cause.lower()
    assert result.verify_digest() is True


@pytest.mark.anyio
async def test_apply_remediation_rejects_without_approval():
    diagnoser = SREDiagnoser()
    remediation = RemediationAction(
        action_id="rem-1",
        operation="set_env",
        target="my-demo-app",
        env_variable="SERVICE_SECRET",
        env_value="valid-token-secret-123",
        description="Set missing SERVICE_SECRET",
        requires_approval=True,
    )
    invalid_approval = ActionApprovalModel(
        run_id="run-1",
        action_id="rem-1",
        operation="set_env",
        target="my-demo-app",
        approved=False,
        plan_digest="fake-digest",
    )

    with pytest.raises(PermissionError, match="Approval required"):
        await diagnoser.apply_remediation(
            remediation=remediation,
            approval=invalid_approval,
            api_token="test-token",
        )


@pytest.mark.anyio
async def test_apply_remediation_rejects_digest_mismatch():
    diagnoser = SREDiagnoser()
    remediation = RemediationAction(
        action_id="rem-1",
        operation="set_env",
        target="my-demo-app",
        env_variable="SERVICE_SECRET",
        env_value="valid-token-secret-123",
        description="Set missing SERVICE_SECRET",
        requires_approval=True,
    )
    mismatched_approval = ActionApprovalModel(
        run_id="run-1",
        action_id="rem-1",
        operation="set_env",
        target="my-demo-app",
        approved=True,
        plan_digest="wrong-tampered-digest",
    )

    with pytest.raises(PermissionError, match="Approval mismatch: Cryptographic digest"):
        await diagnoser.apply_remediation(
            remediation=remediation,
            approval=mismatched_approval,
            api_token="test-token",
            expected_digest="correct-expected-digest",
        )


@pytest.mark.anyio
async def test_apply_remediation_fails_cleanly_when_cli_missing(monkeypatch):
    import asyncio
    diagnoser = SREDiagnoser()
    remediation = RemediationAction(
        action_id="rem-1",
        operation="set_env",
        target="my-demo-app",
        env_variable="SERVICE_SECRET",
        env_value="valid-token-secret-123",
        description="Set missing SERVICE_SECRET",
        requires_approval=True,
    )
    valid_approval = ActionApprovalModel(
        run_id="run-1",
        action_id="rem-1",
        operation="set_env",
        target="my-demo-app",
        approved=True,
        plan_digest="correct-expected-digest",
    )

    def fake_subprocess(*args, **kwargs):
        raise FileNotFoundError("liara executable not found")

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_subprocess)

    result = await diagnoser.apply_remediation(
        remediation=remediation,
        approval=valid_approval,
        api_token="test-token",
        expected_digest="correct-expected-digest",
    )
    assert result["ok"] is False
    assert result["exit_code"] != 0
    assert "not found" in result["output"].lower()


@pytest.mark.anyio
async def test_sre_diagnoser_includes_team_id_in_commands(monkeypatch):
    import asyncio
    diagnoser = SREDiagnoser()
    captured_cmds = []

    class FakeProcess:
        def __init__(self, returncode=0, stdout_data=b"output\n"):
            self.returncode = returncode
            self._stdout_data = stdout_data

        async def communicate(self):
            return self._stdout_data, b""

    async def fake_subprocess(*args, **kwargs):
        captured_cmds.append(list(args))
        return FakeProcess()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_subprocess)

    # 1. fetch_runtime_logs with team_id
    await diagnoser.fetch_runtime_logs(
        app_id="aps-test",
        lines=50,
        api_token="mock-token",
        team_id="6ace4ec3ec13fe0c3c19c4db",
    )
    assert len(captured_cmds) == 1
    cmd = captured_cmds[0]
    assert "--team-id" in cmd
    assert "--last-lines" in cmd
    assert "--timestamps" in cmd
    idx = cmd.index("--team-id")
    assert cmd[idx + 1] == "6ace4ec3ec13fe0c3c19c4db"

    # 2. apply_remediation with team_id
    remediation = RemediationAction(
        action_id="rem-team-1",
        operation="set_env",
        target="aps-test",
        env_variable="PORT",
        env_value="3000",
        description="Set port",
        requires_approval=True,
    )
    approval = ActionApprovalModel(
        run_id="run-team-1",
        action_id="rem-team-1",
        operation="set_env",
        target="aps-test",
        approved=True,
        plan_digest="valid-digest",
    )
    await diagnoser.apply_remediation(
        remediation=remediation,
        approval=approval,
        api_token="mock-token",
        team_id="6ace4ec3ec13fe0c3c19c4db",
    )
    assert len(captured_cmds) == 2
    rem_cmd = captured_cmds[1]
    assert "--team-id" in rem_cmd
    rem_idx = rem_cmd.index("--team-id")
    assert rem_cmd[rem_idx + 1] == "6ace4ec3ec13fe0c3c19c4db"



def test_diagnose_and_remediate_api_endpoints():
    from fastapi.testclient import TestClient
    from engine.main import app
    from engine.config import settings

    client = TestClient(app)

    # 1. Reject diagnose without internal secret
    res_unauth = client.post("/agent/diagnose", json={"app_id": "test-app", "logs": "error log"})
    assert res_unauth.status_code == 403

    # 2. Accept diagnose with internal secret
    res_diag = client.post(
        "/agent/diagnose",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "app_id": "test-app",
            "logs": SAMPLE_CRASH_LOGS,
            "provider_status": "success",
        },
    )
    assert res_diag.status_code == 200
    diag_data = res_diag.json()
    assert diag_data["ok"] is True
    diagnosis = diag_data["diagnosis"]
    assert "SERVICE_SECRET" in diagnosis["root_cause"]
    assert diagnosis["remediation"] is not None
    assert diagnosis["remediation"]["env_variable"] == "SERVICE_SECRET"
    assert diagnosis["log_source"] == "deployment"
    assert "digest" in diagnosis and len(diagnosis["digest"]) == 64

    # 3. Reject remediate without approval
    res_bad_rem = client.post(
        "/agent/remediate",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "app_id": "test-app",
            "remediation": diagnosis["remediation"],
            "approval": {
                "run_id": "run-1",
                "action_id": diagnosis["remediation"]["action_id"],
                "operation": "set_env",
                "target": "test-app",
                "approved": False,
                "plan_digest": diagnosis["digest"],
            },
        },
    )
    assert res_bad_rem.status_code == 400


def test_diagnose_prefers_runtime_logs_for_post_deploy_health_failure(monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app, sre_diagnoser
    from engine.config import settings

    captured = {}
    async def runtime_logs(**kwargs):
        captured["runtime_request"] = kwargs
        return {"ok": True, "logs": "Server listening on port 3000", "error": None}

    def diagnose_logs(logs, app_id, provider_status):
        captured["diagnosed_logs"] = logs
        return SREDiagnoser().diagnose_logs(logs, app_id, provider_status)

    monkeypatch.setattr(sre_diagnoser, "fetch_runtime_logs_result", runtime_logs)
    monkeypatch.setattr(sre_diagnoser, "diagnose_logs", diagnose_logs)
    response = TestClient(app).post(
        "/agent/diagnose",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={"app_id": "simple-app", "logs": "Release created", "provider_status": "success", "fetch_runtime_logs": True},
    )
    assert response.status_code == 200
    assert captured["diagnosed_logs"] == "Server listening on port 3000"
    assert response.json()["diagnosis"]["log_source"] == "runtime"


def test_runtime_logs_endpoint_returns_source_and_failure_details(monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app, sre_diagnoser
    from engine.config import settings

    async def runtime_logs(**kwargs):
        return {"ok": False, "logs": "", "error": "لاگ‌ها در دسترس نیستند"}

    monkeypatch.setattr(sre_diagnoser, "fetch_runtime_logs_result", runtime_logs)
    response = TestClient(app).post(
        "/agent/runtime-logs",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={"app_id": "simple-app", "lines": 100},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": False, "log_source": "runtime", "logs": "", "error": "لاگ‌ها در دسترس نیستند"}
