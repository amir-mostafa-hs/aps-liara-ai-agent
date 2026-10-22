# ADR-0003: Hybrid Next.js Fullstack and Python LangChain Architecture

## Context

The initial discovery documentation (`docs/01`–`docs/05`) specified Python as the primary language and LangChain for orchestration, while requiring a rich visual web UI, auditable approval flows, and robust run persistence. Building the entire UI and database layer strictly in Python without modern frontend tooling risks falling short of high UX expectations (50 hackathon points), whereas Python remains the primary ecosystem for LangChain agent orchestration and tool execution.

## Decision

We adopt a two-tier hybrid architecture:
1. **Application & Experience Tier (Next.js + shadcn/ui + PostgreSQL):**
   - Built with Next.js (TypeScript) and styled using `shadcn/ui` components for an intuitive, modern dashboard.
   - Manages user sessions, project intake input, interactive human-in-the-loop approval gates, and live operation streaming.
   - Uses PostgreSQL (via Prisma or Drizzle ORM) as the authoritative database for persistent run histories, approval audit logs, and workflow states.
2. **AI & Execution Engine Tier (Python + LangChain):**
   - Python service running LangChain for project static inspection, plan generation, failure diagnosis, and tool orchestration.
   - Encapsulates the Liara Adapter (calling Liara CLI and API) with strict secret redaction.
   - Exposes clean, typed REST endpoints (FastAPI) invoked by Next.js route handlers.

## Consequences

- Delivers a top-tier visual experience for the hackathon video demo while retaining full power of Python LangChain.
- Clear separation of concerns: Next.js owns user interaction and persistence; Python owns LLM reasoning, code inspection, and Liara tool execution.
- Development requires running both Next.js and the Python agent service during development, coordinated via environment configuration.

