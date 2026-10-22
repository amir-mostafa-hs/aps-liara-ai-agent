# ADR-0001: Interface Prioritization for 2-Day MVP

## Context

The Liara Deployment & SRE Agent specification lists four interface surfaces: CLI, Web UI, HTTP API, and MCP. However, the project has a strict 48-hour delivery window, 50 points of the evaluation rubric depend on UX clarity, and a 5-minute video demonstration of the visual output is mandatory. Developing four standalone, production-grade interfaces simultaneously risks scope creep and failure to deliver a verified end-to-end deployment.

## Decision

We establish a strict tiered implementation priority:
- **P0 (Demo & Evaluation Core):**
  - Shared Application/Workflow Core (`src/liara_agent/application/`).
  - Web UI (lightweight interface for run creation, plan inspection, approval gate, and live logs/results).
  - Minimal CLI (for local path ingestion and execution kick-off).
  - HTTP API acting directly as the backend for the Web UI.
- **P1 (Extended Assistant Integration):**
  - Standard MCP server (stdio transport) exposing typed operations to external coding assistants, implemented only after P0 deployment and verification workflows are stabilized.

## Consequences

Development effort immediately focuses on a reliable, single-process modular core with a responsive web dashboard for the demo. External MCP capabilities will not block the initial verified deployment milestone.

