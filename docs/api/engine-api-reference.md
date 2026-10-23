# API Reference: Python Orchestrator Engine

All endpoints in the Python FastAPI Engine require the `X-Internal-Secret` header matching `INTERNAL_AGENT_SECRET`.

## 1. System & Health

### `GET /healthz`
Returns engine operational status.
- **Response:** `{"status": "healthy"}`

---

## 2. Liara Cloud Management

### `POST /liara/test-connection`
Validates Liara credentials and queries available teams and apps.
- **Payload:**
  ```json
  {
    "api_token": "string",
    "team_id": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "ok": true,
    "app_count": 1,
    "apps": [{"project_id": "...", "type": "node", "status": "running"}],
    "team_id": "...",
    "teams": [{"id": "...", "name": "..."}]
  }
  ```

### `GET /liara/services`
Fetches all live applications and databases from Liara Cloud.
- **Query Params:** `api_token` (string), `team_id` (optional string).
- **Response:**
  ```json
  {
    "ok": true,
    "services": [
      {
        "name": "link-apsignals",
        "type": "app",
        "status": "running",
        "endpoint": "https://link-apsignals.liara.run",
        "port": 3000
      }
    ],
    "count": 1
  }
  ```

### `POST /liara/projects`
Creates a new application in Liara Cloud.
- **Payload:**
  ```json
  {
    "project_id": "my-app",
    "platform": "node",
    "plan_id": "ir-standard-2",
    "api_token": "string (optional)",
    "team_id": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "ok": true,
    "project_id": "my-app",
    "platform": "node",
    "plan_id": "ir-standard-2",
    "endpoint": "https://my-app.liara.run",
    "status": "created"
  }
  ```

### `GET /liara/plans`
Returns available hardware plan tiers.
- **Query Params:** `api_token` (optional string).
- **Response:** `{"ok": true, "plans": [...]}`

### `POST /agent/database/create`
Provisions a managed database instance in Liara.
- **Payload:** `{"db_name": "...", "db_type": "postgres", "plan_id": "ir-standard-1"}`

---

## 3. Agent Deployment Operations

### `POST /agent/inspect`
Statically inspects project source directory.
- **Payload:** `{"path": "/absolute/path/to/project"}`
- **Response:** `{"ok": true, "analysis": {...}}`

### `POST /agent/plan`
Generates deterministic deployment plan.
- **Payload:** `{"analysis": {...}, "target_app": "my-app", "port": 3000}`
- **Response:** `{"ok": true, "plan": {...}}`

### `POST /agent/deploy`
Executes deployment and returns an SSE event stream of logs.

### `POST /agent/verify`
Probes live app URL for availability.

### `POST /agent/diagnose`
Analyzes error logs and returns actionable remediation.

