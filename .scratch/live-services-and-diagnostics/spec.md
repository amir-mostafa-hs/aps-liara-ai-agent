# استانداردهای فنی و معماری: سرویس‌های زنده ابری، اعتبارسنجی دسترسی‌ها و عیب‌یابی هوشمند SRE

## Problem Statement

اپراتور در کار با ایجنت هوشمند دپلوی با چند مشکل مواجه است:
1. **نمایش کاذب و کش استاتیک سرویس‌ها:** تب سرویس‌های ابری سایدکار به جای استعلام زنده از API لیارا، حاوی اطلاعات هاردکدشده (`aps-test`) است و وقتی کاربر سرویسی را در لیارا حذف یا ایجاد می‌کند، لیست تغییر نمی‌کند. هیچ دکمه‌ای برای رفرش دستی یا سازوکار بروزرسانی خودکار دوره‌ای وجود ندارد.
2. **وضعیت نادرست در تب سلامت سیستم:** تب سلامت همواره متن ثابت «متصل» با تیک سبز نمایش می‌دهد، حتی وقتی پایگاه داده PostgreSQL یا کانتینرها متوقف باشند.
3. **خطای مسیر پوشه محلی:** هنگام انتخاب «مسیر محلی پوشه» و وارد کردن پروژه‌های نمونه یا دایرکتوری‌های سیستم، سیستم به دلیل خطای نگاشت ریشه و خطای اشتباه Path Traversal ارور ۴۰۰ با متن `Source directory does not exist` می‌دهد.
4. **عدم شناسایی دقیق خطا و پیشنهاد نامربوط در عیب‌یابی:** در صورت بروز خطای استقرار (مانند نبود اپلیکیشن در لیارا یا خطای پورت و بیلد)، لاگ‌های استریم به دلیل عدم خواندن بدنه درخواست در اندپوینت عیب‌یابی ارسال نمی‌شوند و سیستم به صورت پیش‌فرض و نامربوط متغیر `SERVICE_SECRET` را برای رفع مشکل پیشنهاد می‌دهد.

---

## Solution

ارائه یک بسته یکپارچه از بهبودها در سه لایه بک‌اند موتور پایتون، لایه API فریم‌ورک Next.js و رابط کاربری فارسی:
1. استعلام زنده پروژه‌ها و دیتابیس‌ها از API لیارا (`GET /v1/projects` و `GET /v1/databases`) و ارائه اندپوینت `/api/liara/services`.
2. افزودن دکمه رفرش دستی و تایمر بازخوانی خودکار هر ۶۰ ثانیه در تب سرویس‌ها و فراهم کردن امکان انتخاب سرویس فعال یا ایجاد خودکار سرویس جدید.
3. اتصال تب سلامت به وضعیت زنده Prisma و Engine و تغییر نشانگرها به قرمز/هشدار در زمان قطعی، به همراه دکمه بررسی مجدد سلامت.
4. اصلاح اعتبارسنجی مسیر محلی پروژه جهت پشتیبانی کامل از مسیرهای نسبی ریشه ریپازیتوری (`sample-apps/nodejs-demo`) و دایرکتوری‌های معتبر محلی سیستم بدون مسدودسازی بی‌مورد.
5. انتقال کامل لاگ‌های خطا به موتور SRE، ارتقای قوانین عیب‌یابی برای خطاهای متداول (مانند پیدا نشدن اپ، خطای پورت، خطای بیلد) و نمایش کارت راهنمای هوشمند متناسب با خطا به جای پیشنهاد نابجای متغیر محیطی.

---

## User Stories

1. As an operator, I want the agent to verify my Liara API token upon workspace load, so that I immediately know if my cloud credentials are valid or missing.
2. As an operator, I want the Services tab to fetch live applications and databases directly from Liara, so that deleted services disappear and newly created services appear.
3. As an operator, I want a manual "Refresh" button with loading state in the Services tab, so that I can immediately synchronize cloud state on demand.
4. As an operator, I want the system to automatically poll and refresh my active cloud services every 60 seconds, so that I never have to stare at outdated infrastructure state.
5. As an operator, I want to select which cloud application is my deployment target, so that I am not restricted to a hardcoded service name.
6. As an operator, I want the System Health tab to display the real connection status of PostgreSQL, so that when my database is offline or restarting it turns red and alerts me.
7. As an operator, I want the System Health tab to reflect the true reachability of the Python AI Engine, so that connectivity issues are caught immediately.
8. As an operator, I want a "Check Health" refresh button inside the Health tab, so that I can re-verify infrastructure status after fixing a local container.
9. As an operator, I want to enter relative paths like `sample-apps/nodejs-demo` in the local source picker, so that the sample applications work out of the box.
10. As an operator, I want to specify valid absolute directory paths on my machine, so that I can deploy any local repository without path traversal errors.
11. As an operator, I want the SRE diagnoser to receive the actual deployment failure logs, so that it can accurately pinpoint why my deployment failed.
12. As an operator, I want a clear Persian diagnosis when my target Liara app does not exist, so that I know I need to create the app or check my team selection.
13. As an operator, I want remediation suggestions to match the actual failure cause rather than always prompting for `SERVICE_SECRET`, so that guidance is actionable.
14. As an operator, I want unique React message keys in the chat, so that the UI never crashes or logs key collision errors in the browser console.

---

## Implementation Decisions

- **Unified Cloud Services Contract:** The Python engine's `LiaraAdapter` queries both `/v1/projects` and `/v1/databases` and returns an array of normalized objects: `{ name, type, status, endpoint, port }`.
- **Token Protection Boundary:** Tokens are fetched server-side from PostgreSQL or environment; no API tokens are returned to the client or embedded into LLM prompt contexts.
- **Source Path Confinement Seam:** Local path validation checks `path.resolve(baseDir)` and repo root `path.resolve(baseDir, "..", "..")`. Safe existing system directories are verified as directories with filesystem checks, while blocking path traversal tricks (`..` escaping).
- **Diagnose Request Forwarding:** `/api/runs/[id]/diagnose` accepts `{ logs, provider_status }` in its JSON payload, falling back to database records if omitted.
- **Dynamic Health Status Binding:** `SidecarConsole` consumes `systemHealth: { database: boolean; engine: boolean }` and maps boolean values to green (متصل) or rose/red (قطع ارتباط) badges dynamically.
- **Adaptive Remediation Widget:** The remediation card inspects `diagnosis.missing_variable`; if present, it provides an environment variable form; if absent, it provides clear contextual Persian guidance and resolution action buttons.

---

## Testing Decisions

- **Engine Unit Tests:** Verify `liara_adapter.get_services` with mocked HTTP responses for apps and databases.
- **Diagnoser Unit Tests:** Verify diagnosis for "Could not find the app", build errors, port errors, and missing environment variables.
- **Web Source Ingestion Tests:** Verify `validateSourcePath` on `sample-apps/nodejs-demo` from both `apps/web` and repository root.
- **Health & Services Route Tests:** Verify `/api/liara/services` and `/api/runs/[id]/diagnose` with valid and invalid payloads.
- **Browser Interaction Tests (Brave MCP):** Live verification of Services tab refresh, Health tab responsiveness, and chat remediation flow.

---

## Out of Scope

- Automated billing or paid plan subscription changes without explicit operator confirmation.
- Direct SSH/SFTP access into Liara containers.
- Automatic multi-region replication.

---

## Further Notes

All UI elements must maintain Persian (RTL) localization, clean shadcn/ui styling, and strict adherence to security guardrails.
