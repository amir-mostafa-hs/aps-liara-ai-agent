# ADR-0005: User Authentication and Credential Management

## Context

The application requires an intuitive and secure mechanism for the operator to access the deployment dashboard and configure their Liara credentials. Full OAuth flows (e.g., GitHub OAuth apps, email verification) introduce unnecessary third-party dependencies during local evaluation, while an unauthenticated panel exposes cloud resources to unauthorized local or network access.

## Decision

1. **Dashboard Authentication:**
   - Single-account or credential-based login in Next.js using a username and password.
   - Session state maintained via secure HTTP-only cookies.
2. **Liara API Token Management:**
   - The user can input, update, and store their personal Liara API token securely via the web settings interface, persisted in PostgreSQL (or initialized via `LIARA_API_TOKEN` environment variable).
   - Sensitive tokens are masked in the UI and redacted from all logs and LLM prompts.
3. **Internal Service Communication:**
   - All internal API calls between the Next.js application layer and the Python LangChain agent engine are authenticated using a shared secret header (`X-Internal-Secret: INTERNAL_AGENT_SECRET`). Direct unauthenticated requests to the Python engine are rejected.

## Consequences

The evaluation and demo experience is self-contained and friction-free with simple username/password credentials, while cloud credentials and internal agent boundaries remain fully protected.

