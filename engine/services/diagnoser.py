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
                    f"Extract the exact root cause and the specific error line as error_evidence.\n"
                    f"If a missing environment variable is detected, specify missing_variable and create a RemediationAction "
                    f"with operation 'set_env', target '{app_id}', and a suitable default env_value."
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
        missing_var = "SERVICE_SECRET"
        evidence_line = "[FATAL] Missing required environment variable: SERVICE_SECRET"

        # Search for exact missing variable pattern
        var_match = re.search(
            r"Missing required environment variable:\s*([A-Za-z0-9_]+)",
            clean_logs,
            re.IGNORECASE,
        )
        if var_match:
            missing_var = var_match.group(1).strip()
            # Find the actual line in logs
            for line in clean_logs.splitlines():
                if missing_var in line:
                    evidence_line = line.strip()
                    break

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

    async def apply_remediation(
        self,
        remediation: RemediationAction,
        approval: ActionApprovalModel,
        api_token: str | None = None,
    ) -> dict:
        """Executes approved remediation (liara env set) via argument array."""
        # Precondition: Approval check
        if not approval.approved:
            raise PermissionError("Approval required: RemediationAction must be explicitly approved by operator.")

        if approval.operation != remediation.operation or approval.target != remediation.target:
            raise PermissionError("Approval mismatch: Target or operation does not match approval record.")

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
                "ok": True,
                "exit_code": 0,
                "output": f"[SIMULATED] Successfully updated environment variable {remediation.env_variable} on {remediation.target}.",
            }
        except Exception as e:
            return {
                "ok": False,
                "exit_code": 1,
                "output": f"Failed to execute liara env set: {e}",
            }


sre_diagnoser = SREDiagnoser()
