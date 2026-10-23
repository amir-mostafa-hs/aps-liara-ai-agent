import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { computePlanDigest, verifyPlanIntegrity } from "../src/lib/plan-digest.ts";

test("computePlanDigest produces deterministic SHA-256 hash matching python engine", () => {
  const plan = {
    plan_id: "plan-1",
    target_app: "demo-app",
    platform: "nodejs",
    port: 3000,
    impact_level: "medium",
    cost_warning: true,
    requires_approval: true,
    actions: [
      {
        action_id: "act-1",
        operation: "create_app",
        target: "demo-app",
        description: "Create app",
        dangerous: false,
        requires_approval: true,
        cost_warning: true,
      },
    ],
  };

  const digest1 = computePlanDigest(plan);
  const digest2 = computePlanDigest({ ...plan });
  assert.equal(typeof digest1, "string");
  assert.equal(digest1.length, 64);
  assert.equal(digest1, digest2);

  // Verifying integrity
  assert.equal(verifyPlanIntegrity(plan, digest1), true);
  assert.equal(digest1, "cac5b22815b90d80bcf9dc7785189aee1e6da4683388c2abd303530accf42f3f");

  // Tampering target_app invalidates digest
  const tampered = { ...plan, target_app: "hacked-app" };
  assert.equal(verifyPlanIntegrity(tampered, digest1), false);
});

test("verifyPlanIntegrity rejects mismatched digest", () => {
  const plan = {
    plan_id: "plan-2",
    target_app: "valid-app",
    platform: "nodejs",
    port: 3000,
    impact_level: "low",
    cost_warning: false,
    requires_approval: true,
    actions: [],
  };

  const fakeDigest = "0".repeat(64);
  assert.equal(verifyPlanIntegrity(plan, fakeDigest), false);
});

test("approval gate logic enforces status precondition and digest match", () => {
  const plan = {
    plan_id: "plan-valid-1",
    target_app: "my-app",
    platform: "nodejs",
    port: 3000,
    impact_level: "medium",
    cost_warning: true,
    requires_approval: true,
    actions: [
      {
        action_id: "act-1",
        operation: "deploy",
        target: "my-app",
        description: "Deploy code",
        dangerous: false,
        requires_approval: true,
        cost_warning: false,
      },
    ],
  };

  const digest = computePlanDigest(plan);

  // Helper verifying approval transition rule
  function evaluateApproval(runState, submittedDigest) {
    if (runState.status !== "awaiting_approval") {
      return { ok: false, error: "Run must be in awaiting_approval" };
    }
    if (!verifyPlanIntegrity(runState.plan, submittedDigest)) {
      return { ok: false, error: "Digest mismatch or invalid plan" };
    }
    return {
      ok: true,
      newStatus: "approved",
      approval: { approved: true, planDigest: submittedDigest },
    };
  }

  // 1. Valid approval
  const validResult = evaluateApproval({ status: "awaiting_approval", plan }, digest);
  assert.equal(validResult.ok, true);
  assert.equal(validResult.newStatus, "approved");
  assert.equal(validResult.approval.approved, true);

  // 2. Mismatched digest
  const mismatchResult = evaluateApproval({ status: "awaiting_approval", plan }, "wrong-digest-123");
  assert.equal(mismatchResult.ok, false);
  assert.match(mismatchResult.error, /Digest mismatch/);

  // 3. Invalid status (already executing or cancelled)
  const invalidStatusResult = evaluateApproval({ status: "cancelled", plan }, digest);
  assert.equal(invalidStatusResult.ok, false);
  assert.match(invalidStatusResult.error, /awaiting_approval/);
});

