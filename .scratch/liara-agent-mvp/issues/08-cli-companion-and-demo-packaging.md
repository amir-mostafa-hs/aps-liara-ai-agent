# 08: CLI Companion and 5-Minute Demo Packaging

**What to build:**
A unified CLI companion command (`liara-agent run --path ...`) enabling developers to execute the same inspection, planning, approval, and deployment lifecycle directly from the terminal. Packages the repository with a comprehensive `.env.example` containing only placeholders, a clean `README.md` with architectural documentation, and a rehearsed 5-minute video demonstration script covering the full inspect -> plan -> approve -> deploy -> crash -> diagnose -> approve fix -> verify loop to ensure high scoring on presentation and evaluation rubrics.

**Blocked by:** 07 (SRE Log Diagnosis and Approved Remediation)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] CLI command allows running the workflow with interactive terminal prompts matching the Web UI logic.
- [ ] Both CLI and Web UI invoke identical application services without duplicated business logic.
- [ ] `.env.example` documents all required configuration keys (`DATABASE_URL`, `OPENAI_API_KEY`, `INTERNAL_AGENT_SECRET`, etc.) with zero hardcoded secrets.
- [ ] `README.md` includes setup guide, architecture diagram, security boundaries, and API limitations.
- [ ] A 5-minute video demo script is provided, walking through the end-to-end happy path and SRE recovery scenario.

