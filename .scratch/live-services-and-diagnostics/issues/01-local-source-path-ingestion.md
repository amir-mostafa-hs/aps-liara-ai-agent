# 01: Local Source Path Ingestion & Confinement Fix

**What to build:**
Fix local directory path validation so that operators can select local project directories (including `sample-apps/nodejs-demo` and valid absolute paths on the operator's machine) without receiving false `Source directory does not exist` or `Path traversal detected` errors.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] `validateSourcePath` in `apps/web/src/lib/source-ingestion.ts` correctly resolves paths relative to repository root (`../../`) when invoked from `apps/web`.
- [x] `sample-apps/nodejs-demo` is successfully validated as a legitimate project directory and its absolute path returned.
- [x] Valid existing absolute directories on the host filesystem are supported without triggering false path traversal rejections.
- [x] Path traversal attacks (`../../../etc/passwd` or non-directory files) remain strictly blocked and return clear errors.
- [x] Automated tests in `apps/web/tests/source-ingestion.test.mjs` pass cleanly.
