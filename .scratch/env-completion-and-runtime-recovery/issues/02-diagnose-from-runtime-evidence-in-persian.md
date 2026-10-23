# 02: Diagnose Runtime Failures from the Correct Evidence in Persian

**What to build:** When deployment completes but the application is unhealthy, the agent obtains runtime logs independently from deployment logs, explains the supported root cause and next step in Persian, and clearly reports when evidence is unavailable or inconclusive.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A failed health check requests runtime logs even when deployment logs are already present.
- [ ] Successful deployment output is never analyzed or presented as runtime evidence.
- [ ] The diagnosis identifies evidence source, confidence, and a specific error excerpt without exposing credentials.
- [ ] User-facing diagnosis and action descriptions are Persian; raw source logs may retain their original language and are labeled as evidence.
- [ ] Missing or failed runtime-log retrieval is reported separately; without corroborating project evidence, the result is inconclusive and contains no fabricated cause or remediation.
- [ ] The `SERVICE_SECRET` startup failure is diagnosed from the runtime evidence, not as an app-creation or deployment failure.
- [ ] Automated tests simulate runtime-log retrieval and verify the public diagnosis behavior without a real Liara connection.
