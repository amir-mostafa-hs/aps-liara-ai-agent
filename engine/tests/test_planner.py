import pytest
from engine.domain.models import DeploymentPlan, ProposedAction, ProjectAnalysis


def test_deployment_plan_digest_computation():
    actions = [
        ProposedAction(
            action_id="act-1",
            operation="create_app",
            target="demo-app-1",
            description="Create Liara Node.js application",
            dangerous=False,
            requires_approval=True,
            cost_warning=True,
        ),
        ProposedAction(
            action_id="act-2",
            operation="deploy",
            target="demo-app-1",
            description="Deploy source code to Liara",
            dangerous=False,
            requires_approval=True,
            cost_warning=False,
        ),
    ]

    plan = DeploymentPlan(
        plan_id="plan-123",
        target_app="demo-app-1",
        platform="nodejs",
        port=3000,
        impact_level="medium",
        cost_warning=True,
        requires_approval=True,
        actions=actions,
        digest="",
    )

    digest = plan.compute_digest()
    assert digest is not None
    assert len(digest) == 64  # SHA-256 hex string

    # Setting digest and verifying consistency
    plan.digest = digest
    assert plan.verify_digest() is True

    # Tampering with target_app invalidates digest
    tampered_plan = plan.model_copy()
    tampered_plan.target_app = "malicious-app"
    assert tampered_plan.verify_digest() is False

    # Verifying get_deploy_action returns the deploy action
    deploy_action = plan.get_deploy_action()
    assert deploy_action is not None
    assert deploy_action.action_id == "act-2"
    assert deploy_action.operation == "deploy"


def test_planner_generates_structured_plan():
    from engine.services.planner import DeploymentPlanner

    planner = DeploymentPlanner()
    analysis = ProjectAnalysis(
        detected_language="javascript",
        detected_platform="nodejs",
        confidence=1.0,
        entrypoint="index.js",
        start_command="node index.js",
        port=3000,
        evidence_files=["package.json", "index.js"],
        required_env_names=["SERVICE_SECRET"],
        missing_configurations=[],
    )

    plan = planner.generate_plan(analysis=analysis, target_app="test-demo-app")

    assert isinstance(plan, DeploymentPlan)
    assert plan.target_app == "test-demo-app"
    assert plan.platform == "nodejs"
    assert plan.port == 3000
    assert plan.impact_level in ["low", "medium", "high"]
    assert plan.cost_warning is True
    assert plan.requires_approval is True
    assert len(plan.actions) >= 1
    assert plan.verify_digest() is True


def test_plan_api_endpoint():
    from fastapi.testclient import TestClient
    from engine.main import app
    from engine.config import settings

    client = TestClient(app)

    # 1. Reject without internal secret
    res_unauth = client.post("/agent/plan", json={"analysis": {"detected_language": "javascript", "detected_platform": "nodejs", "confidence": 1.0, "port": 3000}})
    assert res_unauth.status_code == 403

    # 2. Accept with internal secret
    res = client.post(
        "/agent/plan",
        headers={"X-Internal-Secret": settings.internal_agent_secret},
        json={
            "analysis": {
                "detected_language": "javascript",
                "detected_platform": "nodejs",
                "confidence": 1.0,
                "port": 3000,
            },
            "target_app": "my-demo-app",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    plan = data["plan"]
    assert plan["target_app"] == "my-demo-app"
    assert plan["platform"] == "nodejs"
    assert plan["port"] == 3000
    assert plan["requires_approval"] is True
    assert "digest" in plan and len(plan["digest"]) == 64


def test_approval_verification():
    from engine.services.approval import verify_action_approval
    from engine.domain.models import ActionApprovalModel

    planner_analysis = ProjectAnalysis(
        detected_language="javascript",
        detected_platform="nodejs",
        confidence=1.0,
        port=3000,
    )
    from engine.services.planner import deployment_planner

    plan = deployment_planner.generate_plan(analysis=planner_analysis, target_app="demo-app")
    action = plan.actions[0]

    # Valid approval matching plan digest
    valid_approval = ActionApprovalModel(
        run_id="run-1",
        action_id=action.action_id,
        operation=action.operation,
        target=action.target,
        approved=True,
        plan_digest=plan.digest,
    )
    assert verify_action_approval(plan, action.action_id, valid_approval) is True

    # Tampered plan digest in approval
    invalid_approval = ActionApprovalModel(
        run_id="run-1",
        action_id=action.action_id,
        operation=action.operation,
        target=action.target,
        approved=True,
        plan_digest="0" * 64,
    )
    assert verify_action_approval(plan, action.action_id, invalid_approval) is False

    # Rejected action
    rejected_approval = ActionApprovalModel(
        run_id="run-1",
        action_id=action.action_id,
        operation=action.operation,
        target=action.target,
        approved=False,
        plan_digest=plan.digest,
    )
    assert verify_action_approval(plan, action.action_id, rejected_approval) is False


def test_verify_action_approval_with_generic_plan_approval_and_multiple_actions():
    from engine.services.approval import verify_action_approval
    from engine.domain.models import DeploymentPlan, ProposedAction, ActionApprovalModel

    actions = [
        ProposedAction(
            action_id="create_app",
            operation="create_app",
            target="aps-test",
            description="Create app",
            requires_approval=True,
        ),
        ProposedAction(
            action_id="deploy",
            operation="deploy",
            target="aps-test",
            description="Deploy app",
            requires_approval=True,
        ),
    ]
    plan = DeploymentPlan(
        plan_id="plan-test-123",
        target_app="aps-test",
        platform="nodejs",
        port=3000,
        actions=actions,
        digest="",
    )
    plan.digest = plan.compute_digest()

    # 1. Approval recorded with generic "plan-approval" action_id
    generic_approval = ActionApprovalModel(
        run_id="run-1",
        action_id="plan-approval",
        operation="deploy",
        target="aps-test",
        approved=True,
        plan_digest=plan.digest,
    )
    assert verify_action_approval(plan, "plan-approval", generic_approval) is True
    assert verify_action_approval(plan, "deploy", generic_approval) is True

    # 2. Approval recorded with exact action_id
    exact_approval = ActionApprovalModel(
        run_id="run-1",
        action_id="deploy",
        operation="deploy",
        target="aps-test",
        approved=True,
        plan_digest=plan.digest,
    )
    assert verify_action_approval(plan, "deploy", exact_approval) is True
    assert verify_action_approval(plan, "unknown-action", exact_approval) is False


