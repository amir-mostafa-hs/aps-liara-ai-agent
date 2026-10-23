# 03: Header and Stage Navigation

**What to build:** Redesign the Header component (`apps/web/src/components/layout/Header.tsx`) to feature the double-row layout with 3D logo, operational status pill with pulsing emerald indicator, active team pill, operator user pill, and the 6-stage workflow navigation bar (سورس، دسترسی، دیتابیس، تغییرات، دپلوی، خودترمیمی) reflecting the active deployment phase.

**Blocked by:** 01-assets-and-theme-foundation

**Status:** wontfix

- [x] Row 1 header renders 3D Liara logo, title, and "دستیار مکالمه‌ای SRE" badge
- [x] Team badge, operational health indicator, operator username, clear-conversation action, and logout button are available

## Product decision

The stage navigation was removed after UI review because its steps duplicated the chat surface and did not provide distinct functionality. The conversation and its actual widgets remain the workflow interface. The spec was updated accordingly; do not reintroduce decorative stage tabs without an approved interaction model.
