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
   - Inline interactive action widgets (Source Ingestion, App Target Selector, Hardware Plan Cards, Diff Preview, Deploy Gate, and Remediation Widget).
   - Quick prompt suggestion chips for rapid command entry.

## 2. Typical Deployment Lifecycle

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

