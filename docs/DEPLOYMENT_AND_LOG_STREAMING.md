# Real Liara Deployment Execution & Live Log Streaming

## Overview

The **Liara Deployment & SRE Agent** executes real, non-interactive deployments against **Liara Cloud** using official CLI tools (`@liara/cli`) and streaming Server-Sent Events (SSE).

This document details the execution engine, security guardrails, live log streaming pipeline, and audit log persistence implemented in **Ticket 05**.

```
+-----------------------------------------------------------------------------------+
| Next.js Web Dashboard (apps/web)                                                 |
| - Live terminal emulator with dark theme, auto-scroll, and copy/clear controls    |
| - Connects to SSE proxy via fetch ReadableStream                                  |
+-----------------------------------------------------------------------------------+
                                         |
                                         | POST /api/runs/[id]/deploy (SSE)
                                         v
+-----------------------------------------------------------------------------------+
| Next.js Route Handler (apps/web/src/app/api/runs/[id]/deploy)                    |
| - Verifies operator authentication session                                        |
| - Validates Run has an approved ActionApproval record                             |
| - Injects active Liara API token from PostgreSQL/environment                      |
| - Proxies SSE stream from Python Engine via X-Internal-Secret                    |
| - Saves redacted logs and status ('verifying' / 'failed') to PostgreSQL Run       |
+-----------------------------------------------------------------------------------+
                                         |
                                         | POST /agent/deploy (X-Internal-Secret)
                                         v
+-----------------------------------------------------------------------------------+
| Python Agent Engine (engine/services/deployer.py)                                 |
| - Precondition check: verify_action_approval(plan, action_id, approval)           |
| - Constructs safe argument array: ['liara', 'deploy', '--app', ..., '--no-logs']  |
| - Spawns subprocess with strict timeout (default: 300s)                           |
| - Real-time secret redaction cleanses tokens from stdout/stderr lines              |
| - Yields SSE formatted events: data: {"text": "..."}\n\n                         |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Subprocess exec (argument array)
                                         v
+-----------------------------------------------------------------------------------+
| Liara Cloud Infrastructure                                                        |
| - Uploads source code to Liara PaaS                                              |
| - Builds release container image                                                  |
| - Launches release on *.liara.run                                                 |
+-----------------------------------------------------------------------------------+
```

---

## 1. Security Boundaries & Shell Injection Prevention

Executing cloud deployment commands requires stringent security controls:

1. **Subprocess Argument Arrays (No Shell Interpolation):**
   Commands are executed strictly via `asyncio.create_subprocess_exec(*cmd)` with separate argument elements. Raw shell strings (`shell=True` or bash string interpolation) are strictly prohibited, making shell injection impossible regardless of input project paths or app names.
   ```python
   cmd = [
       "liara",
       "deploy",
       "--app", plan.target_app,
       "--platform", plan.platform,
       "--port", str(plan.port),
       "--path", str(source_dir),
       "--no-app-logs",
   ]
   ```
2. **Mandatory Approval Precondition:**
   Before any subprocess is created, `DeploymentExecutor.execute_deployment()` validates the matching `ActionApproval` record. If approval is missing, tampered, or rejected, execution immediately raises `PermissionError` and halts.
3. **Execution Timeouts:**
   All deployment subprocesses are bound to a strict timeout (default: 300 seconds). If a deployment hangs, the subprocess is terminated cleanly and an error event is yielded.

---

## 2. Real-Time Secret Redaction Pipeline

To protect operator credentials, tokens and passwords are scrubbed **at the source** before reaching the web client or PostgreSQL database:
- **`engine/security/redaction.py`:** Cleanses exact API tokens (`[REDACTED_SECRET]`), Bearer authentication headers (`[REDACTED_BEARER_TOKEN]`), and standard secret flags.
- Real-time filtering: Each stdout/stderr line emitted by `liara deploy` passes through `redact_text(line, api_token)` before being yielded as an SSE event.

---

## 3. Server-Sent Events (SSE) Streaming Pipeline

The deployment output is delivered to the browser with zero buffering:
- **FastAPI Endpoint (`POST /agent/deploy`):**
  Uses `StreamingResponse(sse_generator(), media_type="text/event-stream")`.
- **Next.js Route (`POST /api/runs/[id]/deploy`):**
  Receives the engine stream and forwards chunks directly via a standard web `ReadableStream`.
- **Dashboard Live Terminal (`apps/web/src/app/page.tsx`):**
  Consumes the stream via `fetch` and `reader.read()`, updating the terminal line-by-line with syntax highlighting:
  - Cyan: Agent messages (`[AGENT]`)
  - Emerald: Successful builds and release deployment
  - Amber: Process completion (`[EXIT]`)
  - Red: Execution errors (`[ERROR]`)

---

## 4. Run State Machine Progression

Upon deployment execution, the workflow run transitions through PostgreSQL states:

1. **`approved`:** Operator has granted permission with a valid cryptographic plan digest.
2. **`executing`:** Deployment command has been launched and logs are actively streaming.
3. **`verifying`:** Build completed successfully (exit code 0); ready for endpoint health verification (Ticket 06).
4. **`failed`:** Build failed or process exited with non-zero code; logs are persisted and run is ready for automated SRE diagnosis (Ticket 07).

---

## 5. Verification & Testing

Run all unit and integration test suites:
```bash
pnpm test
```

- **Deployer Service Tests (`engine/tests/test_deployer.py`):**
  - Verifies rejection when `ActionApproval` is missing or tampered
  - Asserts argument array usage without shell strings
  - Asserts real-time secret redaction in streamed logs
  - Validates FastAPI `/agent/deploy` SSE response headers and event payload
- **Web Deployment Proxy Tests (`apps/web/tests/deploy.test.mjs`):**
  - Asserts `X-Internal-Secret` forwarding to engine
  - Asserts `text/event-stream` headers and chunk streaming

