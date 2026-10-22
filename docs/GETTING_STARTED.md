# Getting Started & Setup Guide

This guide walks you through setting up and running the **Liara Deployment & SRE Agent** in your local development environment.

---

## 1. System Architecture Overview

The platform uses a two-tier hybrid architecture:
- **Application Tier (`apps/web`):** Next.js 15 App Router (TypeScript, Tailwind CSS, shadcn/ui) with Prisma ORM connecting to PostgreSQL. Manages user sessions, project intake, deployment plan reviews, human approvals, and real-time log viewers.
- **Agent Engine (`engine/`):** Python 3.13 service (FastAPI, Pydantic, LangChain) encapsulating static code inspection, LLM plan orchestration, secret redaction, and Liara Cloud API/CLI operations. Protected by an internal authorization header (`X-Internal-Secret`).
- **Database:** PostgreSQL 16 running via Docker Compose for persistent run records, approvals, and audit logs.
- **Sample Target App (`sample-apps/nodejs-demo/`):** A standalone Node.js web service designed for the end-to-end deployment and SRE crash-and-remediation demonstration.

---

## 2. Prerequisites

Make sure the following tools are installed on your host:
- **Docker & Docker Compose** (for PostgreSQL database)
- **Node.js** (v20+ or v22+)
- **pnpm** (v9+ or v11+)
- **Python** (v3.11+)

---

## 3. Step-by-Step Setup

### Step 1: Clone and Enter Repository
```bash
git clone git@github.com:amir-mostafa-hs/aps-liara-ai-agent.git
cd aps-liara-ai-agent
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
cp .env.example apps/web/.env
```

Review the values in `.env`:
```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/liara_agent?schema=public"
INTERNAL_AGENT_SECRET="dev-internal-secret-change-me"
ENGINE_URL="http://127.0.0.1:8000"

# Optional: Add your real Liara token here or set it later in the UI dashboard
LIARA_API_TOKEN=""

# AI Engine Model (OpenAI-compatible)
OPENAI_API_KEY=""
OPENAI_MODEL_NAME="gpt-6-luna"

# Operator Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="adminpassword123"
```

### Step 3: Start PostgreSQL Container
Start the PostgreSQL container in the background:
```bash
pnpm db:up
# or: docker compose up -d postgres
```
Verify the database is healthy:
```bash
docker ps
```

### Step 4: Install Node.js Dependencies & Sync Database
```bash
pnpm install
pnpm --filter web prisma:push
```

### Step 5: Setup Python Virtual Environment
Initialize the Python virtual environment for the Agent Engine:
```bash
python3 -m venv engine/.venv
engine/.venv/bin/pip install --upgrade pip
engine/.venv/bin/pip install -e ./engine
```

---

## 4. Running the Application

Start both the Next.js Web Application and Python Agent Engine concurrently with a single command:
```bash
pnpm dev
```

Alternatively, you can run each service in a separate terminal:
- **Terminal 1 (Web Dashboard):**
  ```bash
  pnpm dev:web
  ```
  Dashboard is available at: [http://localhost:3000](http://localhost:3000)
- **Terminal 2 (Python Engine):**
  ```bash
  pnpm dev:engine
  ```
  FastAPI docs available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 5. Verification & Test Execution

Run the complete test suite across Python, Node.js, and the sample app:
```bash
pnpm test
```

Individual test targets:
- **Python Engine Tests (pytest):**
  ```bash
  PYTHONPATH=. engine/.venv/bin/pytest engine/tests/
  ```
- **Web App Unit Tests (node:test):**
  ```bash
  pnpm --filter web test
  ```
- **Sample Node.js App Tests:**
  ```bash
  node sample-apps/nodejs-demo/test.mjs
  ```

---

## 6. Full Docker Compose Deployment (Optional)

You can also run the entire stack (PostgreSQL, Python Engine, and Next.js Web) containerized:
```bash
docker compose up -d --build
```
This builds and starts:
- `liara-agent-postgres` on port `5432`
- `liara-agent-engine` on port `8000`
- `liara-agent-web` on port `3000`

---

## 7. Interactive Walkthrough (Current Features)

1. **Dashboard Health:** Visit [http://localhost:3000](http://localhost:3000). You will see the **Hybrid System Status** banner showing green badges for Next.js, PostgreSQL, and Python Agent Engine.
2. **Operator Login:** Click **Operator Login** (or visit `/login`). Sign in with username `admin` and password `adminpassword123`.
3. **Liara Credentials & Live Test:** In **Step 1 (Liara Cloud Credentials)**, enter your Liara API token and click **Test Connection**. The engine securely verifies access and renders your active cloud projects.
4. **Static Project Inspection:** In **Step 2 (Static Project Inspection)**, click **Preset: Sample App** (`sample-apps/nodejs-demo`) and click **Inspect Project**. The engine statically analyzes the project, extracts runtime metadata (`nodejs`, port 3000, `node server.js`), detects evidence files, and flags required variables (`SERVICE_SECRET`, `PORT`).
5. **AI Deployment Planning & Interactive Approval Gate:**
   - In **Step 3 (AI Deployment Plan & Human Approval Gate)**, enter your target Liara application name (or click **Generate Deployment Plan →** from Step 2).
   - The engine invokes LangChain with Pydantic structured output (`DeploymentPlan`), determining typed actions (`create_app`, `deploy`), billable impact notice, port mapping, and an immutable canonical SHA-256 cryptographic digest.
   - A new execution run is saved in PostgreSQL with status `awaiting_approval`.
   - The operator inspects the proposed actions, impact level, and tamper-proof digest.
   - Clicking **Reject Plan** cleanly marks the run as `cancelled` and halts execution.
   - Clicking **Approve Plan & Proceed** validates the cryptographic digest against the canonical plan, records an immutable `ActionApproval` record in PostgreSQL with operator user ID and timestamp, and transitions the run to `approved` (ready for autonomous deployment in Ticket 05).
6. **Real Liara Deployment Execution & Live SSE Log Streaming:**
   - Once the plan is approved, **Step 4 (Live Deployment & Log Streaming)** unblocks the **Execute Deployment** action.
   - Clicking **Execute Deployment** launches the non-interactive `liara deploy` process via argument arrays on the Python Engine.
   - Real-time build progress and deployment output stream directly to the web dashboard terminal via Server-Sent Events (SSE).
   - All secret tokens, Authorization headers, and sensitive strings are redacted on-the-fly before reaching the browser or database.
   - Upon completion, the full redacted output and exit code are persisted in the PostgreSQL `Run` record.
7. **Public Endpoint Health Verification & Health Decoupling:**
   - In **Step 5 (Public Endpoint Verification & Health Decoupling)**, click **Verify Health** (or follow the prompt in the deployment card).
   - The engine sends an HTTP probe to `https://<app_id>.liara.run` and evaluates response status codes, latency, and response bodies.
   - The dashboard reports **Provider Status** (e.g. `SUCCESS`) and **Application Health** (e.g. `UNHEALTHY` if `SERVICE_SECRET` was omitted, or `HEALTHY` if present) as distinct signals.
   - In the deliberate failure test scenario, the agent detects the startup crash without falsely claiming success, priming the workflow for closed-loop SRE Diagnosis (Ticket 07).
