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
- **Hardware plan selection:** The app loads current hardware plans from Liara and preselects a recommendation. Resource values and prices depend on what Liara returns; a missing price is shown as unavailable rather than estimated.
- **Approval:** Review the app name, platform, hardware plan, known price, and account/team scope. Creating the service can incur charges.
- **Creation status:** The agent reports success only after it confirms the app exists in Liara, then continues to deployment. A provider error stops the flow and is shown to the user.

**Known limitation:** A browser smoke test on 2026-10-23 reached Liara but received `400 g2_plan_unavailable` after selecting `medium-g2`. The current API request sends `name`, `platform`, and `planID`; the official Liara CLI also sends `bundlePlanID`. The missing feature-bundle plan is under investigation, and successful live app creation has not yet been verified. See [Liara app creation diagnostics](../operations/liara-app-creation-diagnostics.md) before retrying against a real account.

## 3. Database Matching & Provisioning

If your project requires a database (such as PostgreSQL):
- The agent checks your active cloud inventory. If an existing database of the matching type is running, it offers to connect to it.
- If no database is found, the agent renders `PlanSelectorCard` so you can choose a database plan.
- Upon creation, internal private network hostnames and connection strings are generated and prepared for injection into the project's `.env` and `liara.json`.

