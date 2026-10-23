import pytest

from engine.providers.liara_tool_catalog import READ_ONLY_OPERATIONS, execute_liara_tool, get_read_only_tool_schemas


class FakeLiaraAdapter:
    async def list_apps_result(self, **kwargs):
        return {"ok": True, "apps": [{"name": "simple-app", "status": "running"}]}

    async def get_app_details_result(self, **kwargs):
        return {"ok": True, "app": {"name": kwargs["app_name"], "status": "running"}}

    async def get_app_logs_result(self, **kwargs):
        return {"ok": True, "logs": "2026-10-23 [stdout] started"}

    async def get_app_releases_result(self, **kwargs):
        return {"ok": True, "releases": [{"tag": "v1", "state": "ready"}]}

    async def get_app_events_result(self, **kwargs):
        return {"ok": True, "events": []}

    async def list_databases_result(self, **kwargs):
        return {"ok": True, "databases": []}

    async def list_buckets_result(self, **kwargs):
        return {"ok": True, "buckets": [{"name": "assets"}]}

    async def list_dns_zones_result(self, **kwargs):
        return {"ok": True, "zones": [{"name": "example.com"}]}

    async def list_mail_servers_result(self, **kwargs):
        return {"ok": True, "mail_servers": [{"domain": "example.com"}]}


class FakeRuntimeLogFetcher:
    async def fetch_runtime_logs_result(self, **kwargs):
        return {"ok": True, "logs": "2026-10-23 [stdout] started"}


@pytest.mark.anyio
async def test_read_only_catalog_routes_a_persian_app_list_request_to_liara_inventory():
    result = await execute_liara_tool(
        "list_liara_apps",
        {},
        api_token="user-token",
        team_id="team-42",
        adapter=FakeLiaraAdapter(),
    )

    assert result == {"ok": True, "apps": [{"name": "simple-app", "status": "running"}]}
    assert any(tool["function"]["name"] == "list_liara_apps" for tool in get_read_only_tool_schemas())


@pytest.mark.anyio
async def test_app_log_tool_uses_cli_runtime_log_service_and_declares_cli_transport():
    result = await execute_liara_tool(
        "get_liara_app_logs",
        {"app_name": "simple-app", "lines": 50},
        api_token="user-token",
        team_id="team-42",
        adapter=FakeLiaraAdapter(),
        log_fetcher=FakeRuntimeLogFetcher(),
    )
    assert result == {"ok": True, "logs": "2026-10-23 [stdout] started"}
    assert READ_ONLY_OPERATIONS["get_liara_app_logs"]["transport"] == "cli"


@pytest.mark.anyio
async def test_catalog_rejects_unknown_tools_and_invalid_parameters():
    adapter = FakeLiaraAdapter()

    unknown = await execute_liara_tool(
        "liara_api_request",
        {"url": "https://evil.invalid"},
        api_token="user-token",
        team_id=None,
        adapter=adapter,
    )
    invalid = await execute_liara_tool(
        "get_liara_app_details",
        {"app_name": "../other"},
        api_token="user-token",
        team_id=None,
        adapter=adapter,
    )

    assert unknown["ok"] is False
    assert invalid["ok"] is False
    assert "app" not in invalid


@pytest.mark.anyio
async def test_read_only_catalog_includes_documented_storage_dns_and_mail_lists():
    adapter = FakeLiaraAdapter()
    results = {}
    for tool_name, collection in (
        ("list_liara_buckets", "buckets"),
        ("list_liara_dns_zones", "zones"),
        ("list_liara_mail_servers", "mail_servers"),
    ):
        results[tool_name] = await execute_liara_tool(
            tool_name,
            {},
            api_token="user-token",
            team_id="team-42",
            adapter=adapter,
        )
        assert results[tool_name]["ok"] is True
        assert collection in results[tool_name]

    schemas = {tool["function"]["name"]: tool for tool in get_read_only_tool_schemas()}
    assert all(name in schemas for name in results)
