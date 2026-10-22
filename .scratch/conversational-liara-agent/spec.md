# مشخصات فنی و عملکردی ایجنت هوشمند مکالمه‌ای و خودکار لیارا (Conversational Liara AI Agent)

**Status:** ready-for-agent

---

## Problem Statement

کاربران توسعه‌دهنده برای دپلوی و مدیریت اپلیکیشن‌های خود در سرویس ابری لیارا (Liara Cloud) در حال حاضر با چالش‌های زیر روبرو هستند:
1. **تجربه کاربری پراکنده و پیچیده:** در داشبوردهای چندمرحله‌ای فعلی، کاربر ناچار است چندین کارت، فرم‌های مختلف، و دکمه‌های مجزا را در مراحل گوناگون کلیک کند. واسط کاربری به زبان انگلیسی بوده و برای کاربران مبتدی یا کسانی که ترجیح می‌دهند فرآیند دپلوی را به صورت گفتگوی مستقیم و طبیعی پیش ببرند، پیچیده است.
2. **عدم یکپارچگی سرویس‌های وابسته (Databases & Dependencies):** اگر یک برنامه به پایگاه داده (نظیر PostgreSQL, MySQL, Redis) نیاز داشته باشد، کاربر باید ابتدا به پنل وب لیارا برود، دیتابیس را دستی بسازد، نام کاربری و رمز و پورت را کپی کرده، دستی فایل `.env` را تغییر دهد و سپس به سراغ دپلوی بیاید.
3. **فقدان راهنمایی گام‌به‌گام و محاوره‌ای برای تنظیم توکن و کلیدها:** دریافت و تنظیم توکن API لیارا برای کاربران ناآشنا واضح نیست و نیازمند راهنمایی ساده و تعاملی در همان محیط گفتگوست، بدون آن‌که امنیت توکن نقض شده یا توکن خام وارد پرامپت هوش مصنوعی شود.
4. **عدم تشخیص خودکار کاستی‌های سورس‌کد و ساخت `liara.json`:** در صورتی که پروژه فاقد فایل تنظیمات دپلوی (`liara.json`) باشد یا در `package.json` پورت و اسکریپت استارت ناقص باشد، دپلوی با شکست مواجه می‌شود و کاربر درگیر خطاهای ترمینال می‌گردد.
5. **جدایی فرآیند دپلوی از راستی‌آزمایی رانتایم و خودترمیمی:** پس از اتمام دپلوی، کاربر نمی‌داند آیا اپلیکیشن واقعاً بالا آمده یا در لایه رانتایم (به دلیل کمبود متغیرهای محیطی یا کرش داخلی) با خطای ۵۰۳ متوقف شده است.

---

## Solution

ایجاد یک ایجنت هوش مصنوعی کاملاً فارسی و مکالمه‌محور (Conversational AI Agent) مشابه چت‌بات‌های مدرن (مانند ChatGPT) با واسط کاربری ترکیبی (Hybrid Chat + Sidecar Console):
- **صفحه گفتگوی تعاملی و فارسی (RTL):** کاربر نیازش را به زبان فارسی بیان می‌کند (مثلاً «می‌خواهم این پروژه Node.js را روی لیارا دیپلوی کنم»).
- **دریافت چندگانه سورس‌کد:** کاربر می‌تواند مسیر پوشه محلی را وارد کند، فایل ZIP پروژه را داخل چت درگ‌وان‌دراپ نماید، یا لینک ریپازیتوری عمومی گیت را ارسال کند.
- **راهنمایی و دریافت امن توکن در چت:** اگر توکن تنظیم نشده باشد، ایجنت به زبان ساده در چت توضیح می‌دهد که از کدام بخش پنل لیارا توکن بگیرد و یک ویجت ورودی امن (Password input) داخل چت نمایش می‌دهد؛ توکن در دیتابیس پروفایل کاربر ذخیره شده و به هیچ وجه وارد پرامپت LLM نمی‌شود.
- **تحلیل استاتیک و ایجاد خودکار دیتابیس/سرویس‌های ابری:** ایجنت نیاز به پایگاه داده را شناسایی کرده و با پیشنهاد پلن سخت‌افزاری بهینه و نمایش کارت‌های تعاملی پلن‌ها، با تایید ۱-کلیکی کاربر سرویس را در لیارا می‌سازد و مقادیر اتصال (مانند `DATABASE_URL`) را مستقیماً در متغیرهای ابری لیارا (`liara env set`) تنظیم می‌کند (با پرسش اختیاری جهت ذخیره در `.env` پروداکشن محلی).
- **اصلاح سورس‌کد و ایجاد/بروزرسانی `liara.json`:** در صورت وجود نواقص، پیش‌نمایش تفاوت‌ها (Diff Preview) در چت نشان داده شده و با زدن دکمه «اعمال خودکار تغییرات» فایل‌ها اصلاح می‌شوند.
- **کنسول ترمینال زنده در پنل کناری (Sidecar):** لاگ‌های دپلوی به صورت استریم زنده در پنل ثابت کناری نمایش داده می‌شوند.
- **چرخه کامل خودترمیمی (Closed-Loop SRE Healing):** پس از دپلوی، سلامت رانتایم با درخواست HTTP و واکشی لاگ‌های اجرایی بررسی شده و در صورت کرش، علت ریشه‌ای گزارش و راه‌حل با دکمه تایید به کاربر ارائه می‌شود.

---

## User Stories

1. As an operator, I want a modern conversational chat interface entirely in Persian (RTL), so that I can interact naturally without deciphering English-only technical forms.
2. As an operator, I want a persistent sidecar console next to the chat, so that real-time terminal output and service statuses remain visible without cluttering the chat history.
3. As an operator, I want to specify my project via local directory path, quick sample presets, ZIP file upload, or public Git clone URL, so that I can deploy any application regardless of how my code is hosted.
4. As an operator, I want the agent to explain simply where to obtain my Liara API token and present a secure inline input widget in the chat, so that I can configure access without leaving the chat window.
5. As an operator, I want my Liara API token to be stored directly and securely in my user session/profile, so that it is never leaked into the LLM context window.
6. As an operator, I want the agent to automatically scan my source code and identify external dependencies (such as PostgreSQL, MySQL, Redis, MongoDB), so that I don't have to guess what cloud services my application requires.
7. As an operator, I want the agent to present interactive plan selection cards (showing RAM, CPU, and estimated cost) inside chat bubbles, so that I can choose the appropriate resource tier for my database or app with one click.
8. As an operator, I want the agent to provision the required database service directly via Liara CLI/API upon my approval, so that I never have to navigate the manual Liara web dashboard.
9. As an operator, I want the database connection parameters (e.g. `DATABASE_URL`) to be injected automatically into Liara cloud environment variables, so that the deployed application connects seamlessly.
10. As an operator, I want the agent to ask me if I also wish to update my local `.env` with production database secrets, so that my local workspace stays aligned with my preferences.
11. As an operator, I want the agent to generate or update `liara.json` with the detected platform, port, and start command, so that my deployment succeeds on Liara without configuration errors.
12. As an operator, I want the agent to show a code diff preview for any suggested fixes (like missing start script or port bindings) with an "Apply Changes" button, so that I maintain full control over file mutations.
13. As an operator, I want to view live deployment logs streamed via SSE into the dedicated terminal sidecar, so that I can observe the packaging, build, and container release in real time.
14. As an operator, I want the agent to analyze build failures from the logs and suggest concrete fixes in chat, so that I can resolve deployment blockers immediately.
15. As an operator, I want the agent to automatically probe the public web endpoint after deployment, so that provider success is decoupled from true application health.
16. As an operator, I want the agent to fetch runtime logs (`liara logs`) when an HTTP 503 or error is detected, so that root causes (like unhandled exceptions or missing environment variables) are diagnosed instantly.
17. As an operator, I want the agent to present a structured remediation action with a one-click "Apply Fix" button, so that my crashed application is self-healed autonomously with my consent.

---

## Implementation Decisions

### 1. Unified Conversational Frontend (Next.js 15)
- Replace the legacy 6-card page with a unified Persian layout:
  - **Chat Area (Right 60% on desktop, RTL):** Virtualized chat feed with rich interactive bubbles:
    - Text messages with Markdown and KaTeX math formatting.
    - `TokenInputWidget`: Secure password field that posts directly to `/api/settings/liara-token`.
    - `SourceInputWidget`: Tabs for Local Path (with preset buttons), File Drag-and-Drop (ZIP), and Git URL.
    - `PlanSelectorCard`: Visual resource cards (RAM, CPU, price) with single-click selection.
    - `DiffPreviewWidget`: Colorized code diff with "اعمال خودکار تغییرات" (Apply) button.
    - `ApprovalGateWidget`: Cryptographic plan approval with impact level and cost warning.
  - **Sidecar Console (Left 40% on desktop, LTR terminal):**
    - Live terminal streaming deployment and runtime logs.
    - Active Cloud Services status indicators (App status, Database status, Health badge).
    - Toggleable / collapsible drawer on smaller screens.

### 2. Backend Orchestration & API Architecture
- **Chat Endpoint (`POST /api/chat`):**
  - Next.js API route that coordinates conversation state, stores messages in PostgreSQL (`ChatMessage` model), and bridges to the Python engine.
  - Emits Server-Sent Events (SSE) for streaming text, intent updates, and interactive UI widgets.
- **Source Ingestion Endpoint (`POST /api/project/ingest`):**
  - Handles local path validation, ZIP unpacking into `.workspace/<session_id>/`, and Git cloning of public repositories.
- **Liara Services API (`/api/liara/services`):**
  - Endpoints to list available plans (`liara plan list`), create databases (`liara db create`), and configure environment variables (`liara env set`).

### 3. Python Engine Conversational Agent
- LangChain / LangGraph ReAct agent equipped with domain tools:
  - `inspect_project(path)`: Scans AST, dependencies (`package.json`, `requirements.txt`), ports, and database drivers.
  - `get_liara_plans(service_type)`: Retrieves plans via Liara CLI/API.
  - `propose_database(db_type, default_plan)`: Prepares approval payload for database creation.
  - `generate_config_diff(path, file_name, content)`: Creates unified diffs for `liara.json` or `.env`.
  - `apply_file_diff(path, file_name, content)`: Writes approved changes to disk safely.
  - `execute_cloud_deploy(...)`: Triggers CLI deploy and streams redacted logs.
  - `verify_and_diagnose(...)`: Conducts decoupled HTTP probes and fetches runtime logs for SRE analysis.

### 4. Security & Privacy
- **Token Protection:** The Liara API token and database passwords are NEVER passed into LLM prompt contexts. The LLM handles structural intent and parameters (e.g. `type: "postgres"`, `plan: "g1"`), while the execution layer injects the user's stored token directly into CLI/API calls.
- **Path Traversal Protection:** All file operations are strictly jailed to the specified or extracted project directory.

---

## Testing Decisions

- **Good Test Criteria:** Tests assert behavior through public HTTP API routes and CLI interfaces, verifying that correct messages, UI cards, and cloud operations occur without coupling to internal prompt phrasing.
- **Seams Under Test:**
  1. *Web Chat Stream API Seam (`/api/chat`):* Verifies conversational turn generation, SSE streaming, and widget emission.
  2. *Source Ingestion Seam (`/api/project/ingest`):* Tests ZIP extraction, local path resolution, and invalid archive rejection.
  3. *Liara Service Provisioning Seam:* Tests `liara db create`, `liara plan list`, and `liara env set` argument construction and secret redaction.
  4. *Diff & File Modification Seam:* Tests safe creation of `liara.json` and `.env` variable insertion with path traversal guards.
- **Prior Art:** Existing `runs.test.mjs`, `approval-flow.test.mjs`, `test_planner.py`, and `test_deployer.py`.

---

## Out of Scope

- Multi-tenant shared database clusters.
- Private Git repository SSH key management (public Git repos only for this milestone).
- Full custom DNS domain purchase or external certificate authority provisioning.
- Native mobile application builds.

---

## Further Notes

- Persian typography: Use Vazirmatn / Shabnam font stack with proper RTL layout classes (`dir="rtl"`).
- Backward compatibility: Existing `Run` and `ActionApproval` database models remain intact and serve as the immutable ledger beneath the conversational chat interface.

