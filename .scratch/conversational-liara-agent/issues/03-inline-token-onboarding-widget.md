# 03: Interactive Credential Onboarding & Secure Token Input

**What to build:**
A frictionless, conversational onboarding flow for users who have not yet configured a Liara API token. The agent explains in simple Persian where to generate the token in the Liara web console, renders a secure inline password input widget inside the chat bubble, and saves the token directly to the user profile without exposing the raw secret to LLM prompt contexts.

**Blocked by:** 01 (Persian Chat Shell and Sidecar Console Layout)

**Status:** resolved

- [x] Chat detection of missing token transitioning agent to guide mode with illustrated Persian instructions
- [x] `TokenInputWidget` component embedded directly inside the chat feed with validation and masking
- [x] Direct credential persistence to `/api/settings/liara-token` with immediate scope and team verification
- [x] Strict redaction and isolation ensuring token is never included in the agent conversation history or LLM prompt
- [x] Automated tests for secure token submission and masking

