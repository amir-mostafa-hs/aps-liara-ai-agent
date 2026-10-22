# 02 — Market and Existing Solutions (Focused Review)

## Purpose and method

This is a deliberately small, product-oriented review of four existing deployment/platform workflows. It is not a full market-sizing or competitor report. The goal is to extract patterns that inform the Liara-focused deployment and SRE agent.

The observations below are based on the linked official product documentation. They describe documented capabilities, not a claim that the products are identical to the proposed agent.

## 1. Vercel MCP

**Official sources**
- Vercel MCP overview: https://vercel.com/docs/agent-resources/vercel-mcp
- Vercel MCP tools: https://vercel.com/docs/agent-resources/vercel-mcp/tools

**Relevant documented pattern**
Vercel provides an official remote MCP server that allows supported AI clients to access Vercel projects and deployments, and analyze deployment logs. Its tools include retrieval of build and runtime logs for investigating failed deployments.

**What we can learn**
- MCP is a practical integration surface for existing coding assistants; the product does not need to own the entire assistant experience.
- Deployment and runtime logs should be accessible through clearly scoped tools.
- Tool names and input/output contracts should map to real platform operations and provide enough context for diagnosis.

**Difference from our MVP**
Our product targets Liara and must provide its own shared operational core and CLI/web UX. Vercel’s implementation does not establish which Liara APIs or MCP capabilities exist; those must be verified separately.

## 2. Railway

**Official sources**
- Services: https://docs.railway.com/services
- Quick start: https://docs.railway.com/quick-start
- CLI deployment and logs: https://docs.railway.com/cli/deployment

**Relevant documented pattern**
Railway documents service deployment from GitHub, a local directory, or a Docker image. It records deployment attempts and metrics, and its CLI supports listing deployments and retrieving logs. Its documentation also describes explicit deployment states such as building, deploying, successful, failed, or crashed.

**What we can learn**
- Supporting both GitHub and local project intake is a familiar and useful workflow.
- Normalize platform states into a stable internal status model rather than exposing inconsistent raw provider responses throughout the application.
- Build and runtime failures should lead to evidence-based troubleshooting, not a generic “deployment failed” message.

**Difference from our MVP**
Railway’s features and command semantics cannot be assumed to exist in Liara. Our Liara capability matrix must verify each required operation before the implementation brief treats it as available.

## 3. Render

**Official source**
- Your First Render Deploy: https://render.com/docs/your-first-deploy

**Relevant documented pattern**
Render documents service creation and deployment through its CLI, including repository and build configuration. The guide also describes official agent skills intended to help coding agents deploy and debug services.

**What we can learn**
- Existing coding agents can be supported through clear skills/instructions and operational tools instead of building a separate coding agent from scratch.
- Deployment configuration should be explicit and inspectable: source repository, build command, publish/output settings, and environment variables.
- A deployment workflow should make it possible to monitor the result and revise configuration when necessary.

**Difference from our MVP**
We are building a Liara-focused operational agent, not a general Render-like PaaS. We should reuse existing coding agents where useful, but keep platform operations in our own verified Liara adapter.

## 4. Coolify

**Official sources**
- Operate applications: https://coolify.io/docs/applications/operations/overview
- CLI deployment: https://coolify.io/docs/cli/deploy-applications
- Environment variables: https://coolify.io/docs/applications/configuration/environment-variables

**Relevant documented pattern**
Coolify separates deployment logs (source checkout, build/image operations and container replacement) from runtime logs (application stdout/stderr). Its CLI documents deployment commands, status inspection, and log retrieval. Its environment-variable documentation also makes clear that bulk-editing configuration can have consequential effects.

**What we can learn**
- Distinguish build/deployment logs from application runtime logs in the agent’s diagnosis flow.
- Make environment-variable changes deliberately; never blindly replace the whole configuration with a partial inferred set.
- Use an inspect → plan → approve → execute → verify workflow for operations that may alter running services.

**Difference from our MVP**
Coolify is a self-hosted platform and its CLI/API contracts do not transfer to Liara. We use it only as a reference for operational UX and safety patterns.

## Cross-product findings

| Finding | Implication for the Liara agent |
|---|---|
| MCP can expose real platform operations to existing assistants | Provide an MCP interface over the same shared core as the CLI and web UI. |
| GitHub, local source, and Docker are established deployment inputs | Keep GitHub and local paths in the MVP; treat Docker as a fallback only when compatible with the detected project and verified Liara support. |
| Deployment status and logs are core operational signals | Define normalized status/log interfaces and verify the corresponding Liara capabilities. |
| Build logs and runtime logs answer different questions | Preserve log source/type and use it when explaining likely causes. |
| Environment and resource changes can have side effects | Show a plan and require approval for sensitive, costly, destructive, or externally visible actions. |
| Agent-assisted deployment is most useful when it can verify outcomes | Do not report success until status and/or endpoint checks provide evidence. |
| Platform-specific behavior differs | Do not copy another provider’s endpoints, commands, states, or assumptions into the Liara adapter. |

## Product implications and recommendation

For the hackathon MVP, prioritize a single reliable Liara end-to-end flow over broad feature parity with these platforms:

1. Inspect a local or GitHub project.
2. Produce a deployment plan with missing information and risks.
3. Execute only operations confirmed by the Liara capability audit.
4. Retrieve deployment status and relevant logs.
5. Explain failures using observed evidence.
6. Request approval before consequential fixes or redeployment.
7. Verify the final outcome and expose the same supported operations through CLI, web, API, and MCP.

Do not implement a full market-analysis workstream, compare pricing in depth, or add features solely because a reference product has them. The next phase is a technical feasibility audit of Liara itself.

## Sources

1. Vercel, “Use Vercel's MCP server”: https://vercel.com/docs/agent-resources/vercel-mcp
2. Vercel, “Tools”: https://vercel.com/docs/agent-resources/vercel-mcp/tools
3. Railway, “Services”: https://docs.railway.com/services
4. Railway, “Quick Start”: https://docs.railway.com/quick-start
5. Railway, “CLI deployment”: https://docs.railway.com/cli/deployment
6. Render, “Your First Render Deploy”: https://render.com/docs/your-first-deploy
7. Coolify, “Operate applications”: https://coolify.io/docs/applications/operations/overview
8. Coolify, “Deploy Applications”: https://coolify.io/docs/cli/deploy-applications
9. Coolify, “Environment Variables”: https://coolify.io/docs/applications/configuration/environment-variables

## Phase 2 completion checklist

- [x] Review a limited set of relevant official product references.
- [x] Extract implementation patterns relevant to the MVP.
- [x] Record the differences and avoid assuming another provider's capabilities transfer to Liara.
- [x] Recommend product implications for the next phase.
- [ ] Add this document to the project repository as `02-market-and-existing-solutions.md`.
