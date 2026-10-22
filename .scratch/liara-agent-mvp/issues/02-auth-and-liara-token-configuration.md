# 02: Operator Login and Masked Liara Token Configuration

**What to build:**
A clean operator authentication and settings interface. The operator logs in using a predefined username and password via a shadcn/ui login form, establishing a secure HTTP-only session. In the settings panel, the operator can configure, view (masked as `••••••••`), and update their Liara API token (`LIARA_API_TOKEN`). An interactive "Test Liara Connection" button calls the Python Liara Adapter to query `liara app list` (or Liara API) and renders the list of active apps on the account with a green connection badge, redacting tokens from all logs and responses.

**Blocked by:** 01 (Scaffold Hybrid Workspace and Health Check)

**Status:** resolved

## Acceptance Criteria
- [x] Operator can log in with valid credentials, and invalid attempts are rejected with clear error feedback.
- [x] Session is maintained via secure HTTP-only cookie and unauthenticated dashboard routes redirect to login.
- [x] Operator can save and update their Liara API token, which is stored in the PostgreSQL database or encrypted session.
- [x] Token characters are masked in the UI, and redaction logic ensures token values never appear in application logs or model prompts.
- [x] Clicking "Test Connection" executes a read-only app-listing check through the Liara Adapter and displays active apps or structured failure errors.

## Resolution
Successfully implemented:
1. Dockerized infrastructure with `docker-compose.yml` orchestrating PostgreSQL (healthy on port 5432) with persistent volume, and Dockerfiles for `engine` and `web`.
2. Operator authentication system:
   - Dedicated login view at `/login` with credentials validation.
   - Secure signed HTTP-only session cookie (`liara_agent_session`).
   - Session verification and logout routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`).
3. Liara token configuration:
   - Persisted in PostgreSQL database via Prisma `User.liaraToken` column.
   - Masked in UI views as `••••••••<last4>` so credentials are never visible.
   - Centralized redaction utility (`engine/security/redaction.py`) scrubbing tokens and bearer headers from logs and responses.
4. Liara live connection testing:
   - Python Liara Adapter (`engine/providers/liara_adapter.py`) querying `GET /v1/projects` with Bearer auth.
   - Next.js proxy route `/api/liara/test-connection` forwarding securely with `X-Internal-Secret`.
   - Dashboard card rendering active cloud projects with green badges upon successful connection.
5. All 9 automated tests passed across Python pytest and Node.js test runners.

