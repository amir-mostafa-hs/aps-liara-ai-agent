# Web Proxy API Reference (`apps/web`)

The Next.js web application acts as the secure user-facing BFF (Backend-For-Frontend) and proxy layer. It handles session authentication, database persistence via Prisma, secure token retrieval, and proxying orchestration requests to the Python AI Engine.

All routes are located under `apps/web/src/app/api/`.

---

## 1. System Health

### `GET /api/health`
Probes database connectivity and downstream Python AI Engine status.

- **Response `200 OK`**:
```json
{
  "status": "healthy" | "degraded",
  "database": {
    "status": "connected" | "disconnected",
    "engine": "postgresql",
    "error": null
  },
  "engine": {
    "status": "connected" | "disconnected",
    "endpoint": "http://127.0.0.1:8000/health",
    "version": "0.1.0",
    "error": null
  },
  "timestamp": "2026-10-23T12:00:00.000Z"
}
```

---

## 2. Liara Cloud Integration (`/api/liara/*`)

### `GET /api/liara/services`
Fetches all live applications and databases from Liara Cloud.
- **Headers / Context**: Uses saved Liara token from session or `LIARA_API_TOKEN`.
- **Query Params**:
  - `team_id` (optional): Filter resources by specific Liara team workspace.
- **Response `200 OK`**:
```json
{
  "projects": [
    {
      "id": "proj-xyz",
      "project_id": "my-web-app",
      "type": "nodejs",
      "status": "running",
      "scale": 1,
      "created_at": "2026-10-20T10:00:00Z"
    }
  ],
  "databases": [
    {
      "id": "db-abc",
      "hostname": "db-abc",
      "type": "postgres",
      "status": "running"
    }
  ],
  "activeCount": 2
}
```

### `GET /api/liara/plans`
Fetches available hardware plan tiers (RAM, vCPU, pricing) for project creation.
- **Query Params**:
  - `type` (optional): Project platform type (e.g. `node`, `python`, `docker`).
- **Response `200 OK`**:
```json
{
  "plans": [
    {
      "id": "ir-standard-1G",
      "name": "Standard 1GB",
      "ram": "1 GB",
      "cpu": "0.5 Core",
      "pricePerHour": 250,
      "monthlyEstimate": "180,000 Tomans"
    }
  ]
}
```

### `POST /api/liara/projects`
Creates a brand-new application service on Liara Cloud via the Python Engine.
- **Request Body**:
```json
{
  "project_id": "my-new-app",
  "platform": "node",
  "plan_id": "ir-standard-1G"
}
```
- **Response `201 Created`**:
```json
{
  "project": {
    "id": "proj_12345",
    "project_id": "my-new-app",
    "type": "node",
    "status": "created"
  }
}
```

### `POST /api/liara/test-connection`
Validates an API token against Liara Cloud and returns associated user profile and team workspaces.
- **Request Body**:
```json
{
  "api_token": "def_liara_secret_token"
}
```

### `POST /api/liara/env/set`
Writes approved environment values to an existing Liara app. The route requires an authenticated same-origin request and validates a SHA-256 digest that binds the confirmation to the exact app and values. The Engine applies the values through Liara's `POST /v1/projects/update-envs` API and preserves existing variables before adding or replacing the selected keys. Secret values are not passed as process arguments and are redacted from provider output. The API contract follows the [official Liara CLI implementation](https://github.com/liara-cloud/cli/blob/master/src/commands/env/set.ts).

The request contains `appName`, `envVars`, and `approval: { confirmed: true, appName, digest }`. The response is successful only when Liara accepts the write; the caller must wait for `ok: true` before starting deployment.
- **Response `200 OK`**:
```json
{
  "valid": true,
  "user": {
    "email": "dev@example.com",
    "name": "Developer"
  },
  "teams": [
    {
      "id": "team_alpha",
      "name": "Alpha Team"
    }
  ]
}
```

---

## 3. Local Project Inspection & Configuration (`/api/project/*`)

### `POST /api/project/inspect`
Inspects a local codebase directory to detect framework, runtime, open ports, and configuration presence.
- **Request Body**:
```json
{
  "path": "/absolute/path/to/project"
}
```
- **Response `200 OK`**:
```json
{
  "detected_framework": "nextjs",
  "detected_port": 3000,
  "has_liara_json": false,
  "existing_app_name": null,
  "suggested_app_name": "project-dir-name"
}
```

### `POST /api/project/config/diff`
Generates Liara configuration files and calculates line-by-line unified diff against existing files on disk.
- **Request Body**:
```json
{
  "path": "/path/to/project",
  "config": {
    "platform": "node",
    "app": "my-app",
    "port": 3000
  }
}
```
- **Response `200 OK`**:
```json
{
  "diff": "--- a/liara.json\n+++ b/liara.json\n@@ -0,0 +1,4 @@\n+{\"app\": \"my-app\"}",
  "has_changes": true
}
```

### `POST /api/project/config/apply`
Atomically writes the agreed configuration files to disk.

---

## 4. Run Lifecycle & Execution (`/api/runs/*`)

### `POST /api/runs`
Initiates a new run cycle. Generates execution plan, calculates SHA-256 digest, and requires human approval for state mutations.

### `GET /api/runs/[id]`
Retrieves live state of a run: status (`PENDING_APPROVAL`, `DEPLOYING`, `FAILED`, `SUCCESS`), step logs, approval token, and diagnostics.

### `POST /api/runs/[id]/approve`
Submits human approval with the required cryptographic digest token.
- **Request Body**:
```json
{
  "approval_token": "sha256_hash_here"
}
```

### `POST /api/runs/[id]/deploy`
Streams live deployment logs from Liara CLI / API via Server-Sent Events (SSE).

### `POST /api/runs/[id]/diagnose`
Invokes the SRE diagnostics engine on deployment or runtime failures. A health failure requests runtime logs independently of any deployment output. The response includes `log_source`, `logs_warning`, `diagnosis_status`, confidence, and a Persian root cause. When evidence is unavailable or inconclusive, no speculative remediation is returned.

### `POST /api/runs/[id]/remediate`
Applies an explicitly approved environment-variable change to the run's already-confirmed Liara app. The request must include `approved: true`, the selected `env_value`, and `value_source` (`manual` or `generated`). The endpoint rejects missing approval, empty values, unsupported remediation types, and a target that does not match the run. It returns a successful recovery only after Liara confirms the write and the HTTP health check is healthy; provider failure blocks the health check.

