import pytest
from unittest.mock import AsyncMock, patch
from engine.cli import main
from engine.domain.models import (
    ProjectAnalysis,
    DeploymentPlan,
    ProposedAction,
    VerificationResult,
    DiagnosisResult,
    RemediationAction,
)

@pytest.fixture
def mock_analysis():
    return ProjectAnalysis(
        detected_language="nodejs",
        detected_platform="nodejs",
        confidence=1.0,
        port=3000,
        entrypoint="server.js",
        evidence_files=["package.json", "server.js"],
        required_env_names=["SERVICE_SECRET"],
        missing_configurations=[],
    )

@pytest.fixture
def mock_plan():
    return DeploymentPlan(
        plan_id="plan-1",
        target_app="demo-app",
        platform="nodejs",
        port=3000,
        impact_level="high",
        actions=[
            ProposedAction(
                action_id="a1",
                operation="deploy",
                target="demo-app",
                description="Deploy to Liara",
                dangerous=False,
                requires_approval=True,
                cost_warning=False,
            )
        ],
        digest="sha256-test-plan-digest",
    )

def test_cli_help(capsys):
    with pytest.raises(SystemExit) as exc:
        main(["--help"])
    assert exc.value.code == 0
    captured = capsys.readouterr()
    assert "Liara Deployment & SRE Agent CLI" in captured.out

def test_cli_inspect(mock_analysis, capsys):
    with patch("engine.cli.project_inspector.inspect", return_value=mock_analysis):
        code = main(["inspect", "--path", "sample-apps/nodejs-demo"])
        assert code == 0
        captured = capsys.readouterr()
        assert "nodejs" in captured.out
        assert "SERVICE_SECRET" in captured.out

def test_cli_run_denied_plan(mock_analysis, mock_plan, capsys):
    with patch("engine.cli.project_inspector.inspect", return_value=mock_analysis), \
         patch("engine.cli.deployment_planner.generate_plan", return_value=mock_plan), \
         patch("builtins.input", return_value="n"):
        code = main(["run", "--path", "sample-apps/nodejs-demo", "--app", "demo-app"])
        assert code == 0
        captured = capsys.readouterr()
        assert "cancelled by operator" in captured.out.lower()

def test_cli_run_full_sre_recovery(mock_analysis, mock_plan, capsys):
    mock_verification_failed = VerificationResult(
        endpoint_url="https://demo-app.liara.run",
        provider_status="success",
        application_health="unhealthy",
        http_status_code=502,
        ready_for_sre=True,
    )
    mock_diagnosis = DiagnosisResult(
        diagnosis_id="diag-1",
        root_cause="Missing SERVICE_SECRET environment variable",
        error_evidence="[FATAL] Missing required environment variable: SERVICE_SECRET",
        missing_variable="SERVICE_SECRET",
        remediation=RemediationAction(
            action_id="rem-1",
            operation="set_env",
            target="demo-app",
            env_variable="SERVICE_SECRET",
            env_value="cli-secret-val",
            description="Set SERVICE_SECRET",
        ),
        digest="sha256-rem-digest",
    )
    mock_verification_healthy = VerificationResult(
        endpoint_url="https://demo-app.liara.run",
        provider_status="success",
        application_health="healthy",
        http_status_code=200,
        response_body_snippet='{"status":"ok"}',
    )

    async def fake_deploy_stream(*args, **kwargs):
        yield "[AGENT] Deploying..."
        yield "Successfully deployed!"

    with patch("engine.cli.project_inspector.inspect", return_value=mock_analysis), \
         patch("engine.cli.deployment_planner.generate_plan", return_value=mock_plan), \
         patch("engine.cli.deployment_executor.execute_deployment", side_effect=fake_deploy_stream), \
         patch("engine.cli.endpoint_verifier.verify_endpoint", AsyncMock(side_effect=[mock_verification_failed, mock_verification_healthy])), \
         patch("engine.cli.sre_diagnoser.diagnose_logs", return_value=mock_diagnosis), \
         patch("engine.cli.sre_diagnoser.apply_remediation", AsyncMock(return_value={"ok": True, "output": "Env set"})), \
         patch("builtins.input", side_effect=["y", "y"]):
        code = main(["run", "--path", "sample-apps/nodejs-demo", "--app", "demo-app"])
        assert code == 0
        captured = capsys.readouterr()
        assert "Service Successfully Recovered" in captured.out

