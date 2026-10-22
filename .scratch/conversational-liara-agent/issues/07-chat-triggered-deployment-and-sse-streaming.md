# 07: Chat-Triggered Deployment & SSE Log Streaming

**What to build:**
Seamless transition from conversation to deployment. Upon operator sign-off, the deployment executes autonomously using the normalized Liara CLI, streaming real-time packaging, build, and release logs directly into the fixed sidecar terminal via Server-Sent Events (SSE). Secret tokens and sensitive credentials are redacted in real time.

**Blocked by:** 06 (Cloud Env Injection & Diff Preview)

**Status:** completed

- [x] Chat action card triggering deployment execution with cryptographic `ActionApproval` check
- [x] Real-time SSE streaming of deployment output into the sidecar terminal viewer
- [x] Secret redaction engine masking API tokens and credentials across all streamed chunks
- [x] Active status badges updating in sidecar (Packaging -> Building -> Pushing -> Release Created)
- [x] Intelligent failure parsing: if build fails, stream is summarized and agent posts diagnostic explanation in chat
- [x] End-to-end integration tests for chat-triggered deploy and stream redaction

