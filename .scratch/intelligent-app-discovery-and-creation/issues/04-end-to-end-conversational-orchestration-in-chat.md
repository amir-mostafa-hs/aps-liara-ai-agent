# 04: End-to-End Conversational Orchestration in Chat

**What to build:**
Update the chat orchestration in `apps/web/src/app/page.tsx` so that when a project is ingested:
1. It compares inspection results against live cloud services.
2. If `liara.json` does not specify a confirmed cloud app, it pauses and displays `AppTargetSelectorWidget`.
3. If database dependencies exist, it checks if an active database instance of that type is already running before proposing new DB creation.
4. Once the target app and database are determined, it generates the `liara.json` diff, prompts for diff approval, requests deploy approval, and streams live deployment.

**Blocked by:** 03: Interactive App Target Selector and Plan Creation Widget

**Status:** ready-for-agent

- [ ] Chat flow does not arbitrarily pick an unrelated app for projects without `liara.json`.
- [ ] Correctly triggers `AppTargetSelectorWidget` when app is unresolved.
- [ ] Detects and offers reuse of existing databases before prompting to provision new ones.
- [ ] Generates `liara.json` with the chosen target app name.
- [ ] Full automated test suite passes and verified via Brave DevTools.

