# 05: Interactive Chat Widgets Redesign

**What to build:** Redesign the core interactive workflow widgets (`SourceInputWidget.tsx`, `TokenInputWidget.tsx`, `PlanSelectorCard.tsx`, `DiffPreviewWidget.tsx`, `DeployApprovalWidget.tsx`, `RemediationApprovalWidget.tsx`, `AppTargetSelectorWidget.tsx`, `EnvironmentPreflightWidget.tsx`) to incorporate floating 3D icons, glowing card containers, plan selection radio cards, and diff viewers matching `temp/liara-agent-ui/index.html`.

**Blocked by:** 01-assets-and-theme-foundation, 04-welcome-hero-and-chat-interface

**Status:** resolved

- [x] SourceInputWidget redesigned with floating `icon-source.webp`, tabbed layout (local, zip, git), and styled `.b1` action button
- [x] TokenInputWidget redesigned with floating `icon-key.webp`, live connection status, and `.b2` action button
- [x] PlanSelectorCard redesigned with floating `icon-db.webp`, 3-column responsive `.plan` radio cards, monthly prices in Tomans, and `.b1` action button
- [x] DiffPreviewWidget redesigned with floating `icon-diff.webp`, file tabs, colorized diff code block, and `.b2` / `.b0` buttons
- [x] DeployApprovalWidget redesigned with amber card style, `bg-mint.webp` background, floating `icon-deploy.webp`, SHA-256 plan digest, and emerald approve button
- [x] RemediationApprovalWidget redesigned with rose card style, `state-error.webp` background, floating `icon-heal.webp`, root-cause callout, secret input, and `.b3` button
- [x] AppTargetSelectorWidget and EnvironmentPreflightWidget styled consistently with the modern design tokens
- [x] Successful deployments render the `state-success.webp` celebration card with public endpoint link
- [x] All props, callbacks, and internal validation logic preserved
