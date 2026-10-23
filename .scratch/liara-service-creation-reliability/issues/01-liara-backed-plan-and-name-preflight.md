# 01: Liara-Backed Plan and Name Preflight

**What to build:** The user sees current account/team-scoped hardware plans, available feature bundles and networks from Liara; can choose or change recommended defaults; and receives a Liara-backed app-name check before approving creation. Prices and unavailable provider data must remain accurate and must not fall back to stale local defaults.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Plan lookup uses the active user's Liara credentials and selected team scope.
- [x] Hardware and bundle options are restricted to Liara-returned available choices; bundle choices remain associated with their hardware plan.
- [x] Available networks are returned with their provider IDs and selected team scope.
- [x] Decimal and comma-separated provider prices are parsed without dropping fractional values.
- [x] The app creation selector displays plans returned by the verified provider operation and identifies the recommendation and any supported price information accurately.
- [x] The user can select a plan; the selector does not silently substitute a hardcoded plan when provider lookup fails.
- [x] The user can check an app name against the correct account/team inventory before creation.
- [x] Provider lookup errors and unavailable/invalid names produce clear, actionable Persian feedback.
- [x] Deterministic tests verify the user-visible preflight behavior with Liara responses simulated.
- [x] Fake credentials and sensitive provider output are absent from returned UI messages and logs.

## Completion evidence

- Provider catalog and web workflow tests cover team-scoped hardware/bundle/network data, recommendations, unavailable networks, and decimal prices.
- The official CLI 9.6.0 source and direct run record are the provider contract reference; the Agent live creation path remains pending.
