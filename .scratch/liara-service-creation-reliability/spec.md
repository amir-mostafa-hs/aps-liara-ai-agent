# Reliable Liara Service Creation and Deployment Spec

**Status:** implemented; manual Liara smoke test pending

## Problem Statement

When a beginner deploys a project that has no confirmed Liara app, the agent asks whether to use an existing app or create one. The new-service path collects an app name and a hardware plan, but currently it does not reliably use account-backed plan data, does not provide a clear name-availability step, and can fail while creating the app. The current create request sends `project_id` and `plan`, while Liara's published PaaS OpenAPI schema describes `name` and `planID`. The UI also assumes a newly created service is already `running` and proceeds to deployment without independent confirmation of its state.

As a result, a user can choose a name and plan but still fail to create the service, or receive misleading success/status feedback. When any step fails, the workflow should explain the issue in simple Persian and let the user recover without losing the project or selected deployment settings.

## Solution

Make the new-service path a reliable, beginner-friendly part of the deployment workflow. The agent checks the connected Liara account, presents plans obtained through a verified Liara operation with a clearly identified recommendation, validates the proposed app name against Liara, and creates the service through the Liara Adapter using the provider's verified contract. It confirms creation from provider evidence before continuing to the existing deployment flow. Conflicts, invalid names, unavailable plans, authentication errors, and network failures are shown as actionable Persian guidance; they do not produce a false success state.

The workflow remains conversational and uses the existing Approval Gate for billable app creation. Provider status and application health remain distinct signals. Testing is centered on one end-to-end boundary from the chat's new-service choice through the Liara Adapter and back into deployment continuation, with Liara responses simulated. A real-account smoke test is a separate manual verification and must use a designated test account.

## User Stories

1. As a beginner deploying a project, I want the agent to explain whether it found a Liara app configuration, so that I understand why it is asking me to select or create a service.
2. As a beginner, I want to choose between an existing service and a new service in plain Persian, so that I can continue without knowing Liara's technical terminology.
3. As a user with an existing Liara app, I want to see apps from the currently connected account/team, so that I can select the right deployment target.
4. As a user creating a service, I want to enter an app name and see whether Liara accepts it before creation, so that I can correct conflicts or invalid names early.
5. As a user, I want name availability to be checked in the same account/team scope that will create the app, so that the check matches the actual operation.
6. As a user, I want the UI to explain that availability can change before creation and handle a final Liara conflict safely, so that a race does not create false success.
7. As a user, I want to see hardware plans returned by a verified Liara CLI/API operation, so that I can choose from current options rather than stale hardcoded data.
8. As a beginner, I want each plan's resource details and price to be explained clearly, so that I can understand the cost and capacity tradeoff.
9. As a beginner, I want one plan to be recommended with a short reason based on the inspected project, so that I have a useful starting choice without losing control.
10. As a user, I want to change the recommended plan before creating the service, so that I control the service's capacity and cost.
11. As a user, I want to review and explicitly approve the selected name, platform, plan, team scope, and cost warning, so that a billable service is not created accidentally.
12. As a user, I want the agent to create the app with the exact name, platform, and plan I approved, so that provider state matches my decision.
13. As a user, I want creation to use a verified Liara Adapter contract and preserve provider error details safely, so that API/CLI failures can be diagnosed instead of hidden.
14. As a user, I want authentication, permission, invalid-input, duplicate-name, and network errors translated into actionable Persian messages, so that I know what to do next.
15. As a user, I want the agent to report service creation only after Liara confirms it, so that a request submission is not mistaken for a completed service.
16. As a user, I want a newly created service to have an honest provider status, so that it is not shown as running before Liara reports that state.
17. As a user, I want deployment to continue only after creation is confirmed, so that deploy does not target a missing service.
18. As a user, I want deployment failure after successful creation to preserve the created service and explain the next step, so that I do not accidentally create duplicates while retrying.
19. As a user, I want retrying a failed creation to recheck the service inventory and name, so that an earlier successful-but-unacknowledged request does not create a duplicate.
20. As a user, I want my Liara token and any sensitive provider output to remain redacted throughout plan lookup, name validation, creation, and deployment, so that troubleshooting does not expose credentials.
21. As a user, I want provider deployment status and application health to be reported separately, so that I can tell whether Liara accepted a deployment and whether my app is actually healthy.
22. As a user deploying an app made with a no-code or AI-assisted coding service, I want the inspection and setup questions to state what is unknown and ask only for required decisions, so that I can proceed without needing to understand the generated project internals.

## Implementation Decisions

- Keep the existing hybrid architecture: the Application Tier owns the Persian chat, user interaction, and credential retrieval; the Agent Engine owns the Liara Adapter and provider-facing operations. This follows ADR-0003.
- Continue the single Shared Core workflow through the existing chat orchestration; do not create a separate service-creation workflow for another interface. This follows ADR-0001's P0 interface prioritization.
- Treat app creation as a consequential operation and retain the Approval Gate. Approval must be tied to the exact app name, platform, plan, and team scope.
- Use a typed Liara Adapter contract for plan lookup, name check, and app creation. The adapter must normalize responses and preserve safe actionable errors.
- Align the create payload with the currently documented Liara PaaS contract (`name`, `planID`, and `platform`) after contract validation. The current code's `project_id`/`plan` payload is incompatible with that published schema.
- Retrieve plan options from an authenticated, verified Liara source. Do not silently present local defaults as if they were current Liara plans. If the provider lookup fails, explain that verified plans are unavailable and stop before billable creation unless a safe fallback has been explicitly approved in product behavior.
- Show a recommended plan and a concise reason, but require the user to select or confirm the plan and cost before creation. Do not invent exact price data when Liara does not provide it through a verified source.
- Check app name availability in the selected account/team scope using a verified provider operation. Treat the create response as authoritative because a name can become unavailable after pre-check.
- Use the official Liara API where its request/response behavior has been verified; use the official CLI only for operations whose command flags and output have been verified. Do not add an unverified fallback path.
- Represent app creation as pending until provider evidence confirms the app exists. Do not infer `running` from an HTTP success response to a create request.
- Continue the existing deployment flow only after the target app is resolved and service creation is confirmed. Keep provider deployment state separate from endpoint health.
- Localized errors should distinguish recoverable input problems from authentication, permission, provider conflict, and transient network failures.
- Do not change unrelated Liara services, database provisioning, DNS, or broad project-inspection behavior as part of this spec. Adjacent problems found during the broader review should be tracked separately after triage.

## Testing Decisions

- The agreed primary seam is one end-to-end test through the chat's new-service choice, plan and name decisions, Approval Gate, Liara Adapter, and successful continuation to the deployment workflow. Simulate Liara responses at the provider boundary; assert externally visible behavior and operation inputs, not private component state.
- The end-to-end test must cover the success path and representative failure paths: name conflict, invalid plan/name, authentication or permission failure, plan lookup failure, and transient provider failure. A failed creation must never continue to deployment or display a running service.
- Test that a stale availability result followed by a provider conflict is handled without duplicate creation or false success.
- Test that the plan displayed and approved is the plan passed to the provider, and that the account/team scope is consistent across lookup and creation.
- Test redaction at user-visible errors and logs using fake credentials.
- Keep a separate manual smoke-test procedure for a designated Liara test account. It should confirm actual plan lookup, name validation, app creation, and a deployment attempt; do not run mutations against production.
- Prior art includes chat and workflow behavior tests, the app target selector tests, Liara project proxy tests, and engine Liara Adapter tests. Existing proxy tests that require binding a local TCP port are not a suitable substitute for the agreed high-level behavioral seam.
- Tests must be deterministic, fast, independent of a real Liara account, and capable of failing on a provider contract mismatch.

## Out of Scope

- Automatic creation of databases, disks, buckets, DNS records, or other dependent resources.
- Changing or deleting an existing Liara app.
- Broad support guarantees for every framework or every AI/no-code coding service.
- Replacing the hybrid architecture or adding another interface tier.
- Live monitoring, billing management, and automatic plan resizing after deployment.
- Claiming a live Liara integration has passed solely from mock tests.

## Further Notes

- The existing app-discovery spec and tickets already cover an earlier version of app selection and creation. This spec focuses on closing the observed reliability gap and should be linked by context in implementation planning rather than duplicating the earlier intent.
- The local repository contains a Node.js sample app, but no fixture explicitly named “Simple App.” The user's target project may need to be supplied or mapped to a supported sample before a live deployment smoke test.
- Static analysis found additional concerns in adjacent code: plan lookup currently falls back to hardcoded tiers, the app selector renders local default plans, and the UI marks a newly created app `running` without provider evidence. These are included here because they directly affect this workflow.
- The engine's focused Liara Adapter and plan tests passed (13 tests). Relevant web proxy tests could not run in this sandbox because they bind a local socket and received `EPERM`; this is an environment limitation, not evidence of a product failure. No real Liara mutation was attempted.
- The current official PaaS OpenAPI lists `POST /v1/projects` with app fields `name`, `planID`, and `platform`, and documents `409 Conflict`. The official CLI documents `liara app create` with `--app`, `--platform`, and `--plan`. Provider behavior still requires validation with the team's Liara test account.
