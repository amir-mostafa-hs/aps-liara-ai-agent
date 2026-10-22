# 01 — Product Scope and MVP Requirements

## 1. Purpose

Build an AI agent that helps users deploy, operate, and troubleshoot applications on Liara. The agent should inspect a project, prepare a deployment plan, perform approved operations through supported Liara interfaces, verify the outcome, and assist with diagnosing deployment/runtime failures.

The MVP is intended for a hackathon demonstration and should prove one reliable end-to-end scenario rather than attempt to implement every possible SRE capability.

## 2. Problem Statement

Deploying an application to a cloud platform can require users to understand the project’s framework, configure deployment settings, provision dependent resources, interpret logs, and repair failed deployments. This can be difficult for users who do not have a dedicated DevOps/SRE engineer.

The agent should reduce this operational burden while keeping the user informed and in control of consequential actions.

## 3. Target Users

1. **Developers without a dedicated DevOps/SRE engineer** who want help deploying and troubleshooting a project on Liara.
2. **Developers using coding agents** such as Codex or Antigravity who want an operational agent that can perform Liara-focused deployment and SRE tasks.
3. **Users who do not use a coding agent** and need the product’s CLI or web interface to guide them through the workflow.

## 4. Product Goal

Demonstrate a complete, auditable workflow:

1. Receive a source project.
2. Inspect the project and identify its likely runtime/platform, build and start requirements, environment-variable needs, and possible dependent services.
3. Produce a deployment plan and identify actions that require user input or approval.
4. Execute supported operations against real Liara infrastructure using verified API/CLI capabilities.
5. Observe deployment status and inspect available logs or errors.
6. Explain the result and, when possible, propose or apply a safe correction.
7. Redeploy and verify the result after required approvals.

The agent must distinguish facts it has verified from assumptions and must not claim a deployment succeeded without checking the actual result.

## 5. Confirmed Product Decisions

The following decisions have been established during project discovery:

- **Target platform:** Liara; the MVP must use real Liara infrastructure, not a simulated-only deployment.
- **Implementation language:** Python.
- **Agent framework:** LangChain.
- **Interfaces:** CLI and web interface from the beginning.
- **Integration interfaces:** API and MCP, backed by a shared core so that the deployment logic is not duplicated across interfaces.
- **Source intake, MVP:** GitHub repository accessed using a token or limited permissions, and a local project path provided through the CLI.
- **Later source intake:** ZIP upload is deferred beyond the initial MVP.
- **Project coverage:** Aim for broad project support through project detection and an appropriate deployment strategy. Use Docker as a fallback where the target project and Liara support it.
- **Coding-agent integration:** Support workflows involving existing coding agents such as Codex and Antigravity. Do not build a separate general-purpose coding agent from scratch.
- **Human-in-the-loop:** The user must be able to review the proposed plan. Sensitive, destructive, costly, or externally visible actions require explicit approval before execution.
- **Time constraint:** The implementation plan must be realistic for a two-day MVP build.
- **Documentation workflow:** Each discovery phase produces a separate Markdown file that can be added to the project repository. This document is the output of phase 1.

## 6. Primary MVP User Journey

### Step 1 — Provide a project

The user selects either:
- a GitHub repository with explicitly configured, limited access; or
- a local project directory using the CLI.

The agent must validate the selected source and report if it cannot access the project.

### Step 2 — Inspect and prepare

The agent inspects the project files and produces a concise summary, including:
- detected language/framework and confidence;
- relevant build and start commands when discoverable;
- deployment configuration already present;
- required environment variables that can be identified from configuration or code, without exposing secret values;
- likely dependent resources, such as a database, if detectable;
- missing information and unresolved assumptions.

The agent must not invent missing configuration. It should ask the user when a required decision cannot be determined safely.

### Step 3 — Produce a deployment plan

Before making consequential changes, show the proposed actions, resources, expected costs if reliably available, and any risks or missing inputs. The user can approve, reject, or revise the plan.

### Step 4 — Execute on Liara

Use only Liara API or CLI operations whose behavior and prerequisites have been verified during the technical feasibility phase. Keep an execution record sufficient to explain what was attempted and what happened.

### Step 5 — Verify deployment

Check the actual deployment state and, where applicable, the resulting application endpoint or health response. Report success only when supported by observable evidence. If verification is inconclusive, report that clearly.

### Step 6 — Diagnose and recover

If deployment or runtime checks fail:
- inspect available status information and logs;
- summarize the likely cause and supporting evidence;
- recommend a correction;
- request approval before source changes, configuration changes, resource creation, restarts, or redeployments when the action is consequential;
- retry and verify after approval.

Where a source-code change is needed, the agent may coordinate with an existing coding agent or provide a patch/instructions. Building a new autonomous coding subsystem is out of scope.

## 7. MVP Scope

### In scope

- CLI workflow for a local project.
- GitHub repository intake with explicit, limited access.
- Project inspection and platform/runtime detection.
- A deployment plan with assumptions and unresolved requirements.
- Real Liara integration through verified API and/or CLI capabilities.
- Deployment status and log retrieval, where supported by verified interfaces.
- User approval for sensitive or consequential operations.
- Basic troubleshooting based on observed errors/logs.
- A controlled correction-and-redeploy loop.
- Web interface for starting a deployment workflow, reviewing the plan, approving or rejecting actions, and viewing status/results.
- API and MCP interfaces over a shared operational core.
- Secure handling of Liara credentials and project secrets.
- Documentation and tests for the demonstrated workflow.

### Explicitly deferred or out of scope for the initial MVP

- ZIP upload as a source-input method.
- A general-purpose coding agent built from scratch.
- Fully autonomous execution of destructive, costly, or externally visible actions without approval.
- Guaranteed automatic support for every language/framework and every Liara product.
- Full production-grade multi-tenant SaaS, organization/role management, billing, and enterprise policy controls.
- Comprehensive long-running monitoring, alerting, incident management, and on-call scheduling.
- Automatic creation or modification of every possible dependent resource without user confirmation.
- Unsupported or undocumented Liara API operations.
- Claiming that any deployment strategy works before validating it against Liara’s actual capabilities.

These boundaries may be revisited only through an explicit scope decision; they should not be silently expanded during implementation.

## 8. Human Approval and Safety Rules

The agent must separate **inspection/planning** from **execution**.

Approval is required before, at minimum:
- creating billable resources or selecting a potentially billable configuration;
- deleting resources or data;
- changing production environment variables or secrets;
- changing DNS or other externally visible routing;
- restarting or redeploying a production service where disruption is possible;
- applying source-code changes or configuration changes that have not been reviewed;
- any action whose impact, cost, or reversibility is unclear.

The interface should show the action, target resource, reason, expected impact, and whether the action may incur cost. A rejected action must not be executed. Secrets must be redacted from user-facing logs and stored documentation.

## 9. Acceptance Criteria for the MVP

The MVP is acceptable when the team can demonstrate all of the following on a test project and real Liara account:

1. The user can provide a supported GitHub repository or a local project path.
2. The agent inspects the project and reports the detected platform plus any uncertainty.
3. The agent creates a deployment plan before executing consequential operations.
4. The user can approve or reject the plan/action; rejection prevents execution.
5. The agent performs a real deployment using an interface verified in the Liara feasibility document.
6. The agent checks deployment status and reports evidence for success or failure.
7. When a failure is available to inspect, the agent retrieves relevant logs/status, explains a plausible cause with supporting evidence, and proposes a recovery action.
8. The agent does not apply a consequential fix or redeploy without the required approval.
9. The user can view the workflow through the CLI and the web interface; API and MCP expose the shared core’s supported operations.
10. The demo makes it clear what the agent did, what the user approved, and how the outcome was verified.
11. Credentials and secrets are not committed to the repository or printed in plaintext logs.
12. Unsupported Liara operations are reported as unsupported rather than simulated or falsely claimed as successful.

## 10. Initial Demo Scenario

Use a small test application in a repository controlled by the project team.

1. Connect the test repository or select its local directory.
2. Ask the agent to deploy it to Liara.
3. Review the detected project details and deployment plan.
4. Approve the necessary operations.
5. Observe the real deployment and verification result.
6. If feasible within the available time, introduce or use a controlled deployment failure, inspect the logs, approve a correction, and verify the redeployment.

The exact framework, resources, API endpoints, and recovery mechanism must be selected only after the Liara capability matrix is complete and the team confirms access to the required test project.

## 11. Assumptions and Open Questions

These points must be resolved during the subsequent technical feasibility and architecture phases rather than guessed here:

- Which Liara API endpoints and CLI commands are currently available for app creation, deployment, status, logs, environment variables, dependent resources, and DNS?
- Which actions can be performed through the API, which require the CLI, and which need a user-driven/manual step?
- What authentication scopes and token handling practices are supported by Liara?
- Which deployment platform will be used for the first reliable end-to-end demo?
- How will the web UI and MCP interface be exposed and authenticated in the two-day MVP?
- Which source modifications can be safely delegated to existing coding agents, and how will changes be reviewed?
- What cost information can be retrieved reliably before creating resources?

## 12. Phase 1 Completion Checklist

- [x] Record the product problem and target users.
- [x] Record confirmed stack and interface decisions.
- [x] Define the primary end-to-end user journey.
- [x] Separate MVP scope from deferred features.
- [x] Define human-approval and secret-handling expectations.
- [x] Define acceptance criteria and an initial demo scenario.
- [ ] Review repository-specific instructions and align this document with the existing project structure.
- [ ] Add this file to the project repository as `01-product-scope.md`.

The last two items depend on reviewing the user’s repository. They do not change the product decisions already recorded above.
