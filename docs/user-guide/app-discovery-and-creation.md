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
- **Hardware Plan Selection:** Choose between official Liara pricing plans:
  - **اقتصادی (ir-standard-1):** 512 MB RAM, 0.25 CPU Core (60,000 Toman/mo)
  - **استاندارد (ir-standard-2):** 1024 MB (1 GB) RAM, 0.5 CPU Core (120,000 Toman/mo - *Recommended*)
  - **حرفه‌ای (ir-standard-4):** 2048 MB (2 GB) RAM, 1 CPU Core (240,000 Toman/mo)
- **Instant Creation:** Clicking **«تأیید و ساخت سرویس در لیارا»** makes an authenticated API call (`POST /v1/projects`) to provision the app instantly. The live service immediately appears in your Sidecar Services tab.

## 3. Database Matching & Provisioning

If your project requires a database (such as PostgreSQL):
- The agent checks your active cloud inventory. If an existing database of the matching type is running, it offers to connect to it.
- If no database is found, the agent renders `PlanSelectorCard` so you can choose a database plan.
- Upon creation, internal private network hostnames and connection strings are generated and prepared for injection into the project's `.env` and `liara.json`.

