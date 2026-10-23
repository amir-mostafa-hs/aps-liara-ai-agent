import test from "node:test";
import assert from "node:assert/strict";
import { canGenerateSecretForEnvName, createApprovedEnvRemediation, isRunOwnedByUser, isSensitiveEnvName, remediationDigest } from "../src/lib/remediation-approval.ts";

test("a remediation run must belong to the authenticated database user", () => {
  assert.equal(isRunOwnedByUser("user-1", "user-1"), true);
  assert.equal(isRunOwnedByUser("user-1", "user-2"), false);
  assert.equal(isRunOwnedByUser(null, "user-1"), false);
  assert.equal(isRunOwnedByUser("user-1", undefined), false);
});

test("remediation requires explicit approval, a confirmed target, and a non-empty value", () => {
  const base = { approved: true, targetApp: "simple-app", missingVariable: "SERVICE_SECRET", envValue: "my-secret", valueSource: "generated" };
  assert.throws(() => createApprovedEnvRemediation({ ...base, approved: false }), /تأیید/);
  assert.throws(() => createApprovedEnvRemediation({ ...base, targetApp: "" }), /سرویس/);
  assert.throws(() => createApprovedEnvRemediation({ ...base, envValue: "  " }), /مقدار/);
  const action = createApprovedEnvRemediation(base, () => "action-1");
  assert.equal(action.target, "simple-app");
  assert.equal(action.env_variable, "SERVICE_SECRET");
  assert.equal(action.env_value, "my-secret");
  assert.equal(action.operation, "set_env");
  assert.match(action.description, /simple-app/);
});

test("external credentials are never classified as generated secrets", () => {
  assert.equal(isSensitiveEnvName("SERVICE_SECRET"), true);
  assert.equal(isSensitiveEnvName("PAYMENT_API_KEY"), true);
  assert.equal(canGenerateSecretForEnvName("PAYMENT_API_KEY"), false);
  assert.equal(canGenerateSecretForEnvName("SERVICE_SECRET"), true);
});

test("approval digest binds the exact action but exposes no raw secret", async () => {
  const action = createApprovedEnvRemediation({
    approved: true,
    targetApp: "simple-app",
    missingVariable: "SERVICE_SECRET",
    envValue: "very-private-secret-value",
    valueSource: "manual",
  }, () => "action-1");
  const digest = await remediationDigest("diag-1", action);
  assert.equal(digest.includes(action.env_value), false);
  assert.equal(digest, await remediationDigest("diag-1", action));
  assert.notEqual(digest, await remediationDigest("diag-1", { ...action, target: "other-app" }));
});
