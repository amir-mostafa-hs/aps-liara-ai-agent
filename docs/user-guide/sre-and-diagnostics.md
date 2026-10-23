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

## 3. Smart SRE Error Diagnosis

If a deployment fails or crashes at runtime:
1. **Log Analysis:** The agent passes the streamed failure logs to `SREDiagnoser`.
2. **Liara Pattern Detection:** The diagnoser identifies specific Liara failure patterns:
   - **App Not Found:** The specified application does not exist or belongs to a different team.
   - **Port Collisions / Mismatch:** The project listens on a port different from `liara.json`.
   - **Missing Environment Variables:** Required variables like `DATABASE_URL` or `SERVICE_SECRET` were not set in the cloud.
   - **Build & Dependency Errors:** Node.js syntax errors, missing packages, or compilation crashes.
3. **Adaptive Remediation:** Instead of generic prompts, the agent presents a context-aware remediation widget proposing exact fixes (e.g. creating the missing service, updating `liara.json` port, or injecting the missing env variable).
4. **Operator Approval:** The operator reviews the proposed remediation and clicks **«تأیید و اجرای اصلاحات»** to automatically trigger healing.

