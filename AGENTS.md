# Liara Deployment & SRE Agent

## Product & Requirements Reference

The canonical source of truth for the product scope, architecture, and tool contracts is contained in the following documentation files under `docs/`. **Do not rewrite, overwrite, or delete these files**:

- [`01-product-scope.md`](docs/01-product-scope.md): Product scope, user workflows, non-goals, and core constraints.
- [`02-market-and-existing-solutions.md`](docs/02-market-and-existing-solutions.md): Analysis of existing deployment & SRE agent patterns.
- [`03-liara-capability-matrix.md`](docs/03-liara-capability-matrix.md): Liara API / CLI capabilities and feasibility matrix.
- [`04-architecture-and-tool-contracts.md`](docs/04-architecture-and-tool-contracts.md): System architecture, tool schemas, safety boundaries, and contracts.
- [`05-antigravity-implementation-brief.md`](docs/05-antigravity-implementation-brief.md): MVP implementation brief and verification guide.

## Agent skills

### Issue tracker

Issues and tasks are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map 1:1 to standard labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` at repo root and ADRs in `docs/adr/`). See `docs/agents/domain.md`.

