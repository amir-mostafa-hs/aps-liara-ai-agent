# Architecture: Security & Token Protection

## 1. Threat Model & Security Boundaries

The agent interacts with third-party cloud infrastructure on behalf of the developer. As such, the system enforces multi-layered defense-in-depth principles:

### A. Zero Token Exposure to LLMs
- **Rule:** The Liara API Token is considered a root-level secret. It is **never** sent to OpenAI, Anthropic, or any LLM inference endpoint.
- **Implementation:** The prompt builders in `engine/services/planner.py` and `engine/services/diagnoser.py` only receive structural metadata (e.g. file trees, sanitized dependencies, redacted build logs). Credential fields are omitted by design.

### B. UI Token Masking
- **Rule:** Tokens must never be visible in plain text in HTML elements, JSON API payloads returned to the browser, or console logs.
- **Implementation:** The utility function `maskToken` in `apps/web/src/lib/auth.ts` reveals only the final 4 characters (e.g. `••••••••C9VI`). In the Sidecar Console, password visibility toggles exist for editing, but initial server loads always deliver masked representations.

### C. Automatic Subprocess Redaction
- **Rule:** When calling the `liara` CLI or receiving HTTP error strings from `https://api.iran.liara.ir`, stdout and stderr streams can contain command line flags or authorization headers.
- **Implementation:** The Python engine's `engine/security/redaction.py` intercepts all raw process and network strings and runs `redact_text(text, api_token)`. Any token occurrence is replaced with `[REDACTED_LIARA_TOKEN]`.

### D. Path Traversal & Command Injection Prevention
- **Rule:** Ingesting local file paths or Git repository URLs must not allow directory escapes (`/etc/passwd`, `../../`) or arbitrary shell executions.
- **Implementation:**
  - `validateSourcePath` in `apps/web/src/lib/source-ingestion.ts` and `ProjectInspector.validate_path` in `engine/services/inspector.py` use realpath canonicalization constrained to allowed repository roots.
  - Subprocess calls (`asyncio.create_subprocess_exec`) receive explicit command argument arrays without `shell=True`.
  - Git clone commands reject URLs containing shell metacharacters (`;`, `&`, `|`, `` ` ``, `$`).

### E. Service-to-Service Secret Authentication
- **Rule:** The Python FastAPI engine only accepts requests from the Next.js server.
- **Implementation:** All requests between Next.js API routes and the FastAPI engine must include the `X-Internal-Secret` header matching `INTERNAL_AGENT_SECRET`. Unauthenticated direct requests are rejected with HTTP 403.
