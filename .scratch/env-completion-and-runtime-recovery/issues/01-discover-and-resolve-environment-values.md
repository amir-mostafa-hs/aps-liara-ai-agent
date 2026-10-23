# 01: Discover and Resolve Environment Values Before Deployment

**What to build:** The agent identifies a project's required environment values, explains where each requirement came from, determines whether Liara, an agent-created Liara service, the user, or secure generation supplies the value, and resolves it with the user's input and approval. Deployment starts only after all required Liara writes are confirmed.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Inspection identifies variables from env example files, relevant project configuration, and supported source references, and explains the evidence for each one.
- [x] Variables are classified as platform-provided, from a verified Liara service, external credentials requiring user input, generated application secrets, or unresolved/ambiguous.
- [x] Example and placeholder values are not silently treated as production values.
- [x] For a required secret, the agent asks whether the user will enter it or wants a secure generated value; generated secrets are masked by default and the user is reminded to save them securely.
- [x] Secret values are excluded from model prompts, logs, and ordinary conversation history.
- [x] Approval is bound to the target app, variable, chosen source/value action, and exact cloud write.
- [x] A Liara write is awaited and provider-confirmed before deployment begins; failure or ambiguity blocks deployment and is explained in Persian.
- [x] Behavioral tests simulate user choices and Liara responses and verify no real Liara operation is used by automated tests.

**Verification:** All 63 web tests and 82 Engine tests pass. TypeScript checking and the production build pass. The simulated Liara journey verifies inspection and provider-confirmed environment setup without real credentials.
