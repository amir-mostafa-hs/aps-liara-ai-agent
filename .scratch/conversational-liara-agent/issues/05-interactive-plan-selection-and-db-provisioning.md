# 05: Interactive Plan Selection & Database Provisioning

**What to build:**
Interactive plan selection cards inside chat bubbles displaying available Liara resource tiers (RAM, CPU, disk, estimated pricing) fetched dynamically via `liara plan list`. The agent recommends a sensible starter tier, allows 1-click operator plan selection, and upon cryptographic approval, provisions the database on Liara Cloud using `liara db create`.

**Blocked by:** 03 (Credential Onboarding), 04 (Dependency Detection)

**Status:** ready-for-agent

- [ ] Backend service querying Liara plans via CLI (`liara plan list --output json`) and caching tier metadata
- [ ] `PlanSelectorCard` component rendered in chat with RAM/CPU specs, estimated cost, and active selection state
- [ ] Operator approval gate for billable resource creation with cryptographic action verification
- [ ] Subprocess executor for `liara db create --name <db_name> --type <type> --plan <plan>` with argument arrays (no shell=True)
- [ ] Tests for plan listing parsing, approval verification, and command execution

