# 03: Interactive App Target Selector and Plan Creation Widget

**What to build:**
Build an interactive Persian chat widget `AppTargetSelectorWidget.tsx` that presents the user with two clear options when a project has no configured Liara app:
1. Select an existing active app from their Liara account inventory or enter custom name.
2. Create a new app in Liara: input app name (prefilled with suggested slug), choose from hardware plan cards (RAM, CPU, monthly cost), and click "تأیید و ساخت سرویس در لیارا".

**Blocked by:** 02: Next.js Project Creation API Route and Proxy

**Status:** ready-for-agent

- [ ] Displays initial question: "آیا این اپلیکیشن قبلاً در لیارا ساخته شده است؟"
- [ ] Mode "سرویس موجود": dropdown of existing cloud apps + manual entry option.
- [ ] Mode "سرویس جدید": app name input with suggestions + plan selection cards + create action.
- [ ] Provides clear loading and feedback states in Persian.
- [ ] Component unit tests pass.

