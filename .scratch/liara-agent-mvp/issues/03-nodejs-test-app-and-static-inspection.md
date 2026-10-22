# 03: Node.js Test Project and Read-Only Static Inspection

**What to build:**
A minimal, standalone Node.js web application stored in the repository (equipped with a deliberate missing environment variable for subsequent SRE crash demonstration), combined with a static inspection service in the Python engine. The operator inputs a local project path into the dashboard (or selects the sample preset). The agent reads configuration files (`package.json`, etc.) strictly read-only without executing any code or hooks. The dashboard renders an interactive "Project Analysis" card showing detected runtime (`nodejs`), start script, entrypoint, evidence files, and discovered environment variables, rejecting path traversal attempts (`../../`) with a structured security error.

**Blocked by:** 01 (Scaffold Hybrid Workspace and Health Check)

**Status:** resolved

## Acceptance Criteria
- [x] Sample Node.js test project exists in the repo with minimal dependencies and configurable environment variables.
- [x] Operator can provide a local directory path, and paths outside allowed workspace roots or path traversal attacks are rejected.
- [x] Static inspection inspects files without invoking `npm`, `node`, or executing arbitrary scripts.
- [x] Analysis accurately detects Node.js platform, entrypoint, start command, and required environment variable keys (without values).
- [x] Dashboard displays an evidence-backed Project Analysis card with confidence level and unresolved assumptions.

## Resolution
Successfully implemented:
1. Created the standalone sample Node.js test web application in `sample-apps/nodejs-demo/` with built-in SRE failure hook (`SERVICE_SECRET` requirement) and passing tests.
2. Implemented the Python Static Inspection Service in `engine/services/inspector.py` enforcing boundary security (rejection of path traversal `/etc/passwd` and non-existent folders) and strictly static file parsing without executing user code.
3. Added `POST /agent/inspect` endpoint in the Python engine returning typed Pydantic `ProjectAnalysis`.
4. Added Next.js proxy route `POST /api/project/inspect` forwarding with `X-Internal-Secret`.
5. Built interactive "Step 2: Static Project Inspection" UI card in `apps/web/src/app/page.tsx` with preset sample loader, path input, and detailed analysis display.
6. Added complete English setup and architectural documentation in `docs/GETTING_STARTED.md` and `README.md`.
7. All 19 automated tests passed across Python pytest, Node.js unit tests, and sample app test runner.

