# 01: Scaffold Hybrid Workspace and Health Check

**What to build:**
A dual-tier development workspace containing the Next.js web application (`apps/web` or `src/web`) with Tailwind CSS and shadcn/ui, PostgreSQL database models with Prisma ORM, and the Python Agent Engine (`engine/` or `src/liara_agent`) with FastAPI and Pydantic. Booting both services connects the Next.js backend to PostgreSQL and verifies internal connectivity to the Python engine via the `X-Internal-Secret` header, displaying a verified green "Services Connected" status card on the web dashboard.

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance Criteria
- [x] Running package dev scripts boots the Next.js frontend and Python FastAPI service concurrently.
- [x] PostgreSQL schema is initialized via Prisma with tables for `User`, `Run`, `ActionApproval`, and `AuditLog`.
- [x] An authenticated internal proxy route (`/api/health`) validates database connectivity and proxies to the Python engine's `/health` endpoint with the `X-Internal-Secret` header.
- [x] Direct requests to the Python engine without the correct `X-Internal-Secret` header are rejected with HTTP 403.
- [x] The dashboard renders a clear health badge confirming both Next.js and Python engine connectivity.

## Resolution
Successfully scaffolded the hybrid workspace with:
1. Root monorepo configuration with `pnpm` workspaces (`pnpm-workspace.yaml`, `package.json`).
2. Next.js 15 App Router web application in `apps/web` with Tailwind CSS, shadcn/ui dark mode styling, and Prisma schema with `User`, `Run`, `ActionApproval`, and `AuditLog` models.
3. Python FastAPI backend service in `engine/` with internal security authentication enforcing the `X-Internal-Secret` header.
4. Internal health proxy endpoint at `/api/health` checking PostgreSQL and the Python engine.
5. Interactive dashboard at `/` showing real-time health badges for all 3 components.
6. 100% passing test suites across both Python (pytest) and Node.js (`node:test`).

