# 06: Sidecar Console Redesign

**What to build:** Redesign the Sidecar Console (`apps/web/src/components/console/SidecarConsole.tsx`) to feature 3D tab icons for logs, services, and health, colorized terminal stream, card-based service list with 3D platform badges (`svc-node.webp`, `svc-postgres.webp`, `svc-redis.webp`), operational health pulse indicators, and matched settings tab.

**Blocked by:** 01-assets-and-theme-foundation, 05-interactive-chat-widgets-redesign

**Status:** resolved

- [x] Tab header bar equipped with 3D icons (`icon-terminal.webp`, `icon-services.webp`, `icon-health.webp`) and action buttons (Copy, Clear, Collapse)
- [x] Terminal view styled with deep `#0c0c0e` background, monospaced typography, colored status prefixes, and glowing cursor `▌`
- [x] Services view renders `.svc` cards with platform badges (`svc-node.webp`, `svc-postgres.webp`, `svc-redis.webp`), status pills (Running, Deploying, Failed), and endpoint details
- [x] Health tab renders system status items with animated pulse indicator dots (سالم / کند / قطع)
- [x] Settings tab restyled to match modern glassmorphic inputs while preserving masked token display, team selector, and test connection functions
- [x] Collapsible sidebar behavior preserved on both desktop and mobile
