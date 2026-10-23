# 03: Services Tab Manual Refresh, Auto-Refresh & Active Target Selection

**What to build:**
Connect the Sidecar Console's Services tab to the live `/api/liara/services` endpoint, eliminating static mock data (`aps-test`). Add a manual "Refresh" button with loading state, automatic background polling every 60 seconds, and allow the operator to select an active target application for deployments.

**Blocked by:** 02: Live Liara Credentials Verification & Services API

**Status:** resolved

- [x] Hardcoded mock data (`aps-test`) removed from initial state in `apps/web/src/app/page.tsx`.
- [x] Real cloud services loaded on mount via `/api/liara/services`.
- [x] Manual "Refresh" button (`RefreshCw`) added to the Services tab in `SidecarConsole.tsx` with spinning animation during load.
- [x] Auto-refresh timer triggers background refresh every 60 seconds while the page is active.
- [x] Deleted services immediately disappear upon refresh; newly provisioned services appear with their real live status.
- [x] Operator can select an active application from the list, or create a new app if none exists, updating the target in deployment plans.
- [x] Clean empty state rendered when the user has zero services in their Liara account.
