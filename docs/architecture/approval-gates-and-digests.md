# Architecture: Approval Gates & Digest Verification

## 1. The Human-in-the-Loop Philosophy

The agent never makes infrastructure changes (such as creating databases, overwriting project files, injecting cloud environment variables, or executing deployments) without explicit, auditable operator authorization.

## 2. Deterministic SHA-256 Digest Mechanism

To guarantee that the exact plan or configuration reviewed by the operator is identical to the one executed by the deployment orchestrator, the agent employs a deterministic SHA-256 digest:

```
[Normalized Plan Content]
  ├── target_app
  ├── platform
  ├── port
  └── actions [action_id, operation, target]
           │
           ▼
    SHA-256 Hash
           │
           ▼
    digest: "a1b2c3d4..."
```

### Digest Rules
1. **Canonical JSON Serialization:** Keys are sorted, whitespace is normalized, and dynamic timestamps are excluded.
2. **Identical Engine & Web Hashing:** Both the Python engine (`compute_plan_digest` in `engine/services/approval.py`) and Next.js client (`computePlanDigest` in `apps/web/src/lib/digest.ts`) implement the identical canonicalization algorithm.
3. **Execution Guard:** When the user clicks "تأیید و اجرای دپلوی", the approval token is submitted to `/api/runs/[id]/deploy`. If the submitted digest does not match the active plan digest, the request is aborted with HTTP 400.

## 3. Visual Diff Approval

Before any file modification is written to disk (such as generating `liara.json` or saving `.env`), the agent renders `DiffPreviewWidget`:
- Syntax-highlighted unified diff format (`--- /dev/null`, `+++ b/liara.json`).
- Clearly demarcated additions and deletions.
- Opt-in checkbox for persisting generated database credentials locally.
- Explicit "اعمال خودکار تغییرات" button that records user consent before applying the changes.
