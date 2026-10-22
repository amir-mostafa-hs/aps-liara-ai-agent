# 5-Minute Video Demonstration Script: Liara Deployment & SRE Agent

This rehearsed script guides presenters, evaluators, and operators through a 5-minute video walkthrough or live demo of the **Liara Deployment & SRE Agent**. It demonstrates the end-to-end autonomous lifecycle: project inspection, structured planning, human-in-the-loop approval, live deployment with SSE streaming, health verification decoupling, and closed-loop SRE self-healing.

---

## Video Run-Down & Time Allocation

| Timestamp | Phase | Action / Screen | Talking Point |
|---|---|---|---|
| **00:00 - 00:45** | **Intro & Architecture** | Web Dashboard (`localhost:3000`) | Problem statement: Cloud deployments often report provider success while the container crashes silently. Introduce our hybrid architecture (Next.js + Python LangChain Engine). |
| **00:45 - 01:30** | **Setup & Inspection** | Step 1 & Step 2 | Authenticate as Operator, verify Liara API token connection, run static code inspection on `sample-apps/nodejs-demo`. |
| **01:30 - 02:30** | **AI Plan & Gate** | Step 3 | Generate structured deployment plan with Pydantic & SHA-256 cryptographic digest. Review actions and approve plan. |
| **02:30 - 03:30** | **Real Deploy & SSE** | Step 4 | Execute deployment. Show real-time streaming CLI output in the terminal component with automatic secret redaction. |
| **03:30 - 04:15** | **Health Decoupling** | Step 5 | Run independent HTTP health probe on `https://<app>.liara.run`. Show Provider=SUCCESS vs Application=UNHEALTHY. |
| **04:15 - 04:45** | **SRE Diagnosis & Fix** | Step 6 | Click "Diagnose Failure with AI". Show exact log evidence citation. Review remediation plan, inject missing secret, and click "Approve Fix". |
| **04:45 - 05:00** | **Recovery & CLI** | Step 6 & Terminal | Public endpoint returns HTTP 200 OK. Incident closed. Briefly show unified `liara-agent run` CLI companion. |

---

## Detailed Step-by-Step Script

### Phase 1: Introduction & Architecture (00:00 - 00:45)
- **On Screen:** Open browser at `http://localhost:3000`. Show the **Hybrid System Status** banner with green badges for Next.js, PostgreSQL, and Python Agent Engine.
- **Narrator:**
  > *"Hello everyone! Today we are demonstrating the Liara Deployment & SRE Agent — an autonomous AI coding and operations agent built specifically for Liara Cloud.*
  > 
  > *In real-world cloud engineering, deploying code isn't just running a build command. Applications frequently crash on startup due to missing environment variables or misconfigurations, even while the cloud provider reports a successful release.*
  > 
  > *Our agent pairs a Next.js 15 dashboard with an autonomous Python LangChain engine to inspect code, plan deployments with cryptographic human-in-the-loop approvals, stream live CLI output with secret redaction, and perform closed-loop SRE diagnosis when incidents occur."*

---

### Phase 2: Operator Authentication & Static Inspection (00:45 - 01:30)
- **On Screen:**
  1. Click **Operator Login**, sign in as `admin` / `adminpassword123`.
  2. In **Step 1 (Liara Cloud Credentials)**, click **Test Connection**. Show the active cloud projects listed.
  3. In **Step 2 (Project Inspection)**, leave default `sample-apps/nodejs-demo` and click **Inspect Project**.
- **Narrator:**
  > *"First, we authenticate as an authorized operator. The agent securely validates our Liara API token, confirming live connectivity to Liara Cloud.*
  > 
  > *Next, in Step 2, we inspect our sample Node.js project. The agent's static inspector scans the codebase with strict path-traversal boundaries, detecting that it's a Node.js service running on port 3000, and flags that it requires an environment variable called `SERVICE_SECRET`."*

---

### Phase 3: AI Deployment Planning & Human-in-the-Loop Approval Gate (01:30 - 02:30)
- **On Screen:**
  1. Click **Generate Deployment Plan →** in Step 2.
  2. Scroll to **Step 3 (Deployment Planning & Approval Gate)**.
  3. Highlight the **Pydantic Structured Plan**, **Impact Level (HIGH)**, and **SHA-256 Plan Digest**.
  4. Click **Approve Plan & Proceed**.
- **Narrator:**
  > *"Now, the agent generates a structured deployment plan using LangChain and Pydantic. Notice it doesn't just guess: it determines the exact CLI actions needed, flags the billable impact level, and computes a deterministic SHA-256 cryptographic digest.*
  > 
  > *Under our strict safety policy, no mutating CLI command is ever executed without operator approval. We inspect the proposed actions, verify the digest, and click 'Approve Plan'. This commits an immutable audit record in PostgreSQL."*

---

### Phase 4: Live Deployment & SSE Streaming with Redaction (02:30 - 03:30)
- **On Screen:**
  1. Scroll to **Step 4 (Live Deployment & Log Streaming)**.
  2. Click **Execute Deployment**.
  3. Watch the real-time build logs stream into the terminal window via Server-Sent Events.
- **Narrator:**
  > *"With the plan approved, Step 4 unlocks. We click 'Execute Deployment'.*
  > 
  > *The Python engine executes the official Liara CLI using safe argument arrays. Notice the terminal window: build output streams live over Server-Sent Events (SSE). Sensitive API tokens and credentials are intercepted and redacted in real-time before ever touching the browser or database."*

---

### Phase 5: Decoupled Public Verification & Crash Detection (03:30 - 04:15)
- **On Screen:**
  1. Once deployment finishes, click **Verify Public Endpoint →** in Step 5.
  2. Show the results grid: **Provider Status = SUCCESS**, but **Application HTTP Health = UNHEALTHY (HTTP 502 / Connection Refused)**.
  3. Point out the warning banner: *"Deliberate SRE Scenario Detected"*.
- **Narrator:**
  > *"Here is where our agent separates itself from standard tools. The provider deployment succeeded, but did the app actually start?*
  > 
  > *We run an independent HTTP health probe directly against `https://demo-node-app.liara.run`. As you can see, Provider Status is SUCCESS, but Application Health is UNHEALTHY.*
  > 
  > *Because we didn't provide `SERVICE_SECRET`, the Node.js process crashed on startup. Instead of reporting a false success, the agent detects the crash and primes the Autonomous SRE Loop."*

---

### Phase 6: Autonomous SRE Diagnosis & Approved Remediation (04:15 - 04:45)
- **On Screen:**
  1. Scroll down to **Step 6 (Autonomous SRE Diagnosis & Approved Remediation)**.
  2. Click **Diagnose Failure with AI**.
  3. Show the SRE Diagnosis card:
     - Root Cause description
     - Exact quoted log evidence: `[FATAL] Missing required environment variable: SERVICE_SECRET`
     - Proposed fix: `liara env:set SERVICE_SECRET=... --app demo-node-app`
  4. Click **Approve Fix & Recover Service**.
- **Narrator:**
  > *"Now watch our SRE agent in action. We click 'Diagnose Failure with AI'.*
  > 
  > *The agent parses the crash stack trace, isolates the root cause, and cites the exact failing line: `[FATAL] Missing required environment variable: SERVICE_SECRET`.*
  > 
  > *It formulates a targeted remediation plan to inject the missing variable via `liara env set`. Once again, the change is gated behind operator approval. We click 'Approve Fix & Recover Service'. The agent sets the environment variable and restarts the container."*

---

### Phase 7: Verification of Recovery & CLI Companion (04:45 - 05:00)
- **On Screen:**
  1. Watch Step 6 re-probe the endpoint and turn into a green banner: **"🎉 Service Successfully Recovered! Incident Closed."**
  2. Click the live URL link `https://demo-node-app.liara.run` to show the application responding.
  3. Briefly switch to terminal to run `pnpm cli inspect` or `liara-agent --help`.
- **Narrator:**
  > *"And look at that: the public endpoint is re-probed and returns HTTP 200 OK! The incident is automatically resolved and recorded in the audit log.*
  > 
  > *Furthermore, every capability you saw here is also accessible via our unified CLI companion: `bin/liara-agent run`, sharing the exact same business logic.*
  > 
  > *Thank you for watching the Liara Deployment & SRE Agent demo!"*
