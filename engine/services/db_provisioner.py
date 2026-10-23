import asyncio
import logging
import re
from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)

DEFAULT_PLANS = [
    {
        "plan_id": "ir-standard-1",
        "name_fa": "اقتصادی (پایه)",
        "ram": "512 MB",
        "cpu": "0.25 هسته",
        "disk": "10 GB SSD",
        "price_monthly": 60000,
        "is_recommended": False,
    },
    {
        "plan_id": "ir-standard-2",
        "name_fa": "استاندارد (پیشنهادی)",
        "ram": "1024 MB (1 GB)",
        "cpu": "0.5 هسته",
        "disk": "20 GB SSD",
        "price_monthly": 120000,
        "is_recommended": True,
    },
    {
        "plan_id": "ir-standard-4",
        "name_fa": "حرفه‌ای",
        "ram": "2048 MB (2 GB)",
        "cpu": "1 هسته",
        "disk": "40 GB SSD",
        "price_monthly": 240000,
        "is_recommended": False,
    },
    {
        "plan_id": "ir-standard-8",
        "name_fa": "تجاری / مقیاس بالا",
        "ram": "4096 MB (4 GB)",
        "cpu": "2 هسته",
        "disk": "60 GB SSD",
        "price_monthly": 480000,
        "is_recommended": False,
    },
]

DB_PORT_MAP = {
    "postgres": 5432,
    "postgresql": 5432,
    "mysql": 3306,
    "mariadb": 3306,
    "redis": 6379,
    "mongodb": 27017,
}


class DatabaseProvisioner:
    def __init__(self):
        self.cached_plans = DEFAULT_PLANS

    async def get_available_plans(
        self, api_token: str | None = None
    ) -> list[dict]:
        if api_token and api_token.strip():
            try:
                cmd = [
                    "liara",
                    "plan",
                    "list",
                    "--output",
                    "json",
                    "--api-token",
                    api_token.strip(),
                ]
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await proc.communicate()
                if proc.returncode == 0:
                    import json

                    data = json.loads(stdout.decode("utf-8"))
                    if isinstance(data, list) and len(data) > 0:
                        parsed_plans = []
                        for item in data:
                            plan_id = (
                                item.get("Plan")
                                or item.get("plan")
                                or item.get("name")
                            )
                            if not plan_id:
                                continue
                            ram = item.get("RAM") or "1 GB"
                            cpu = item.get("CPU") or "0.5"
                            disk = item.get("Disk") or "20 GB"
                            price = item.get("Price") or 120000
                            parsed_plans.append(
                                {
                                    "plan_id": str(plan_id),
                                    "name_fa": f"پلن {plan_id}",
                                    "ram": f"{ram} GB"
                                    if isinstance(ram, (int, float))
                                    else str(ram),
                                    "cpu": f"{cpu} هسته"
                                    if isinstance(cpu, (int, float))
                                    else str(cpu),
                                    "disk": f"{disk} GB"
                                    if isinstance(disk, (int, float))
                                    else str(disk),
                                    "price_monthly": int(
                                        str(price).replace(",", "")
                                    )
                                    if str(price).replace(",", "").isdigit()
                                    else 120000,
                                    "is_recommended": "standard"
                                    in str(plan_id).lower()
                                    or "medium" in str(plan_id).lower(),
                                }
                            )
                        if parsed_plans:
                            return parsed_plans
            except Exception as e:
                logger.warning(
                    "Failed to fetch plans from Liara CLI: %s. Falling back to defaults.",
                    e,
                )

        # Return sensible default plans if no token or CLI unavailable
        return self.cached_plans

    async def provision_database(
        self,
        db_name: str,
        db_type: str,
        plan_id: str,
        api_token: str,
        team_id: str | None = None,
    ) -> dict:
        if not db_name or not re.match(r"^[a-zA-Z0-9_-]{3,64}$", db_name.strip()):
            raise ValueError(
                "Invalid database name. Must be 3-64 characters and contain only letters, numbers, hyphens or underscores."
            )

        if not api_token or not api_token.strip():
            raise ValueError("Liara API token cannot be empty.")

        clean_name = db_name.strip()
        clean_type = db_type.strip().lower()
        clean_plan = plan_id.strip()

        # Build liara CLI command array (no shell=True)
        cmd = [
            "liara",
            "db",
            "create",
            "--name",
            clean_name,
            "--type",
            clean_type,
            "--plan",
            clean_plan,
            "--api-token",
            api_token.strip(),
            "--yes",
        ]

        if team_id and team_id.strip():
            cmd.extend(["--team-id", team_id.strip()])

        logger.info(
            "Executing database provisioning: liara db create --name %s --type %s --plan %s",
            clean_name,
            clean_type,
            clean_plan,
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
                logger.error("Database provisioning failed: %s", clean_err)
                return {
                    "ok": False,
                    "error": clean_err or clean_out or f"Process exited with code {proc.returncode}",
                    "output": clean_out,
                }

            port = DB_PORT_MAP.get(clean_type, 5432)
            # Default internal connection URI pattern in Liara private network
            internal_host = f"{clean_name}"
            suggested_env_vars = {
                "DB_HOST": internal_host,
                "DB_PORT": str(port),
                "DATABASE_URL": f"{clean_type}://{clean_name}:{port}/master",
            }

            return {
                "ok": True,
                "db_name": clean_name,
                "db_type": clean_type,
                "plan_id": clean_plan,
                "port": port,
                "internal_host": internal_host,
                "suggested_env_vars": suggested_env_vars,
                "output": clean_out,
            }
        except Exception as e:
            safe_error = redact_text(str(e), api_token)
            logger.exception("Subprocess execution exception: %s", safe_error)
            return {
                "ok": False,
                "error": f"Failed to execute database creation: {safe_error}",
            }


db_provisioner = DatabaseProvisioner()

