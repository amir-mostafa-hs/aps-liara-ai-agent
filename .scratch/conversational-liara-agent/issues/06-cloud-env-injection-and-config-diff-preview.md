# 06: Cloud Env Injection, `liara.json` & Diff Preview

**What to build:**
Automated credential wiring and codebase configuration fixes. The agent injects generated database connection parameters into Liara application environment variables (`liara env set`), prompts the user optionally to save into a production `.env`, generates or updates `liara.json`, and displays code diffs with an interactive "اعمال خودکار تغییرات" (Apply Changes) button before modifying local files.

**Blocked by:** 05 (Interactive Plan Selection & Database Provisioning)

**Status:** ready-for-agent

- [ ] Automatic injection of connection credentials (e.g. `DATABASE_URL`) into Liara cloud environment via `liara env set`
- [ ] Chat prompt asking user if they also wish to persist variables into local `.env` file
- [ ] Intelligent generation/updating of `liara.json` based on detected platform, port, and start command
- [ ] `DiffPreviewWidget` component rendering unified colorized diffs with 1-click apply confirmation
- [ ] Safe file-writing engine enforcing directory jailing and preventing arbitrary path traversal
- [ ] Automated tests for env setting, diff generation, and file mutation safety

