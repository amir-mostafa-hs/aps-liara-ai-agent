# 07: End-to-End Verification and Test Suite

**What to build:** Perform end-to-end verification of the whole application tier, verify that all 63 unit/integration tests pass without regressions, verify all assets render at runtime with HTTP 200, and ensure complete visual fidelity with `temp/liara-agent-ui`.

**Blocked by:** 02-login-page-redesign, 05-interactive-chat-widgets-redesign, 06-sidecar-console-redesign

**Status:** resolved

- [x] Execute `pnpm --filter web test` and ensure all 63 tests pass
- [x] Verify that Next.js builds successfully (`pnpm --filter web build` or equivalent)
- [x] Confirm all 19 webp assets are correctly served from `/assets/`
- [x] Verify responsive layout across mobile and desktop
- [x] Validate end-to-end interactive deployment flow (source -> inspect -> plan -> diff -> deploy -> verify) in chat
