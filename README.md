# Liara Deployment & SRE Agent

An autonomous AI agent designed for **Liara Cloud** to inspect projects, formulate structured deployment plans, execute operations with human-in-the-loop approval, and troubleshoot runtime failures through closed-loop SRE diagnosis.

---

## Key Highlights

- **Hybrid Two-Tier Architecture:** Next.js 15 Fullstack (shadcn/ui + PostgreSQL + Prisma) paired with a Python 3.13 Agent Engine (FastAPI + LangChain).
- **Human-in-the-Loop Safety:** Mandatory approval gates before any mutating or billable operations.
- **Provider Evidence over Assumptions:** Rigorous distinction between cloud provider deployment status and actual HTTP 200 application health.
- **Closed-Loop SRE Troubleshooting:** Autonomous log inspection, root-cause diagnosis, and operator-approved remediation.
- **Multi-Layer Security:** Automatic token masking, credential redaction across logs, and strict path-traversal prevention.

---

## Quick Start

### 1. Start PostgreSQL with Docker Compose
```bash
pnpm db:up
```

### 2. Configure Environment
```bash
cp .env.example .env
cp .env.example apps/web/.env
```

### 3. Install Dependencies & Setup Database
```bash
pnpm install
pnpm --filter web prisma:push
```

### 4. Setup Python Virtual Environment
```bash
python3 -m venv engine/.venv
engine/.venv/bin/pip install -e ./engine
```

### 5. Run Concurrently
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

For comprehensive instructions, see [**`docs/GETTING_STARTED.md`**](docs/GETTING_STARTED.md).

---

## Testing

Run all unit and integration test suites:
```bash
pnpm test
```

---

## Architectural Decision Records (ADRs)

Key architectural choices are documented under [`docs/adr/`](docs/adr/):
- [ADR-0001: Interface Prioritization for 2-Day MVP](docs/adr/0001-interface-prioritization-mvp.md)
- [ADR-0002: First End-to-End Deployment Target and SRE Scenario](docs/adr/0002-first-e2e-deployment-path.md)
- [ADR-0003: Hybrid Next.js Fullstack and Python LangChain Architecture](docs/adr/0003-hybrid-nextjs-python-architecture.md)
- [ADR-0004: AI Model Selection and Structured Orchestration](docs/adr/0004-ai-model-and-structured-orchestration.md)
- [ADR-0005: User Authentication and Credential Management](docs/adr/0005-authentication-and-credential-management.md)

---

## License
MIT
