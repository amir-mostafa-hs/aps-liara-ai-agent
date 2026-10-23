# User Guide: Conversational Workflow

## 1. Dual-Pane Workspace Layout

The application interface is divided into two primary complementary panels:

1. **Left Sidecar Console (`SidecarConsole`):**
   - **Terminal & Logs Tab:** Real-time log streaming from build, deployment, and SRE operations with copy-to-clipboard and clear actions.
   - **Cloud Services Tab:** Live inventory of applications and databases active in the user's Liara account, featuring an auto-refresh timer (60s), manual refresh button, and active target app selection.
   - **System Health Tab:** Live heartbeat of core infrastructure components (PostgreSQL DB connection via Prisma and Python FastAPI engine).
   - **Account Settings Tab:** Complete Liara token management, masked secret display, and team workspace selector.
   - **Collapsible Mode:** Can be minimized into an icon bar to maximize chat screen area on smaller displays.

2. **Right Conversational Chat Area (`ChatMessageList` & `ChatInput`):**
   - Natural Persian (RTL) assistant guiding the user step-by-step.
   - Inline interactive action widgets (Source Ingestion, Liara Token Input, App Target Selector, Hardware Plan Cards, Diff Preview, Deploy Gate, and Remediation Widget).
   - Quick prompt suggestion chips for rapid command entry.

Conversation history can be deleted from the header with **پاک‌کردن گفتگو**. After confirmation, the app deletes all conversations owned by the signed-in user; related messages are removed by the database cascade. The chat returns to its normal start screen with the introduction and suggestions for deployment, project inspection, and Liara token setup. No empty conversation is created until the user sends a new message. This action is unavailable while a response is streaming. Message times are shown in Persian local time; missing or invalid timestamps are omitted.

The chat and its interactive controls support keyboard focus, visible focus indicators, and reduced-motion preferences. User and assistant messages are visually separated and aligned to opposite sides. Suggested actions use the matching deployment, source, and access icons from `apps/web/public/assets`. All Persian UI text, including text inside elements marked for monospace styling, uses Vazirmatn for consistent typography.

When a user asks to configure, save, enter, or obtain a Liara API token, the assistant response includes the token-entry widget below its explanation. The user can paste the token, optionally test it, and save it through the existing protected settings endpoint. Message timestamps use the same Persian UI font as the rest of the conversation.

For generated application secrets, the environment preflight displays the current generated value in a selectable field and provides a copy action. Regenerating the secret updates the displayed value. The value remains in the current page until the user confirms writing the environment settings; users should save a copy in a secure place.

## 2. Typical Deployment Lifecycle

The deployment assistant determines the Liara platform from project manifests and dependencies (for example, `next` in `package.json`, Django/Flask dependencies, `composer.json`, `go.mod`, or a Dockerfile). Users choose the destination service and plan, but do not choose the platform. If the project files do not identify a supported platform, service creation stops instead of guessing or sending an invalid value to Liara.

```
1. Ingest Project Source (Folder, ZIP, Git)
      │
      ▼
2. Static Analysis & Dependency Detection
      │
      ▼
3. Liara Target App Resolution (Existing Cloud App vs. New App Creation)
      │
      ▼
4. Database Provisioning (if required by code dependencies)
      │
      ▼
5. Unified Diff Review (liara.json & .env)
      │
      ▼
6. Deployment Approval Gate
      │
      ▼
7. Real-time Deployment Execution (SSE Log Streaming)
      │
      ▼
8. Post-Deploy Health Probing (Live URL Verification)
      │
      ▼
9. Autonomous SRE Remediation (if errors encountered)
```

