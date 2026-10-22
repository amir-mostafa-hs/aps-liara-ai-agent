# 07: SRE Log Diagnosis and Approved Remediation

**What to build:**
A closed-loop SRE troubleshooting pipeline. When an application failure or crash is detected during verification, the agent automatically retrieves bounded runtime logs via `liara logs` (or Liara OpenAPI logs endpoint). LangChain parses the stack trace, diagnoses the root cause (citing specific log evidence showing the missing environment variable), and formulates a remediation action proposing to set the variable (`liara env set`) on the target app. The dashboard displays an interactive "SRE Diagnosis & Remediation" card. Upon the operator clicking "Approve Fix", the agent applies the variable, triggers recovery, re-verifies the public endpoint, and presents an end-to-end audit timeline with a green "Service Recovered" badge.

**Blocked by:** 06 (Endpoint Verification and Health Check)

**Status:** resolved

## Acceptance Criteria
- [x] Bounded runtime logs are queried and sanitized before model evaluation.
- [x] LangChain diagnosis generates an evidence-backed root cause citing exact log error lines.
- [x] Remediation plan proposes setting the missing variable via `liara env set` and explicitly requests approval.
- [x] Consequential remediation is blocked until explicit user confirmation is recorded.
- [x] After approved execution, the public endpoint is re-checked, verifying HTTP 200 health and closing the incident.

