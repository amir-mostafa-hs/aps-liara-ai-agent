# 06: Endpoint Verification and Health Check

**What to build:**
An independent verification service that determines application health by querying the deployed public URL (`https://<app-id>.liara.run`) with HTTP GET. The agent strictly distinguishes provider deployment status from application health: if the provider reports successful deployment but the endpoint crashes or returns 500/connection errors (as engineered in the deliberate missing-variable test), the run marks provider status as `successful` but application health as `unhealthy` / `failed`. It never fabricates a false success and transitions the workflow into the SRE diagnosis state.

**Blocked by:** 05 (Real Liara Deployment Execution and Live Log Streaming)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Agent queries the deployed application's public URL with configurable timeout and retries.
- [ ] Provider deployment status and application HTTP health are tracked and reported as distinct signals in `VerificationResult`.
- [ ] Receiving HTTP 200 OK transitions the run to `succeeded` and renders a green "Healthy" badge.
- [ ] Process crashes, HTTP 500, or connection failures mark application health as `unhealthy` without falsely claiming overall success.
- [ ] Indeterminate network outcomes or unresponsive endpoints yield an explicit `inconclusive` status.

