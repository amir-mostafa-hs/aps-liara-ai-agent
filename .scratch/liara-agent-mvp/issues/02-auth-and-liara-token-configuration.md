# 02: Operator Login and Masked Liara Token Configuration

**What to build:**
A clean operator authentication and settings interface. The operator logs in using a predefined username and password via a shadcn/ui login form, establishing a secure HTTP-only session. In the settings panel, the operator can configure, view (masked as `••••••••`), and update their Liara API token (`LIARA_API_TOKEN`). An interactive "Test Liara Connection" button calls the Python Liara Adapter to query `liara app list` (or Liara API) and renders the list of active apps on the account with a green connection badge, redacting tokens from all logs and responses.

**Blocked by:** 01 (Scaffold Hybrid Workspace and Health Check)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Operator can log in with valid credentials, and invalid attempts are rejected with clear error feedback.
- [ ] Session is maintained via secure HTTP-only cookie and unauthenticated dashboard routes redirect to login.
- [ ] Operator can save and update their Liara API token, which is stored in the PostgreSQL database or encrypted session.
- [ ] Token characters are masked in the UI, and redaction logic ensures token values never appear in application logs or model prompts.
- [ ] Clicking "Test Connection" executes a read-only app-listing check through the Liara Adapter and displays active apps or structured failure errors.

