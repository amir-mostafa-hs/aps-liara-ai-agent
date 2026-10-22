import asyncio
import logging
import os
from pathlib import Path
from typing import AsyncGenerator
from engine.domain.models import ActionApprovalModel, DeploymentPlan
from engine.security.redaction import redact_text
from engine.services.approval import verify_action_approval
from engine.services.inspector import project_inspector

logger = logging.getLogger(__name__)


class DeploymentExecutor:
    def __init__(self, cli_timeout_seconds: int = 300):
        self.cli_timeout_seconds = cli_timeout_seconds

    async def _stream_command(
        self, cmd: list[str], cwd: Path | None = None
    ) -> AsyncGenerator[str, None]:
        """Executes a subprocess command using argument arrays and streams line-by-line output."""
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(cwd) if cwd else None,
            )

            while True:
                try:
                    line = await asyncio.wait_for(
                        process.stdout.readline(), timeout=float(self.cli_timeout_seconds)
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    yield f"[ERROR] Deployment process timed out after {self.cli_timeout_seconds}s.\n"
                    break

                if not line:
                    break
                yield line.decode("utf-8", errors="replace")

            try:
                await asyncio.wait_for(
                    process.wait(), timeout=float(self.cli_timeout_seconds)
                )
            except asyncio.TimeoutError:
                process.kill()
                yield f"[ERROR] Deployment process timed out waiting for process exit.\n"

            if process.returncode != 0:
                yield f"[EXIT] Process exited with non-zero status code: {process.returncode}\n"
            else:
                yield "[EXIT] Process completed successfully (exit code 0).\n"
        except FileNotFoundError:
            yield "[ERROR] 'liara' CLI command was not found on PATH.\n"
        except Exception as e:
            yield f"[ERROR] Failed to execute deployment command: {e}\n"

    async def execute_deployment(
        self,
        plan: DeploymentPlan,
        approval: ActionApprovalModel,
        source_path: str,
        api_token: str,
        team_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Validates approval and streams live, secret-redacted deployment logs."""
        # 1. Strict approval enforcement check
        if not verify_action_approval(plan, approval.action_id, approval):
            raise PermissionError("Approval required: Invalid or missing ActionApproval.")

        # 2. Path verification
        source_dir = Path(source_path).resolve()
        if not source_dir.exists() or not source_dir.is_dir():
            raise FileNotFoundError(f"Source directory does not exist: {source_path}")

        # 3. Construct command using argument array (no shell string)
        cmd = [
            "liara",
            "deploy",
            "--app",
            plan.target_app,
            "--platform",
            plan.platform,
            "--port",
            str(plan.port),
            "--path",
            str(source_dir),
            "--no-app-logs",
        ]

        if api_token and api_token.strip():
            cmd.extend(["--api-token", api_token.strip()])

        if team_id and team_id.strip():
            cmd.extend(["--team-id", team_id.strip()])

        yield f"[AGENT] Initiating deployment for app '{plan.target_app}' ({plan.platform}) on port {plan.port}...\n"

        # 4. Stream command output with real-time secret redaction
        async for raw_line in self._stream_command(cmd, cwd=source_dir):
            clean_line = redact_text(raw_line, api_token)
            yield clean_line


deployment_executor = DeploymentExecutor()

