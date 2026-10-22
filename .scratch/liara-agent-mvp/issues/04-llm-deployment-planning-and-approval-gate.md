# 04: LLM Deployment Planning and Interactive Approval Gate

**What to build:**
An intelligent planning service powered by LangChain and `gpt-6-luna` (or configured OpenAI-compatible LLM) coupled with an interactive human-in-the-loop Approval Gate. The operator clicks "Generate Deployment Plan" from the analysis card. The Python engine invokes the model using Pydantic structured output (`DeploymentPlan`), producing typed actions (target app, platform `nodejs`, port, billable risk flag, and impact level). The run enters state `awaiting_approval`. The dashboard renders the plan with explicit "Approve" and "Reject" buttons. Rejecting cleanly cancels the run and halts execution; approving records an immutable `ActionApproval` record with plan digest in PostgreSQL and transitions the run to approved.

**Blocked by:** 02 (Operator Login and Masked Liara Token Configuration), 03 (Node.js Test Project and Read-Only Static Inspection)

**Status:** resolved

## Acceptance Criteria
- [x] LangChain orchestration enforces Pydantic structured outputs (`.with_structured_output(DeploymentPlan)`) prohibiting arbitrary prose or shell commands.
- [x] Proposed plan explicitly lists target app, platform, port, impact level, and potential cost notice.
- [x] Workflow transitions to `awaiting_approval`, and any attempt to execute mutating actions without matching approval is rejected.
- [x] Clicking "Reject" marks the run as `cancelled` and records the decision.
- [x] Clicking "Approve" records an `ActionApproval` entry with timestamp, user ID, and cryptographic plan digest, unblocking execution.

