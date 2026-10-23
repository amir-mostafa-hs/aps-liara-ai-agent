# 03: Continue Deployment After Confirmed Service Creation

**What to build:** Once Liara confirms the newly selected service exists, the agent uses that exact service as the deployment target and continues the existing deploy workflow. If deployment fails, the user gets clear recovery guidance and can retry without being asked to create a duplicate service. The result distinguishes Liara's deployment state from the application's health.

**Blocked by:** 02: Create Service with the Verified Liara Contract

**Status:** resolved

- [x] Deployment does not start until service creation has been confirmed from Liara evidence.
- [x] The confirmed app name and selected platform are passed through to the existing deployment workflow.
- [x] A deployment failure preserves the created service as the target and the existing deploy widget offers a retry without repeating service creation.
- [x] The UI does not infer a running service from creation; deployment status and app health remain separate.
- [x] User-visible progress and errors are clear, concise Persian and do not expose credentials.
- [x] Automated workflow tests cover provider-simulated plan lookup, name validation, confirmed creation, and continuation.
- [x] A manual smoke-test checklist documents verification on a designated Liara test account and maps “Simple App” to the available project fixture.
