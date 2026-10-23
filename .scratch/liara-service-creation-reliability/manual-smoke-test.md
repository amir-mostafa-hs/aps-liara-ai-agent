# Manual Smoke Test: Liara App Creation, Deployment, and Logs

## Current status (2026-10-23)

- Mocked end-to-end tests and automated suites pass.
- A direct CLI deployment to the designated test app `aps-direct-e2e-20261023-a91f` succeeded; runtime logs and its public health endpoint were verified. Details are in [`docs/operations/liara-direct-deployment-e2e-2026-10-23.md`](../../docs/operations/liara-direct-deployment-e2e-2026-10-23.md).
- The Agent's real-account app-creation path remains pending live verification. The prior browser failure (`g2_plan_unavailable`) occurred before bundle and network values were included; the later successful direct CLI test is separate and does not count as an Agent live pass.
- The designated test app remains deployed and may incur ongoing charges. Reuse it for runtime-log and health checks; do not create another service solely for that check.

## Preconditions

- [ ] Confirm the Liara token and intended account/team are configured in the app. Never print or record the token.
- [ ] Use `sample-apps/nodejs-demo` as the “Simple App” fixture unless the user's own source is available locally.
- [ ] Confirm `aps-direct-e2e-20261023-a91f` remains the intended existing test service before any live deployment or log check.
- [ ] Before live service creation, use a designated disposable name and explicitly review all provider-returned prices and selected team.

## Agent new-service flow

- [ ] Start a deployment request and choose to create a new service.
- [ ] Confirm the UI loads current account/team-scoped hardware plans, feature bundles, and networks from Liara.
- [ ] Confirm the suggested hardware plan has a short explanation and the lowest-priced available bundle is selected when provider prices are available. Change either option and confirm the selection persists.
- [ ] Enter a unique app name, verify Liara reports it available, and verify an existing name blocks creation with a clear message.
- [ ] Review and approve the exact name, platform, hardware plan, bundle, network, separate prices, and account/team.
- [ ] Confirm the app is created with those exact settings and is not called `running` unless Liara reports that state.
- [ ] Confirm deployment continues only after provider confirmation. An ambiguous create response must trigger an inventory check before retry.

## Deployment, health, and logs

- [ ] Complete a deployment to the approved test app and verify the result uses the explicit final deployment event.
- [ ] Verify the public endpoint and HTTP health separately from Liara's deployment status.
- [ ] After a healthy deployment, confirm runtime logs are fetched and summarized separately from the health result.
- [ ] On an unhealthy endpoint, confirm diagnosis prefers runtime logs even when deployment logs exist, and identifies the log source or explains retrieval failure.
- [ ] If deployment fails after service creation, retry deployment against the existing app rather than repeating service creation.

## Record

Record date, account/team identifier, hardware and bundle IDs, network name, app name, provider status, deployment result, health result, runtime-log result, and any provider error. Never record credentials. Keep the designated test service; do not delete it as part of this verification.
