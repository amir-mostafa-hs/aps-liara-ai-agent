from engine.domain.models import ActionApprovalModel, DeploymentPlan


def verify_action_approval(
    plan: DeploymentPlan,
    action_id: str,
    approval: ActionApprovalModel,
) -> bool:
    """Verifies that an action within a deployment plan has a valid, untampered approval."""
    if not approval.approved:
        return False

    # Check plan integrity and digest match
    if not plan.verify_digest() or approval.plan_digest != plan.digest:
        return False

    # Check action exists in plan
    matching_action = next((a for a in plan.actions if a.action_id == action_id), None)
    if not matching_action and (
        action_id == "plan-approval" or approval.action_id == "plan-approval"
    ):
        matching_action = next(
            (a for a in plan.actions if a.operation == approval.operation), None
        )

    if not matching_action:
        return False

    # Check operation and target match
    if (
        matching_action.operation != approval.operation
        or matching_action.target != approval.target
    ):
        return False

    return True

