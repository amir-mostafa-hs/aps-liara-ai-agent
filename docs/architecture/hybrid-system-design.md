# Architecture: Hybrid System Design

## 1. Overview

The **Liara AI Deployment & SRE Agent** is designed as a secure, hybrid dual-runtime system that combines:
- **Next.js 15 (TypeScript / React 19 / Tailwind CSS):** A responsive, conversational user interface featuring an RTL Persian chat shell, dynamic action widgets, and a multi-tab sidecar console.
- **FastAPI Python 3.13 Orchestrator:** The deterministic backend engine handling static codebase inspection, LLM-guided deployment planning, sub-process log streaming, Liara Cloud API/CLI integration, and SRE log diagnosis.
- **PostgreSQL 17 (Prisma ORM):** Persistent relational storage for session states, deployment runs, approvals, and user configuration.
- **Liara Cloud PaaS:** The target cloud infrastructure providing compute apps (`*.liara.run`) and managed databases (Postgres, MySQL, Redis, MongoDB, MariaDB).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Web Browser (RTL UX)                       │
│      Chat Workspace (Interactive Widgets) │ Sidecar Console (Logs/Tabs)│
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ HTTP / SSE / Session Cookies
┌────────────────────────────────────▼───────────────────────────────────┐
│                    Next.js 15 Web Application                          │
│   • Auth & Session Token Guard                                         │
│   • Source Ingestion & Path Validator (Realpath / Sandboxing)          │
│   • API Proxy Routes with X-Internal-Secret                            │
│   • Prisma Client ORM                                                  │
└────────────┬───────────────────────────────────────────┬───────────────┘
             │ Prisma / SQL                              │ HTTP + Internal Secret
┌────────────▼──────────────┐             ┌──────────────▼───────────────┐
│  PostgreSQL 17 (Alpine)   │             │   Python FastAPI Engine      │
│  • Users & Profiles       │             │   • Project Inspector        │
│  • Audit Logs & Runs      │             │   • Liara API/CLI Adapter    │
│  • Action Approvals       │             │   • Deployment Planner       │
└───────────────────────────┘             │   • SSE Deploy Executor      │
                                          │   • SRE Diagnoser            │
                                          └──────────────┬───────────────┘
                                                         │ HTTPS / CLI Subprocess
                                          ┌──────────────▼───────────────┐
                                          │     Liara Cloud Platform     │
                                          │  • Applications (Projects)   │
                                          │  • Managed Databases         │
                                          │  • Team Workspaces           │
                                          └──────────────────────────────┘
```

## 2. Key Architectural Tenets

1. **Strict Seam Boundaries:** The Web layer handles UI state, cookie authentication, and rendering. The Python engine acts as an autonomous, deterministic execution agent behind an authenticated internal secret barrier (`X-Internal-Secret`).
2. **Security & Redaction by Default:** Cloud API credentials (Liara API tokens) are strictly stored at rest, masked in the UI (`••••••••XXXX`), and never passed into LLM prompt contexts. Subprocess outputs automatically scrub tokens before reaching frontend streams.
3. **Conversational Disambiguation:** When project configuration is ambiguous (e.g. missing `liara.json`), the agent does not guess or hijack existing unrelated cloud applications; it presents interactive widgets directly in chat to let the user select an active app or provision a new one.
4. **Deterministic Digest Verification:** Deployment and configuration actions require human-in-the-loop approval, verified via SHA-256 digest checks to prevent race conditions or tampering.

