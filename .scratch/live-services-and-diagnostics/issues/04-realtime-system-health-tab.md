# 04: Realtime System Health Tab & Live Status Reporting

**What to build:**
Fix the Sidecar Console Health tab so that it dynamically reflects the actual operational health of PostgreSQL and the Python Engine, rendering red alert badges upon downtime instead of static hardcoded "متصل" labels.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Static hardcoded "متصل" strings in `SidecarConsole.tsx` replaced with dynamic badge rendering based on `systemHealth.database` and `systemHealth.engine`.
- [x] When PostgreSQL is disconnected, displays red/rose badge with "قطع ارتباط / خطای پایگاه‌داده" and warning icon (`AlertTriangle`).
- [x] When Python AI Engine is unreachable, displays red/rose badge with "قطع ارتباط با موتور" and warning icon.
- [x] `page.tsx` parses `/api/health` response correctly (`data.status === "healthy"` / `"degraded"`) and updates state accurately.
- [x] `systemHealth` state prop is passed to `<SidecarConsole>`.
- [x] Dedicated "بررسی مجدد سلامت" (Refresh health) button inside Health tab triggers fresh `/api/health` check.
