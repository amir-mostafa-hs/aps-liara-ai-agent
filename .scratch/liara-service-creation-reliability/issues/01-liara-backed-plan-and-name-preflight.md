# 01: Liara-Backed Plan and Name Preflight

**What to build:** The user sees current, account-scoped Liara app plans with a clearly explained recommendation, can choose a plan, and receives a Liara-backed check for whether the requested app name is available before confirming a billable creation. If Liara cannot provide verified plan or name information, the agent explains the limitation in Persian and does not present stale defaults as current provider data.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Plan lookup uses the active user's Liara credentials and selected team scope.
- [x] The app creation selector displays plans returned by the verified provider operation and identifies the recommendation and any supported price information accurately.
- [x] The user can select a plan; the selector does not silently substitute a hardcoded plan when provider lookup fails.
- [x] The user can check an app name against the correct account/team inventory before creation.
- [x] Provider lookup errors and unavailable/invalid names produce clear, actionable Persian feedback.
- [x] Deterministic tests verify the user-visible preflight behavior with Liara responses simulated.
- [x] Fake credentials and sensitive provider output are absent from returned UI messages and logs.
