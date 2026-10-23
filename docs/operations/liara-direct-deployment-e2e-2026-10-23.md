# Liara Direct Deployment E2E Test (2026-10-23)

## Purpose and scope

Validate app creation, source deployment, and post-deployment logs directly through the Liara API and official CLI, without using the Liara AI Agent workflow. This run used the test team, created one app, deployed the repository's Node.js sample, and left the service running for follow-up comparison. No delete operation was performed.

All credentials and the test value for `SERVICE_SECRET` are intentionally redacted. The API request bodies below record the non-secret values sent or the CLI-generated contract fields. Dynamic upload identifiers are not retained.

## Environment

- Date: 2026-10-23
- Liara CLI: `@liara/cli 9.6.0` (`darwin-arm64`, Node.js `22.23.3`)
- API host: `https://api.liara.ir`
- Team ID: `6ace4ec3ec13fe0c3c19c4db`
- Region: Iran
- App: `aps-direct-e2e-20261023-a91f`
- Source: `sample-apps/nodejs-demo`
- Public URL: <https://aps-direct-e2e-20261023-a91f.liara.run>

## Preflight API reads

The requests below used `Authorization: Bearer <REDACTED>` and `User-Agent: LiaraDirectE2ETest/1.0` where sent directly. CLI requests used the same test token and explicit `--team-id`.

### Plan catalog

`GET https://api.liara.ir/v1/me?teamID=6ace4ec3ec13fe0c3c19c4db` returned HTTP 200.

Relevant response values:

| Choice | Available | Resource / price returned by Liara |
| --- | --- | --- |
| `medium-g2` | Yes | Iran, 1 GB RAM, 1 CPU, 10 GB volume, `displayPrice: 825000`, `price: 1145.83` |
| `medium-g2` bundle `free` | No | `displayPrice: 0` |
| `medium-g2` bundle `basic` | Yes | `displayPrice: 475000` |
| `medium-g2` bundle `standard` | Yes | `displayPrice: 825000` |
| `medium-g2` bundle `pro` | Yes | `displayPrice: 1475000` |

The CLI's human-readable plan list displayed the hardware plan as `824,997.6` Tomans/month and the `basic` feature bundle as `475,000` Tomans/month. These are separate catalog values; this report does not infer a combined billing total.

The selected hardware plan was `medium-g2`; the lowest-priced available feature bundle was `basic`. The `free` feature bundle was not available for this hardware plan.

### Network and app inventory

- `GET https://api.liara.ir/v1/networks?teamID=6ace4ec3ec13fe0c3c19c4db` returned HTTP 200 and one network: `my-network`, ID `6ada2289ce14a814501bd34b`.
- `GET https://api.liara.ir/v1/projects?teamID=6ace4ec3ec13fe0c3c19c4db` returned HTTP 200 with zero projects before creation. The unique test app name was therefore not present in this team's inventory.

The official CLI `liara plan list --output json` also returned `medium-g2` as an available plan. The `liara app list --output json` invocation returned an error instead of an inventory, so the direct `GET /v1/projects` result is the recorded inventory check.

## App creation

Command (credential redacted):

```text
liara app create --app aps-direct-e2e-20261023-a91f --platform node --plan medium-g2 --feature-plan basic --network my-network --api-token <REDACTED> --team-id 6ace4ec3ec13fe0c3c19c4db
```

The official CLI submitted:

```http
POST https://api.liara.ir/v1/projects/
Authorization: Bearer <REDACTED>
Content-Type: application/json
```

```json
{
  "name": "aps-direct-e2e-20261023-a91f",
  "platform": "node",
  "planID": "medium-g2",
  "bundlePlanID": "basic",
  "network": "6ada2289ce14a814501bd34b"
}
```

`readOnlyRootFilesystem` was omitted. The CLI exited with code 0 and printed `App aps-direct-e2e-20261023-a91f created.`

### Creation verification

`GET https://api.liara.ir/v1/projects/aps-direct-e2e-20261023-a91f?teamID=6ace4ec3ec13fe0c3c19c4db` returned HTTP 200:

```json
{
  "project_id": "aps-direct-e2e-20261023-a91f",
  "status": "ACTIVE",
  "type": "node",
  "planID": "medium-g2",
  "bundlePlanID": "basic",
  "isDeployed": false,
  "network": {
    "_id": "6ada2289ce14a814501bd34b",
    "name": "my-network"
  }
}
```

This confirms the live CLI contract succeeds with both `bundlePlanID` and `network`. The earlier Agent request sent only `name`, `platform`, and `planID` and was rejected with `g2_plan_unavailable`; this direct run confirms a complete CLI request works, but does not isolate which of the additional fields alone was decisive.

## Runtime configuration

The sample intentionally exits unless `SERVICE_SECRET` is present. A test-only value was set before the first deployment so the resulting runtime could reach a healthy state. The value is redacted in this report.

Command (test value and credential redacted):

```text
liara env set SERVICE_SECRET=<REDACTED_TEST_VALUE> --app aps-direct-e2e-20261023-a91f --api-token <REDACTED> --team-id 6ace4ec3ec13fe0c3c19c4db
```

The official CLI first read the existing project environment from `GET /v1/projects/aps-direct-e2e-20261023-a91f`, then sent:

```http
POST https://api.liara.ir/v1/projects/update-envs
Authorization: Bearer <REDACTED>
Content-Type: application/json
```

```json
{
  "project": "aps-direct-e2e-20261023-a91f",
  "variables": [
    { "key": "SERVICE_SECRET", "value": "<REDACTED_TEST_VALUE>" }
  ]
}
```

The CLI displayed a restart confirmation; it was accepted. The command exited with code 0 and reported `Configuration variable applied and restarting aps-direct-e2e-20261023-a91f`.

## Source deployment

Local sample tests:

```text
cd sample-apps/nodejs-demo && npm test
```

Result: 2 tests passed, 0 failed. The same test initially could not bind to loopback under the restricted shell; it passed when rerun with local-network permission.

Deployment command (credential redacted):

```text
liara deploy --path sample-apps/nodejs-demo --app aps-direct-e2e-20261023-a91f --platform node --port 3000 --message direct-e2e-validation-2026-10-23 --build-location iran --no-app-logs --api-token <REDACTED> --team-id 6ace4ec3ec13fe0c3c19c4db
```

The CLI's deployment request contract is `POST https://api.liara.ir/v2/projects/aps-direct-e2e-20261023-a91f/releases`. CLI 9.6.0 built this JSON body from the arguments and source directory:

| Request field | Value / handling |
| --- | --- |
| `build.cache` | `true` |
| `build.location` | `iran` |
| `port` | `3000` |
| `type` | `node` |
| `message` | `direct-e2e-validation-2026-10-23` |
| `gitInfo` | Generated from the local source directory by the CLI |
| `platformConfig` | Detected by the CLI for Node.js |
| `sourceID` | Generated by the CLI source upload; exact value not retained |
| `args`, `cron`, `disks`, `envs`, `dockerfile` | Not supplied by this invocation |

The CLI also uploaded a generated compressed source archive before creating the release. The dynamic source ID, git metadata object, and detected platform configuration were not exposed in normal CLI output and are intentionally not reconstructed as literal JSON here.

The CLI exited with code 0 and reported `Deployment finished successfully.` It printed:

```text
App: aps-direct-e2e-20261023-a91f
Path: sample-apps/nodejs-demo
Platform: node
Port: 3000
Auto-detected node version: 22
Compressed size: 1.45KB
All base images are already pulled.
Running npm install...
up to date in 750ms
Successfully built
Upload finished.
Build finished.
Image pushed.
Release created.
Deployment finished successfully.
```

Base image used: `registry2.iran.liara.ir/platforms/node-platform:release-2026-10-17T11-44-node22`.

`--no-app-logs` was used so the build result and the subsequent runtime-log read could be captured independently.

## Post-deployment verification

### Liara project state

The same `GET /v1/projects/{app}?teamID=...` returned HTTP 200 after deployment. Relevant fields:

```json
{
  "project_id": "aps-direct-e2e-20261023-a91f",
  "status": "ACTIVE",
  "type": "node",
  "planID": "medium-g2",
  "bundlePlanID": "basic",
  "isDeployed": true,
  "defaultSubdomain": true
}
```

### Runtime logs

Command (credential redacted):

```text
liara logs --app aps-direct-e2e-20261023-a91f --since "30 minutes ago" --timestamps --last-lines --api-token <REDACTED> --team-id 6ace4ec3ec13fe0c3c19c4db
```

CLI exited with code 0. Runtime output for release `v1`:

```text
2026-10-23T14:34:06 > liara-node-demo@1.0.0 start
2026-10-23T14:34:06 > node server.js
2026-10-23T14:34:06 [liara-node-demo] Server listening on port 3000
2026-10-23T14:34:06 [liara-node-demo] Health check available at http://0.0.0.0:3000/health
```

Non-fatal Node.js warning captured by the CLI: the package does not declare `"type": "module"`; Node reparses `server.js` as an ES module with some performance overhead. This did not prevent the service from starting.

### Public HTTP checks

The public endpoint initially returned transient HTTP 503/502 while the deployment became routable. A subsequent check returned HTTP 200 for both routes:

- `GET https://aps-direct-e2e-20261023-a91f.liara.run/health` — HTTP 200, `Content-Type: application/json`.
- `GET https://aps-direct-e2e-20261023-a91f.liara.run/` — HTTP 200, `Content-Type: application/json`.

Response body:

```json
{
  "status": "healthy",
  "app": "liara-node-demo",
  "message": "Hello from Liara Cloud! Deployed by Liara Agent.",
  "timestamp": "2026-10-23T11:04:42.550Z"
}
```

## Findings for comparing with the Agent code

1. `medium-g2` was available, but its `free` feature bundle was not. The cheapest available bundle returned by Liara was `basic`.
2. The successful direct CLI app-creation request included `bundlePlanID: "basic"` and the selected network ID. The previous Agent request omitted both values and received `g2_plan_unavailable`. The Agent should preserve the valid feature-bundle choices from the authenticated `v1/me` response, require an explicit approved choice, and send the selected value with the app request. A controlled test is still needed to prove whether Liara requires the network field for this account/team.
3. Liara CLI creation success must be followed by a project-details read; this run returned `ACTIVE` and later `isDeployed: true`.
4. Build success and app health are separate checks: the CLI reported a completed release, runtime logs showed the process listening on port 3000, and public `/health` plus `/` returned HTTP 200.
5. The app remains deployed in the test team as `aps-direct-e2e-20261023-a91f`; no deletion or cleanup was performed. The selected hardware and bundle plans may incur ongoing charges.
