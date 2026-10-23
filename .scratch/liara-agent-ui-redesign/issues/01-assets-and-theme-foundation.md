# 01: Assets and Theme Foundation

**What to build:** Set up static 3D assets in `apps/web/public/assets`, extend Tailwind configuration with `liara`, `mint`, and `bg` theme colors, and define modern glassmorphic utility classes (`.card`, `.ico`, `.fl`, `.pulse`, `.b1`, `.b2`, `.b3`, `.b0`, `.inp`, `.plan`, `.svc`, `.pill`) in `globals.css` with Vazirmatn Persian typography.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] All 19 webp assets from `temp/liara-agent-ui/assets/` copied into `apps/web/public/assets/`
- [x] Tailwind theme in `apps/web/tailwind.config.ts` extended with `bg: '#121214'`, `liara: '#2cc4f4'`, `mint: '#6ee7b7'`
- [x] CSS utilities (`.ico`, `.fl`, `.pulse`, `.card`, `.inp`, `.btn`, `.b1`, `.b2`, `.b3`, `.b0`, `.pill`, `.plan`, `.svc`) added to `apps/web/src/app/globals.css`
- [x] Root layout updated with global background gradient matching `temp/liara-agent-ui/index.html`
- [x] Existing build and test suite passes without regressions
