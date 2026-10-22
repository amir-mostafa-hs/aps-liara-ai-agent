import pytest
import asyncio
from engine.domain.models import DeploymentPlan, ProposedAction, ActionApprovalModel
from engine.services.deployer import DeploymentExecutor


@pytest.fixture
def sample_plan():
    actions = [
        ProposedAction(
            action_id="act-deploy",
            operation="deploy",
            target="my-sample-app",
            description="Deploy application",
            requires_approval=True,
        )
    ]
    plan = DeploymentPlan(
        plan_id="plan-101",
        target_app="my-sample-app",
        platform="nodejs",
        port=3000,
        actions=actions,
        digest="",
    )
    plan.digest = plan.compute_digest()
    return plan


@pytest.fixture
def valid_approval(sample_plan):
    return ActionApprovalModel(
        run_id="run-101",
        action_id="act-deploy",
        operation="deploy",
        target="my-sample-app",
        approved=True,
        plan_digest=sample_plan.digest,
    )


@pytest.mark.anyio
async def test_deployer_rejects_without_valid_approval(sample_plan):
    executor = DeploymentExecutor()
    invalid_approval = ActionApprovalModel(
        run_id="run-101",
        action_id="act-deploy",
        operation="deploy",
        target="my-sample-app",
        approved=False,
        plan_digest="fake-digest",
    )

    with pytest.raises(PermissionError, match="Approval required"):
        async for _ in executor.execute_deployment(
            plan=sample_plan,
            approval=invalid_approval,
            source_path="/some/path",
            api_token="test-token-1234",
        ):
            pass


@pytest.mark.anyio
async def test_deployer_streams_redacted_output(sample_plan, valid_approval, monkeypatch, tmp_path):
    executor = DeploymentExecutor()
    secret_token = "secret-liara-token-abcdef"

    # Mock subprocess runner to simulate liara deploy output containing the secret
    async def mock_run_command(cmd, cwd=None):
        yield f"Deploying to Liara with token {secret_token}...\n"
        yield "Building Node.js container image [1/3]...\n"
        yield f"Successfully pushed release for my-sample-app (auth={secret_token}).\n"

    monkeypatch.setattr(executor, "_stream_command", mock_run_command)

    lines = []
    async for line in executor.execute_deployment(
        plan=sample_plan,
        approval=valid_approval,
        source_path=str(tmp_path),
        api_token=secret_token,
    ):
        lines.append(line)

    full_output = "".join(lines)
    assert secret_token not in full_output
    assert "[REDACTED_SECRET]" in full_output
    assert "Building Node.js container image [1/3]" in full_output


def test_deploy_api_endpoint(sample_plan, valid_approval, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from engine.main import app
    from engine.config import settings
    from engine.services.deployer import deployment_executor

    client = TestClient(app)

    # 1. Reject without internal secret
    res_unauth = client.post(
        "/agent/deploy",
        json={
            "plan": sample_plan.model_dump(),
            "approval": valid_approval.model_dump(),
            "source_path": str(tmp_path),
        },
    )
    assert res_unauth.status_code == 403

    # 2. Reject with invalid approval
    invalid_approval = valid_approval.model_copy()
    invalid_approval.approved = False
    res_bad_approval = client.post(
        "/agent/deploy",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "plan": sample_plan.model_dump(),
            "approval": invalid_approval.model_dump(),
            "source_path": str(tmp_path),
        },
    )
    assert res_bad_approval.status_code == 400

    # 3. Stream SSE on valid approval
    async def mock_stream(cmd, cwd=None):
        yield "Deployment in progress...\n"
        yield "Release deployed successfully.\n"

    monkeypatch.setattr(deployment_executor, "_stream_command", mock_stream)

    res_valid = client.post(
        "/agent/deploy",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "plan": sample_plan.model_dump(),
            "approval": valid_approval.model_dump(),
            "source_path": str(tmp_path),
            "api_token": "mock-token-xyz",
        },
    )
    assert res_valid.status_code == 200
    assert "text/event-stream" in res_valid.headers.get("content-type", "")
    assert "Deployment in progress" in res_valid.text

