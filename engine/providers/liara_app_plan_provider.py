import asyncio
import json
import logging

from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)


class LiaraAppPlanProvider:
    """Loads verified application plans without changing database-plan behavior."""

    async def list_plans(self, api_token: str, team_id: str | None = None) -> list[dict]:
        if not api_token or not api_token.strip():
            raise RuntimeError("Liara credentials are required to verify available app plans.")

        command = ["liara", "plan", "list", "--output", "json", "--api-token", api_token.strip()]
        if team_id and team_id.strip():
            command.extend(["--team-id", team_id.strip()])

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                safe_error = redact_text(stderr.decode("utf-8", errors="replace"), api_token)
                raise RuntimeError(safe_error or f"Liara plan lookup exited with code {process.returncode}")

            data = json.loads(stdout.decode("utf-8"))
            if isinstance(data, dict):
                data = data.get("plans", [])
            if not isinstance(data, list):
                raise ValueError("Unexpected plan response format")

            plans = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                plan_id = item.get("Plan") or item.get("plan") or item.get("plan_id") or item.get("name")
                if not plan_id:
                    continue
                plans.append({
                    "plan_id": str(plan_id),
                    "name_fa": str(item.get("name_fa") or f"پلن {plan_id}"),
                    "ram": self._format_resource(item.get("RAM", item.get("ram")), " GB"),
                    "cpu": self._format_resource(item.get("CPU", item.get("cpu")), " هسته"),
                    "disk": self._format_resource(item.get("Disk", item.get("disk")), " GB"),
                    "price_monthly": self._parse_price(item.get("Price", item.get("price_monthly"))),
                    "is_recommended": False,
                })

            if not plans:
                raise RuntimeError("Liara did not return any usable app plans.")

            recommended = next(
                (plan for plan in plans if "standard" in plan["plan_id"].lower() or "medium" in plan["plan_id"].lower()),
                plans[0],
            )
            recommended["is_recommended"] = True
            return plans
        except Exception as error:
            safe_error = redact_text(str(error), api_token)
            logger.warning("Liara app-plan lookup failed: %s", safe_error)
            raise RuntimeError(f"Liara app plans could not be verified: {safe_error}") from error

    @staticmethod
    def _format_resource(value, suffix: str) -> str:
        if value is None or value == "":
            return "اعلام نشده"
        if isinstance(value, (int, float)):
            return f"{value}{suffix}"
        return str(value)

    @staticmethod
    def _parse_price(value):
        if value is None:
            return None
        normalized = str(value).replace(",", "").strip()
        return int(normalized) if normalized.isdigit() else None


liara_app_plan_provider = LiaraAppPlanProvider()
