# AI Deployment Planning & Human-in-the-Loop Approval Gate

## Overview

The **Liara Deployment & SRE Agent** enforces a strict safety boundary: **no mutating or billable cloud actions are ever performed without human approval**.

To guarantee that language model outputs are deterministic, auditable, and impossible to bypass or tamper with, the agent employs **LangChain Structured Outputs with Pydantic schemas** combined with **cryptographic SHA-256 plan digests** stored in PostgreSQL.

```
+---------------------+         POST /agent/plan         +-------------------------+
| Next.js Application | -------------------------------> |   Python Agent Engine   |
|     (Web Tier)      | <------------------------------- |   (FastAPI + LangChain) |
+---------------------+   DeploymentPlan (Pydantic)      +-------------------------+
          |
          v
  Status: awaiting_approval
  Digest: SHA-256(canonical_json)
          |
     [Operator]
    /          \
Approve       Reject
   |             |
   v             v
Status:       Status:
approved      cancelled
(Records      (Halts
ActionApproval Execution)
in PostgreSQL)
```

---

## 1. Structured Output Architecture (LangChain + Pydantic)

Freeform LLM text generation is prohibited at the service boundary. The agent engine invokes OpenAI-compatible models (e.g. `gpt-6-luna`) strictly via `.with_structured_output(DeploymentPlan)`.

### Typed Schema Models (`engine/domain/models.py`)

```python
class ProposedAction(BaseModel):
    action_id: str
    operation: str  # e.g., "create_app", "deploy", "set_env"
    target: str
    description: str
    dangerous: bool = False
    requires_approval: bool = True
    cost_warning: bool = False


class DeploymentPlan(BaseModel):
    plan_id: str
    target_app: str
    platform: str
    port: int = 3000
    impact_level: str = "medium"  # "low", "medium", "high"
    cost_warning: bool = True
    requires_approval: bool = True
    actions: list[ProposedAction]
    digest: str = ""
```

---

## 2. Cryptographic Digest & Tamper Prevention

To prevent race conditions, replay attacks, or man-in-the-middle tampering between plan generation and approval:

1. **Canonical Serialization:** Both Python and TypeScript implement identical deterministic canonical serialization (`json.dumps(data, sort_keys=True, separators=(",", ":"))`).
2. **SHA-256 Digest:** The canonical representation is hashed to produce a 64-character hexadecimal digest.
3. **Approval Validation:** When an operator clicks **Approve**, the client presents the plan digest. The backend recomputes the digest from `planDetails` and verifies match using constant-time comparison (`crypto.timingSafeEqual`).
4. **Tamper Invalidation:** Any mutation to the target application name, port, or actions automatically invalidates the digest, causing the approval gate to reject the execution.

---

## 3. Human-in-the-Loop State Machine

A deployment workflow run progresses through distinct states in PostgreSQL:

| Run Status | Allowed Operator Actions | Behavior |
|---|---|---|
| `awaiting_approval` | **Approve** or **Reject** | Plan is presented on the dashboard with impact level, cost warning, and action list. Mutating operations are blocked. |
| `approved` | Unblocked for execution | An immutable `ActionApproval` record is created in PostgreSQL with `approved: true`, operator ID, and `planDigest`. |
| `cancelled` | None (Terminal) | An `ActionApproval` record is recorded with `approved: false`. Execution immediately halts; no cloud resources are touched. |

---

## 4. API Reference

### 1. `POST /api/runs`
Initiates project inspection and LLM deployment planning, creating a persistent Run in PostgreSQL.
- **Request Body:**
  ```json
  {
    "sourcePath": "sample-apps/nodejs-demo",
    "targetApp": "my-demo-app",
    "port": 3000
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "run": {
      "id": "run-uuid-1234",
      "status": "awaiting_approval",
      "targetApp": "my-demo-app",
      "platform": "nodejs",
      "planDetails": {
        "plan_id": "...",
        "impact_level": "medium",
        "cost_warning": true,
        "actions": [...],
        "digest": "cac5b22815b90d80bcf9dc7785189aee1e6da4683388c2abd303530accf42f3f"
      }
    }
  }
  ```

### 2. `POST /api/runs/[id]/approve`
Human approval gate endpoint.
- **Request Body:**
  ```json
  {
    "planDigest": "cac5b22815b90d80bcf9dc7785189aee1e6da4683388c2abd303530accf42f3f"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "run": { "id": "...", "status": "approved" },
    "approval": { "id": "...", "approved": true, "planDigest": "..." }
  }
  ```

### 3. `POST /api/runs/[id]/reject`
Rejects the deployment plan.
- **Request Body:**
  ```json
  {
    "reason": "Operator rejected deployment plan."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "run": { "id": "...", "status": "cancelled" },
    "approval": { "id": "...", "approved": false }
  }
  ```

---

## 5. Verification & Tests

- **Python Tests (`engine/tests/test_planner.py`):**
  - Schema conformity with Pydantic
  - SHA-256 digest determinism and tamper detection
  - Secret header protection on `/agent/plan`
  - Approval verification logic against altered digests
- **Web Tests (`apps/web/tests/runs.test.mjs`):**
  - Cross-language byte-for-byte SHA-256 parity between Python and TypeScript
  - State machine transition rules (`awaiting_approval` -> `approved` / `cancelled`)
  - Status precondition enforcement

