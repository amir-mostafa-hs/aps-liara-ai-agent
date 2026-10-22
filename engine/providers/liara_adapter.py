import httpx
from engine.security.redaction import redact_text


class LiaraAdapter:
    def __init__(self, base_url: str = "https://api.iran.liara.ir"):
        self.base_url = base_url.rstrip("/")

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
        except Exception:
            pass
        return []

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
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Fetch available teams in parallel/sequence
                teams_list: list[dict] = []
                try:
                    t_res = await client.get(
                        f"{self.base_url}/v2/teams", headers=headers
                    )
                    if t_res.status_code == 200:
                        t_data = t_res.json()
                        teams_list = [
                            {"id": t.get("_id", ""), "name": t.get("name", "")}
                            for t in t_data.get("teams", [])
                            if t.get("_id")
                        ]
                except Exception:
                    pass

                # 2. Fetch projects (scoped to teamID if provided)
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


liara_adapter = LiaraAdapter()
