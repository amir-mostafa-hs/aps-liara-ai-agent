# Liara Deployment & SRE Agent MVP Specification

Status: ready-for-agent

## Problem Statement

Developers and teams deploying applications to cloud infrastructure like Liara often lack dedicated DevOps or SRE personnel. Navigating framework detection, configuring build/start commands, managing environment variables, diagnosing deployment failures, and recovering crashed services requires tedious manual troubleshooting across documentation and web dashboards. 

Users need an intelligent operational partner that can inspect their project, formulate an auditable deployment plan, execute operations on real Liara infrastructure only upon explicit approval, verify deployment health through observable evidence, and automatically diagnose runtime crashes with actionable remediation recommendations.

## Solution

A hybrid deployment and SRE platform combining:
1. **Application Tier (Next.js Fullstack + shadcn/ui + PostgreSQL):** A modern, responsive web dashboard where users authenticate with username/password, input local project paths or authorized GitHub URLs, securely configure their Liara API token, review typed deployment plans, grant or reject approvals for sensitive operations, and observe real-time status and logs.
2. **Agent Engine (Python + LangChain + FastAPI):** An intelligent execution core that inspects codebase trees read-only, generates schema-validated deployment plans using `gpt-6-luna` (or configured OpenAI-compatible LLMs), interfaces with Liara infrastructure via the Liara Adapter, enforces strict output redaction, monitors logs, and executes closed-loop remediation upon user approval.
3. **Primary End-to-End Demo Journey:** Deploying a lightweight Node.js web application to Liara's native `nodejs` platform, triggering a controlled runtime configuration crash (missing required environment variable), autonomously inspecting Liara logs to diagnose the missing variable, presenting a remediation plan to set the variable via `liara env set`, executing the fix upon user confirmation, and verifying healthy HTTP 200 resolution.

---

## User Stories

### Authentication & Setup
1. As an operator, I want to log into the web dashboard using a username and password, so that unauthorized users cannot trigger cloud deployments or view operational logs.
2. As an operator, I want to input and save my Liara API token in the settings view, so that the agent can interact with my Liara account without exposing credentials in plaintext files.
3. As an operator, I want my Liara API token to be masked in the user interface and redacted from all logs, so that sensitive credentials never leak during demonstrations or screen shares.

### Source Intake & Static Inspection
4. As a developer, I want to provide a local project path via the web dashboard or CLI, so that the agent can inspect my local repository without requiring an external Git push.
5. As a developer, I want to provide an authorized GitHub repository URL, so that the agent can inspect and deploy remote repositories.
6. As a security-conscious engineer, I want the agent to restrict local file access to a safe workspace root, so that malicious directory traversals or symlink escapes are rejected.
7. As a security-conscious engineer, I want project inspection to be completely static and read-only, so that untrusted code or repository hooks never execute on my host during analysis.
8. As a developer, I want the agent to detect the project runtime (Node.js) and build/start commands with clear confidence levels and evidence files, so that I can verify the inspection accuracy before deploying.
9. As a developer, I want the agent to identify required environment variables without guessing secret values, so that configuration prerequisites are surfaced upfront.

### Planning & Human-in-the-Loop (Approval Gate)
10. As an operator, I want the agent to present a typed Deployment Plan before mutating cloud infrastructure, so that I understand exactly what actions will be taken.
11. As an operator, I want each proposed action to display its target, arguments, rationale, expected cost impact, and reversibility, so that I can make informed operational decisions.
12. As an operator, I want an explicit Approval Gate that prevents any mutating or billable operation from executing without my approval, so that the agent cannot perform unapproved actions.
13. As an operator, I want the ability to reject a proposed action, so that execution is safely halted and no changes are made.
14. As an operator, I want any change to an action's arguments or target to invalidate prior approvals, so that outdated or tampered actions cannot execute.

### Deployment & Verification
15. As a developer, I want the agent to execute deployments against real Liara infrastructure using verified Liara Adapter operations, so that my application actually goes live.
16. As an operator, I want to watch real-time deployment progress and redacted logs in the web dashboard, so that I have complete visibility into the release lifecycle.
17. As an operator, I want the agent to perform an independent HTTP endpoint verification check after deployment, so that provider-reported success is distinguished from actual application health.
18. As an operator, I want ambiguous or inconclusive verification results to be reported as `inconclusive`, so that false-positive successes are never claimed.

### SRE Diagnosis & Remediation Loop
19. As an operator, I want the agent to automatically capture and analyze Liara runtime logs when an application fails or crashes, so that I do not have to parse stack traces manually.
20. As an operator, I want the agent to present a grounded diagnosis citing specific log evidence, so that I understand why the service failed.
21. As an operator, I want the agent to formulate a concrete remediation plan (such as setting a missing environment variable via `liara env set`), so that the problem can be resolved efficiently.
22. As an operator, I want the remediation action to require my explicit approval before execution, so that automatic changes are never applied without human consent.
23. As an operator, I want the agent to re-verify the application after applying a remediation, so that we have verifiable proof that the incident is resolved.

### Audit & Persistence
24. As an evaluator, I want the application to persist run records, approval timestamps, and execution summaries in PostgreSQL, so that all operations are fully auditable.
25. As a developer, I want a lightweight CLI interface that can kick off runs and feed local paths, so that command-line workflows are supported alongside the web UI.

---

## Implementation Decisions

### 1. Architectural Shape (ADR-0001, ADR-0003)
The system is built as a two-tier modular monolith:
- **Application Tier (`apps/web` or `src/web`):** Next.js (TypeScript) with `shadcn/ui` and Tailwind CSS. Connects to PostgreSQL via Prisma ORM to store users, project configurations, workflow runs, approval logs, and operation audit trails. Handles browser sessions and renders the dashboard.
- **Agent Engine (`src/liara_agent/`):** Python service powered by LangChain and FastAPI. Encapsulates project inspection, Pydantic domain models, prompt orchestration, and the Liara Adapter.
- **Internal Service Communication (ADR-0005):** Next.js server actions / route handlers communicate with the Python FastAPI service over localhost HTTP, secured by an `X-Internal-Secret: INTERNAL_AGENT_SECRET` header.

### 2. Interface Prioritization (ADR-0001)
- **P0:** Core Workflow Service + Web UI (Next.js + shadcn/ui) + minimal CLI + HTTP API (backend for Web UI).
- **P1:** Standalone MCP server (stdio transport), deferred until P0 deployment and SRE verification are rock-solid.

### 3. Primary End-to-End Demo Target (ADR-0002)
- **Target Application:** A lightweight standalone Node.js web server (`express` or native `http`).
- **Target Platform on Liara:** Native `nodejs` (fastest deployment, zero Docker build overhead).
- **Target App ID:** Configurable via dashboard / `.env` (e.g. `test-liara-agent-app`).
- **Controlled Failure Scenario:** Application expects an environment variable `SERVICE_SECRET` or `PORT`. When missing, the process exits with an error code and logs `Error: Missing required environment variable: SERVICE_SECRET`.
- **Remediation Loop:** Agent reads `liara logs`, parses the missing key, prompts user to approve setting `SERVICE_SECRET=demo-secret-123`, applies it via `liara env set`, and confirms resolution via HTTP 200.

### 4. AI Model & Output Enforcement (ADR-0004)
- **Primary LLM:** Configured for `gpt-6-luna` using OpenAI-compatible client configuration (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`).
- **Abstraction:** Initialized via LangChain's `init_chat_model` to allow seamless environment switching to Claude or Gemini.
- **Structured Outputs:** Strict enforcement of Pydantic models via `.with_structured_output(DeploymentPlan)` and `.with_structured_output(DiagnosisResult)` to prevent hallucinated freeform text or arbitrary shell generation.

### 5. Liara Capability Classification

| Category | Operations / Capabilities | Rationale & Handling |
|---|---|---|
| **Verified (تأییدشده)** | - Bearer Token Auth (`--api-token`)<br>- List apps (`liara app list`)<br>- Create app (`liara create / liara app create`)<br>- Deploy local source (`liara deploy`)<br>- List / Set environment variables (`liara env list`, `liara env set`)<br>- Bounded logs query via CLI & OpenAPI (`GET /v1/projects/{name}/logs`) | Officially documented in Liara OpenAPI specs and Liara CLI references. Supported directly by the Liara Adapter. |
| **Needs Live Test (نیازمند تست عملی)** | - Structured release/deploy status polling without parsing interactive terminal strings<br>- Runtime log format & pagination limits<br>- Restart / redeploy timing & downtime behavior<br>- Public URL stability (`*.liara.run`) and HTTP health response | Documented at CLI/API level, but exact machine-readable JSON formats and latency must be verified against the live test account. |
| **Unsupported / Unknown (پشتیبانی‌نشده / نامشخص)** | - Direct deployment from remote GitHub repo via Liara CLI without local checkout<br>- Accurate pre-creation cost/pricing calculation API<br>- Automated database / disk / DNS provisioning without manual console setup | Not established in Liara CLI/API specifications. Defer or implement local Git checkout before deploy; flag pricing as "may incur cost" rather than guessing. |

### 6. Typed Tool Contracts (Python Engine)
The Python engine exposes allowlisted typed tools behind application service boundaries:
1. `inspect_project(source: ProjectSource) -> ProjectAnalysis`
2. `prepare_deployment_plan(analysis: ProjectAnalysis) -> DeploymentPlan`
3. `execute_approved_action(action: ProposedAction, approval: ActionApproval) -> OperationResult`
4. `deploy_project(app_id: str, platform: str, source_path: str) -> OperationResult`
5. `get_deployment_logs(app_id: str, lines: int = 100) -> LogResult`
6. `verify_deployment(endpoint_url: str) -> VerificationResult`
7. `diagnose_failure(logs: str, provider_status: str) -> DiagnosisResult`

### 7. Human-in-the-Loop & Safety Policies
- **Approval Gate:** Mutating operations (`create_app`, `deploy`, `set_env`, `restart`) transition the run state to `awaiting_approval`. Execution halts until a matching `ActionApproval` record with an identical digest is confirmed.
- **Redaction:** A centralized `redact_secrets()` utility cleanses stdout, stderr, logs, and arguments before storing them in PostgreSQL or returning them to the LLM.
- **Strict Allowlist:** The agent cannot execute arbitrary bash commands. All operations pass through predefined Liara Adapter functions with validated arguments.

### 8. Acceptance Criteria
The MVP is successful when:
1. An operator can log into the Next.js web application using username and password.
2. The operator can configure their Liara API token and local project directory.
3. The agent statically inspects the project and displays detected framework (`nodejs`), entrypoint, and configuration.
4. The agent generates a structured Deployment Plan showing target app, port, and actions.
5. The operator can approve or reject the plan; rejection cleanly halts execution.
6. Upon approval, the agent deploys the app to real Liara infrastructure using the Liara Adapter.
7. In the controlled failure scenario, the agent captures Liara logs, diagnoses the missing environment variable, prepares a remediation action, and waits for approval.
8. Upon remediation approval, the agent executes `liara env set`, triggers service recovery, and verifies HTTP 200 health on `*.liara.run`.
9. No secrets or tokens are exposed in plaintext logs, database columns, or video recordings.

---

## Testing Decisions

### Seams
We identify two primary testing seams across the codebase:

1. **The Shared Application Service Seam (`ExecutionCoordinator` / `WorkflowService` in Python):**
   - **Why this seam?** It sits immediately below the API boundary and coordinates inspection, plan generation, approval checks, tool execution, and verification.
   - **How it is tested:** Unit and integration tests drive this seam with mock adapters (`MockLiaraAdapter`, `MockModelProvider`). This allows testing 100% of the workflow logic (path traversal rejection, static inspection, approval gate invalidation, secret redaction, state transitions, and diagnosis parsing) without network calls or cloud costs.
2. **The Liara Adapter Live Seam (`LiaraAdapter` against live Liara):**
   - A single, dedicated integration test suite verifying real authentication, `liara app list`, deploy, log retrieval, and `liara env set` against the designated test account.
3. **The Web API Contract Seam (Next.js Route Handlers):**
   - Route handler unit tests verifying authenticated session cookies, proxying requests to the Python engine with `X-Internal-Secret`, and persisting run records to PostgreSQL.

### What Makes a Good Test
- Tests must verify external behavior (e.g. "when approval is missing, executing deploy raises `APPROVAL_REQUIRED`"), not private internal variable states.
- Tests must assert that secrets (e.g. `mock-liara-token-12345`) are redacted in output.
- Tests must reject paths outside the allowed workspace directory (`../traversal/path`).

---

## Out of Scope

The following items are explicitly deferred beyond the 48-hour hackathon MVP:
1. **Multi-tenant SaaS & Enterprise Roles:** Team permissions, billing tiers, or multi-tenant user isolation.
2. **ZIP File Uploads:** Uploading arbitrary `.zip` archives directly to the agent.
3. **Automatic Database/Storage Provisioning:** Automatically spinning up DBaaS Postgres or Object Storage buckets without manual console verification.
4. **General-Purpose Coding Agent:** Autonomous generation of multi-file source code patches from scratch (the agent diagnoses and provides config/env fixes or instructions only).
5. **DNS & Custom Domain Automation:** Managing ArvanCloud/Irantk or registering external domains.
6. **24/7 Background Alerting:** Long-running daemon workers with PagerDuty / Slack on-call alerting.

---

## Further Notes & Potential Blockers

### Operational Risks & Open Technical Items
1. **Liara CLI Binary Presence:** The agent's host environment requires `@liara/cli` installed (`npm i -g @liara/cli`) and accessible in PATH.
2. **Live Liara Account Credentials:** Execution of Phase C (Liara live tests) requires an active Liara API token with sufficient wallet credit on the test account.
3. **LLM Endpoint Connectivity:** Access to `gpt-6-luna` or OpenAI-compatible endpoint with an active API key (`OPENAI_API_KEY`).
4. **Database Migration:** PostgreSQL instance must be reachable via `DATABASE_URL` (local docker-compose or hosted PostgreSQL on Liara).

