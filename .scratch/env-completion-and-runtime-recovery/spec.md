# Environment Completion and Runtime Recovery

**Status:** ready-for-agent

## Problem Statement

The Liara Agent can report a deployment as successful even when the application is not running. In the observed `nodejs-demo` run, Liara completed the deployment but the health check returned HTTP 503. Runtime logs in the Liara console showed that the process repeatedly exited because `SERVICE_SECRET` was missing. Although project inspection could discover the variable name from the sample env file and application source, the deployment flow did not pass that requirement into the application environment setup. It also reported environment injection without waiting for or checking the provider response.

The subsequent SRE response used successful deployment output instead of the application's runtime evidence. It told the user in English that no error had been detected and presented an unrelated app-creation action. The user needs a beginner-friendly Persian workflow that identifies required values before deployment, handles sensitive values safely, and, when deployment or health fails, explains the cause from appropriate evidence and offers a specific, approval-gated recovery action.

## Solution

Inspect project env examples, configuration, and relevant source references before deployment. Classify each discovered variable by source, whether it is required, whether it is sensitive, and whether its value can be safely obtained from Liara or generated. Ask the user for missing external credentials, and ask whether to enter or securely generate a secret when a new application secret is required. Never treat an example value as a production secret without confirmation. Keep secrets out of model prompts, logs, and ordinary conversation history; tell users to securely save generated secrets.

Do not start deployment until required values are resolved and Liara has confirmed all approved environment writes. On health failure, retrieve runtime logs independently from deployment logs and base the diagnosis on the correct evidence. Explain the cause and proposed action in Persian. If runtime evidence cannot be obtained and project evidence is insufficient, state that diagnosis is inconclusive instead of inventing a cause. A remediation must target the same confirmed app and may execute only after the user approves the exact action. Verify the provider write and recheck application health afterward.

The primary automated seam is a full behavioral journey from project inspection and env resolution through a simulated Liara deployment, failing health check, runtime-log diagnosis, remediation approval, and successful re-verification.

## User Stories

1. As a beginner, I want the agent to inspect env example files, project configuration, and application code, so that required runtime values are identified before deployment.
2. As a beginner, I want the agent to show which file or code evidence requires each variable, so that I can understand why the value is needed.
3. As a user, I want each variable classified by its source and sensitivity, so that I know whether Liara, another service, or I must provide its value.
4. As a user, I want Liara-provided runtime values to be handled automatically, so that I do not have to enter values that the platform supplies.
5. As a user, I want connection values from Liara services created for my project to be connected automatically after provider confirmation, so that the deployed app can use those services.
6. As a user, I want the agent to ask me for external credentials that it cannot access through an authorized integration, so that it does not invent or silently omit them.
7. As a user, I want to choose between entering a required application secret myself and having the agent generate a secure value, so that I retain control over sensitive configuration.
8. As a user, I want the agent to ask before writing a generated secret to Liara and remind me to save it securely, so that I do not lose an important credential.
9. As a user, I want secret values masked in the interface and excluded from model prompts, logs, and ordinary conversation history, so that deployment help does not expose credentials.
10. As a user, I want example values to be treated as examples until verified, so that placeholder or demo credentials are not silently used in production.
11. As a user, I want the agent to block deployment while a required variable is unresolved or an approved Liara write has failed, so that the app is not knowingly deployed with incomplete configuration.
12. As a user, I want the agent to distinguish a completed Liara deployment from a healthy running application, so that I understand what succeeded and what did not.
13. As a user, I want the SRE workflow to fetch runtime logs independently after a failed health check, so that the app's startup and runtime errors are analyzed instead of deployment-success messages.
14. As a user, I want a Persian explanation of the root cause, evidence, confidence, and next step, so that I can act without interpreting English diagnostics.
15. As a user, I want the agent to state when evidence is unavailable or inconclusive, so that it does not claim a cause it cannot support.
16. As a user, I want a proposed remediation to identify its exact target and environment change, so that I can make an informed approval decision.
17. As a user, I want the agent to wait for my approval before changing a Liara service, so that no remediation is applied without my consent.
18. As a user, I want an approved env remediation to reuse the existing app, verify the provider write, and recheck HTTP health, so that recovery does not create a duplicate app or claim success prematurely.
19. As a user, I want provider, log-retrieval, and health-check failures to be reported separately in Persian, so that I know which part needs attention.
20. As a user, I want these flows to be tested without connecting automated tests to Liara, so that the checks remain safe, repeatable, and fast.

## Implementation Decisions

- Preserve the hybrid Application Tier and Agent Engine architecture and existing Approval Gate, Liara Adapter, and Credential Store boundaries.
- Extend project analysis with env metadata that identifies the variable name, evidence/source, requiredness, sensitivity, value source, and resolution state. Keep raw secret values out of model-facing analysis and ordinary API results.
- Support the following value sources: Liara-provided runtime values; outputs from a Liara service created and verified by the agent; credentials the user must provide for external services; application secrets that the user may enter or ask the agent to generate; and unresolved/ambiguous values that require a user question.
- Treat `.env.example` values as untrusted examples. Do not copy likely placeholders or sample secrets to the cloud automatically.
- Bind secret-generation choice, target app, variable name, and write action to an explicit approval. Mask generated values by default, provide a deliberate secure save/copy affordance, and remind the user to retain the secret. Do not persist raw values in chat history or logs.
- Await and validate Liara environment-setting results before deployment. A failed or ambiguous write blocks deployment and is reported accurately.
- For health failures, always request runtime logs independently from deployment logs. Never use deployment output that says deployment succeeded as runtime evidence. Preserve log source metadata and retrieval warnings.
- Diagnosis output uses structured fields for Persian root cause, evidence, confidence, and remediation. Raw application log excerpts may remain in their original language and are clearly labeled as evidence.
- If runtime logs are unavailable, use only corroborating project-inspection or operation evidence. Otherwise return an inconclusive diagnosis with no fabricated remediation.
- Restrict automatic remediation to supported environment-setting operations on the already-confirmed target. Require explicit approval, verify Liara's result, and recheck application health before reporting recovery.
- Do not add automatic credential retrieval from arbitrary third-party services. Ask users for values unless an authorized, supported integration or verified Liara service output supplies them.

## Testing Decisions

- Use one high-level behavioral seam with Liara simulated at the provider boundary. Exercise the user-observable journey from inspection through env approval, deploy, HTTP failure, runtime evidence, Persian diagnosis, approved remediation, and health recovery.
- Add one failing behavior test before each implementation slice and iterate red → green → refactor only after the behavior is established.
- Assert that required values are identified from the sample env and source; examples are not silently sent; external credentials are requested; generated secrets require choice and approval; and secret values do not leak into model requests, logs, or ordinary chat output.
- Assert that unresolved env or a failed Liara write blocks deployment, while successful approved writes are confirmed before deployment starts.
- Assert that diagnosis uses runtime logs rather than successful deployment logs, is Persian for user-facing explanations, and reports inconclusive status when evidence is absent.
- Assert that rejected remediation causes no provider mutation; approved remediation uses the same app, verifies the write, and only reports recovery after a healthy recheck.
- Simulate Liara HTTP/CLI responses and process results. Automated tests must not write to a real Liara account.
- Prior art includes project-inspection tests, deployment workflow and approval tests, Liara adapter tests, SRE diagnoser tests, and existing browser-level workflow tests.
- A separate manual smoke test may use the existing `nodejs-demo` app after the user approves the generated or entered value in the Agent. It must not create or delete a Liara service.

## Out of Scope

- Automatically discovering or fetching credentials from arbitrary third-party accounts without an authorized integration.
- Creating additional databases or third-party services as part of this change.
- Applying environment changes or remediation without the user's explicit approval.
- Treating build/deployment logs as proof that the app is healthy.
- Broad automatic code edits, arbitrary shell actions, or autonomous repeated remediation.
- Changing or deleting unrelated Liara applications or resources.

## Further Notes

- The observed Liara runtime log contained `FATAL ERROR: Missing required environment variable: SERVICE_SECRET` and `Application failed to start. Configure SERVICE_SECRET in your environment.` The application health check returned HTTP 503 after Liara reported deployment completion.
- The Agent's UI showed a successful deployment, then a diagnosis message stating that no error was detected and suggesting an unrelated app-creation fix. These are separate failures: env setup was not connected to inspected project requirements, and SRE selected the wrong evidence/language.
- The approved ticket graph has two independent first tickets; the remediation ticket depends on both.
