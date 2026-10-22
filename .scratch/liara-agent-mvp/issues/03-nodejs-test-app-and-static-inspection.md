# 03: Node.js Test Project and Read-Only Static Inspection

**What to build:**
A minimal, standalone Node.js web application stored in the repository (equipped with a deliberate missing environment variable for subsequent SRE crash demonstration), combined with a static inspection service in the Python engine. The operator inputs a local project path into the dashboard (or selects the sample preset). The agent reads configuration files (`package.json`, etc.) strictly read-only without executing any code or hooks. The dashboard renders an interactive "Project Analysis" card showing detected runtime (`nodejs`), start script, entrypoint, evidence files, and discovered environment variables, rejecting path traversal attempts (`../../`) with a structured security error.

**Blocked by:** 01 (Scaffold Hybrid Workspace and Health Check)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Sample Node.js test project exists in the repo with minimal dependencies and configurable environment variables.
- [ ] Operator can provide a local directory path, and paths outside allowed workspace roots or path traversal attacks are rejected.
- [ ] Static inspection inspects files without invoking `npm`, `node`, or executing arbitrary scripts.
- [ ] Analysis accurately detects Node.js platform, entrypoint, start command, and required environment variable keys (without values).
- [ ] Dashboard displays an evidence-backed Project Analysis card with confidence level and unresolved assumptions.

