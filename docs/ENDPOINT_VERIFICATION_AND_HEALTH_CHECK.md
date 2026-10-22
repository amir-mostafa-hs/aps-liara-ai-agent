# Public Endpoint Verification & Health Decoupling

## Overview

In cloud PaaS platforms like Liara, a deployment command (`liara deploy`) exiting with code 0 indicates only that the **container image was built and scheduled by the orchestrator**. It does **not** prove that the user application successfully started, passed its internal initialization, or is serving traffic.

A critical design requirement of the **Liara Deployment & SRE Agent** is the **strict decoupling of provider deployment status from application health**:
- **Provider Status:** Did Liara accept and release the container? (`success` / `failed`)
- **Application Health:** Did the application respond with HTTP 200 OK to public health probes? (`healthy` / `unhealthy` / `inconclusive`)

```
+------------------------------------------------------------------------------+
| Liara Cloud Deploy Exit Code 0 (Provider Status = 'success')                 |
+------------------------------------------------------------------------------+
                                      |
                                      v
           [ HTTP GET Probe: https://<app_id>.liara.run ]
                                      |
                 +--------------------+--------------------+
                 |                                         |
          HTTP 200 OK                               HTTP 500 / Crash
                 |                                         |
                 v                                         v
   Application Health: 'healthy'             Application Health: 'unhealthy'
   Run Status: 'succeeded'                   Provider Status: 'success'
   Badge: [Healthy (200)]                    Run Status: 'failed'
                                             SRE Trigger: ready_for_sre = True
                                             (Transition to Ticket 07 SRE Loop)
```

---

## 1. Schema & Data Contracts (`engine/domain/models.py`)

The verification engine returns a strictly typed `VerificationResult` model:

```python
class VerificationResult(BaseModel):
    endpoint_url: str
    provider_status: str = "success"
    application_health: str = "inconclusive"  # "healthy", "unhealthy", "inconclusive"
    http_status_code: int | None = None
    response_body_snippet: str | None = None
    error_message: str | None = None
    latency_ms: float | None = None
    checked_at: str
    ready_for_sre: bool = False
```

### Signal Interpretation Matrix

| Provider Status | Application Health | Meaning | Run Status | Action |
|---|---|---|---|---|
| `success` | `healthy` | Deployment successful and app passed HTTP 200 health probe | `succeeded` | Mark complete |
| `success` | `unhealthy` | Deployed to Liara, but application crashed (e.g. missing `SERVICE_SECRET`) | `failed` | **Trigger SRE Diagnosis (Ticket 07)** |
| `failed` | `unhealthy` | Deploy failed at build/CLI stage | `failed` | Trigger build diagnosis |
| `success` | `inconclusive` | Probe timed out or DNS propagation pending | `inconclusive` | Operator prompt for retry |

---

## 2. Verification Service Engine (`engine/services/verifier.py`)

- **Retries & Backoff:** Probes the public endpoint with configurable timeout (default: 5.0s) and exponential retries to accommodate DNS latency after release rollout.
- **Latency Measurement:** Records round-trip HTTP latency in milliseconds (`latency_ms`).
- **Secret Redaction:** Truncates response snippets and scrubs any credentials before returning or persisting.
- **Connection Failure Detection:** Detects `ConnectError` / connection resets (identifying that the application process died on startup) and flags `ready_for_sre: true`.

---

## 3. Web API Endpoints

### 1. `POST /agent/verify` (Python Engine)
Protected by `X-Internal-Secret` header.
- **Request Body:**
  ```json
  {
    "app_id": "my-demo-app",
    "provider_status": "success",
    "timeout_seconds": 5.0,
    "retries": 2
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "verification": {
      "endpoint_url": "https://my-demo-app.liara.run",
      "provider_status": "success",
      "application_health": "unhealthy",
      "http_status_code": 500,
      "response_body_snippet": "Missing SERVICE_SECRET",
      "latency_ms": 42.5,
      "ready_for_sre": true
    }
  }
  ```

### 2. `POST /api/runs/[id]/verify` (Next.js Application)
- Verifies operator session.
- Proxies probe request to Python engine.
- Updates PostgreSQL `Run.verification`, `Run.status`, and records `AuditLog: endpoint_verified`.

---

## 4. Dashboard User Interface (Step 5)

The dashboard presents:
- Clickable external link to `https://<targetApp>.liara.run`.
- Individual status cards displaying Provider Status, Application Health, and HTTP Status/Latency.
- SRE Callout banner: When `ready_for_sre` is true, informs the operator that the application crashed despite successful deployment, and offers the autonomous SRE diagnosis loop.

---

## 5. Verification & Tests

Run all unit and integration test suites:
```bash
pnpm test
```

- **Verifier Tests (`engine/tests/test_verifier.py`):**
  - Asserts HTTP 200 maps to `application_health: healthy` and `ready_for_sre: false`.
  - Asserts HTTP 500 or crash maps to `application_health: unhealthy` and `ready_for_sre: true`, maintaining `provider_status: success`.
  - Asserts network timeouts produce `inconclusive`.
  - Asserts internal secret header security on `/agent/verify`.
- **Web Tests (`apps/web/tests/verify.test.mjs`):**
  - Asserts Next.js proxy forwards internal secret and correctly handles health verification outcomes.

