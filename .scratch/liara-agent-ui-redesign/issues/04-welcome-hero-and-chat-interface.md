# 04: Welcome Hero and Chat Interface

**What to build:** Update the main chat interface layout (`apps/web/src/app/page.tsx`, `ChatMessageList.tsx`, `ChatInput.tsx`) to render the 3D welcome hero agent card (`hero-agent.webp`), styled Persian RTL conversational speech bubbles with cyan accents, quick preset prompt chips, and the glowing input box.

**Blocked by:** 01-assets-and-theme-foundation, 03-header-and-stage-navigation

**Status:** ready-for-agent

- [ ] Welcome hero card with gradient `#16222a` to `#121214`, 3D agent illustration (`hero-agent.webp`), and CTA buttons ("شروع دپلوی", "راهنما") rendered at top of chat stream
- [ ] User message speech bubbles styled with cyan accent glass (`bg-liara/15 border-liara/25`) and RTL curvature
- [ ] Assistant messages render clean markdown formatting, code highlights, and widget containers
- [ ] Chat input bar at bottom updated with quick preset prompt chips matching `index.html`
- [ ] Input textarea has cyan glowing focus shadow (`shadow-[0_0_30px_-10px_#2cc4f4]`) and gradient send button
