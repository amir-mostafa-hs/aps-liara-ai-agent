import pytest
from engine.domain.models import DiagnosisResult, RemediationAction, ActionApprovalModel
from engine.services.diagnoser import SREDiagnoser


SAMPLE_CRASH_LOGS = """
2026-10-22T10:00:00Z [liara-node-demo] Server initializing on port 3000...
2026-10-22T10:00:01Z [liara-node-demo] Checking required environment configurations...
2026-10-22T10:00:01Z [FATAL] Missing required environment variable: SERVICE_SECRET
2026-10-22T10:00:01Z [FATAL] Process exiting with status code 1.
"""


def test_diagnoser_identifies_missing_env_without_inventing_a_secret():
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
    assert result.remediation is None
    assert "متغیر محیطی" in result.root_cause
    assert result.verify_digest() is True


def test_diagnoser_handles_empty_logs_without_fabrication():
    diagnoser = SREDiagnoser()
    result = diagnoser.diagnose_logs(
        logs="   ",
        app_id="empty-app",
        provider_status="success",
    )
    assert result.confidence == 0.0
    assert result.remediation is None
    assert "اطلاعات کافی" in result.root_cause


def test_missing_runtime_logs_include_bounded_project_evidence_without_claiming_a_cause():
    result = SREDiagnoser().diagnose_logs(
        logs="",
        app_id="simple-app",
        project_evidence=["متغیر SERVICE_SECRET، منبع: generated_secret", "x" * 500],
    )
    assert result.diagnosis_status == "inconclusive"
    assert "SERVICE_SECRET" in result.error_evidence
    assert "علت خرابی" in result.root_cause
    assert "x" * 300 not in result.error_evidence


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
    assert diagnosis["remediation"] is None
    assert diagnosis["missing_variable"] == "SERVICE_SECRET"
    assert diagnosis["log_source"] == "deployment"
    assert "digest" in diagnosis and len(diagnosis["digest"]) == 64

    # 3. Reject remediate without approval
    res_bad_rem = client.post(
        "/agent/remediate",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "app_id": "test-app",
            "remediation": {
                "action_id": "rem-test",
                "operation": "set_env",
                "target": "test-app",
                "env_variable": "SERVICE_SECRET",
                "env_value": "",
                "description": "تنظیم مقدار تأییدشده",
                "requires_approval": True,
            },
            "approval": {
                "run_id": "run-1",
                "action_id": "rem-test",
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

    def diagnose_logs(logs, app_id, provider_status, project_evidence=None):
        captured["diagnosed_logs"] = logs
        captured["project_evidence"] = project_evidence
        return SREDiagnoser().diagnose_logs(logs, app_id, provider_status, project_evidence)

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
    assert captured["project_evidence"] == []


def test_diagnose_endpoint_passes_project_evidence_when_runtime_logs_are_unavailable(monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app, sre_diagnoser
    from engine.config import settings

    async def unavailable_runtime_logs(**kwargs):
        return {"ok": False, "logs": "", "error": "غیرفعال"}

    monkeypatch.setattr(sre_diagnoser, "fetch_runtime_logs_result", unavailable_runtime_logs)
    response = TestClient(app).post(
        "/agent/diagnose",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={"app_id": "simple-app", "fetch_runtime_logs": True, "project_evidence": ["SERVICE_SECRET از نمونه و کد شناسایی شد"]},
    )
    diagnosis = response.json()["diagnosis"]
    assert diagnosis["diagnosis_status"] == "inconclusive"
    assert "SERVICE_SECRET" in diagnosis["error_evidence"]
    assert "علت خرابی" in diagnosis["root_cause"]


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


def test_failed_runtime_log_fetch_does_not_diagnose_successful_deployment_logs(monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app, sre_diagnoser
    from engine.config import settings

    async def unavailable_runtime_logs(**kwargs):
        return {"ok": False, "logs": "", "error": "دریافت لاگ اجرای برنامه ناموفق بود."}

    monkeypatch.setattr(sre_diagnoser, "fetch_runtime_logs_result", unavailable_runtime_logs)
    response = TestClient(app).post(
        "/agent/diagnose",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "app_id": "simple-app",
            "logs": "Release created successfully; deployment complete",
            "provider_status": "success",
            "fetch_runtime_logs": True,
        },
    )

    assert response.status_code == 200
    diagnosis = response.json()["diagnosis"]
    assert diagnosis["log_source"] == "none"
    assert diagnosis["diagnosis_status"] == "inconclusive"
    assert diagnosis["remediation"] is None
    assert "اطلاعات کافی" in diagnosis["root_cause"]
    assert diagnosis["logs_warning"] == "دریافت لاگ‌های اجرای برنامه از Liara ناموفق بود."


def test_missing_env_runtime_diagnosis_is_persian_and_never_invents_secret_value():
    result = SREDiagnoser().diagnose_logs(
        logs="FATAL ERROR: Missing required environment variable: SERVICE_SECRET",
        app_id="simple-app",
    )

    assert "SERVICE_SECRET" in result.root_cause
    assert "متغیر محیطی" in result.root_cause
    assert result.diagnosis_status == "conclusive"
    assert result.remediation is None


def test_runtime_log_secret_assignments_are_redacted_before_diagnosis():
    from engine.security.redaction import redact_text

    assert "visible-secret-value" not in redact_text("SERVICE_SECRET=visible-secret-value")
    result = SREDiagnoser().diagnose_logs(
        logs="SERVICE_SECRET=visible-secret-value\nApplication started",
        app_id="simple-app",
    )
    assert "visible-secret-value" not in result.error_evidence


def test_remediation_provider_failure_does_not_trigger_health_check(monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app, sre_diagnoser, endpoint_verifier
    from engine.config import settings

    async def failed_write(**kwargs):
        return {"ok": False, "exit_code": 1, "output": "Liara rejected the write"}

    async def should_not_verify(**kwargs):
        raise AssertionError("health must not be checked before provider write confirmation")

    monkeypatch.setattr(sre_diagnoser, "apply_remediation", failed_write)
    monkeypatch.setattr(endpoint_verifier, "verify_endpoint", should_not_verify)
    action = RemediationAction(
        action_id="rem-fail",
        operation="set_env",
        target="simple-app",
        env_variable="SERVICE_SECRET",
        env_value="test-secret",
        description="ثبت secret تأییدشده",
    )
    approval = ActionApprovalModel(
        run_id="run-fail",
        action_id="rem-fail",
        operation="set_env",
        target="simple-app",
        approved=True,
        plan_digest="digest",
    )
    response = TestClient(app).post(
        "/agent/remediate",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={"app_id": "simple-app", "remediation": action.model_dump(), "approval": approval.model_dump()},
    )

    assert response.status_code == 200
    assert response.json()["ok"] is False
    assert response.json()["verification"] is None


def test_remediation_rejects_mismatched_health_target(monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app, sre_diagnoser
    from engine.config import settings

    async def should_not_write(**kwargs):
        raise AssertionError("mismatched target must be rejected before Liara mutation")

    monkeypatch.setattr(sre_diagnoser, "apply_remediation", should_not_write)
    action = RemediationAction(
        action_id="rem-target",
        operation="set_env",
        target="other-app",
        env_variable="SERVICE_SECRET",
        env_value="test-secret",
        description="ثبت secret تأییدشده",
    )
    approval = ActionApprovalModel(
        run_id="run-target",
        action_id="rem-target",
        operation="set_env",
        target="other-app",
        approved=True,
        plan_digest="digest",
    )
    response = TestClient(app).post(
        "/agent/remediate",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={"app_id": "simple-app", "remediation": action.model_dump(), "approval": approval.model_dump()},
    )
    assert response.status_code == 400
    assert "مطابقت ندارد" in response.json()["detail"]


def test_simulated_liara_env_runtime_diagnosis_and_recovery_journey(monkeypatch):
    from pathlib import Path
    from fastapi.testclient import TestClient
    from engine.main import app, env_manager, endpoint_verifier, sre_diagnoser
    from engine.config import settings
    from engine.domain.models import VerificationResult

    client = TestClient(app)
    headers = {"X-Internal-Secret": settings.internal_agent_secret}
    inspection = client.post(
        "/agent/inspect",
        headers=headers,
        json={"path": str(Path("sample-apps/nodejs-demo").resolve())},
    )
    assert inspection.status_code == 200
    requirements = {item["name"]: item for item in inspection.json()["analysis"]["env_requirements"]}
    assert requirements["SERVICE_SECRET"]["value_source"] == "generated_secret"

    recorded_env = {}
    async def simulated_env_write(**kwargs):
        recorded_env.update(kwargs["env_vars"])
        return {"ok": True, "variables_set": list(kwargs["env_vars"])}

    async def runtime_failure(**kwargs):
        return {"ok": True, "logs": "FATAL ERROR: Missing required environment variable: SERVICE_SECRET", "error": None}

    monkeypatch.setattr(env_manager, "set_cloud_env", simulated_env_write)
    monkeypatch.setattr(sre_diagnoser, "fetch_runtime_logs_result", runtime_failure)
    env_write = client.post(
        "/agent/cloud/env/set",
        headers=headers,
        json={"app_name": "simple-app", "api_token": "mock-token", "env_vars": {"SERVICE_SECRET": "simulated-generated-value"}},
    )
    assert env_write.status_code == 200 and env_write.json()["ok"] is True
    assert recorded_env == {"SERVICE_SECRET": "simulated-generated-value"}

    diagnosis_response = client.post(
        "/agent/diagnose",
        headers=headers,
        json={"app_id": "simple-app", "logs": "Release created", "fetch_runtime_logs": True},
    )
    diagnosis = diagnosis_response.json()["diagnosis"]
    assert diagnosis_response.status_code == 200
    assert diagnosis["log_source"] == "runtime"
    assert diagnosis["diagnosis_status"] == "conclusive"
    assert diagnosis["missing_variable"] == "SERVICE_SECRET"
    assert diagnosis["remediation"] is None
    assert "متغیر محیطی" in diagnosis["root_cause"]

    observed_action = {}
    async def simulated_approved_write(**kwargs):
        observed_action.update(kwargs)
        return {"ok": True, "exit_code": 0, "output": "متغیر ثبت شد"}

    async def simulated_healthy_check(**kwargs):
        return VerificationResult(
            endpoint_url="https://simple-app.liara.run",
            application_health="healthy",
            http_status_code=200,
            ready_for_sre=False,
        )

    monkeypatch.setattr(sre_diagnoser, "apply_remediation", simulated_approved_write)
    monkeypatch.setattr(endpoint_verifier, "verify_endpoint", simulated_healthy_check)
    action = RemediationAction(
        action_id="rem-e2e",
        operation="set_env",
        target="simple-app",
        env_variable="SERVICE_SECRET",
        env_value="user-approved-generated-secret",
        description="ثبت secret تأییدشده برای SERVICE_SECRET",
    )
    approval = ActionApprovalModel(
        run_id="run-e2e",
        action_id=action.action_id,
        operation="set_env",
        target="simple-app",
        approved=True,
        plan_digest="exact-approved-digest",
    )
    recovery = client.post(
        "/agent/remediate",
        headers=headers,
        json={
            "app_id": "simple-app",
            "remediation": action.model_dump(),
            "approval": approval.model_dump(),
            "expected_digest": approval.plan_digest,
        },
    )
    assert recovery.status_code == 200
    assert recovery.json()["ok"] is True
    assert recovery.json()["verification"]["application_health"] == "healthy"
    assert observed_action["remediation"].target == "simple-app"
    assert observed_action["approval"].approved is True
