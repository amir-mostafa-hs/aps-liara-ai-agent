import asyncio
import logging
import re
import uuid
from engine.config import settings
from engine.domain.models import (
    ActionApprovalModel,
    DiagnosisResult,
    RemediationAction,
)
from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)


class SREDiagnoser:
    RUNTIME_LOG_TIMEOUT_SECONDS = 30
    MAX_RUNTIME_LOG_LINES = 500
    MAX_RUNTIME_LOG_CHARS = 50_000

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model_name: str | None = None,
    ):
        self.api_key = api_key or settings.openai_api_key
        self.base_url = base_url or settings.openai_base_url
        self.model_name = model_name or settings.openai_model_name

    def diagnose_logs(
        self,
        logs: str,
        app_id: str,
        provider_status: str = "success",
        project_evidence: list[str] | None = None,
    ) -> DiagnosisResult:
        """Inspects crash logs, extracts root cause evidence, and constructs a structured remediation plan."""
        clean_logs = redact_text(logs)

        # Early return if no logs are available: do not fabricate false findings
        if not clean_logs.strip():
            safe_project_evidence = [
                redact_text(str(item))[:240]
                for item in (project_evidence or [])
                if str(item).strip()
            ][:8]
            evidence = (
                "شواهد بازرسی پروژه: " + "؛ ".join(safe_project_evidence)
                if safe_project_evidence
                else "لاگ اجرایی دریافت نشد."
            )
            return DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause=(
                    "لاگ اجرایی در دسترس نیست. شواهد بازرسی پروژه دریافت شد، اما برای تعیین علت خرابی کافی نیست."
                    if safe_project_evidence
                    else "اطلاعات کافی برای تشخیص علت در دسترس نیست؛ لاگ اجرایی یا شاهد تأییدکننده‌ای از پروژه دریافت نشد."
                ),
                error_evidence=evidence,
                missing_variable=None,
                remediation=None,
                confidence=0.0,
                requires_approval=False,
                diagnosis_status="inconclusive",
                digest="",
            )

        # Attempt LangChain structured diagnosis if API key is present
        if self.api_key:
            try:
                from langchain_openai import ChatOpenAI

                kwargs = {
                    "model": self.model_name,
                    "api_key": self.api_key,
                }
                if self.base_url:
                    kwargs["base_url"] = self.base_url

                llm = ChatOpenAI(**kwargs)
                structured_llm = llm.with_structured_output(DiagnosisResult)

                prompt = (
                    f"Analyze the following application runtime logs for Liara app '{app_id}'.\n"
                    f"Provider Status: {provider_status}\n"
                    f"Logs:\n{clean_logs[-2000:]}\n\n"
                    f"Write every user-facing field in Persian. Keep error_evidence as an exact, redacted excerpt from the logs. "
                    f"Do not invent values, credentials, or remediations. For a missing environment variable, identify its name "
                    f"but leave remediation empty; the user must choose how to supply a secret.\n"
                    f"If the app does not exist or was deleted, state that clearly and set missing_variable=null."
                )

                result: DiagnosisResult = structured_llm.invoke(prompt)
                if result and isinstance(result, DiagnosisResult) and re.search(r"[\u0600-\u06FF]", result.root_cause):
                    if not result.diagnosis_id:
                        result.diagnosis_id = f"diag-{uuid.uuid4().hex[:8]}"
                    # The model may describe evidence, but executable actions are
                    # constructed only by the approval-gated server workflow.
                    result.remediation = None
                    result.requires_approval = True
                    result.digest = result.compute_digest()
                    return result
            except Exception as e:
                logger.warning(
                    "LLM SRE diagnosis failed: %s. Falling back to deterministic diagnosis.",
                    e,
                )

        # Deterministic / rule-based SRE diagnosis
        lower_logs = clean_logs.lower()

        # 1. App not found on Liara
        if "could not find the app" in lower_logs or "app not found" in lower_logs:
            evidence_line = next(
                (l.strip() for l in clean_logs.splitlines() if "could not find the app" in l.lower()),
                "خطای پیدا نشدن برنامه در حساب لیارا ثبت شد."
            )
            remediation = RemediationAction(
                action_id=f"rem-{uuid.uuid4().hex[:8]}",
                operation="create_app",
                target=app_id,
                env_variable="",
                env_value="",
                description=f"ایجاد اپلیکیشن '{app_id}' در حساب لیارا",
                requires_approval=True,
            )
            diagnosis = DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause=f"اپلیکیشن '{app_id}' در حساب یا تیم فعلی لیارا یافت نشد. ممکن است برنامه در لیارا حذف شده باشد یا هنوز ایجاد نشده باشد.",
                error_evidence=evidence_line,
                missing_variable=None,
                remediation=remediation,
                confidence=0.99,
                requires_approval=True,
                digest="",
            )
            diagnosis.digest = diagnosis.compute_digest()
            return diagnosis

        # 2. Port collision (EADDRINUSE)
        if "eaddrinuse" in lower_logs or "address already in use" in lower_logs:
            evidence_line = next(
                (l.strip() for l in clean_logs.splitlines() if "eaddrinuse" in l.lower() or "address already in use" in l.lower()),
                "Error: listen EADDRINUSE: address already in use"
            )
            diagnosis = DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause=f"تداخل پورت در هنگام اجرای اپلیکیشن '{app_id}'. پورت تنظیم‌شده در حال استفاده است.",
                error_evidence=evidence_line,
                missing_variable=None,
                remediation=None,
                confidence=0.95,
                requires_approval=True,
                digest="",
            )
            diagnosis.digest = diagnosis.compute_digest()
            return diagnosis

        # 3. Missing environment variable
        var_match = re.search(
            r"Missing required environment variable:\s*([A-Za-z0-9_]+)",
            clean_logs,
            re.IGNORECASE,
        )
        if var_match:
            missing_var = var_match.group(1).strip()
            evidence_line = next(
                (l.strip() for l in clean_logs.splitlines() if missing_var in l),
                f"[FATAL] Missing required environment variable: {missing_var}"
            )
            diagnosis = DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause=f"برنامه هنگام راه‌اندازی به‌دلیل تنظیم‌نشدن متغیر محیطی اجباری «{missing_var}» متوقف شده است.",
                error_evidence=evidence_line,
                missing_variable=missing_var,
                remediation=None,
                confidence=0.98,
                requires_approval=True,
                digest="",
            )
            diagnosis.digest = diagnosis.compute_digest()
            return diagnosis

        # 4. Build or package installation error
        if "npm err!" in lower_logs or "yarn error" in lower_logs or "build failed" in lower_logs:
            evidence_line = next(
                (l.strip() for l in clean_logs.splitlines() if "npm err" in l.lower() or "error" in l.lower()),
                "Build or packaging process failed"
            )
            diagnosis = DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause=f"فرآیند بیلد یا نصب بسته‌های پروژه با خطا متوقف شد.",
                error_evidence=evidence_line,
                missing_variable=None,
                remediation=None,
                confidence=0.92,
                requires_approval=True,
                digest="",
            )
            diagnosis.digest = diagnosis.compute_digest()
            return diagnosis

        # 5. Generic execution failure
        evidence_line = next(
            (l.strip() for l in clean_logs.splitlines() if "error" in l.lower() or "exit" in l.lower()),
            "فرآیند با کد خطا متوقف شد؛ جزئیات علت در لاگ موجود نیست."
        )
        diagnosis = DiagnosisResult(
            diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
            root_cause="فرآیند اجرای اپلیکیشن با خطا متوقف شد، اما از شواهد موجود علت دقیق مشخص نیست.",
            error_evidence=evidence_line,
            missing_variable=None,
            remediation=None,
            confidence=0.35,
            requires_approval=True,
            diagnosis_status="inconclusive",
            digest="",
        )
        diagnosis.digest = diagnosis.compute_digest()
        return diagnosis

    async def fetch_runtime_logs(
        self,
        app_id: str,
        lines: int = 100,
        api_token: str | None = None,
        team_id: str | None = None,
    ) -> str:
        """Fetches bounded runtime logs using the official Liara CLI."""
        result = await self.fetch_runtime_logs_result(app_id, lines, api_token, team_id)
        return result["logs"]

    async def fetch_runtime_logs_result(
        self,
        app_id: str,
        lines: int = 100,
        api_token: str | None = None,
        team_id: str | None = None,
    ) -> dict:
        """Fetch bounded runtime logs through Liara's supported app-logs CLI command."""
        clean_app_id = (app_id or "").strip()
        if not clean_app_id:
            return {"ok": False, "logs": "", "error": "نام سرویس برای دریافت لاگ‌های اجرا مشخص نیست.", "retryable": False}
        token = (api_token or "").strip()
        if not token:
            return {"ok": False, "logs": "", "error": "توکن Liara برای دریافت لاگ‌های اجرا تنظیم نشده است.", "retryable": False}

        safe_lines = min(max(int(lines), 1), self.MAX_RUNTIME_LOG_LINES)
        command = [
            "liara",
            "app",
            "logs",
            "--app",
            clean_app_id,
            "--since",
            "30 minutes ago",
            "--timestamps",
            "--last-lines",
            "--debug",
        ]
        if team_id and team_id.strip():
            command.extend(["--team-id", team_id.strip()])
        command.extend(["--api-token", token])

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.RUNTIME_LOG_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                process.kill()
                return {
                    "ok": False,
                    "logs": "",
                    "error": "دریافت لاگ‌های اجرای برنامه از Liara بیش از زمان مجاز طول کشید.",
                    "retryable": True,
                }
        except FileNotFoundError:
            return {
                "ok": False,
                "logs": "",
                "exit_code": 127,
                "error": "ابزار رسمی Liara CLI روی موتور Agent نصب یا در دسترس نیست.",
                "retryable": False,
            }
        except Exception as error:
            return {
                "ok": False,
                "logs": "",
                "error": redact_text(str(error), token),
                "retryable": True,
            }

        safe_stdout = redact_text(stdout.decode("utf-8", errors="replace"), token).strip()
        safe_stderr = redact_text(stderr.decode("utf-8", errors="replace"), token).strip()
        if process.returncode == 0:
            # Liara CLI writes app stderr log records to process.stderr. Keep those
            # timestamped records while excluding its own --debug diagnostics.
            runtime_stderr = [
                line
                for line in safe_stderr.splitlines()
                if re.search(r"(?:^| \| )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", line)
            ]
            output_lines = [
                line
                for line in [*safe_stdout.splitlines(), *runtime_stderr]
                if line.strip()
            ]
            bounded_logs = "\n".join(output_lines[-safe_lines:])[-self.MAX_RUNTIME_LOG_CHARS:]
            if bounded_logs:
                return {
                    "ok": True,
                    "logs": bounded_logs,
                    "status_code": 200,
                    "exit_code": 0,
                    "error": None,
                    "retryable": False,
                }
            return {
                "ok": False,
                "logs": "",
                "status_code": 200,
                "exit_code": 0,
                "error": "Liara هنوز لاگ اجرایی برای این بازه برنگردانده است.",
                "retryable": True,
            }

        error_output = f"{safe_stdout}\n{safe_stderr}".strip()[-4000:]
        status_match = re.search(r"\b(401|403|404|429|5\d{2})\b", error_output)
        status_code = int(status_match.group(1)) if status_match else None
        lower_error = error_output.lower()
        if status_code is None and ("app not found" in lower_error or "project not found" in lower_error):
            status_code = 404
        if status_code == 401 or "unauthorized" in lower_error or "unauthenticated" in lower_error:
            message, retryable = "توکن Liara اجازهٔ خواندن لاگ‌های این سرویس را ندارد (401).", False
        elif status_code == 403 or "forbidden" in lower_error:
            message, retryable = "حساب Liara اجازهٔ خواندن لاگ‌های این سرویس را ندارد (403).", False
        elif status_code == 404 or "app not found" in lower_error or "project not found" in lower_error:
            message, retryable = "سرویس در حساب یا تیم انتخاب‌شدهٔ Liara پیدا نشد.", False
        elif status_code == 429 or (status_code is not None and status_code >= 500):
            message, retryable = "Liara موقتاً نتوانست لاگ‌های runtime را برگرداند.", True
        elif any(term in lower_error for term in ("timeout", "timed out", "econn", "network", "temporar")):
            message, retryable = "ارتباط موقت با Liara برقرار نشد؛ دریافت لاگ دوباره امتحان می‌شود.", True
        else:
            message, retryable = "فرمان دریافت لاگ runtime در Liara ناموفق شد.", False
        return {
            "ok": False,
            "logs": "",
            "status_code": status_code,
            "exit_code": process.returncode,
            "error": message,
            "error_detail": redact_text(error_output, token)[:1000],
            "retryable": retryable,
        }

    async def apply_remediation(
        self,
        remediation: RemediationAction,
        approval: ActionApprovalModel,
        api_token: str | None = None,
        expected_digest: str | None = None,
        team_id: str | None = None,
    ) -> dict:
        """Executes approved remediation (liara env set) via argument array."""
        # Precondition: Approval check
        if not approval.approved:
            raise PermissionError("Approval required: RemediationAction must be explicitly approved by operator.")

        if approval.operation != remediation.operation or approval.target != remediation.target:
            raise PermissionError("Approval mismatch: Target or operation does not match approval record.")

        if expected_digest and approval.plan_digest != expected_digest:
            raise PermissionError("Approval mismatch: Cryptographic digest does not match expected remediation plan.")

        if remediation.operation != "set_env":
            raise PermissionError("این نوع راهکار خودکار پشتیبانی نمی‌شود؛ هیچ تغییری اعمال نشد. سرویس مقصد را بررسی و دپلوی را دوباره اجرا کنید.")

        cmd = [
            "liara",
            "env",
            "set",
            f"{remediation.env_variable}={remediation.env_value}",
            "-a",
            remediation.target,
            "-f",
        ]

        if api_token and api_token.strip():
            cmd.extend(["--api-token", api_token.strip()])

        if team_id and team_id.strip():
            cmd.extend(["--team-id", team_id.strip()])

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            stdout, _ = await process.communicate()
            raw_output = stdout.decode("utf-8", errors="replace")
            clean_output = redact_text(raw_output, api_token)
            clean_output = redact_text(clean_output, remediation.env_value)

            return {
                "ok": process.returncode == 0,
                "exit_code": process.returncode,
                "output": clean_output,
            }
        except FileNotFoundError:
            return {
                "ok": False,
                "exit_code": 127,
                "output": "Error: 'liara' CLI executable not found on PATH.",
            }
        except Exception as e:
            safe_error = redact_text(str(e), api_token)
            safe_error = redact_text(safe_error, remediation.env_value)
            return {
                "ok": False,
                "exit_code": 1,
                "output": f"اجرای فرمان ثبت متغیر در Liara ناموفق بود: {safe_error}",
            }


sre_diagnoser = SREDiagnoser()

