import test from "node:test";
import assert from "node:assert/strict";
import { buildAppCreationApproval, matchesApprovedAppCreation } from "../src/lib/app-creation-approval.ts";

test("approval records the exact action, team, and displayed price", () => {
  const approval = buildAppCreationApproval({
    appName: "simple-app",
    platform: "node",
    planId: "g2-small",
    teamId: "team-42",
    priceMonthly: 90000,
  });

  assert.deepEqual(approval, {
    appName: "simple-app",
    platform: "node",
    planId: "g2-small",
    teamId: "team-42",
    priceMonthly: 90000,
    confirmed: true,
  });
  assert.equal(matchesApprovedAppCreation(approval, approval), true);
  assert.equal(matchesApprovedAppCreation({ ...approval, planId: "g2-large" }, approval), false);
  assert.equal(matchesApprovedAppCreation({ ...approval, teamId: "other-team" }, approval), false);
});
