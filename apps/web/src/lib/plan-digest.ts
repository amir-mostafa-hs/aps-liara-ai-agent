import crypto from "node:crypto";

export interface PlanAction {
  action_id: string;
  operation: string;
  target: string;
  description: string;
  dangerous: boolean;
  requires_approval: boolean;
  cost_warning: boolean;
}

export interface DeploymentPlanShape {
  plan_id: string;
  target_app: string;
  platform: string;
  port: number;
  impact_level: string;
  cost_warning: boolean;
  requires_approval: boolean;
  actions: PlanAction[];
  digest?: string;
}

export function canonicalPlanString(plan: DeploymentPlanShape): string {
  const sortedActions = (plan.actions || []).map((a) => ({
    action_id: a.action_id,
    cost_warning: Boolean(a.cost_warning),
    dangerous: Boolean(a.dangerous),
    description: a.description || "",
    operation: a.operation || "",
    requires_approval: Boolean(a.requires_approval),
    target: a.target || "",
  }));

  const canonicalObj = {
    actions: sortedActions,
    cost_warning: Boolean(plan.cost_warning),
    impact_level: plan.impact_level || "medium",
    plan_id: plan.plan_id || "",
    platform: plan.platform || "nodejs",
    port: Number(plan.port || 3000),
    requires_approval: Boolean(plan.requires_approval),
    target_app: plan.target_app || "",
  };

  return JSON.stringify(canonicalObj);
}

export function computePlanDigest(plan: DeploymentPlanShape): string {
  const jsonStr = canonicalPlanString(plan);
  return crypto.createHash("sha256").update(jsonStr, "utf8").digest("hex");
}

export function verifyPlanIntegrity(plan: DeploymentPlanShape, expectedDigest: string): boolean {
  if (!expectedDigest || typeof expectedDigest !== "string" || expectedDigest.length !== 64) {
    return false;
  }
  const actualDigest = computePlanDigest(plan);
  return crypto.timingSafeEqual(Buffer.from(actualDigest), Buffer.from(expectedDigest));
}

export function getDeployAction(actions: PlanAction[] = []): PlanAction | undefined {
  return actions.find((a) => a.operation === "deploy") || actions[0];
}

export function resolveActionForApproval(
  actions: PlanAction[] = [],
  requestedActionId?: string,
  fallbackTarget = "unknown"
): { actionId: string; operation: string; target: string } {
  const matched = requestedActionId
    ? actions.find((a) => a.action_id === requestedActionId)
    : getDeployAction(actions);

  return {
    actionId: requestedActionId || matched?.action_id || "deploy",
    operation: matched?.operation || "deploy",
    target: matched?.target || fallbackTarget,
  };
}

