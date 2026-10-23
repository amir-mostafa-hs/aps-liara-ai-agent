# 03: Apply Approved Remediation and Verify Application Health

**What to build:** After a supported remediation is diagnosed, the agent presents the exact change for user approval, applies it to the already-confirmed app only after approval, verifies Liara accepted it, and checks the application's health again before reporting recovery.

**Blocked by:** 01: Discover and Resolve Environment Values Before Deployment; 02: Diagnose Runtime Failures from the Correct Evidence in Persian.

**Status:** ready-for-agent

- [ ] The remediation proposal explains the cause, evidence, target app, variable, and planned action in Persian.
- [ ] A rejected proposal or missing approval performs no Liara mutation.
- [ ] An approved env remediation is bound to the exact target and value action and never creates a duplicate app.
- [ ] Secret values remain protected in logs, model inputs, and ordinary chat history throughout remediation.
- [ ] Liara write failures are reported and cannot be represented as successful recovery.
- [ ] Health is rechecked after provider confirmation; success is reported only after the application returns healthy.
- [ ] The full simulated-Liara journey passes from project inspection and env setup through deployment failure, runtime diagnosis, approved remediation, and healthy verification.
- [ ] The manual smoke-test guide documents the existing-app verification path and the user's approval point without creating or deleting a service.
