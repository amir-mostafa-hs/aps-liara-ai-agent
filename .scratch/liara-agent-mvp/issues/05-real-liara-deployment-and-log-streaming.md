# 05: Real Liara Deployment Execution and Live Log Streaming

**What to build:**
A robust execution engine that invokes real deployments against Liara infrastructure via the Liara Adapter upon valid approval. The adapter executes non-interactive CLI commands (`liara deploy`) or verified API endpoints using argument arrays and strict timeouts. The run state transitions to `executing`. The dashboard displays a live streaming terminal (via Server-Sent Events / SSE) showing build progress and real-time deployment logs. An integrated redaction pipeline scrubs tokens, passwords, and sensitive strings from all stdout/stderr streams before they reach the web client or PostgreSQL audit tables.

**Blocked by:** 04 (LLM Deployment Planning and Interactive Approval Gate)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Mutating deployment is executed only when a verified, matching approval record exists for the run.
- [ ] Command execution uses argument arrays with subprocess timeouts; arbitrary shell injection is impossible.
- [ ] Real-time output and deployment progress are streamed to the web dashboard via SSE.
- [ ] Secret redaction cleanses all tokens, bearer headers, and passwords from logs before database persistence and UI rendering.
- [ ] Final exit status, start time, end time, and redacted output summary are recorded in PostgreSQL.

