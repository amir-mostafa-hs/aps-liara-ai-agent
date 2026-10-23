# Liara App Creation: Implementation and Diagnostics

## Current workflow

The chat asks whether to use an existing Liara application or create one. The new-app path loads hardware/bundle plans and networks from account/team-scoped Liara endpoints, checks the app name against the same scope, then asks the user to approve the exact app name, platform, hardware plan, bundle, network, separate prices, and team before sending a create request.

Relevant implementation:

- Chat widget and plan/name preflight: `apps/web/src/components/chat/AppTargetSelectorWidget.tsx` and `apps/web/src/lib/app-preflight.ts`.
- Approval binding and create orchestration: `apps/web/src/lib/app-creation-approval.ts`, `apps/web/src/lib/app-creation-workflow.ts`, and `apps/web/src/app/api/liara/projects/route.ts`.
- Liara plan lookup and app creation: `engine/providers/liara_app_plan_provider.py` and `engine/providers/liara_adapter.py`.
- Behavior-focused tests: `apps/web/tests/app-creation-*.test.mjs`, `apps/web/tests/app-preflight.test.mjs`, and `engine/tests/test_liara_adapter.py`.
- Product requirements and manual test checklist: `.scratch/liara-service-creation-reliability/spec.md` and `.scratch/liara-service-creation-reliability/manual-smoke-test.md`.

## Browser smoke-test observations (2026-10-23)

Using `sample-apps/nodejs-demo`, the browser detected Node.js and offered the new-service path. The Liara-backed plan list loaded; `medium-g2` was preselected as the recommendation. Checking `nodejs-demo` reported that the name was available in the selected account/team. After the user submitted the create action, the UI displayed Liara's response:

```text
HTTP 400
{"statusCode":400,"error":"Bad Request","message":"g2_plan_unavailable","data":null}
```

The failed request did not advance to deployment. No second create request was sent during diagnosis, and live service creation has not been verified successfully.

## Diagnosis and follow-up

The adapter previously sent PaaS requests to `https://api.iran.liara.ir`; it now uses the documented and CLI-used `https://api.liara.ir` host. A follow-up browser attempt with the unique name `aps-liara-hostcheck-20261023-7d4f` confirmed that Liara reported the name available, but the create call still returned HTTP 400 `g2_plan_unavailable`. A read-only availability check after the failure still reported the name as free, so the app was not created. No deployment was started and no second create request was made.

The host mismatch was therefore not sufficient to explain the failure. A later direct CLI run successfully created and deployed `aps-direct-e2e-20261023-a91f` using `medium-g2`, the lowest-priced available feature bundle (`basic`), and the existing network `my-network`. The official CLI submitted `bundlePlanID` and `network` along with `name`, `platform`, and `planID`; the previous Agent request omitted both. This validates the complete CLI contract for this team, although it does not isolate which additional field alone was decisive. The live creation, deployment, runtime log, and health-check evidence is recorded in [Liara direct deployment E2E test](liara-direct-deployment-e2e-2026-10-23.md). Before the Agent workflow is considered fixed, it still needs to load available feature bundles, bind the user's exact bundle choice into approval, and send the selected bundle and network values.

## Agent implementation follow-up (2026-10-23)

The Agent now loads `v1/me` and `v1/networks` for current account/team options, parses comma-separated decimal prices, binds bundle/network and both prices into the approval record, and sends the direct CLI-verified fields (`name`, `platform`, `planID`, `bundlePlanID`, `network`). After the create request it confirms that Liara reports the requested app, plan, bundle, and network before deployment can continue. Known plan, network, balance, authorization, and permission errors have actionable Persian responses.

The deployment flow now requires an explicit terminal completion SSE event. On success it fetches bounded runtime logs and reports them separately from HTTP health. When health fails, diagnosis fetches runtime logs even if deployment logs were supplied and reports the source or retrieval warning. Runtime log fetching uses the official CLI's supported `--since`, `--timestamps`, and `--last-lines` flags. Unsupported remediation operations are rejected instead of being sent through `liara env set`.

Verification completed: all 69 Engine tests passed at the last full run; all 53 web tests passed (the first sandbox-only run failed to bind loopback, then passed with local socket access); the web production build completed. Additional provider verification tests were added after that snapshot and the focused suites pass. The Agent's live create flow is still pending; the direct CLI success recorded above is not an Agent live pass.

Liara references:

- [Official Liara CLI `app create` implementation](https://github.com/liara-cloud/cli/blob/master/src/commands/app/create.ts) (reads a hardware plan and feature bundle plan, then submits both).
- [Official Liara CLI `plan list` implementation](https://github.com/liara-cloud/cli/blob/master/src/commands/plan/list.ts) (filters the listed plans to available plans in Iran).
- [Official Liara CLI command reference](https://github.com/liara-cloud/cli#liara-app-create).
