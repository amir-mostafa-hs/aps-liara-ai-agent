import asyncio
import json
import logging
import httpx

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

    async def list_catalog(self, api_token: str, team_id: str | None = None) -> dict:
        """Load the same account-scoped catalog the official CLI uses for app creation."""
        if not api_token or not api_token.strip():
            raise RuntimeError("Liara credentials are required to verify app creation options.")

        token = api_token.strip()
        team = team_id.strip() if team_id and team_id.strip() else None
        params = {"teamID": team} if team else None
        headers = {"Authorization": f"Bearer {token}", "User-Agent": "LiaraAgent/0.1.0"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                me_response = await client.get("https://api.liara.ir/v1/me", headers=headers, params=params)
                me_response.raise_for_status()
                network_response = await client.get("https://api.liara.ir/v1/networks", headers=headers, params=params)
                network_response.raise_for_status()

            account_plans = me_response.json().get("plans", {})
            projects = account_plans.get("projects", {})
            bundles_by_plan = account_plans.get("projectBundlePlans", {})
            plans = []
            feature_plans = []

            for plan_id, details in projects.items():
                if not isinstance(details, dict) or not details.get("available"):
                    continue
                if details.get("region") != "iran" or not (plan_id == "free" or "g2" in plan_id.lower()):
                    continue
                plans.append({
                    "plan_id": str(plan_id),
                    "name_fa": f"پلن {plan_id}",
                    "ram": self._format_resource((details.get("RAM") or {}).get("amount"), " GB"),
                    "cpu": self._format_resource((details.get("CPU") or {}).get("amount"), " هسته"),
                    "disk": self._format_resource(details.get("volume"), " GB"),
                    "price_monthly": self._plan_price(details),
                    "is_recommended": False,
                })

                bundle_options = bundles_by_plan.get(plan_id, {})
                if isinstance(bundle_options, dict):
                    plan_features = []
                    for bundle_id, bundle in bundle_options.items():
                        if not isinstance(bundle, dict) or not bundle.get("available"):
                            continue
                        normalized_bundle = {
                            "plan_id": str(plan_id),
                            "bundle_plan_id": str(bundle_id),
                            "name_fa": f"پلن {bundle_id}",
                            "price_monthly": self._parse_price(bundle.get("displayPrice")),
                            "is_recommended": False,
                        }
                        plan_features.append(normalized_bundle)
                        feature_plans.append(normalized_bundle)
                    if plan_features:
                        recommendation = min(
                            plan_features,
                            key=lambda option: option["price_monthly"] if option["price_monthly"] is not None else float("inf"),
                        )
                        recommendation["is_recommended"] = True

            networks = network_response.json().get("networks", [])
            normalized_networks = [
                {"id": str(network.get("_id")), "name": str(network.get("name")), "is_recommended": False}
                for network in networks
                if isinstance(network, dict) and network.get("_id") and network.get("name")
            ]
            if not plans or not feature_plans:
                raise ValueError("Liara returned no usable hardware or feature bundle plans.")
            return {"plans": plans, "feature_plans": feature_plans, "networks": normalized_networks}
        except Exception as error:
            safe_error = redact_text(str(error), token)
            logger.warning("Liara app creation catalog lookup failed: %s", safe_error)
            raise RuntimeError(f"Liara app creation options could not be verified: {safe_error}") from error

    @classmethod
    def _plan_price(cls, details: dict):
        display_price = cls._parse_price(details.get("displayPrice"))
        if display_price is not None:
            return display_price
        hourly_price = cls._parse_price(details.get("price"))
        return hourly_price * 720 if hourly_price is not None else None

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
        try:
            parsed = float(normalized)
        except (TypeError, ValueError):
            return None
        return int(parsed) if parsed.is_integer() else parsed


liara_app_plan_provider = LiaraAppPlanProvider()
