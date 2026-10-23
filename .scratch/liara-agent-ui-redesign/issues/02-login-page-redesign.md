# 02: Login Page Redesign

**What to build:** Redesign the operator authentication page (`apps/web/src/app/login/page.tsx`) to match the split-screen layout from `temp/liara-agent-ui/login.html` with the cyan mesh background, glassmorphic operator card, 3D logo, secure HttpOnly cookie notice, and desktop hero illustration banner.

**Blocked by:** 01-assets-and-theme-foundation

**Status:** resolved

- [x] Operator login page split into form side and desktop hero side matching `login.html`
- [x] 3D logo (`logo.webp`) and 3D hero landscape (`login-hero.webp`) rendered
- [x] Form input fields styled with dark glass background, mono fonts, and cyan focus rings
- [x] Gradient submit button (`bg-gradient-to-l from-liara to-mint`) with loading state
- [x] HttpOnly session security guidance text included with mint indicator dot
- [x] Form submission, error alert handling, and auth session redirect to `/` work identically to original logic
