# Spec: Liara Agent UI Redesign & Modern Design System Integration

Status: ready-for-agent

## Problem Statement

The current Application Tier UI (Next.js frontend in `apps/web`) uses generic dark zinc styling with standard basic controls and Lucide icons. It lacks the distinctive visual identity, polished glassmorphism, brand iconography, visual stage indicators, animated state transitions, and high-fidelity 3D assets designed for Liara AI Agent (as prototyped in `temp/liara-agent-ui`). This makes the interface feel like a generic administration console rather than a state-of-the-art conversational SRE assistant.

## Solution

Redesign the frontend application tier (`apps/web`) to mirror the visual design, typography, layout, animations, and aesthetic found in `temp/liara-agent-ui`, while preserving all functional capabilities, SSE streaming, authentication, approval cryptography, preflight validation, and test suites. This includes:
1. Copying the full 3D asset library from `temp/liara-agent-ui/assets/` into `apps/web/public/assets/`.
2. Updating `tailwind.config.ts` and `globals.css` with the Liara Agent color palette (`#121214` dark bg, `#2cc4f4` cyan, `#6ee7b7` mint), Vazirmatn typography, glowing card styles, floating animations, and masked 3D icons (`.ico`, `.fl`, `.card`, `.plan`, `.svc`, `.b1`, `.b2`, `.b3`).
3. Overhauling the Login Page (`apps/web/src/app/login/page.tsx`) with the split-screen layout, glowing glassmorphic card, cyan background mesh, and hero illustration from `temp/liara-agent-ui/login.html`.
4. Updating the Header component (`apps/web/src/components/layout/Header.tsx`) to feature the double-row layout with the 3D logo, operational status pill with pulsing indicator, user/team pill badges, and the 6-stage workflow navigation bar (سورس، دسترسی، دیتابیس، تغییرات، دپلوی، خودترمیمی).
5. Transforming the Main Chat Page (`apps/web/src/app/page.tsx` and chat widgets) to include the welcome hero banner card with 3D agent illustration (`hero-agent.webp`), styled conversational bubbles, preset suggestion chips, glowing chat input area, and re-skinned widgets (`SourceInputWidget`, `TokenInputWidget`, `PlanSelectorCard`, `DiffPreviewWidget`, `DeployApprovalWidget`, `RemediationApprovalWidget`, `AppTargetSelectorWidget`, `EnvironmentPreflightWidget`) that match the mock cards.
6. Re-styling the Sidecar Console (`apps/web/src/components/console/SidecarConsole.tsx`) with 3D tab icons (`icon-terminal.webp`, `icon-services.webp`, `icon-health.webp`), terminal color highlights, card-based service list (`.svc` with platform icons `svc-node.webp`, `svc-postgres.webp`, `svc-redis.webp`), pulse health checks, and a matched settings tab.

## User Stories

1. As an operator, I want to see a branded, glowing login page with Liara 3D illustration and secure HttpOnly cookie notice, so that my authentication experience is professional and reassuring.
2. As an operator, I want a double-tier header with Liara 3D logo, active team, operational status indicator, and a 6-stage workflow bar, so that I can immediately tell which phase of the deployment pipeline I am currently in.
3. As an operator, I want an engaging welcome hero card with the 3D agent illustration and quick-action buttons upon opening the app, so that I can start a deployment or view guidance with one click.
4. As an operator, I want the chat bubbles to use distinct Persian RTL styling with cyan accents and dark glass backgrounds, so that conversations are easy to follow and visual hierarchy is clear.
5. As an operator, I want the source selection widget to display a floating 3D source icon and sleek tabs (local path, zip dropzone, git url), so that selecting project code is intuitive and visually clear.
6. As an operator, I want the token configuration widget to feature the floating 3D key icon, status indicators, and clean password styling, so that entering and testing my Liara API token feels secure and smooth.
7. As an operator, I want the database plan selector to display 3-column cards with glowing selection borders and clear specifications (RAM, CPU, SSD, monthly price in Tomans), so that I can choose the appropriate tier confidently.
8. As an operator, I want the config diff preview widget to display code changes in a clean monospaced card with highlighted additions and deletions, so that I can verify changes before approving them.
9. As an operator, I want the deployment approval gate to render an amber-accented card with background graphics, floating 3D rocket icon, and cryptographic plan digest, so that consequential actions stand out clearly before execution.
10. As an operator, I want successful deployments to display a celebratory success card with the 3D success orb and public domain link, so that I get immediate visual confirmation that my app is live.
11. As an operator, I want SRE self-healing and remediation cards to show rose warning styling, 3D repair icon, and root cause diagnosis, so that I understand what went wrong and can authorize fixes with single-click ease.
12. As an operator, I want quick-action prompt chips above the chat input, so that I can quickly run common commands (deploy sample app, inspect requirements, set token) without typing manually.
13. As an operator, I want the sidecar console tabs to feature 3D icons for logs, services, and health, so that switching between monitoring views is pleasant and obvious.
14. As an operator, I want the sidecar service inventory to show dedicated 3D badges for Node, Postgres, and Redis with live status pills, so that I can monitor active cloud resources at a glance.
15. As an operator, I want the system health tab in the sidecar to display pulsing indicators for the local database, Python engine, and Liara API connectivity, so that I know the system's operational readiness.
16. As an operator, I want all existing backend capabilities, SSE streaming, authentication sessions, and cryptographic approval gates to continue functioning without regressions.

## Implementation Decisions

- **Asset Directory Placement**: Static assets from the prototype are placed into the Next.js public directory (`apps/web/public/assets/`), allowing standard static serving via `/assets/<name>.webp`.
- **Design Tokens & Utility Classes**: Tailwind theme extension for `liara` (`#2cc4f4`), `mint` (`#6ee7b7`), and `bg` (`#121214`). Utility classes (`.card`, `.ico`, `.fl`, `.b1`, `.b2`, `.b3`, `.b0`, `.inp`, `.plan`, `.svc`, `.pulse`) defined in `globals.css` ensuring zero-runtime CSS overhead and seamless reusability across components.
- **Stage Tracking in Header**: The header's 6-stage navigation bar (سورس، دسترسی، دیتابیس، تغییرات، دپلوی، خودترمیمی) is bound to the dynamic state of the active workflow in the chat session, while remaining interactive.
- **Preserve All Component Props & Callbacks**: Every widget retains its exact interface and internal handler functions so that all parent-child communication in `apps/web/src/app/page.tsx` remains intact.
- **High-Seam Testing**: All existing test suites in `apps/web/tests/` continue testing external behavior through the highest seams (HTTP endpoints, workflow modules, component contracts).

## Testing Decisions

- **Behavioral Preservation**: Tests verify that the UI redesign does not alter JSON request/response formats, cryptographic plan digests, approval requirements, or SSE event parsers.
- **Test Coverage**: All 63 existing tests in `apps/web/tests/` must pass completely without modification.
- **Visual Verification**: Verify that all assets load with HTTP 200, fonts render properly in RTL, glow effects and hover states function smoothly, and responsiveness works on mobile and desktop.

## Out of Scope

- Modifying the Python Agent Engine (`engine/`) or backend tool execution logic.
- Altering the Prisma database schema or session encryption mechanisms.
- Changing CLI/MCP capabilities.

## Further Notes

- The prototype in `temp/liara-agent-ui` represents a static HTML/Tailwind mockup. The actual Next.js application requires stateful React components, dynamic SSE log streaming, responsive collapsible sidebars, and authenticated session state.
