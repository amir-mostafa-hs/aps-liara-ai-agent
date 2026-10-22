import asyncio
import logging
from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)


class CloudEnvManager:
    async def set_cloud_env(
        self,
        app_name: str,
        env_vars: dict[str, str],
        api_token: str,
        team_id: str | None = None,
    ) -> dict:
        if not app_name or not app_name.strip():
            raise ValueError("Application name cannot be empty.")

        if not api_token or not api_token.strip():
            raise ValueError("Liara API token cannot be empty.")

        if not env_vars:
            return {"ok": True, "app_name": app_name, "message": "No variables to set."}

        # Build liara CLI command arguments (no shell=True)
        env_args = [f"{k}={v}" for k, v in env_vars.items()]
        cmd = [
            "liara",
            "env",
            "set",
            *env_args,
            "--app",
            app_name.strip(),
            "--force",
            "--api-token",
            api_token.strip(),
        ]

        if team_id and team_id.strip():
            cmd.extend(["--team-id", team_id.strip()])

        logger.info(
            "Setting cloud environment variables for app '%s': %s",
            app_name,
            list(env_vars.keys()),
        )

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            raw_stdout = stdout.decode("utf-8", errors="replace")
            raw_stderr = stderr.decode("utf-8", errors="replace")

            clean_out = redact_text(raw_stdout, api_token)
            clean_err = redact_text(raw_stderr, api_token)

            if proc.returncode != 0:
                logger.error("Cloud env set failed: %s", clean_err)
                return {
                    "ok": False,
                    "error": clean_err or clean_out or f"Process exited with code {proc.returncode}",
                    "output": clean_out,
                }

            return {
                "ok": True,
                "app_name": app_name.strip(),
                "variables_set": list(env_vars.keys()),
                "output": clean_out,
            }
        except Exception as e:
            safe_error = redact_text(str(e), api_token)
            logger.exception("Failed to set cloud env: %s", safe_error)
            return {
                "ok": False,
                "error": f"Failed to execute env set: {safe_error}",
            }


env_manager = CloudEnvManager()

