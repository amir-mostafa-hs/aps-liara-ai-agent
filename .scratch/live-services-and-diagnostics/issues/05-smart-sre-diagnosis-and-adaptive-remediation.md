# 05: Smart SRE Diagnosis & Adaptive Remediation

**What to build:**
Deliver accurate, context-aware Persian SRE error diagnosis when deployments fail. Pass client error logs to the diagnostic engine, accurately detect app-not-found, port collision, and build failure scenarios, and render relevant remediation guidance rather than always defaulting to an irrelevant `SERVICE_SECRET` environment variable prompt.

**Blocked by:** 01: Local Source Path Ingestion & Confinement Fix, 02: Live Liara Credentials Verification & Services API

**Status:** resolved

- [x] Next.js `/api/runs/[id]/diagnose` endpoint parses `req.json()` to consume live error logs and provider status streamed from deployment.
- [x] Python engine `SREDiagnoser` provides rule-based and LLM diagnosis for common failure patterns:
  - App not found in account/team (`Error: Could not find the app`)
  - Port collision / connection refusal
  - Missing environment variables
  - Build and packaging failures
- [x] `RemediationApprovalWidget.tsx` conditionally renders:
  - Environment variable injection form only when a missing environment variable is genuinely diagnosed.
  - Actionable Persian guidance and quick resolution actions (e.g. creating the application on Liara or verifying team ID) when the failure is structural or configuration-based.
- [x] Chat message handler generates guaranteed unique keys (`usr-${Date.now()}-${random}`) preventing React duplicate key errors.
- [x] Automated tests in `engine/tests/test_diagnoser.py` and Next.js test suite verify accurate diagnostic output and widget payload handling.
