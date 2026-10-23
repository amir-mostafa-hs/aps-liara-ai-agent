import logging

from engine.providers.liara_adapter import LiaraAdapter
from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)


class CloudEnvManager:
    def __init__(self, adapter: LiaraAdapter | None = None):
        self.adapter = adapter or LiaraAdapter()

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
            return {"ok": True, "app_name": app_name, "variables_set": [], "output": ""}

        logger.info(
            "Setting cloud environment variables for app '%s': %s",
            app_name.strip(),
            list(env_vars.keys()),
        )
        result = await self.adapter.set_environment_variables(
            app_name=app_name.strip(),
            env_vars=env_vars,
            api_token=api_token.strip(),
            team_id=team_id,
        )
        if not result.get("ok"):
            safe_error = redact_text(str(result.get("error", "ثبت متغیرها در لیارا ناموفق بود.")), api_token)
            for value in env_vars.values():
                if value:
                    safe_error = redact_text(safe_error, value)
            logger.error("Cloud env set failed for '%s': %s", app_name.strip(), safe_error)
            return {"ok": False, "error": safe_error, "status_code": result.get("status_code")}

        safe_output = redact_text(str(result.get("output", "")), api_token)
        for value in env_vars.values():
            if value:
                safe_output = redact_text(safe_output, value)
        return {
            "ok": True,
            "app_name": app_name.strip(),
            "variables_set": list(env_vars.keys()),
            "output": safe_output,
        }


env_manager = CloudEnvManager()
