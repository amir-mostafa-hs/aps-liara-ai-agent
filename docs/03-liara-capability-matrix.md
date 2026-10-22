# 03 — Liara Capability Matrix and Technical Feasibility

## 1. Purpose

This document records the first-pass technical feasibility review of Liara's official API specifications and CLI documentation. It distinguishes:

- **Documented:** an official API specification or CLI reference explicitly lists the operation.
- **Needs live validation:** the operation is documented, but its exact behavior, required permissions, response shape, region behavior, or end-to-end suitability must be tested with the project team's Liara account.
- **Not established:** the reviewed evidence does not yet prove that the required behavior is available in a reliable form.

This is a documentation audit, not a claim that live API calls have been tested. No Liara credentials were used during this review.

## 2. Official References

1. Official OpenAPI repository: https://github.com/liara-cloud/openapi
2. PaaS OpenAPI specification: https://github.com/liara-cloud/openapi/blob/main/spec/paas.yaml
3. DBaaS OpenAPI specification: https://github.com/liara-cloud/openapi/blob/main/spec/dbaas.yaml
4. DNS OpenAPI specification: https://github.com/liara-cloud/openapi/blob/main/spec/dns.yaml
5. Official Liara CLI reference: https://github.com/liara-cloud/cli
6. API overview and authentication: https://github.com/liara-cloud/openapi/blob/main/index.mdx
7. Liara documentation portal: https://docs.liara.ir

The OpenAPI repository identifies specifications for PaaS, DBaaS, Object Storage, DNS, Mail, File Browser, and IaaS. The API overview documents JWT Bearer authentication. The official CLI README lists commands for app creation/listing, deployment, logs, environment variables, databases, disks, buckets, domains/zones, and more.

## 3. Capability Matrix

| Capability | Evidence found in official docs | Initial status | MVP decision / required validation |
|---|---|---|---|
| Authenticate with Liara | API overview documents `Authorization: Bearer YOUR_API_TOKEN`; CLI commands accept `--api-token` | Documented | Use a secret manager/environment injection; never log token values. Validate token permissions and region/account selection. |
| List existing apps | CLI `liara app list` / `liara app ls`; supports machine-readable output such as JSON/YAML | Documented | Include as a safe read-only discovery operation. Validate actual JSON schema and team/account behavior. |
| Create an app | CLI README lists `liara app create` and `liara create` | Documented at CLI level | Validate required flags, platform choices, region and billing implications. Require approval before creation. |
| Deploy local source | CLI `liara deploy` supports a local path, platform, app ID, port, Dockerfile/image and `liara.json` options | Documented at CLI level | Likely best MVP deployment path. Test one selected framework and Docker fallback with the team's account. |
| GitHub repository intake | User's product requirement is GitHub repository intake; the reviewed CLI deployment reference primarily documents local path/image/config flags | Not established as a direct CLI source-deploy feature by this audit | The agent can clone an authorized repository locally, inspect it, then use the local deploy path, subject to security controls. Validate private repo access and safe checkout behavior. |
| Deploy status / release state | CLI docs list deployment operations; exact status-query flow and stable machine-readable schema were not fully confirmed in this audit | Needs live validation | Test whether a deployment can be polled/retrieved without relying on terminal output parsing. Define timeout and inconclusive states. |
| Retrieve app logs | CLI `liara app logs` / `liara logs`; supports timestamps, follow, time window, release selector and last-lines options. PaaS OpenAPI lists `GET /v1/projects/{name}/logs` with `since` query parameter | Documented | Use bounded log retrieval by default. Test log format, pagination/limits, timestamps and whether build logs are separately available. |
| Retrieve app events | PaaS OpenAPI lists `GET /v1/projects/{name}/events` | Documented in OpenAPI | Evaluate as a source of deployment lifecycle evidence; verify schema and availability. |
| Restart / start / stop app | CLI lists `liara app restart`, `start`, and `stop` | Documented at CLI level | Require explicit approval because of possible service disruption. Test behavior on a non-production app. |
| Set/list/unset environment variables | CLI lists `liara env list`, `env set`, and `env unset`; `set` supports `key=value` and a force flag | Documented at CLI level | MVP may list and set only after validation. Never print values; do not replace all variables from partial inference. Require approval for changes and deletion. |
| Create/list/resize database | DBaaS OpenAPI includes `GET /v1/databases`, `POST /v1/databases`, database detail/delete, scale, resize and backup endpoints | Documented in OpenAPI | Resource creation, resizing, and deletion can affect cost/data; defer broad automation. For MVP, detect database needs and ask for user decisions; only create if tested and explicitly approved. |
| Create/manage disks | CLI lists `liara disk create`; PaaS OpenAPI includes disk create/list/resize/delete operations | Documented | Defer unless the selected demo requires it. Require approval and test persistence semantics. |
| DNS zones and records | OpenAPI repository includes DNS specification; CLI lists zone and zone-record create/list/get/update/remove commands | Documented at service/CLI level | Do not change DNS in the initial happy path. Treat public routing changes as sensitive; validate exact parameters and domain ownership checks. |
| Object storage / buckets | OpenAPI repository includes Object Storage; CLI lists bucket create/list/delete commands | Documented at service/CLI level | Out of the first demo unless the selected project needs it. Require approval for creation/deletion and validate costs/permissions. |
| App platform detection / `liara.json` | CLI deploy accepts `--platform` and a `--liara-json` configuration path | Partially documented | Build local detection from project files, but do not assume every detected framework is supported. Inspect official `liara.json` schema and supported platforms before finalizing the detector. |
| Health check / verify public endpoint | Not confirmed as a universal Liara-specific health-check API in the reviewed material | Needs design and live validation | For MVP, use the deployed URL (when available) and an HTTP request plus app status/log evidence. Distinguish provider deployment success from application health. |
| Pricing / estimate before resource creation | No reliable pricing lookup flow was established by this audit | Not established | Do not invent estimates. Show that an operation may incur cost and ask the user to check/confirm the selected plan when exact pricing cannot be retrieved. |
| MCP integration | MCP is part of the product architecture; Liara CLI/API provide operations that can be wrapped | Product implementation decision, not a Liara capability | Implement MCP over the shared core, not as a second implementation of provider logic. Validate MCP SDK and transport separately in the architecture phase. |

## 4. API and CLI Integration Strategy

### Recommended approach for the two-day MVP

Use a **Liara adapter** behind a shared core. Prefer the official CLI for the first end-to-end deployment where it is the most reliable documented path, and use direct API calls for operations whose endpoints and schemas have been verified. Avoid duplicating business logic in the web/API/MCP layers.

The adapter should return normalized results instead of exposing raw provider responses to every caller. At minimum, normalize:
- operation name and target resource;
- whether the operation is read-only or mutating;
- success/failure/inconclusive outcome;
- provider status or exit code;
- redacted output and relevant logs;
- timestamps and a correlation/run ID;
- retryability and user-action-needed flags.

Do not make the LLM responsible for constructing arbitrary shell commands or unrestricted API requests. Use allowlisted operations with validated parameters.

### API base URL and region caution

The official OpenAPI overview lists service-specific base URLs, while the DBaaS specification shows a region-specific host (`https://api.iran.liara.ir`). Do not hardcode one host as universal for all services or regions. Confirm the correct API base URL for the selected service and region during live validation.

### CLI process execution caution

If using the CLI from Python:
- invoke it with an argument array rather than shell-string concatenation;
- set a strict timeout and capture exit code/stdout/stderr separately;
- redact token values and secret-bearing output;
- validate the executable and supported flags at startup;
- do not treat exit code zero alone as proof that the deployed application is healthy;
- require approval before executing mutating commands.

## 5. Required Live Validation Checklist

Run these tests only with the team's designated test app/account. Do not run destructive commands against production.

1. Confirm the CLI version and the exact supported commands using `liara --version` and command help.
2. Verify token authentication with a read-only app-list operation.
3. Confirm the correct account/team/region selection.
4. Deploy a minimal, non-sensitive test application from a local directory.
5. Capture the deploy command's exit status and output without leaking credentials.
6. Determine how to retrieve deployment/release status in a machine-readable or reliably parseable way.
7. Retrieve logs with a bounded time window and timestamps.
8. Confirm whether build/deployment logs and runtime logs are distinct and how each is retrieved.
9. Make an approved, harmless environment-variable change on the test app; verify its behavior and rollback path. Do not use real secrets in the test.
10. Verify a restart only on the test app and record expected downtime/behavior.
11. Check whether the app exposes a stable public URL and test HTTP health verification.
12. If time permits, test one failed deployment and determine whether logs/events identify a useful root cause.
13. Record all exact commands, inputs, outputs, errors, and version information in a private test note; never include tokens or secret values.

If a test cannot be completed, mark the capability as “not validated” rather than assuming success.

## 6. MVP Implementation Priority Based on This Audit

### Priority 0 — Required for the demo
- Read-only authentication check and app listing.
- Local project inspection and deploy plan.
- Deploy a single known-supported test project through the official CLI.
- Retrieve logs and inspect deployment outcome.
- Verify the resulting endpoint where available.
- Approval gate before mutating operations.
- Secret redaction and structured operation results.

### Priority 1 — Add only after validation
- GitHub repository checkout using narrowly scoped credentials.
- App creation when no target app exists.
- Environment-variable changes.
- Restart and controlled redeployment.
- Use app events to improve failure diagnosis.
- One tested remediation loop.

### Defer unless essential
- Automated DNS changes.
- Automated database/disk/bucket provisioning.
- Arbitrary platform support without test coverage.
- Pricing estimates without a reliable official source.
- Unattended destructive operations.
- Broad production monitoring/alerting.

## 7. Risks and Open Questions

- CLI output and flags may evolve; pin/test a known version for the demo.
- API hostnames may vary by service and region.
- CLI documentation confirms command availability but does not replace live tests of permissions, response schemas, or edge cases.
- GitHub intake introduces repository-token, untrusted-code, and prompt-injection risks. Repository contents must be treated as untrusted input, not as instructions for the agent.
- A build succeeding does not prove the application is healthy.
- Logs may contain secrets or personal data; apply redaction before passing logs to the LLM.
- Resource creation, resizing, deletion, and DNS updates may have cost or availability consequences.
- A tool result that is missing or ambiguous must be reported as inconclusive, not successful.

## 8. Phase 3 Completion Checklist

- [x] Identify official Liara API specifications and CLI documentation.
- [x] Build a first-pass matrix for deploy, status/logs, environment, databases, disks, DNS and storage.
- [x] Separate documented features from items requiring live validation.
- [x] Define a conservative API/CLI integration strategy for the MVP.
- [ ] Run the live validation checklist with the team's Liara test account.
- [ ] Add this document to the repository as `03-liara-capability-matrix.md`.

**Status note:** This document is ready as a documentation-based capability matrix. The live validation checklist remains open because no credentials or test operations were used during this review.

## Sources

- Liara OpenAPI repository: https://github.com/liara-cloud/openapi
- Liara PaaS specification: https://github.com/liara-cloud/openapi/blob/main/spec/paas.yaml
- Liara DBaaS specification: https://github.com/liara-cloud/openapi/blob/main/spec/dbaas.yaml
- Liara DNS specification: https://github.com/liara-cloud/openapi/blob/main/spec/dns.yaml
- Liara CLI documentation: https://github.com/liara-cloud/cli
- Liara API overview: https://github.com/liara-cloud/openapi/blob/main/index.mdx
