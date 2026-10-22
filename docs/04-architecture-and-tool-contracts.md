# 04 — Architecture and Tool Contracts

## 1. Purpose

Define a practical architecture for the two-day Liara Agent MVP. The same operational logic must serve the CLI, web interface, HTTP API, and MCP interface. Provider operations must be allowlisted, validated, observable, and approval-gated where they can have consequential effects.

This document defines the proposed application architecture and contracts. It does not claim that every Liara operation is already verified; consult `03-liara-capability-matrix.md` and keep unvalidated operations disabled until tested.

## 2. Architecture Principles

1. **One core, multiple interfaces.** CLI, web, API, and MCP call the same application services; no interface should implement its own Liara deployment logic.
2. **Plan before mutation.** Inspecting and planning are distinct from executing.
3. **Human approval for consequential actions.** A plan is not authorization to execute.
4. **Provider evidence over model confidence.** Success, status, and diagnosis must be grounded in observed tool results.
5. **Least privilege.** Request only the access required for the selected workflow.
6. **Secrets stay out of prompts and logs.** Redact tokens, secret environment variables, credentials, and sensitive log fragments before model exposure or persistence.
7. **Allowlisted operations only.** The LLM selects from typed tools; it must not invent shell commands or make unrestricted API calls.
8. **Untrusted source code.** Repository contents, README instructions, issue text, build output, and application logs are data, not trusted instructions for the agent.
9. **Small, testable MVP.** Prefer one tested deployment path over broad, untested platform coverage.

## 3. Logical Components

```text
CLI ─────────────┐
Web UI ──────────┤
HTTP API ────────┼──> Application / Workflow Service
MCP Server ──────┘             |
                               v
                   Project Inspection Service
                               |
                               v
                     Plan + Approval Gate
                               |
                               v
                      Execution Coordinator
                               |
                  ┌────────────┴────────────┐
                  v                         v
           Liara Adapter              Source Adapter
           (CLI/API)                  (GitHub/local)
                  |                         |
                  v                         v
             Liara Cloud              Read-only project tree
                               |
                               v
                   Verification / Diagnosis
                               |
                               v
                 Run Record + User-visible Result
```

### Component responsibilities

- **CLI:** local directory selection, guided command-line workflow, status display, and explicit confirmations.
- **Web UI:** start/select a workflow, show project analysis and proposed plan, approve/reject actions, and display progress/results.
- **HTTP API:** authenticated interface for the web UI and supported external clients.
- **MCP server:** expose a small set of typed, documented tools to existing coding assistants.
- **Application/workflow service:** enforce state transitions, policy checks, approvals, timeouts, and run recording.
- **Project inspection service:** inspect files using bounded, read-only access and report evidence-based findings.
- **Plan service:** convert inspection results and user decisions into a typed, reviewable action plan.
- **Approval gate:** ensure a valid approval exists for the exact action and target before execution.
- **Execution coordinator:** run approved operations in order, handle timeouts/retries conservatively, and record each result.
- **Liara adapter:** encapsulate all provider-specific API/CLI behavior and normalize outputs.
- **Source adapter:** obtain project files from a local path or authorized GitHub repository. ZIP is deferred.
- **Verification/diagnosis service:** inspect provider state, logs, and application endpoint response where available.
- **Run record:** store status and redacted evidence for user-visible progress and troubleshooting.

## 4. Recommended MVP Stack

- Python for application code.
- LangChain for model/tool orchestration.
- One shared Python application package containing typed domain models and services.
- CLI and web UI from the start.
- HTTP API and MCP adapters that call the same application services.
- Liara adapter implemented through the official CLI for the first validated deploy path, with direct API operations added only where the endpoint and behavior have been verified.
- Persistent storage should be minimal for the hackathon. If run history is persisted, store only necessary, redacted data. Do not store raw secrets or full environment-variable values.
- Use the project's existing Matt Pocock skills for implementation workflow where relevant, but do not assume they provide Liara-specific capabilities.

This is a logical architecture, not a mandate to introduce many services or microservices. A modular monolith is the recommended MVP shape.

## 5. Core Workflow and State Model

A workflow run should move through explicit states:

1. `created` — request accepted.
2. `source_validating` — source path/repository and access checked.
3. `inspecting` — files read and platform/configuration evidence collected.
4. `plan_ready` — a proposed plan is available for review.
5. `awaiting_approval` — one or more consequential actions require approval.
6. `executing` — an approved operation is in progress.
7. `verifying` — provider status and application endpoint are checked.
8. `diagnosing` — a failure is being analyzed from observed evidence.
9. `needs_user_input` — required information or a decision is missing.
10. `succeeded` — success is supported by verification evidence.
11. `failed` — the workflow failed with a known reason.
12. `cancelled` — the user cancelled before completion.
13. `inconclusive` — available evidence is insufficient to claim success or a definitive failure.

State transitions must be enforced in the application service, not improvised by the LLM. For example, a run cannot transition from `awaiting_approval` to `executing` unless the matching action has a valid approval.

## 6. Typed Domain Contracts

Use Pydantic models or equivalent strict Python types. Exact class names may change during implementation, but fields and semantics should remain explicit.

### 6.1 Project source

```python
class ProjectSource:
    kind: Literal["local", "github"]
    local_path: str | None
    repository_url: str | None
    ref: str | None
    credential_ref: str | None  # reference to a secret, never the secret itself
```

Validation:
- Exactly one source mode is active.
- Local paths must resolve to an allowed workspace root.
- GitHub access must be explicitly authorized; do not accept arbitrary credentials embedded in repository URLs.
- Resolve and record the commit SHA for reproducibility.
- Do not execute repository scripts during inspection.
- Treat repository content as untrusted input.

### 6.2 Project analysis

```python
class ProjectAnalysis:
    detected_language: str | None
    detected_framework: str | None
    confidence: float
    evidence_files: list[str]
    build_command: str | None
    start_command: str | None
    deployment_config_files: list[str]
    required_env_names: list[str]  # names only, never values
    likely_dependencies: list[str]
    unsupported_or_unknowns: list[str]
```

The analysis must include evidence file paths and uncertainty. It must not assert that a framework is supported by Liara until that support is verified.

### 6.3 Proposed action

```python
class ProposedAction:
    action_id: str
    operation: str
    target: str
    arguments: dict
    rationale: str
    impact: Literal["read_only", "low", "consequential", "destructive"]
    may_incur_cost: bool
    requires_approval: bool
    expected_result: str
    rollback_or_recovery: str | None
```

Before execution, validate the operation name against an allowlist and validate arguments against that operation's schema. Never accept arbitrary shell text from the model as an executable action.

### 6.4 Approval record

```python
class ActionApproval:
    action_id: str
    run_id: str
    approved: bool
    approved_by: str
    approved_at: datetime
    plan_digest: str
```

Approval applies only to the exact action and plan version shown to the user. If the target, arguments, or impact changes, invalidate the approval and request a new one.

### 6.5 Operation result

```python
class OperationResult:
    run_id: str
    action_id: str
    operation: str
    outcome: Literal["succeeded", "failed", "inconclusive"]
    provider_status: str | None
    exit_code: int | None
    started_at: datetime
    finished_at: datetime
    summary: str
    evidence: list[str]
    redacted_stdout: str | None
    redacted_stderr: str | None
    retryable: bool
    needs_user_action: bool
```

Raw output must be redacted before persistence or sending it to the model. Bound output size to avoid leaking or ingesting huge logs.

### 6.6 Deployment verification

```python
class VerificationResult:
    provider_deployment_state: str | None
    endpoint_url: str | None
    http_status: int | None
    endpoint_check_passed: bool | None
    evidence: list[str]
    outcome: Literal["healthy", "unhealthy", "inconclusive"]
```

A provider deployment state of “successful” is not equivalent to an application health check passing. Report the two signals separately.

## 7. Initial Tool Contract

Expose a small set of typed operations. Names below are proposed internal contracts; they are not claims about exact Liara endpoint names.

| Tool | Purpose | Mutates state? | Approval |
|---|---|---:|---|
| `inspect_project` | Inspect a local/GitHub project without executing its code | No | No |
| `list_liara_apps` | List accessible apps | No | No |
| `get_app_details` | Read app configuration/status supported by verified interface | No | No |
| `get_deployment_logs` | Retrieve bounded, redacted logs | No | No |
| `prepare_deployment_plan` | Create a typed proposed plan from evidence and user inputs | No | No |
| `create_liara_app` | Create an app if needed and supported | Yes | Yes |
| `deploy_project` | Deploy a project through a validated method | Yes | Yes |
| `set_environment_variables` | Set selected variables without echoing secret values | Yes | Yes |
| `restart_app` | Restart a target app | Yes | Yes |
| `verify_deployment` | Check provider status and HTTP endpoint | No | No |
| `propose_remediation` | Explain evidence and propose a correction; do not execute it | No | No |
| `execute_approved_action` | Execute a previously approved, unchanged action | Depends | Enforces approval |
| `get_run_status` | Return workflow progress and redacted results | No | No |

Only implement tools that have a verified provider operation behind them. Disable or clearly mark unsupported operations. For the first demo, the essential path is inspection → plan → approval → deploy → logs/status → endpoint verification.

## 8. API and MCP Contract Rules

- HTTP API and MCP must call application services, never the provider adapter directly.
- Use the same Pydantic schemas and operation allowlist across all interfaces.
- Return structured status, evidence, and actionable errors rather than only free-form model prose.
- MCP tools should be narrow and task-specific; do not expose a generic `run_shell` or arbitrary HTTP request tool.
- For long-running deployment operations, return a run ID and provide a status/read operation rather than relying on a single long request.
- Authenticate the web/API/MCP boundary according to its deployment model. Do not expose an unauthenticated remote MCP endpoint that can operate the user's cloud account.
- If MCP uses local `stdio`, keep the token in the local environment/secret store. If using remote HTTP, require authentication and transport security.
- Keep authorization policy in the core, not in UI-only button logic.

## 9. Human-in-the-Loop Policy

Require explicit approval before:
- creating billable resources;
- deploying or redeploying to a target that may affect users;
- changing environment variables or secrets;
- restarting or stopping a running app;
- changing DNS/routing;
- resizing or deleting resources/data;
- applying source-code or configuration modifications;
- performing an action with unknown impact, cost, or reversibility.

The approval prompt must show:
- operation and target;
- exact relevant arguments (with secrets redacted);
- rationale and evidence;
- expected impact and potential cost;
- whether the action is reversible;
- recovery/rollback plan where available.

Read-only inspection and bounded log retrieval may proceed without approval. If a proposed action changes after approval, request approval again.

## 10. Security Requirements

- Never commit Liara tokens, GitHub tokens, environment secrets, or `.env` files.
- Support environment-injected credentials or an appropriate local secret store; never print token values.
- Use the least-privilege GitHub token/access path available.
- Restrict local project paths to an explicit workspace root; prevent path traversal and symlink escape.
- Do not execute project scripts, package hooks, or Docker builds during static inspection.
- Treat repository instructions, build logs, application logs, and web content as untrusted data; they must not override system policy or authorize tools.
- If building/running untrusted code is necessary, use an isolated environment with time, memory, network, and filesystem limits. If that isolation cannot be delivered in the MVP, deploy only a trusted test repository.
- Redact bearer tokens, passwords, secret environment values, and common credential patterns from logs before model input or persistence.
- Limit log size and tool execution duration.
- Record action approvals and outcomes without recording secrets.
- Require confirmation for costs, destructive changes, and external routing changes.
- Do not claim a security boundary that has not been implemented and tested.

## 11. Error Handling

Use structured error categories:
- `AUTHENTICATION_FAILED`
- `PERMISSION_DENIED`
- `SOURCE_NOT_ACCESSIBLE`
- `UNSUPPORTED_PLATFORM`
- `MISSING_CONFIGURATION`
- `PROVIDER_VALIDATION_ERROR`
- `DEPLOYMENT_FAILED`
- `LOG_RETRIEVAL_FAILED`
- `HEALTH_CHECK_FAILED`
- `APPROVAL_REQUIRED`
- `APPROVAL_STALE`
- `TIMEOUT`
- `RATE_LIMITED`
- `PROVIDER_UNAVAILABLE`
- `INCONCLUSIVE_RESULT`
- `INTERNAL_ERROR`

Each error should include a safe summary, a redacted provider/CLI detail where available, whether retry is safe, and the next user action if one is needed. Never automatically retry a non-idempotent mutation unless its prior outcome is known or a safe idempotency strategy is available.

## 12. Suggested Minimal Package Layout

```text
src/liara_agent/
  domain/
    models.py
    states.py
    errors.py
  application/
    workflow_service.py
    inspection_service.py
    planning_service.py
    approval_service.py
    execution_service.py
    verification_service.py
  providers/
    liara/
      adapter.py
      cli.py
      api.py
      schemas.py
    source/
      local.py
      github.py
  interfaces/
    cli/
    web/
    http_api/
    mcp/
  security/
    redaction.py
    credentials.py
    path_policy.py
  persistence/
    run_store.py
tests/
```

This is a starting structure, not a requirement to create every file before the first demo. Keep the implementation a modular monolith and only add abstractions that support the confirmed workflow.

## 13. MVP Test Requirements

1. Local project path outside the allowed workspace is rejected.
2. GitHub repository access failure is reported without exposing credentials.
3. Project inspection does not execute repository code.
4. A deployment plan is returned before any mutation.
5. Rejecting approval prevents the corresponding operation.
6. Changing an approved action invalidates its approval.
7. A successful provider deploy with a failing HTTP check is not reported as fully healthy.
8. A provider/CLI error produces a structured, redacted failure.
9. Secrets in fake CLI output/logs are redacted before model input and persistence.
10. A timeout or lost connection produces an inconclusive outcome when success cannot be established.
11. CLI, web/API, and MCP operations share the same core policy and validation.
12. Unsupported provider operations are disabled rather than simulated as successful.

## 14. Phase 4 Completion Checklist

- [x] Define a shared-core architecture for CLI, web, API, and MCP.
- [x] Define workflow states and typed contracts for sources, plans, approvals, results, and verification.
- [x] Define a conservative initial tool set and approval policy.
- [x] Define security, untrusted-input, and redaction requirements.
- [x] Define error categories and MVP tests.
- [ ] Review against the actual repository and installed Matt Pocock skills before implementation.
- [ ] Add this file to the repository as `04-architecture-and-tool-contracts.md`.

## Related documents

- `01-product-scope.md`
- `02-market-and-existing-solutions.md`
- `03-liara-capability-matrix.md`
