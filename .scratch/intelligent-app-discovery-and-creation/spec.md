# Intelligent Liara App Discovery, Matching & Service Creation Spec

## Problem Statement

When deploying an application via the Liara AI Agent, the system currently assumes a hardcoded or arbitrary first active app name from the user's account if `liara.json` is missing from the repository. It does not:
1. Check whether the target app actually exists and is ready in the user's Liara Cloud account.
2. Inquire whether the user has previously created this application in Liara or wants to deploy to an existing app.
3. Allow creating a new Liara app with hardware plan selection (RAM, CPU, Price) right from the chat workspace when the app does not exist.
4. Verify if required services (e.g., PostgreSQL database) already exist in the user's Liara inventory before asking to provision a new one.

This leads to confusing configurations, unintentional deployments to incorrect existing apps, and inability to deploy fresh projects from scratch without manually opening the Liara dashboard.

## Solution

A conversational, inventory-aware discovery and provisioning workflow:
1. **Static Inspection:** The engine analyzes the project and detects platform, port, database dependencies, presence of `liara.json`, and whether an `app` name is explicitly defined.
2. **Account Inventory Verification:** The system matches project needs against active services in the user's Liara account.
3. **Conversational App Disambiguation:**
   - If `liara.json` has a valid matching app: proceed directly.
   - If `liara.json` is missing or the app is not in the account: ask the user whether they have already created an app in Liara or need a new one.
   - If existing: let the user select from their active cloud apps (or specify an app name).
   - If new: offer an auto-suggested app name, present an interactive hardware plan selector, and autonomously create the app via the Liara API/CLI.
4. **Database Matching:** If a database is required, check if a suitable instance already exists in the account; offer connecting to it or provisioning a new one with plan selection.
5. **Configuration Diff & Deployment:** Generate accurate `liara.json` diff and `.env` credentials, request approval, and stream deployment.

## User Stories

1. As a developer deploying a new project without `liara.json`, I want the AI agent to ask if I already created an app in Liara, so that I don't deploy over an unrelated existing project.
2. As a developer with existing cloud apps, I want to select my target app from a list of active apps in my account, so that I don't have to look up the exact slug.
3. As a developer deploying a brand-new project, I want the AI agent to create the app service in Liara on my behalf, so that I don't have to leave the chat to visit the Liara console.
4. As a developer creating a new app service, I want to see and choose hardware plans (RAM, CPU, and cost), so that I control my resource budget.
5. As a developer whose project requires a PostgreSQL database, I want the agent to check if I already have an active Postgres instance in my Liara account, so that I can reuse it instead of paying for a new one.
6. As a developer whose project needs a database not yet in my account, I want the agent to guide me through provisioning one with plan selection before deployment.
7. As a developer, I want to see a clear diff of `liara.json` with the confirmed app name before it is written to disk, so that I retain full control over configuration changes.
8. As a developer, I want all sensitive Liara tokens redacted from logs and never exposed in prompts or chat messages.

## Implementation Decisions

- **Engine Inspection Model:** Enhance `ProjectAnalysis` with `has_liara_json`, `existing_app_name`, and `suggested_app_name`.
- **Project Creation Service:** Implement `create_project` in `LiaraAdapter` using `POST /v1/projects` (with fallback to `liara create`), and expose via `POST /liara/projects` with `verify_internal_secret`.
- **Next.js API Route:** Implement `POST /api/liara/projects` forwarding authenticated requests to the Python engine.
- **Interactive UI Widget:** Introduce `AppTargetSelectorWidget` in the chat for selecting an existing app or creating a new app with plan selection.
- **State Machine in Chat:** Update `page.tsx` to pause after inspection and present the `AppTargetSelectorWidget` whenever target app disambiguation is required, proceeding to DB check and diff generation only after the target app is resolved.

## Testing Decisions

- Test engine inspection for `has_liara_json`, `existing_app_name`, and `suggested_app_name`.
- Test `create_project` in `LiaraAdapter` for valid payload, team scoping, and error handling.
- Test Next.js proxy route `POST /api/liara/projects`.
- Test front-end state transitions in chat shell for app selection and creation.

## Out of Scope

- Deleting existing Liara apps or databases from within the chat interface.
- Multi-region selection (defaults to Iran region `iran.liara.ir`).

## Further Notes

All UI elements must be in clean, natural Persian (RTL) adhering to existing styling.

