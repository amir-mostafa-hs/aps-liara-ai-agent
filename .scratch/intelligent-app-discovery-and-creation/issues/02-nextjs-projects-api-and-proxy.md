# 02: Next.js Project Creation API Route and Proxy

**What to build:**
Create `POST /api/liara/projects` in the Next.js web application to securely forward app creation requests to the Python engine with `X-Internal-Secret`. Inject stored user credentials (token and teamId) if not provided in the request body, and return structured responses for success or error.

**Blocked by:** 01: Engine Project Inspection Enhancements and App Creation API

**Status:** ready-for-agent

- [ ] `POST /api/liara/projects` validates authenticated session and input parameters.
- [ ] Forwards `project_id`, `platform`, `plan_id`, and `team_id` to engine with `X-Internal-Secret`.
- [ ] Returns sanitized JSON response without credential leaks.
- [ ] Node.js unit tests in `apps/web/tests/liara-projects.test.mjs` pass.

