# 01: Engine Project Inspection Enhancements and App Creation API

**What to build:**
Enhance the Python engine's `ProjectAnalysis` model and `ProjectInspector` to detect the presence of `liara.json`, extract any configured `app` name, and generate a sanitized `suggested_app_name`. Implement `create_project` in `LiaraAdapter` and expose `POST /liara/projects` in FastAPI to allow creating new apps in Liara Cloud with platform and plan specification.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `ProjectAnalysis` contains `has_liara_json`, `existing_app_name`, and `suggested_app_name`.
- [ ] `ProjectInspector` extracts app name from `liara.json` when present.
- [ ] `LiaraAdapter.create_project` creates an app via Liara API/CLI, supporting teamID and plan_id.
- [ ] `POST /liara/projects` validates payload and enforces `X-Internal-Secret`.
- [ ] Pytest unit tests in `test_inspector.py` and `test_liara_adapter.py` pass.

