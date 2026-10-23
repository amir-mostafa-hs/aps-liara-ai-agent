# User Guide: App Discovery & Creation

## 1. Static Source Inspection

When you supply a project path (e.g. `sample-apps/nodejs-demo`), upload a ZIP file, or link a Git repository, the agent inspects the directory structure:
- **Platform & Language:** Identifies Node.js, Python, Docker, or Static web apps.
- **Port Detection:** Inspects files for `PORT` variables, default listen ports, or `liara.json`.
- **Database Dependencies:** Scans `package.json`, `requirements.txt`, `prisma/schema.prisma`, and source code references for database drivers (PostgreSQL, MySQL, Redis, MongoDB, MariaDB).
- **Existing Liara Configuration:** Checks if `liara.json` already exists and whether a specific `app` slug is bound.

## 2. Resolving Target Cloud Service

If `liara.json` is missing or the configured app is not present in your Liara account, the agent presents the **«تعیین سرویس مقصد در لیارا»** widget in the chat:

### Path A: Connect to an Existing App («سرویس موجود در لیارا»)
- Displays all active applications currently running in your account.
- Select an existing app from the dropdown or type a custom app name.
- Click **«تأیید و اتصال به این سرویس»**. The agent will generate a `liara.json` diff pointing to this application.

### Path B: Create a Brand-New App («ساخت سرویس جدید»)
- **App ID:** Pre-filled with an intelligent slug derived from your folder or project name (e.g. `nodejs-demo`).
- **Name preflight:** Check the name in the selected account/team before creation. Availability can change before Liara processes the create request.
- **Plan and network selection:** The app loads account/team-scoped hardware plans, available feature bundles, and networks from Liara. It preselects a hardware recommendation and, when provider prices are known, the lowest-priced bundle. You can change either choice. Hardware and bundle prices are displayed separately.
- **Approval:** Review the app name, platform, hardware plan, feature bundle, network, separate prices, and account/team scope. Creating the service can incur charges.
- **Creation status:** The agent reports success only after it confirms the app exists in Liara, then continues to deployment. A provider error stops the flow and is shown to the user.

**Verification status:** The Agent workflow now sends and verifies the hardware plan, feature bundle, and network selected by the user. Simulated end-to-end tests cover the path. A live service creation through the Agent is still pending and must not be inferred from the separate successful direct CLI test. See [Liara app creation diagnostics](../operations/liara-app-creation-diagnostics.md) and the [direct deployment test record](../operations/liara-direct-deployment-e2e-2026-10-23.md).

After a successful deployment, the Agent checks HTTP health and retrieves runtime logs separately. If health fails, the SRE diagnosis requests runtime logs even when build/deployment logs are already available.

## 3. Database Matching & Provisioning

If your project requires a database (such as PostgreSQL):
- The agent checks your active cloud inventory. If an existing database of the matching type is running, it offers to connect to it.
- If no database is found, the agent renders `PlanSelectorCard` so you can choose a database plan.
- Upon creation, internal private network hostnames and connection strings are generated and prepared for injection into the project's `.env` and `liara.json`.

Connection values from a database created by the Agent are kept out of ordinary chat and terminal output. They are sent to the app environment only after the user approves the write, and deployment starts only after Liara confirms it. External-service credentials that the Agent cannot retrieve through an authorized integration must be supplied by the user.

For environment review and the post-deployment runtime diagnosis and recovery flow, see [SRE and diagnostics](sre-and-diagnostics.md).

