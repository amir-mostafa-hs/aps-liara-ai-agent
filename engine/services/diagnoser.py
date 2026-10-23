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
    ) -> DiagnosisResult:
        """Inspects crash logs, extracts root cause evidence, and constructs a structured remediation plan."""
        clean_logs = redact_text(logs)

        # Early return if no logs are available: do not fabricate false findings
        if not clean_logs.strip():
            return DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause="No runtime logs or crash stack traces could be retrieved for this application.",
                error_evidence="N/A (Logs were empty)",
                missing_variable=None,
                remediation=None,
                confidence=0.0,
                requires_approval=False,
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
                    f"Extract the exact root cause in Persian (فارسی) or English and the specific error line as error_evidence.\n"
                    f"If a missing environment variable is detected, specify missing_variable and create a RemediationAction "
                    f"with operation 'set_env', target '{app_id}', and a suitable default env_value.\n"
                    f"If the app does not exist or was deleted, state that clearly and set missing_variable=null."
                )

                result: DiagnosisResult = structured_llm.invoke(prompt)
                if result and isinstance(result, DiagnosisResult):
                    if not result.diagnosis_id:
                        result.diagnosis_id = f"diag-{uuid.uuid4().hex[:8]}"
                    if result.remediation:
                        result.remediation.target = app_id
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
                "Error: Could not find the app."
            )
            remediation = RemediationAction(
                action_id=f"rem-{uuid.uuid4().hex[:8]}",
                operation="create_app",
                target=app_id,
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
            remediation = RemediationAction(
                action_id=f"rem-{uuid.uuid4().hex[:8]}",
                operation="set_env",
                target=app_id,
                env_variable=missing_var,
                env_value="sre-recovery-secret-key-123",
                description=f"Set missing environment variable '{missing_var}' on Liara app '{app_id}' via 'liara env set'",
                requires_approval=True,
            )
            diagnosis = DiagnosisResult(
                diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
                root_cause=f"Application crashed during startup due to missing mandatory configuration '{missing_var}'.",
                error_evidence=evidence_line,
                missing_variable=missing_var,
                remediation=remediation,
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
            "Process exited with non-zero status"
        )
        diagnosis = DiagnosisResult(
            diagnosis_id=f"diag-{uuid.uuid4().hex[:8]}",
            root_cause=f"فرآیند اجرای اپلیکیشن با خطا متوقف شد.",
            error_evidence=evidence_line,
            missing_variable=None,
            remediation=None,
            confidence=0.85,
            requires_approval=True,
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
        """Fetches bounded runtime logs using liara logs --app <app_id>."""
        cmd = ["liara", "logs", "--app", app_id, "--lines", str(lines)]
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
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=15.0)
            raw = stdout.decode("utf-8", errors="replace")
            return redact_text(raw, api_token)
        except Exception as e:
            logger.warning(f"Failed to fetch runtime logs via CLI: {e}")
            return ""

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
            return {
                "ok": False,
                "exit_code": 1,
                "output": f"Failed to execute liara env set: {e}",
            }


sre_diagnoser = SREDiagnoser()

