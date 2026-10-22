# 08: Autonomous Health Probe & SRE Self-Healing in Chat

**What to build:**
Autonomous post-deployment health verification and closed-loop incident recovery inside the conversational interface. The agent independently probes the public HTTP endpoint, fetches runtime logs (`liara logs`) upon detecting errors or crashes (e.g. HTTP 503), presents an AI-diagnosed root cause explanation in Persian chat, and offers a 1-click approved remediation action.

**Blocked by:** 07 (Chat-Triggered Deployment & SSE Log Streaming)

**Status:** ready-for-agent

- [ ] Automatic independent HTTP health probe decoupled from provider deployment state
- [ ] Bounded runtime log fetcher (`liara logs --app <app_name> --last 100`) triggered automatically on unhealthy status
- [ ] LangChain SRE diagnoser citing exact log line evidence and pinpointing root cause in Persian
- [ ] Interactive `RemediationApprovalWidget` in chat presenting targeted fix (e.g. setting missing env, resizing, or restarting)
- [ ] Execution of approved remediation and automatic re-verification of the public endpoint
- [ ] Automated tests for health probe, log diagnosis, and remediation execution

