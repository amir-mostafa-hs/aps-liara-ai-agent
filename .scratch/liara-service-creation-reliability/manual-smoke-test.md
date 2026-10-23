# Manual Smoke Test: New Liara App and Deployment

## Latest observed result (2026-10-23)

- The browser loaded Liara-backed hardware plans and confirmed the sample name `nodejs-demo` was available in the selected account/team.
- The user submitted app creation with `medium-g2`; Liara returned HTTP 400 `g2_plan_unavailable`.
- The workflow stopped before deployment. Do not count the real-account smoke test as passed. Investigate the missing feature bundle plan and plan availability as recorded in [`Liara app creation diagnostics`](../../docs/operations/liara-app-creation-diagnostics.md) before the next live attempt.
- No second create attempt was made during diagnosis. See [`docs/operations/liara-app-creation-diagnostics.md`](../../docs/operations/liara-app-creation-diagnostics.md) for the code-level diagnosis and follow-up.

Run this only with a designated Liara test account/team and a disposable app name. The automated suite simulates Liara; this procedure validates provider behavior with a real account. It creates a billable cloud service.

## Prepare

- [ ] Confirm the Liara token is configured for the intended test account and team in the app.
- [ ] Use the repository's `sample-apps/nodejs-demo` fixture as the “Simple App” unless the user's own Simple App source is available locally.
- [ ] Choose a unique app name that is not already present in that account/team.
- [ ] Ensure the account can create apps and has an understood billing limit.

## Verify the flow

- [ ] Start a deployment request for the fixture and choose the new-service path.
- [ ] Confirm the UI loads plans from the connected Liara account and shows the recommended plan, resource details, and any price Liara returns.
- [ ] Enter the unique app name and verify the UI reports availability. Try an existing name and confirm creation is blocked with a clear explanation.
- [ ] Select a plan, review the name/platform/plan/cost, and explicitly approve creation.
- [ ] Confirm the app appears in the same Liara account/team. Confirm the UI reports the provider status without claiming `running` unless Liara reports that state.
- [ ] Confirm the workflow continues to the existing deployment step using the new app name and selected platform.
- [ ] Complete the deployment and verify the deployment result and app endpoint separately from app health.
- [ ] If creation returns an ambiguous result, refresh the service inventory before retrying; confirm the flow does not create a duplicate.
- [ ] If deployment fails after creation, retry deployment against the already-created app instead of repeating service creation.

## Record

Record the date, account/team identifier (never the token), selected plan identifier, app name, Liara status, deployment result, and any provider error. Remove the disposable app through Liara's normal controls when it is no longer needed, following the account's retention and billing practices.
