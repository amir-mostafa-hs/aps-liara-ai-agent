import test from "node:test";
import assert from "node:assert/strict";
import { resolveActionForApproval, getDeployAction } from "../src/lib/plan-digest.ts";

test("resolveActionForApproval matches specific actionId and its exact operation/target", () => {
  const planActions = [
    { action_id: "create_app", operation: "create_app", target: "my-app" },
    { action_id: "deploy_app", operation: "deploy", target: "my-app" },
  ];

  // Specific actionId requested: create_app
  const createRes = resolveActionForApproval(planActions, "create_app", "my-app");
  assert.equal(createRes.actionId, "create_app");
  assert.equal(createRes.operation, "create_app");
  assert.equal(createRes.target, "my-app");

  // Specific actionId requested: deploy_app
  const deployRes = resolveActionForApproval(planActions, "deploy_app", "my-app");
  assert.equal(deployRes.actionId, "deploy_app");
  assert.equal(deployRes.operation, "deploy");
  assert.equal(deployRes.target, "my-app");

  // Default when no specific actionId requested
  const defaultRes = resolveActionForApproval(planActions, undefined, "my-app");
  assert.equal(defaultRes.actionId, "deploy_app");
  assert.equal(defaultRes.operation, "deploy");
  assert.equal(defaultRes.target, "my-app");
});

test("getDeployAction prioritizes deploy operation over other actions", () => {
  const planActions = [
    { action_id: "create_app", operation: "create_app", target: "my-app" },
    { action_id: "deploy_app", operation: "deploy", target: "my-app" },
  ];

  const deployAction = getDeployAction(planActions);
  assert.ok(deployAction);
  assert.equal(deployAction.action_id, "deploy_app");
  assert.equal(deployAction.operation, "deploy");
});
