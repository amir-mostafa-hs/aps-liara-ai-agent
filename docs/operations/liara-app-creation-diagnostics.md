# Liara App Creation: Implementation and Diagnostics

## Current workflow

The chat asks whether to use an existing Liara application or create one. The new-app path loads hardware plans through the web API and the Liara CLI, checks the app name against the selected account/team, then asks the user to approve the exact app name, platform, hardware plan, price, and team before sending a create request.

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

The UI and adapter currently model one selected hardware plan (`planID`). The current official Liara CLI implementation also prompts for a feature bundle plan and sends both `planID` and `bundlePlanID` to `POST v1/projects/`. The agent's create payload currently omits `bundlePlanID`, so its request does not yet match the CLI's complete app-creation flow. This is the leading code-level cause to investigate for `g2_plan_unavailable`; the 400 response alone does not prove the omitted field is the sole cause. Plan availability for the selected team/account and Liara's live API validation also need to be checked.

Before another real-account attempt:

1. Extend plan lookup to preserve the valid feature bundle choices associated with each hardware plan from Liara's authenticated plan catalog.
2. Present the feature bundle choice or a clearly explained default and bind it into the approval record so the exact approved value is sent.
3. Send `bundlePlanID` with `name`, `platform`, and `planID`, matching the current official CLI request.
4. Add simulated-provider tests that verify the approved feature plan reaches the Liara adapter and that an unavailable plan produces an actionable Persian error without continuing to deployment.
5. Repeat the manual smoke test only with a designated test account/team and disposable app name; record whether the error is resolved before proceeding to deployment.

Liara references:

- [Official Liara CLI `app create` implementation](https://github.com/liara-cloud/cli/blob/master/src/commands/app/create.ts) (reads a hardware plan and feature bundle plan, then submits both).
- [Official Liara CLI `plan list` implementation](https://github.com/liara-cloud/cli/blob/master/src/commands/plan/list.ts) (filters the listed plans to available plans in Iran).
- [Official Liara CLI command reference](https://github.com/liara-cloud/cli#liara-app-create).
