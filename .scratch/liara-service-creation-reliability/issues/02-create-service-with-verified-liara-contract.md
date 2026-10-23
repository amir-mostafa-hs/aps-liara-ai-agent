# 02: Create Service with the Verified Liara Contract

**What to build:** After the user reviews and approves the exact app name, platform, plan, and team scope, the agent creates the service through a verified Liara operation. It confirms that the service exists before reporting success, explains provider failures in Persian, and safely handles a name conflict or an ambiguous response without creating a duplicate or claiming the app is already running.

**Blocked by:** 01: Liara-Backed Plan and Name Preflight

**Status:** ready-for-agent

- [x] The Approval Gate applies to the exact app name, platform, selected plan, and team scope.
- [x] The Liara Adapter sends the create request using the verified Liara contract (`name`, `planID`, and `platform`) or another explicitly verified official operation.
- [x] A provider conflict after preflight is handled as a recoverable name conflict; the user can choose another name.
- [x] The agent verifies service existence with provider evidence before reporting creation success.
- [x] A newly created service is not labeled `running` unless Liara confirms that status.
- [x] Authentication, permission, validation, conflict, and transient provider errors are returned as safe, actionable Persian messages.
- [x] If the create result is ambiguous, a retry rechecks Liara before attempting another create.
- [x] Automated tests cover approved creation, provider contract fields, failure handling, and secret redaction with Liara simulated.

## Comments

- 2026-10-23 browser smoke test: after a successful Liara name-availability check and selecting `medium-g2`, Liara returned HTTP 400 `g2_plan_unavailable` on creation. The UI did not continue to deployment. The current implementation sends `name`, `platform`, and `planID`, while the official CLI also chooses and sends `bundlePlanID`. Investigate this contract gap and validate team-scoped plan availability before marking the ticket resolved. See [`docs/operations/liara-app-creation-diagnostics.md`](../../../docs/operations/liara-app-creation-diagnostics.md). No additional live creation request was sent.
