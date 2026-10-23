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
- [x] Deployment success requires the explicit final server completion event; text that merely contains “successfully” cannot report success.
- [x] Successful deployment retrieves bounded runtime logs and presents a short summary separately from HTTP health.
- [x] Health-failure diagnosis requests runtime logs independently of deployment logs, records the source, and explains retrieval failures.
- [x] Unsupported non-environment remediation actions cannot run through `liara env set`.
- [x] A manual smoke-test checklist documents verification on a designated Liara test account and maps “Simple App” to the available project fixture.

## Completion evidence

- Engine SRE, deployment, health-verification, and web runtime workflow tests pass with Liara responses/processes simulated.
- Full Agent live verification is tracked separately in the manual checklist; direct CLI success is recorded in the operations report and is not counted as an Agent live pass.
