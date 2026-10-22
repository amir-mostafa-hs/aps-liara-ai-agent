# Liara Agent Hackathon --- Short Documentation Plan

## Goal

Prepare only the essential technical documentation needed to implement
the Liara Agent MVP with Antigravity. Keep research narrow,
evidence-based, and time-boxed. After each completed section, create a
separate Markdown file that can be added to the project repository.

## Confirmed product decisions

-   Runtime and implementation language: Python.
-   Agent framework: LangChain.
-   Interfaces: CLI and web UI are both in the MVP scope.
-   Integrations: one shared core exposed through an API and an MCP
    server.
-   Project input in the first phase: local project path through CLI and
    GitHub repository access using a token or limited repository access.
-   ZIP upload: defer until after the first MVP path is working.
-   Project support: detect common project types and use Docker for
    supported custom projects where feasible.
-   Deployment target: real Liara infrastructure, not a simulated-only
    demo.
-   Required product flow: inspect source → identify platform and
    requirements → propose configuration/resources → request approval
    for sensitive/cost-incurring actions → deploy → verify → inspect
    logs on failure → recommend or apply permitted fixes → redeploy and
    verify.
-   Time budget: two days.
-   Coding workflow: use Antigravity/Codex and the already-installed
    Matt Pocock skills.
-   The user has a Liara account, can create an API token, and has a
    test project.

## Short work plan

### Section 1 --- Repository and skill readiness

**Status: Pending actual repository access**

Inspect only: - repository structure, README, current instructions and
existing docs - current branch and uncommitted changes - installed Matt
Pocock skills and whether the repository setup skill has actually run -
existing Python/dependency/test configuration

**Output:** `01-repository-readiness.md`

Do not modify application code during this inspection.

### Section 2 --- Focused market and open-source scan

**Status: Pending**

Time-box the scan. Review at most 3--5 directly relevant examples,
prioritizing: - deployment platforms or agents that turn a repository
into a deployed service - AI/SRE troubleshooting agents that inspect
logs and verify recovery - MCP/API patterns that let external coding
agents call deployment tools

For each example, record only: - what it does - relevant workflow or
architecture - reusable idea - limitation or mismatch with this
challenge - source URL

Avoid broad market research and do not copy a product's architecture
without evidence.

**Output:** `02-competitive-scan.md`

### Section 3 --- Liara capability verification

**Status: Initial documentation links identified; endpoint verification
pending**

Use official Liara API/OpenAPI and CLI documentation to create a small
capability matrix for only the MVP operations: - authentication and
account/project discovery - app creation and platform/plan
configuration - deploy and deployment status - logs and service
health/resource data, where available - environment variables -
databases or other dependent resources - restart/scale and DNS only if
required by the chosen demo

For every capability, record the verified API/CLI operation, required
inputs, whether it is safe to automate, approval requirements, and any
limitation. If an operation cannot be verified, mark it **unverified**
rather than assuming it exists.

**Output:** `03-liara-capability-matrix.md`

### Section 4 --- MVP architecture and operational decisions

**Status: Pending**

Decide only what Antigravity needs to implement: - shared Python core -
LangChain agent/tool orchestration - API boundary - MCP server boundary
and transport for local development/demo - CLI and minimal web UI -
project detector/configuration strategy - deployment state machine and
verification steps - approval policy for
cost-incurring/destructive/high-impact actions - secret handling,
command execution boundaries, and audit/error reporting

Keep the architecture small enough to implement and demonstrate in two
days. Do not build an independent coding agent; expose tools so external
coding agents can use them.

**Output:** `04-mvp-architecture.md`

### Section 5 --- Antigravity implementation brief

**Status: Pending**

Create one implementation-ready brief containing: - product goal and
non-goals - selected demo scenario using the user's test project -
architecture and module boundaries - tool/API/MCP contracts - acceptance
criteria and test cases - environment variables and local setup
requirements (names only; never include secret values) - implementation
order and definition of done - explicit constraints: do not invent Liara
capabilities, do not overwrite existing environment variables blindly,
request approval before sensitive/cost-incurring actions, and verify
deployment rather than trusting model-generated claims

**Output:** `05-antigravity-implementation-brief.md`

After this document is ready, implementation begins. ZIP upload and
broader project coverage remain post-MVP.

## Definition of documentation-ready

The documentation phase is complete when: 1. The repository and
installed skill workflow have been inspected. 2. The focused scan covers
no more than 3--5 relevant examples and includes source links. 3. MVP
Liara operations are marked verified, unavailable, or unverified based
on evidence. 4. Architecture and safety decisions are explicit. 5.
Antigravity has one actionable implementation brief with testable
acceptance criteria.

## Current status

### Completed

-   Reviewed the challenge introduction and task brief.
-   Clarified product scope and confirmed the two-day constraint.
-   Agreed on Python + LangChain, CLI + web UI, shared core + API + MCP.
-   Agreed on local CLI and GitHub token/limited-access input for the
    first phase; ZIP is deferred.
-   Identified official Liara documentation and OpenAPI as the primary
    technical sources.

### Remaining

1.  Obtain the project repository URL or inspectable project files.
2.  Complete Section 1 and deliver `01-repository-readiness.md`.
3.  Complete Section 2 and deliver `02-competitive-scan.md`.
4.  Complete Section 3 and deliver `03-liara-capability-matrix.md`.
5.  Complete Section 4 and deliver `04-mvp-architecture.md`.
6.  Complete Section 5 and deliver
    `05-antigravity-implementation-brief.md`.

## Working rule

At the end of every project-related response, include the current TODO
list with completed and remaining items. After each section is finished,
provide its Markdown file for the user to add to the repository. Do not
claim repository inspection or endpoint verification until it has
actually been performed.
