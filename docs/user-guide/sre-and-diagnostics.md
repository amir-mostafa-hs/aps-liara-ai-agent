# User Guide: SRE & Diagnostics

## 1. Real-time Deployment & SSE Streaming

When deployment is approved, the Python engine launches the Liara deployment process asynchronously. Real-time build and release logs are streamed directly to the **Sidecar Console (Terminal Tab)** over Server-Sent Events (SSE):
- Color-coded output: Green for successful steps, blue for agent notifications, red for error messages.
- Live progress indicator with ping animations in the tab header.
- Full log copy capability (`Copy` icon) for team sharing and troubleshooting.

## 2. Automated Post-Deployment Verification

Immediately after the deployment process reports exit code 0, the agent conducts an automated health check:
- Targets the live public URL (`https://<app-name>.liara.run`).
- Verifies HTTP 200 response and measures roundtrip response latency.
- Reports status back into the chat. If the site is live, a green success message with a direct link is displayed.

## 3. Environment Setup Before Deployment

Before starting deployment, the agent scans env example files, project configuration, and supported source references. For each variable it shows why it is needed, whether the platform supplies it, and whether its value must come from a Liara service, an external provider, the user, or secure generation.

- Values from a verified Liara service can be connected automatically after the user approves the write.
- External credentials such as payment-provider keys must be entered by the user; the agent does not invent or generate them.
- For supported application secrets such as `SERVICE_SECRET`, the user chooses manual entry or secure random generation. Example-file values are never copied as production secrets.
- Sensitive inputs stay masked. A generated secret can be revealed or copied after confirmation; save it in a secure place because it is not recoverable after closing the page.
- Deployment remains blocked until Liara confirms the approved environment-variable write. A failed write is reported in Persian and does not advance to deployment.
- The web API requires an authenticated same-origin request and verifies a digest over the exact app and values the user confirmed. Secret values are sent to Liara through its environment API, not as process command-line arguments; provider output is redacted before returning to the UI.

## 4. Smart SRE Error Diagnosis and Recovery

When a deployment reports success but the application health check fails, the agent requests application runtime logs independently from deployment logs. Successful release output is not treated as runtime evidence. If logs cannot be retrieved and project evidence does not support a cause, the agent says the diagnosis is inconclusive and offers no speculative fix.

For a supported missing environment variable, the diagnosis presents the Persian cause, a redacted log excerpt, the exact Liara app, and the variable to change. For sensitive values, the user chooses manual entry or generation only when generation is appropriate. External credentials are manual-only. Confirmation is recorded against the authenticated owner, run, app, variable, and exact value digest, then consumed once before execution. Rejecting or leaving the widget does not mutate Liara.

Liara must confirm the env write before the agent checks HTTP health again. A provider rejection prevents the health check and cannot be reported as recovery. If Liara accepts the change but HTTP remains unhealthy, the agent reports that distinction and does not silently repeat the write.

All user-facing diagnosis, actions, and error explanations are in Persian. Original log excerpts may remain in English and are shown only as clearly labeled evidence after secret redaction.

## 5. Safe Manual Smoke Test

Use an already-existing Liara app and the `sample-apps/nodejs-demo` project. Do not create or delete an app for this check.

1. Inspect the sample project and confirm that `SERVICE_SECRET` is identified from `.env.example` and `server.js`; confirm that the demo value is marked as an example and is not copied.
2. Choose manual entry or secure generation in the preflight widget. Review the target app and variable, then explicitly approve the env write.
3. Confirm that the UI waits for Liara's response before it starts deployment. A simulated Liara write failure must stop the flow.
4. If the application returns an unhealthy HTTP status, confirm that runtime logs are fetched separately and the Persian diagnosis points to the missing variable using the redacted runtime excerpt.
5. Review the exact target, variable, value source, and proposed action. Rejecting it must produce no Liara write. Approving it should write only to the existing app and trigger a health check only after Liara confirms the write.
6. Confirm that recovery is reported only after HTTP health is healthy. If health remains unhealthy, the UI must say so and must not repeat the mutation automatically.

Automated tests use a simulated Liara boundary and never access a real Liara account. A live smoke test is separate and requires the normal in-product approval for each cloud mutation.

