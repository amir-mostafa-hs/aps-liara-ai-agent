# 03: Header and Stage Navigation

**What to build:** Redesign the Header component (`apps/web/src/components/layout/Header.tsx`) to feature the double-row layout with 3D logo, operational status pill with pulsing emerald indicator, active team pill, operator user pill, and the 6-stage workflow navigation bar (سورس، دسترسی، دیتابیس، تغییرات، دپلوی، خودترمیمی) reflecting the active deployment phase.

**Blocked by:** 01-assets-and-theme-foundation

**Status:** resolved

- [x] Row 1 header renders 3D Liara logo, title, and "دستیار مکالمه‌ای SRE" badge
- [x] Team badge, operational health indicator with pulsing animation, operator username, and logout button displayed
- [x] Row 2 stage navigation renders all 6 stages with their icons (`icon-source.webp`, `icon-key.webp`, `icon-db.webp`, `icon-diff.webp`, `icon-deploy.webp`, `icon-heal.webp`)
- [x] Active stage is visually highlighted and exposed with `aria-current="step"`, based on the latest workflow widget
- [x] Selecting a stage scrolls to the latest matching widget when one exists
- [x] Navigation remains horizontally scrollable and keyboard-operable on narrow and desktop viewports

Implementation: `apps/web/src/components/layout/Header.tsx` renders the stage navigation; `apps/web/src/app/page.tsx` derives the active stage and resolves stage selection to a conversation widget; `ChatMessageList.tsx` provides stable message targets. The behavior is documented in `docs/user-guide/conversational-workflow.md`.
