# 07: Chat-Triggered Deployment & SSE Log Streaming

**What to build:**
Seamless transition from conversation to deployment. Upon operator sign-off, the deployment executes autonomously using the normalized Liara CLI, streaming real-time packaging, build, and release logs directly into the fixed sidecar terminal via Server-Sent Events (SSE). Secret tokens and sensitive credentials are redacted in real time.

**Blocked by:** 06 (Cloud Env Injection & Diff Preview)

**Status:** ready-for-agent

- [ ] Chat action card triggering deployment execution with cryptographic `ActionApproval` check
- [ ] Real-time SSE streaming of deployment output into the sidecar terminal viewer
- [ ] Secret redaction engine masking API tokens and credentials across all streamed chunks
- [ ] Active status badges updating in sidecar (Packaging -> Building -> Pushing -> Release Created)
- [ ] Intelligent failure parsing: if build fails, stream is summarized and agent posts diagnostic explanation in chat
- [ ] End-to-end integration tests for chat-triggered deploy and stream redaction

