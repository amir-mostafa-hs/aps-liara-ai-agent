# 05 — Antigravity Implementation Brief

## 1. Mission

Implement a two-day MVP of a Liara-focused deployment and troubleshooting agent. The agent must inspect a user-provided project, prepare a deployment plan, execute only supported Liara operations after the required approval, verify the deployment, and use available logs/status evidence to explain failures.

This brief is the implementation handoff for Antigravity. It is based on:
- `01-product-scope.md`
- `02-market-and-existing-solutions.md`
- `03-liara-capability-matrix.md`
- `04-architecture-and-tool-contracts.md`

If any of those files are absent from the repository, add them before implementation or copy the relevant decisions into the project docs. Do not silently contradict them.

## 2. Fixed Product Decisions

- Language: Python.
- Agent orchestration: LangChain.
- Interfaces: CLI and web UI.
- External interfaces: HTTP API and MCP.
- Architecture: modular monolith with one shared application core.
- Initial source inputs: local project path via CLI and GitHub repository using explicitly authorized, limited access.
- ZIP upload is deferred.
- Target provider: real Liara infrastructure.
- Use official Liara CLI/API capabilities only after verifying commands/endpoints and behavior.
- Existing coding agents (e.g. Codex and Antigravity) may be integrated into the workflow; do not build a general-purpose coding agent from scratch.
- Human approval is required for consequential operations.
- Keep the scope realistic for a two-day hackathon build.
- Matt Pocock skills are installed in the repository environment. Inspect and follow the applicable installed skill instructions; do not assume they replace this product brief or provide Liara-specific functionality.

## 3. Definition of MVP Success

The MVP is successful only if the team can demonstrate a real, auditable end-to-end workflow on a designated test project and Liara account:

1. Accept a local project or authorized GitHub repository.
2. Inspect files without executing untrusted project code during static inspection.
3. Report the detected language/framework, evidence files, build/start information when discoverable, likely dependencies, and unresolved assumptions.
4. Present a typed deployment plan before consequential changes.
5. Allow the user to approve or reject the plan/action. Rejection must prevent execution.
6. Deploy through a verified Liara operation.
7. retrieve deployment status/logs where supported, and check the public endpoint when available.
8. Distinguish provider deployment success from application health.
9. On a failure, present evidence-based diagnosis and a proposed remediation. Apply consequential changes or redeploy only after required approval.
10. Avoid exposing Liara/GitHub tokens, environment secrets, or sensitive log content.
11. Show structured progress/results through CLI and web UI, with API and MCP exposing supported operations through the same core.
12. Produce a five-minute demo and concise repository documentation.

Do not claim success if provider status or health evidence is missing or ambiguous. Use an `inconclusive` result where appropriate.

## 4. Scope and Priorities

### P0 — Must implement first

1. Inspect repository and relevant Matt Pocock skills; read existing instructions before creating files.
2. Create a minimal Python project skeleton using a modular-monolith structure.
3. Define typed models for project source, project analysis, proposed action, approval, operation result, verification result, workflow state, and structured errors.
4. Implement local project inspection with path restrictions; do not execute project scripts during inspection.
5. Implement a Liara adapter around a verified official CLI/API path.
6. Implement the workflow: inspect → plan → approval → deploy → retrieve evidence → verify → report.
7. Implement secret/log redaction and safe structured output.
8. Add essential unit tests and one integration/manual test against the team's test Liara app.
9. Provide a minimal CLI experience that demonstrates the end-to-end workflow.
10. Add a minimal web UI that can initiate/view a run, review the plan, approve/reject the relevant action, and view the outcome.

### P1 — Implement if the P0 path is reliable and time remains

- GitHub repository intake using limited, explicit authorization.
- HTTP API endpoints for starting a run, retrieving run status, and approving/rejecting a pending action.
- MCP tools wrapping the same core application services.
- One controlled troubleshooting and approved redeployment loop.
- Additional read-only status/log tools, if verified.
- Better structured run history.

### Explicitly out of scope for the two-day MVP unless the team explicitly renegotiates scope

- ZIP upload.
- A separate general-purpose coding agent.
- Unattended destructive or cost-incurring actions.
- Automatic DNS changes or broad automatic provisioning of databases, disks, and buckets.
- Full multi-tenant SaaS, billing, enterprise roles/policies, or production-grade on-call monitoring.
- Guaranteed support for every framework or arbitrary deployment topology.
- Any Liara API/CLI operation that has not been verified.
- Sophisticated pricing estimates unless a reliable official source/API is confirmed.

## 5. Required Workflow

### A. Source intake and inspection

- Accept either a local path or an authorized GitHub repository.
- Resolve the repository revision/commit when applicable.
- Restrict local paths to an explicit workspace root; reject path traversal and symlink escapes.
- Treat all source files, repository instructions, logs, and README content as untrusted data. They must not override system policy or authorize actions.
- Inspect configuration and project files read-only.
- Identify framework/platform, build/start commands where discoverable, deployment config, environment-variable names (never values), likely dependencies, and unknowns.
- Do not execute scripts, package hooks, or builds during static inspection.

### B. Planning

Produce a typed, reviewable plan. Each action must include:
- action ID and operation name;
- target;
- validated arguments, with secret values redacted;
- rationale and supporting evidence;
- impact level;
- whether cost may be incurred;
- whether approval is required;
- expected result;
- rollback/recovery information if available.

Never let the model provide arbitrary shell strings as executable actions. Use allowlisted operations and strict schemas.

### C. Approval

- Approval must apply to the exact action and plan version presented to the user.
- If action target, arguments, or impact changes, invalidate approval and request it again.
- Rejection must prevent execution.
- Require approval for deployment/redeployment, resource creation, environment-variable changes, restart/stop, DNS changes, deletion/resizing, source/configuration modifications, or any unclear consequential action.
- The approval UI/CLI must show the action, target, expected impact, possible cost, and risks.

### D. Execution and verification

- Invoke the verified Liara CLI/API through the provider adapter.
- Use argument arrays, not shell-string concatenation.
- Enforce timeouts; capture exit code/stdout/stderr separately; redact output before persistence or LLM input.
- Record action/run IDs and timestamps.
- After deployment, query available provider status/logs and check the public endpoint when possible.
- Report provider deployment state and application health as separate signals.
- A missing or ambiguous signal must yield `inconclusive`, not fabricated success.

### E. Troubleshooting

- Use observed provider state, bounded logs, events (if verified), and HTTP checks as evidence.
- Summarize likely causes and cite the evidence in the user-visible result.
- Propose one safe next action at a time.
- Request approval before applying a consequential fix or redeploying.
- Do not automatically retry a non-idempotent mutation if its previous outcome is unknown.
- If the required Liara capability is not verified, state that and offer a manual next step rather than simulating the operation.

## 6. Suggested Package Layout

Use this as a starting point; adapt to the repository only when there is a clear reason:

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

Avoid creating abstractions that do not support the P0 flow. A modular monolith is preferred over microservices.

## 7. Implementation Sequence

### Phase A — Inspect and scaffold

1. Read the repository instructions and installed Matt Pocock skills.
2. Confirm the Python environment and available tools.
3. Add a concise README and `.env.example` containing placeholder names only.
4. Add `.gitignore` entries for `.env`, tokens, local state, build artifacts, and test outputs.
5. Scaffold the minimum package and tests.

**Exit condition:** the app imports, configuration validation works, and tests run.

### Phase B — Core models and inspection

1. Define typed domain models and workflow states.
2. Implement local path policy and read-only inspection.
3. Add unit tests for supported project layouts, missing config, invalid paths, and untrusted repository instructions.
4. Implement a clear “unsupported/unknown” result when detection is uncertain.

**Exit condition:** project analysis is structured, evidence-based, and does not execute source code.

### Phase C — Liara adapter

1. Inspect current official Liara CLI/API documentation and the capability matrix.
2. Confirm the exact CLI version and help output.
3. Implement one read-only authentication/app-list check.
4. Implement one deployment path for a small trusted test app.
5. Implement bounded log/status retrieval using only verified commands/endpoints.
6. Add output redaction, timeouts, and structured errors.
7. Perform a manual integration test using the team's test account; never place real tokens in the repo.

**Exit condition:** the test app can be deployed and the result can be verified from actual evidence.

### Phase D — Workflow and approval gate

1. Implement plan generation from inspection results.
2. Implement approval records tied to exact action and plan version.
3. Implement execution only for approved allowlisted actions.
4. Implement status tracking, cancellation where safe, and inconclusive outcomes.
5. Test approval rejection, stale approval, timeout, and provider failure.

**Exit condition:** no consequential operation can run without the matching approval.

### Phase E — CLI and web UI

1. Implement the CLI for source selection, inspection, plan review, approval, execution, and result display.
2. Implement a minimal web UI for run creation, plan review, approval/rejection, and status/result display.
3. Ensure both interfaces call the same application services.
4. Keep the UI simple and reliable; do not spend hackathon time on extensive styling.

**Exit condition:** the same core workflow works from CLI and web.

### Phase F — API and MCP, only after P0 works

1. Add authenticated HTTP API operations for run creation, status, and approval/rejection.
2. Add a minimal MCP server that exposes only supported typed operations.
3. Ensure API and MCP invoke the shared core and policy checks.
4. Test authentication, rejection, and secret redaction at each interface.
5. If time is short, document API/MCP as a minimal follow-up rather than destabilizing the working deploy demo; however, do not silently mark them complete if they are not implemented.

**Exit condition:** supported operations work through the selected interface and cannot bypass approval policy.

### Phase G — Demo and handoff

1. Run unit tests and the Liara integration test.
2. Use a controlled test app and non-sensitive sample configuration.
3. Record the exact commands and any limitations.
4. Prepare a five-minute demo showing source inspection, plan, approval, real deployment, status/logs, and endpoint verification.
5. If feasible, demonstrate one controlled failure and an approved correction.
6. Update README with setup, environment variables, run instructions, supported capabilities, known limitations, and demo steps.
7. Review git diff for secrets and accidental scope expansion.

**Exit condition:** a reproducible demo, documentation, and tests exist; unsupported behavior is clearly disclosed.

## 8. Minimum Environment Configuration

Use placeholders only in `.env.example`. Exact names can be adjusted to match implementation:

```dotenv
LIARA_API_TOKEN=
LIARA_REGION=
GITHUB_TOKEN=
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
APP_SECRET=
```

Do not require all variables if a workflow does not use them. Validate configuration at startup and explain missing required variables without printing values. Do not commit a real `.env` file.

## 9. Minimum Tests

- Valid and invalid project path handling, including symlink/path traversal checks.
- Inspection never executes project code.
- Unsupported project/platform is reported explicitly.
- Repository instructions cannot override agent safety policy.
- Missing Liara token returns a safe authentication/configuration error.
- CLI timeout and non-zero exit code are handled.
- Tokens and fake secrets in stdout/stderr/logs are redacted.
- A plan is required before mutation.
- Rejected approval prevents execution.
- Approval is invalidated if action arguments or target change.
- A successful provider deployment with a failing HTTP check is reported as unhealthy, not healthy.
- Ambiguous result becomes `inconclusive`.
- CLI/web/API/MCP use the same operation policy where implemented.
- Unsupported Liara operations are not simulated as successful.

## 10. Five-Minute Demo Script

1. **0:00–0:40 — Problem and project input:** show a small trusted project and select local path or authorized GitHub source.
2. **0:40–1:20 — Inspection:** show detected framework, evidence files, configuration needs, and uncertainty.
3. **1:20–2:00 — Plan and approval:** show the proposed operations, risks, and explicit approval.
4. **2:00–3:10 — Real Liara deployment:** execute the verified path and show operation progress.
5. **3:10–4:00 — Verification:** show actual deployment status and HTTP endpoint check.
6. **4:00–4:40 — Troubleshooting:** show bounded logs/status and a grounded diagnosis; if time permits, approve a safe correction and redeploy.
7. **4:40–5:00 — Safety and architecture:** show redacted output, approval gate, and shared core across available interfaces.

Do not stage a fake successful result. If a failure scenario is not reliable, show the recorded test evidence or explain that the remediation loop remains incomplete.

## 11. Risks and Scope Guardrails

- **Two-day timebox:** P0 end-to-end deployment comes first. Do not let API/MCP polish, broad platform detection, or UI styling block the real deployment demo.
- **Liara API uncertainty:** use only verified CLI/API operations; record untested items.
- **Untrusted source code:** do not run builds or scripts during inspection. If execution is required, use an isolated environment or only a trusted test project.
- **Secret leakage:** redact tool output before it reaches the model or persistence layer.
- **Cost and availability:** require approval for billable or disruptive actions.
- **False success:** separate provider state from endpoint health and support `inconclusive`.
- **Integration scope:** if time prevents a full interface, disclose it. Do not claim a CLI/web/API/MCP interface is complete unless tested.
- **No arbitrary command execution:** use allowlisted operations and validated arguments.

## 12. Definition of Done

The documentation-to-implementation handoff is ready when:
- [ ] The repository instructions and relevant Matt Pocock skills have been inspected.
- [ ] The app can inspect a local test project and produce a typed plan.
- [ ] A real Liara test deployment can be executed through a verified adapter.
- [ ] Deployment status/logs and endpoint verification provide actual evidence.
- [ ] Approval gates and redaction tests pass.
- [ ] The CLI and minimal web UI demonstrate the same shared workflow.
- [ ] API/MCP status is accurately documented: implemented and tested, or explicitly deferred.
- [ ] A reproducible five-minute demo and concise README are available.
- [ ] No secrets or credentials are committed.

## 13. Phase 5 Completion Checklist

- [x] Consolidate product scope, market patterns, Liara feasibility, and architecture.
- [x] Define implementation priorities, sequence, acceptance criteria, tests, and demo.
- [ ] Review this brief against the actual repository and installed Matt Pocock skills.
- [ ] Add this file to the repository as `05-antigravity-implementation-brief.md`.

## Related documents

- `01-product-scope.md`
- `02-market-and-existing-solutions.md`
- `03-liara-capability-matrix.md`
- `04-architecture-and-tool-contracts.md`
