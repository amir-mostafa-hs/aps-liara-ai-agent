# 02: Diagnose Runtime Failures from the Correct Evidence in Persian

**What to build:** When deployment completes but the application is unhealthy, the agent obtains runtime logs independently from deployment logs, explains the supported root cause and next step in Persian, and clearly reports when evidence is unavailable or inconclusive.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] A failed health check requests runtime logs even when deployment logs are already present.
- [x] Successful deployment output is never analyzed or presented as runtime evidence.
- [x] The diagnosis identifies evidence source, confidence, and a specific error excerpt without exposing credentials.
- [x] User-facing diagnosis and action descriptions are Persian; raw source logs may retain their original language and are labeled as evidence.
- [x] Missing or failed runtime-log retrieval is reported separately; without corroborating project evidence, the result is inconclusive and contains no fabricated cause or remediation.
- [x] The `SERVICE_SECRET` startup failure is diagnosed from the runtime evidence, not as an app-creation or deployment failure.
- [x] Automated tests simulate runtime-log retrieval and verify the public diagnosis behavior without a real Liara connection.

**Verification:** All 82 Engine tests and 63 web tests pass. TypeScript checking and the production build pass. Diagnosis coverage includes runtime-log preference, bounded project evidence, inconclusive results, Persian cause text, secret redaction, and the simulated recovery journey.
