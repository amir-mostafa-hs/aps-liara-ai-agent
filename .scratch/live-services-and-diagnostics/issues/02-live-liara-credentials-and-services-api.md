# 02: Live Liara Credentials Verification & Services API

**What to build:**
Implement live cloud service discovery in the Python AI Engine and Next.js backend that queries Liara API for both applications (`GET /v1/projects`) and databases (`GET /v1/databases`), returning a unified real-time list of cloud services with statuses, domains, and port mappings.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Python engine `LiaraAdapter` implements `get_services(api_token, team_id)` to query `/v1/projects` and `/v1/databases`.
- [x] Returns normalized cloud services `{ name, type, status, endpoint, port }` with active connection verification.
- [x] Engine endpoint `GET /liara/services` added with `verify_internal_secret` protection.
- [x] Next.js route `GET /api/liara/services` implemented, resolving operator token/team securely and proxying to engine.
- [x] Returns `{ ok: false, error: ... }` if token is invalid or missing, providing clear feedback.
- [x] Automated pytest tests in `engine/tests/test_liara_adapter.py` and unit tests in Next.js pass.
