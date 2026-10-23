# Deployment & Docker Setup

This guide details running and deploying the Liara Deployment & SRE Agent stack via Docker Compose or native development processes.

---

## 1. Architecture Stack

The deployment environment comprises three main services:

| Service | Container Name | Image / Base | Internal Port | External Port | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Database** | `liara-agent-postgres` | `postgres:17-alpine` | `5432` | `5432` | Persistent metadata & runs store |
| **AI Engine** | `liara-agent-engine` | Python 3.13 / FastAPI | `8000` | `8000` | Agentic planning, SRE diagnostics, Liara Adapter |
| **Web Frontend** | `liara-agent-web` | Next.js 15 Standalone | `3000` | `3000` | Persian chat UI, Sidecar console, BFF proxy |

---

## 2. Docker Compose Deployment

### Prerequisites
- Docker Engine `>= 24.0`
- Docker Compose `>= 2.20`

### Quick Start
1. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

2. Configure necessary environment variables in `.env`:
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_postgres_password
POSTGRES_DB=liara_agent
DATABASE_URL=postgresql://postgres:secure_postgres_password@postgres:5432/liara_agent?schema=public

# Inter-service Authentication
INTERNAL_AGENT_SECRET=your_super_secret_internal_token_here
APP_SECRET=your_nextjs_session_cookie_secret_here

# LLM Providers (OpenAI, OpenRouter, or Liara AI)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_NAME=gpt-4o

# Liara Credentials (Can also be set in Web UI)
LIARA_API_TOKEN=def_...
```

3. Start all services:
```bash
docker compose up -d --build
```

4. Verify health:
```bash
docker compose ps
```
The `postgres` container includes a built-in health check (`pg_isready -U postgres -d liara_agent`). Both `engine` and `web` wait for postgres readiness before starting.

5. View logs:
```bash
docker compose logs -f web
docker compose logs -f engine
```

---

## 3. Local Development Setup (Native)

For rapid local iteration without full container rebuilds:

### 1. Database
Run only the PostgreSQL 17 Alpine container:
```bash
docker compose up -d postgres
```

### 2. Python Engine
Navigate to `engine/`:
```bash
cd engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export INTERNAL_AGENT_SECRET=dev-internal-secret-change-me
python -m uvicorn engine.main:app --reload --port 8000
```

### 3. Next.js Web Application
In the repo root:
```bash
pnpm install
pnpm --filter web prisma:push
pnpm --filter web dev
```
Open `http://localhost:3000` in your browser.

---

## 4. Database Migrations

Database schemas are managed using Prisma ORM under `apps/web/prisma/schema.prisma`.

- **Push Schema Changes to DB**:
```bash
pnpm --filter web prisma:push
```
- **Generate Prisma Client**:
```bash
pnpm --filter web prisma:generate
```
- **Open Prisma Studio (Visual DB Explorer)**:
```bash
pnpm --filter web prisma:studio
```

---

## 5. Security & Production Checklist

- [ ] Change `INTERNAL_AGENT_SECRET` to a cryptographically strong 64-character random string.
- [ ] Change `APP_SECRET` to protect user session cookies.
- [ ] Bind ports `8000` and `5432` only to localhost (`127.0.0.1`) if exposing `web` (port `3000`) publicly behind Nginx or Caddy.
- [ ] Never hardcode or commit tokens to version control.

## 6. Liara Production Deployment

The production Liara image is built from the repository-root `Dockerfile`. It runs the Next.js web/API server and the FastAPI engine in one container so both processes can access the same temporary project workspace. PostgreSQL remains a separate managed Liara database. At each start, the container applies checked-in Prisma migrations and ensures the configured operator has a database user row before either service begins accepting requests.

Required Liara app variables are `DATABASE_URL`, `INTERNAL_AGENT_SECRET`, `APP_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL_NAME`. `LIARA_API_TOKEN` and `LIARA_TEAM_ID` are optional app defaults; users can also save their own token from the UI. Use a private Liara network for the app and database, and do not expose the database publicly. The Liara app listens on port `3000`; the engine listens only on container loopback port `8000`.

Never include `.env`, `apps/web/.env`, `.workspace/`, or local build artifacts in the image. `.dockerignore` protects the Docker build context. The web login remains a single operator account configured through `ADMIN_USERNAME` and `ADMIN_PASSWORD`; this project does not provide public self-registration or separate customer accounts.

