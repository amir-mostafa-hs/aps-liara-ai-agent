# 02: Create Service with the Verified Liara Contract

**What to build:** After the user reviews and approves the exact app name, platform, hardware plan, bundle plan, network, displayed prices, and team scope, the agent creates the service with the verified Liara contract. It confirms the returned service configuration before reporting creation, explains provider failures in Persian, and safely handles name conflicts or ambiguous responses without creating duplicates or claiming the app is already running.

**Blocked by:** 01: Liara-Backed Plan and Name Preflight

**Status:** resolved

- [x] The Approval Gate applies to the exact app name, platform, hardware plan, bundle plan, network, displayed prices, and team scope.
- [x] The Liara Adapter sends the verified contract (`name`, `planID`, `platform`, `bundlePlanID`, and network ID).
- [x] Liara verification confirms that the returned hardware plan, bundle and network match the approved values.
- [x] A provider conflict after preflight is handled as a recoverable name conflict; the user can choose another name.
- [x] The agent verifies service existence with provider evidence before reporting creation success.
- [x] A newly created service is not labeled `running` unless Liara confirms that status.
- [x] Authentication, permission, validation, conflict, and transient provider errors are returned as safe, actionable Persian messages.
- [x] If the create result is ambiguous, a retry rechecks Liara before attempting another create.
- [x] Automated tests cover approved creation, provider contract fields, failure handling, and secret redaction with Liara simulated.

## Comments

- 2026-10-23 browser smoke test: after a successful Liara name-availability check and selecting `medium-g2`, Liara returned HTTP 400 `g2_plan_unavailable` on creation. The UI did not continue to deployment. The current implementation sends `name`, `platform`, and `planID`, while the official CLI also chooses and sends `bundlePlanID`. Investigate this contract gap and validate team-scoped plan availability before marking the ticket resolved. See [`docs/operations/liara-app-creation-diagnostics.md`](../../../docs/operations/liara-app-creation-diagnostics.md). No additional live creation request was sent.
- 2026-10-23 follow-up: changed the PaaS adapter's API host to `https://api.liara.ir`. A unique test name was confirmed available before and after one create attempt, but Liara again returned HTTP 400 `g2_plan_unavailable`. No service was created, no deployment started, and no retry was sent. The host change alone did not resolve the error. Inspect the authenticated CLI plan contract and add approved feature-bundle selection before another live creation attempt; see [`docs/operations/liara-app-creation-diagnostics.md`](../../../docs/operations/liara-app-creation-diagnostics.md).
- 2026-10-23 direct CLI validation: Liara CLI 9.6.0 created `aps-direct-e2e-20261023-a91f` on `medium-g2` with `bundlePlanID=basic` and network `my-network`; direct deploy completed, runtime logs showed Node listening on port 3000, and `/health` returned HTTP 200. This confirms the complete CLI contract works for the test team. The Agent integration still needs to model the feature bundle and network in its approval/request path. Full details: [`docs/operations/liara-direct-deployment-e2e-2026-10-23.md`](../../../docs/operations/liara-direct-deployment-e2e-2026-10-23.md).
- Implementation follow-up: hardware, bundle and network choices are loaded from team-scoped Liara endpoints, carried through the approval and sent to the adapter. The adapter verifies the exact selected configuration and maps known plan, network, balance, and permission failures to actionable messages.
- Verification: focused Engine tests and app workflow E2E tests pass with Liara simulated. A separate Agent real-account creation attempt is still pending; the earlier successful direct CLI run is not evidence that the Agent path has passed live.
