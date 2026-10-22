# 01: Scaffold Hybrid Workspace and Health Check

**What to build:**
A dual-tier development workspace containing the Next.js web application (`apps/web` or `src/web`) with Tailwind CSS and shadcn/ui, PostgreSQL database models with Prisma ORM, and the Python Agent Engine (`engine/` or `src/liara_agent`) with FastAPI and Pydantic. Booting both services connects the Next.js backend to PostgreSQL and verifies internal connectivity to the Python engine via the `X-Internal-Secret` header, displaying a verified green "Services Connected" status card on the web dashboard.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance Criteria
- [ ] Running package dev scripts boots the Next.js frontend and Python FastAPI service concurrently.
- [ ] PostgreSQL schema is initialized via Prisma with tables for `User`, `Run`, `ActionApproval`, and `AuditLog`.
- [ ] An authenticated internal proxy route (`/api/health`) validates database connectivity and proxies to the Python engine's `/health` endpoint with the `X-Internal-Secret` header.
- [ ] Direct requests to the Python engine without the correct `X-Internal-Secret` header are rejected with HTTP 403.
- [ ] The dashboard renders a clear health badge confirming both Next.js and Python engine connectivity.

