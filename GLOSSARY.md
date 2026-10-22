# Liara Deployment & SRE Agent

A specialized AI agent that inspects projects, prepares deployment plans, executes verified Liara operations with human-in-the-loop approval, and troubleshoots runtime issues.

## Language

**Shared Core**:
The central application service layer coordinating workflows, state transitions, inspection, planning, and safety policies across all interfaces (Web, CLI, MCP).
_Avoid_: Backend service, general agent, monolith

**Application Tier**:
The Next.js fullstack service providing the web dashboard, shadcn/ui interface, and PostgreSQL persistence layer.
_Avoid_: Frontend-only, client app

**Agent Engine**:
The Python service running LangChain, responsible for code inspection, LLM orchestration, Liara adapter tool execution, and failure diagnosis.
_Avoid_: Python script, worker

**Approval Gate**:
A mandatory enforcement mechanism that stops execution before consequential actions until explicit human authorization is recorded for the exact action and arguments.
_Avoid_: Confirmation dialog, user prompt, manual step

**Liara Adapter**:
The provider-facing integration module that invokes verified Liara CLI/API operations, redacts sensitive output, and returns normalized operation results.
_Avoid_: Liara wrapper, cloud client

**Deployment Plan**:
A typed, reviewable specification of proposed infrastructure operations, arguments, and risk levels prepared before executing any mutation.
_Avoid_: Action list, recipe, script

**Remediation Loop**:
The closed-loop process where observed failure evidence is diagnosed, a targeted corrective action is planned and approved, and the outcome is re-verified.
_Avoid_: Auto-heal, self-repair, retry loop

**Structured Output**:
An LLM response constrained to a strict Pydantic model via LangChain, preventing arbitrary prose or hallucinatory commands.
_Avoid_: Freeform response, raw completion, JSON prompt

**Credential Store**:
The isolated storage layer managing user passwords and masked Liara API tokens, ensuring credentials never leak into prompt context or logs.
_Avoid_: Config file, secrets dump

