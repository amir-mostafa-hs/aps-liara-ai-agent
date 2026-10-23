import logging
import re
import httpx
from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)

LIARA_PROJECT_PLATFORMS = {
    "static", "docker", "node", "laravel", "react", "vue", "angular",
    "django", "php", "flask", "netcore", "dotnet", "next", "python", "go",
}


def normalize_liara_project_platform(platform: str) -> str:
    normalized = (platform or "").strip().lower()
    aliases = {
        "nodejs": "node",
        "node.js": "node",
        "javascript": "node",
        "nextjs": "next",
        "next.js": "next",
        "python3": "python",
        ".net core": "netcore",
    }
    canonical = aliases.get(normalized, normalized)
    if canonical not in LIARA_PROJECT_PLATFORMS:
        supported = ", ".join(sorted(LIARA_PROJECT_PLATFORMS))
        raise ValueError(
            f"پلتفرم پروژه از روی فایل‌های آن قابل تشخیص نیست یا با Liara سازگار نیست "
            f"(مقدار تشخیص‌داده‌شده: {normalized or 'خالی'}). ساخت سرویس متوقف شد. "
            f"پلتفرم‌های پشتیبانی‌شده: {supported}."
        )
    return canonical


class LiaraAdapter:
    def __init__(self, base_url: str = "https://api.liara.ir"):
        self.base_url = base_url.rstrip("/")

    @staticmethod
    def _auth(api_token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {api_token.strip()}", "User-Agent": "LiaraAgent/0.1.0"}

    @staticmethod
    def _team_params(team_id: str | None) -> dict[str, str] | None:
        return {"teamID": team_id.strip()} if team_id and team_id.strip() else None

    async def list_apps_result(self, api_token: str, team_id: str | None = None) -> dict:
        token = (api_token or "").strip()
        if not token:
            return {"ok": False, "error": "توکن Liara برای فهرست اپلیکیشن‌ها لازم است."}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/v1/projects",
                    headers=self._auth(token),
                    params=self._team_params(team_id),
                )
            if response.status_code != 200:
                return {"ok": False, "status_code": response.status_code, "error": redact_text(response.text[:500], token)}
            data = response.json()
            projects = data.get("projects") if isinstance(data, dict) else None
            if not isinstance(projects, list):
                return {"ok": False, "error": "قالب فهرست اپلیکیشن‌های Liara معتبر نیست."}
            apps = []
            for project in projects:
                if not isinstance(project, dict):
                    continue
                name = project.get("project_id") or project.get("name")
                if not name:
                    continue
                apps.append({
                    "name": str(name),
                    "platform": project.get("type"),
                    "status": project.get("status"),
                    "is_deployed": project.get("isDeployed"),
                    "plan_id": project.get("planID"),
                    "created_at": project.get("created_at"),
                    "url": f"https://{name}.liara.run",
                })
            return {"ok": True, "apps": apps}
        except Exception as error:
            return {"ok": False, "error": redact_text(str(error), token), "retryable": True}

    async def get_app_details_result(self, app_name: str, api_token: str, team_id: str | None = None) -> dict:
        app = (app_name or "").strip()
        token = (api_token or "").strip()
        if not re.fullmatch(r"[a-z0-9-]{3,64}", app) or not token:
            return {"ok": False, "error": "نام اپلیکیشن معتبر یا توکن Liara مشخص نیست."}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/v1/projects/{app}",
                    headers=self._auth(token),
                    params=self._team_params(team_id),
                )
            if response.status_code != 200:
                return {"ok": False, "status_code": response.status_code, "error": redact_text(response.text[:500], token)}
            payload = response.json()
            project = payload.get("project", payload) if isinstance(payload, dict) else None
            if not isinstance(project, dict):
                return {"ok": False, "error": "قالب جزئیات اپلیکیشن Liara معتبر نیست."}
            env_names = [item.get("key") for item in project.get("envs", []) if isinstance(item, dict) and item.get("key")]
            return {"ok": True, "app": {
                "name": project.get("project_id", app),
                "platform": project.get("type"),
                "status": project.get("status"),
                "is_deployed": project.get("isDeployed"),
                "plan_id": project.get("planID"),
                "hourly_price": project.get("hourlyPrice"),
                "created_at": project.get("created_at"),
                "environment_variable_names": env_names,
                "url": f"https://{app}.liara.run",
            }}
        except Exception as error:
            return {"ok": False, "error": redact_text(str(error), token), "retryable": True}

    async def get_app_releases_result(self, app_id: str, api_token: str, team_id: str | None = None) -> dict:
        token = (api_token or "").strip()
        app = (app_id or "").strip()
        if not app or not token:
            return {"ok": False, "error": "نام اپلیکیشن یا توکن Liara مشخص نیست."}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(f"{self.base_url}/v1/projects/{app}/releases", headers=self._auth(token), params=self._team_params(team_id))
            if response.status_code != 200:
                return {"ok": False, "status_code": response.status_code, "error": redact_text(response.text[:500], token)}
            data = response.json()
            if not isinstance(data, dict) or not isinstance(data.get("releases", []), list):
                return {"ok": False, "error": "قالب releaseهای Liara معتبر نیست."}
            releases = [{key: item.get(key) for key in ("tag", "state", "createdAt", "finishedAt", "projectType", "port") if key in item} for item in data["releases"] if isinstance(item, dict)]
            return {"ok": True, "current_release": data.get("currentRelease"), "ready_releases_count": data.get("readyReleasesCount"), "releases": releases}
        except Exception as error:
            return {"ok": False, "error": redact_text(str(error), token), "retryable": True}

    async def get_app_events_result(self, app_id: str, api_token: str, team_id: str | None = None) -> dict:
        token = (api_token or "").strip()
        app = (app_id or "").strip()
        if not app or not token:
            return {"ok": False, "error": "نام اپلیکیشن یا توکن Liara مشخص نیست."}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(f"{self.base_url}/v1/projects/{app}/events", headers=self._auth(token), params=self._team_params(team_id))
            if response.status_code != 200:
                return {"ok": False, "status_code": response.status_code, "error": redact_text(response.text[:500], token)}
            data = response.json()
            return {"ok": True, "events": data.get("data", []) if isinstance(data, dict) else data}
        except Exception as error:
            return {"ok": False, "error": redact_text(str(error), token), "retryable": True}

    async def list_databases_result(self, api_token: str, team_id: str | None = None) -> dict:
        token = (api_token or "").strip()
        if not token:
            return {"ok": False, "error": "توکن Liara برای فهرست دیتابیس‌ها لازم است."}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(f"{self.base_url}/v1/databases", headers=self._auth(token), params=self._team_params(team_id))
            if response.status_code != 200:
                return {"ok": False, "status_code": response.status_code, "error": redact_text(response.text[:500], token)}
            data = response.json()
            databases = data.get("databases") if isinstance(data, dict) else None
            if not isinstance(databases, list):
                return {"ok": False, "error": "قالب فهرست دیتابیس‌های Liara معتبر نیست."}
            safe_items = [{key: item.get(key) for key in ("name", "hostname", "type", "status", "planID", "created_at") if key in item} for item in databases if isinstance(item, dict)]
            return {"ok": True, "databases": safe_items}
        except Exception as error:
            return {"ok": False, "error": redact_text(str(error), token), "retryable": True}

    async def _list_service_result(
        self,
        *,
        host: str,
        path: str,
        collection_key: str,
        response_path: tuple[str, ...] | None = None,
        api_token: str,
        team_id: str | None = None,
    ) -> dict:
        """Read a documented Liara service catalog without returning credentials."""
        token = (api_token or "").strip()
        if not token:
            return {"ok": False, "error": "توکن Liara برای خواندن این فهرست لازم است."}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{host.rstrip('/')}{path}",
                    headers=self._auth(token),
                    params=self._team_params(team_id),
                )
            if response.status_code != 200:
                return {
                    "ok": False,
                    "status_code": response.status_code,
                    "error": redact_text(response.text[:500], token),
                    "retryable": response.status_code == 429 or response.status_code >= 500,
                }
            payload = response.json()
            resources = payload
            for segment in response_path or (collection_key,):
                resources = resources.get(segment) if isinstance(resources, dict) else None
            if not isinstance(resources, list):
                return {"ok": False, "error": "قالب پاسخ فهرست Liara معتبر نیست."}
            safe_resources = []
            for item in resources:
                if not isinstance(item, dict):
                    continue
                safe_resources.append({
                    key: redact_text(str(item[key]), token)
                    for key in ("id", "name", "domain", "status", "type", "planID", "created_at", "createdAt")
                    if item.get(key) is not None
                })
            return {"ok": True, collection_key: safe_resources}
        except Exception as error:
            return {"ok": False, "error": redact_text(str(error), token), "retryable": True}

    async def list_buckets_result(self, api_token: str, team_id: str | None = None) -> dict:
        return await self._list_service_result(
            host="https://storage-service.liara.ir",
            path="/api/v1/buckets",
            collection_key="buckets",
            api_token=api_token,
            team_id=team_id,
        )

    async def list_dns_zones_result(self, api_token: str, team_id: str | None = None) -> dict:
        return await self._list_service_result(
            host="https://dns-service.liara.ir",
            path="/api/v1/zones",
            collection_key="zones",
            response_path=("data",),
            api_token=api_token,
            team_id=team_id,
        )

    async def list_mail_servers_result(self, api_token: str, team_id: str | None = None) -> dict:
        return await self._list_service_result(
            host="https://mail-service.liara.ir",
            path="/api/v1/mails",
            collection_key="mail_servers",
            response_path=("data", "mailServers"),
            api_token=api_token,
            team_id=team_id,
        )

    async def get_latest_release_result(
        self, app_id: str, api_token: str, team_id: str | None = None
    ) -> dict:
        """Read the latest release metadata through Liara's documented PaaS API."""
        app = (app_id or "").strip()
        token = (api_token or "").strip()
        if not app or not token:
            return {"ok": False, "error": "نام سرویس یا توکن Liara مشخص نیست."}
        params = {"teamID": team_id.strip()} if team_id and team_id.strip() else None
        headers = {"Authorization": f"Bearer {token}", "User-Agent": "LiaraAgent/0.1.0"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/v1/projects/{app}/releases",
                    headers=headers,
                    params=params,
                )
            if response.status_code != 200:
                return {
                    "ok": False,
                    "status_code": response.status_code,
                    "retryable": response.status_code == 429 or response.status_code >= 500,
                    "error": redact_text(response.text[:500], token),
                }
            data = response.json()
            if not isinstance(data, dict):
                return {"ok": False, "error": "پاسخ فهرست releaseهای Liara معتبر نبود."}
            current_tag = data.get("currentRelease")
            releases = data.get("releases", [])
            current = next(
                (item for item in releases if isinstance(item, dict) and item.get("tag") == current_tag),
                releases[0] if releases and isinstance(releases[0], dict) else {},
            )
            return {
                "ok": True,
                "state": str(current.get("state") or "unknown"),
                "tag": current.get("tag") or current_tag,
                "current_release": current_tag,
                "ready_releases_count": data.get("readyReleasesCount"),
            }
        except Exception as error:
            return {
                "ok": False,
                "retryable": True,
                "error": redact_text(str(error), token),
            }

    async def set_environment_variables(
        self,
        app_name: str,
        env_vars: dict[str, str],
        api_token: str,
        team_id: str | None = None,
    ) -> dict:
        """Apply env values through Liara's API, keeping secrets out of process argv."""
        app = (app_name or "").strip()
        token = (api_token or "").strip()
        if not app or not token or not env_vars:
            return {"ok": False, "error": "نام برنامه، توکن و دست‌کم یک متغیر لازم است."}

        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "LiaraAgent/0.1.0",
            "Content-Type": "application/json",
        }
        clean_team_id = team_id.strip() if team_id and team_id.strip() else None
        params = {"teamID": clean_team_id} if clean_team_id else None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                project_response = await client.get(
                    f"{self.base_url}/v1/projects/{app}", headers=headers, params=params
                )
                if project_response.status_code != 200:
                    return {
                        "ok": False,
                        "error": redact_text(project_response.text, token),
                        "status_code": project_response.status_code,
                    }
                project_data = project_response.json()
                project = project_data.get("project", project_data) if isinstance(project_data, dict) else {}
                existing = project.get("envs", []) if isinstance(project, dict) else []
                merged = {
                    item.get("key"): item.get("value", "")
                    for item in existing
                    if isinstance(item, dict) and item.get("key")
                }
                merged.update(env_vars)
                variables = [{"key": key, "value": value} for key, value in merged.items()]
                response = await client.post(
                    f"{self.base_url}/v1/projects/update-envs",
                    headers=headers,
                    params=params,
                    json={"project": app, "variables": variables},
                )
                safe_response = redact_text(response.text, token)
                for value in env_vars.values():
                    if value:
                        safe_response = redact_text(safe_response, value)
                if response.status_code not in (200, 201, 202):
                    return {"ok": False, "error": safe_response, "status_code": response.status_code}
                return {"ok": True, "app_name": app, "variables_set": list(env_vars.keys()), "output": safe_response}
        except Exception as error:
            safe_error = redact_text(str(error), token)
            for value in env_vars.values():
                if value:
                    safe_error = redact_text(safe_error, value)
            return {"ok": False, "error": safe_error}

    async def get_teams(self, api_token: str) -> list[dict]:
        """Fetches the list of teams accessible by the given API token."""
        if not api_token or not api_token.strip():
            return []

        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "User-Agent": "LiaraAgent/0.1.0",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.base_url}/v2/teams", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return [
                        {"id": t.get("_id", ""), "name": t.get("name", "")}
                        for t in data.get("teams", [])
                        if t.get("_id")
                    ]
                else:
                    logger.warning(
                        "Liara /v2/teams returned status %s: %s",
                        res.status_code,
                        redact_text(res.text, api_token),
                    )
        except Exception as e:
            logger.warning("Failed to fetch teams: %s", redact_text(str(e), api_token))
        return []

    async def get_services(
        self, api_token: str, team_id: str | None = None
    ) -> list[dict]:
        """Fetches both applications (projects) and databases from Liara."""
        if not api_token or not api_token.strip():
            return []

        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "User-Agent": "LiaraAgent/0.1.0",
        }
        clean_team_id = team_id.strip() if team_id and team_id.strip() else None
        params = {"teamID": clean_team_id} if clean_team_id else None

        services = []

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Fetch projects (apps)
                try:
                    p_res = await client.get(
                        f"{self.base_url}/v1/projects", headers=headers, params=params
                    )
                    if p_res.status_code == 200:
                        projects = p_res.json().get("projects", [])
                        for p in projects:
                            name = p.get("project_id", p.get("_id", ""))
                            raw_status = str(p.get("status", "")).lower()
                            status = (
                                "running"
                                if raw_status in ["running", "ready", "active"]
                                else raw_status
                                if raw_status in ["created", "creating", "pending"]
                                else "stopped"
                            )
                            services.append({
                                "name": name,
                                "type": "app",
                                "status": status,
                                "endpoint": f"https://{name}.liara.run" if name else "",
                                "port": p.get("port", 3000),
                            })
                except Exception as e:
                    logger.warning("Failed to fetch projects in get_services: %s", redact_text(str(e), api_token))

                # 2. Fetch databases
                try:
                    d_res = await client.get(
                        f"{self.base_url}/v1/databases", headers=headers, params=params
                    )
                    if d_res.status_code == 200:
                        databases = d_res.json().get("databases", [])
                        for d in databases:
                            name = d.get("hostname", d.get("name", d.get("_id", "")))
                            db_type = d.get("type", "postgres").lower()
                            raw_status = str(d.get("status", "")).lower()
                            status = (
                                "running"
                                if raw_status in ["running", "ready", "active"]
                                else "stopped"
                            )
                            services.append({
                                "name": name,
                                "type": db_type,
                                "status": status,
                                "endpoint": d.get("public_network") or d.get("hostname", ""),
                                "port": d.get("port", 5432),
                            })
                except Exception as e:
                    logger.warning("Failed to fetch databases in get_services: %s", redact_text(str(e), api_token))

        except Exception as e:
            logger.warning("get_services encountered error: %s", redact_text(str(e), api_token))

        return services

    async def check_project_name(
        self, project_name: str, api_token: str, team_id: str | None = None
    ) -> dict:
        """Check app-name availability against the selected account/team inventory."""
        clean_name = (project_name or "").strip().lower()
        if not re.fullmatch(r"[a-z0-9-]{3,64}", clean_name):
            return {"ok": False, "available": False, "reason": "invalid_name"}
        if not api_token or not api_token.strip():
            return {"ok": False, "available": False, "reason": "missing_credentials"}

        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "User-Agent": "LiaraAgent/0.1.0",
        }
        clean_team_id = team_id.strip() if team_id and team_id.strip() else None
        params = {"teamID": clean_team_id} if clean_team_id else None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/projects", headers=headers, params=params
                )
            if res.status_code == 401:
                return {"ok": False, "available": False, "reason": "unauthorized"}
            if res.status_code == 403:
                return {"ok": False, "available": False, "reason": "forbidden"}
            if res.status_code != 200:
                logger.warning(
                    "Liara app inventory check failed (HTTP %s): %s",
                    res.status_code,
                    redact_text(res.text, api_token),
                )
                return {"ok": False, "available": False, "reason": "provider_error"}

            data = res.json()
            projects = data.get("projects") if isinstance(data, dict) else None
            if not isinstance(projects, list):
                logger.warning("Liara app inventory response had an unexpected shape")
                return {"ok": False, "available": False, "reason": "provider_error"}

            exists = any(
                isinstance(project, dict)
                and str(project.get("project_id", project.get("name", ""))).strip().lower() == clean_name
                for project in projects
            )
            return {
                "ok": True,
                "available": not exists,
                "reason": "already_exists" if exists else None,
            }
        except Exception as e:
            logger.warning("Liara app inventory check failed: %s", redact_text(str(e), api_token))
            return {"ok": False, "available": False, "reason": "provider_error"}

    async def test_connection(
        self, api_token: str, team_id: str | None = None
    ) -> dict:
        if not api_token or not api_token.strip():
            return {
                "ok": False,
                "error": "Liara API token cannot be empty.",
            }

        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "User-Agent": "LiaraAgent/0.1.0",
        }

        clean_team_id = team_id.strip() if team_id and team_id.strip() else None
        params = {"teamID": clean_team_id} if clean_team_id else None

        try:
            # 1. Fetch available teams using the dedicated helper
            teams_list = await self.get_teams(api_token)

            # 2. Fetch projects (scoped to teamID if provided)
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.base_url}/v1/projects", headers=headers, params=params
                )

                if res.status_code == 200:
                    data = res.json()
                    projects = data.get("projects", [])
                    return {
                        "ok": True,
                        "app_count": len(projects),
                        "apps": [
                            {
                                "project_id": p.get("project_id", p.get("_id", "")),
                                "type": p.get("type", "unknown"),
                                "status": p.get("status", "unknown"),
                            }
                            for p in projects
                        ],
                        "team_id": clean_team_id,
                        "active_team_id": clean_team_id,
                        "teams": teams_list,
                    }
                elif res.status_code == 401:
                    return {
                        "ok": False,
                        "error": "Authentication failed with Liara Cloud. Check your API token.",
                    }
                else:
                    safe_msg = redact_text(res.text, api_token)
                    return {
                        "ok": False,
                        "error": f"Liara returned status {res.status_code}: {safe_msg}",
                    }
        except Exception as e:
            safe_error = redact_text(str(e), api_token)
            return {
                "ok": False,
                "error": f"Connection error: {safe_error}",
            }

    async def create_project(
        self,
        project_id: str,
        platform: str,
        plan_id: str,
        bundle_plan_id: str,
        network_id: str,
        api_token: str,
        team_id: str | None = None,
    ) -> dict:
        if not project_id or not re.match(r"^[a-zA-Z0-9-]{3,64}$", project_id.strip()):
            raise ValueError(
                "Invalid project name. Must be 3-64 characters and contain only letters, numbers, or hyphens."
            )

        if not api_token or not api_token.strip():
            raise ValueError("Liara API token cannot be empty.")

        clean_project = project_id.strip().lower()
        clean_platform = normalize_liara_project_platform(platform)
        clean_plan = plan_id.strip()

        headers = {
            "Authorization": f"Bearer {api_token.strip()}",
            "User-Agent": "LiaraAgent/0.1.0",
            "Content-Type": "application/json",
        }
        clean_team_id = team_id.strip() if team_id and team_id.strip() else None
        params = {"teamID": clean_team_id} if clean_team_id else None

        clean_bundle_plan = (bundle_plan_id or "").strip()
        clean_network_id = (network_id or "").strip()
        if not clean_platform or not clean_plan or not clean_bundle_plan or not clean_network_id:
            raise ValueError("Liara platform, hardware plan, feature bundle, and network are required to create an app.")

        # Liara's documented POST /v1/projects contract uses these exact field names.
        body = {
            "name": clean_project,
            "platform": clean_platform,
            "planID": clean_plan,
            "bundlePlanID": clean_bundle_plan,
            "network": clean_network_id,
        }

        logger.info("Creating Liara project: %s (type: %s, plan: %s)", clean_project, clean_platform, clean_plan)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/v1/projects",
                    headers=headers,
                    params=params,
                    json=body,
                )

                if res.status_code in [200, 201, 202]:
                    # Liara's create endpoint acknowledges a request. Confirm the app
                    # through the provider before allowing the workflow to continue.
                    verify_res = await client.get(
                        f"{self.base_url}/v1/projects/{clean_project}",
                        headers=headers,
                        params=params,
                    )
                    if verify_res.status_code == 200:
                        verify_data = verify_res.json()
                        project = (
                            verify_data.get("project", verify_data)
                            if isinstance(verify_data, dict)
                            else {}
                        )
                        verified_network = project.get("network")
                        verified_network_id = verified_network.get("_id") if isinstance(verified_network, dict) else verified_network
                        if (
                            str(project.get("project_id", "")).lower() != clean_project
                            or project.get("planID") != clean_plan
                            or project.get("bundlePlanID") != clean_bundle_plan
                            or str(verified_network_id or "") != clean_network_id
                        ):
                            return {
                                "ok": False,
                                "reason": "unverified",
                                "status": "unverified",
                                "error": "لیارا وجود سرویس را تأیید کرد اما تنظیمات پلن یا شبکه با انتخاب شما تطبیق ندارد؛ پیش از ادامه، سرویس را در کنسول لیارا بررسی کنید.",
                            }
                        return {
                            "ok": True,
                            "project_id": clean_project,
                            "platform": clean_platform,
                            "plan_id": clean_plan,
                            "bundle_plan_id": clean_bundle_plan,
                            "network_id": clean_network_id,
                            "endpoint": f"https://{clean_project}.liara.run",
                            "status": str(project.get("status") or "created").lower(),
                        }

                    if verify_res.status_code == 404:
                        return {
                            "ok": False,
                            "reason": "unverified",
                            "status": "unverified",
                            "error": "درخواست ساخت ارسال شد، اما هنوز وجود سرویس در لیارا تأیید نشده است. کمی بعد وضعیت را دوباره بررسی کنید.",
                        }

                    safe_verify_error = redact_text(verify_res.text, api_token)
                    logger.warning(
                        "Liara app creation could not be verified (HTTP %s): %s",
                        verify_res.status_code,
                        safe_verify_error,
                    )
                    return {
                        "ok": False,
                        "reason": "unverified",
                        "status": "unverified",
                        "error": "درخواست ساخت ارسال شد، اما نتوانستم وجود سرویس را از لیارا تأیید کنم. برای جلوگیری از ساخت تکراری، ابتدا فهرست سرویس‌ها را دوباره بررسی کنید.",
                    }
                elif res.status_code == 409:
                    return {
                        "ok": False,
                        "reason": "already_exists",
                        "error": f"برنامه‌ای با نام '{clean_project}' قبلاً در لیارا ثبت شده است. لطفاً نام دیگری انتخاب کنید.",
                    }
                elif res.status_code == 401:
                    return {
                        "ok": False,
                        "error": "احراز هویت در لیارا ناموفق بود. کلید دسترسی (API Token) را بررسی کنید.",
                    }
                elif res.status_code == 402:
                    return {"ok": False, "reason": "insufficient_balance", "error": "موجودی حساب لیارا برای ساخت این سرویس کافی نیست؛ موجودی را بررسی کنید و دوباره تلاش کنید."}
                elif res.status_code == 403:
                    return {"ok": False, "reason": "forbidden", "error": "این حساب یا تیم اجازهٔ ساخت سرویس با تنظیمات انتخاب‌شده را ندارد؛ دسترسی و پلن را بررسی کنید."}
                else:
                    safe_msg = redact_text(res.text, api_token)
                    try:
                        provider_message = str(res.json().get("message", ""))
                    except (ValueError, AttributeError):
                        provider_message = ""
                    if "plan_unavailable" in provider_message or "plan is not available" in provider_message:
                        return {"ok": False, "reason": "plan_unavailable", "error": "پلن سخت‌افزاری یا امکانات انتخاب‌شده دیگر برای این حساب در دسترس نیست؛ گزینه‌ها را دوباره از لیارا دریافت کنید."}
                    if "network" in provider_message.lower() and res.status_code in [400, 404]:
                        return {"ok": False, "reason": "network_unavailable", "error": "شبکهٔ انتخاب‌شده در لیارا پیدا نشد یا در دسترس نیست؛ گزینه‌ها را دوباره دریافت و انتخاب کنید."}
                    return {
                        "ok": False,
                        "error": f"خطا در ساخت سرویس در لیارا (کد {res.status_code}): {safe_msg}",
                    }
        except Exception as e:
            safe_err = redact_text(str(e), api_token)
            logger.error("Failed to create Liara project: %s", safe_err)
            return {
                "ok": False,
                "error": f"خطای ارتباط با سرور لیارا: {safe_err}",
            }


liara_adapter = LiaraAdapter()
