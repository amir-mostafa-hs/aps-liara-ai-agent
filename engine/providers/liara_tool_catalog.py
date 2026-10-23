"""Versioned, typed allowlist of Liara operations available to the chat agent."""

import re

from engine.providers.liara_adapter import LiaraAdapter, liara_adapter


CATALOG_VERSION = 1

READ_ONLY_OPERATIONS = {
    "inspect_project": {
        "description": "وقتی کاربر می‌خواهد پروژه‌ای را بررسی یا دپلوی کند، فایل‌های پروژه را فقط‌خواندنی بررسی کن.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "مسیر پروژه در فضای کاری مجاز"}}, "required": ["path"], "additionalProperties": False},
        "transport": "engine",
        "documentation": "internal:project-inspection",
    },
    "list_liara_apps": {
        "description": "فهرست اپلیکیشن‌های قابل‌دسترسی کاربر در Liara را نمایش بده.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "transport": "api",
        "documentation": "https://developers.liara.ir/pass/apps/get-details-of-all-projects",
    },
    "get_liara_app_details": {
        "description": "وضعیت و مشخصات غیرمحرمانهٔ یک اپلیکیشن Liara را بخوان.",
        "parameters": {"type": "object", "properties": {"app_name": {"type": "string", "description": "نام اپلیکیشن"}}, "required": ["app_name"], "additionalProperties": False},
        "transport": "api",
        "documentation": "https://developers.liara.ir/pass/apps/get-details-of-a-project",
    },
    "get_liara_app_logs": {
        "description": "لاگ‌های محدود اپلیکیشن را از Liara دریافت کن.",
        "parameters": {"type": "object", "properties": {"app_name": {"type": "string"}, "lines": {"type": "integer", "minimum": 1, "maximum": 200}}, "required": ["app_name"], "additionalProperties": False},
        "transport": "cli",
        "documentation": "https://github.com/liara-cloud/cli/blob/master/README.md",
    },
    "get_liara_app_releases": {
        "description": "releaseهای اپلیکیشن و release جاری را بخوان.",
        "parameters": {"type": "object", "properties": {"app_name": {"type": "string"}}, "required": ["app_name"], "additionalProperties": False},
        "transport": "api",
        "documentation": "https://developers.liara.ir/pass/apps/get-releases-of-app",
    },
    "get_liara_app_events": {
        "description": "رویدادهای ثبت‌شده برای اپلیکیشن را بخوان.",
        "parameters": {"type": "object", "properties": {"app_name": {"type": "string"}}, "required": ["app_name"], "additionalProperties": False},
        "transport": "api",
        "documentation": "https://developers.liara.ir/pass/apps/get-events-of-the-app",
    },
    "list_liara_databases": {
        "description": "فهرست دیتابیس‌های قابل‌دسترسی کاربر در Liara را نمایش بده.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "transport": "api",
        "documentation": "https://developers.liara.ir/dbass/databases/get-all-databases",
    },
    "list_liara_buckets": {
        "description": "فهرست مخزن‌های Object Storage کاربر را بخوان.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "transport": "api",
        "documentation": "https://github.com/liara-cloud/openapi/blob/main/spec/object-storage.yaml",
    },
    "list_liara_dns_zones": {
        "description": "فهرست zoneهای DNS کاربر را بخوان.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "transport": "api",
        "documentation": "https://github.com/liara-cloud/openapi/blob/main/spec/dns.yaml",
    },
    "list_liara_mail_servers": {
        "description": "فهرست سرویس‌های Mail کاربر را بخوان.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        "transport": "api",
        "documentation": "https://github.com/liara-cloud/openapi/blob/main/spec/mail.yaml",
    },
}


def get_read_only_tool_schemas() -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": name,
                "description": operation["description"],
                "parameters": operation["parameters"],
            },
        }
        for name, operation in READ_ONLY_OPERATIONS.items()
    ]


async def execute_liara_tool(
    name: str,
    arguments: dict,
    api_token: str,
    team_id: str | None,
    adapter: LiaraAdapter = liara_adapter,
    log_fetcher=None,
) -> dict:
    operation = READ_ONLY_OPERATIONS.get(name)
    if not operation:
        return {"ok": False, "error": "این ابزار در فهرست مجاز Agent وجود ندارد."}
    if not isinstance(arguments, dict) or set(arguments) - set(operation["parameters"]["properties"]):
        return {"ok": False, "error": "پارامترهای ابزار معتبر نیستند."}

    if name == "inspect_project":
        source_path = arguments.get("path")
        if not isinstance(source_path, str) or not source_path.strip() or len(source_path) > 500:
            return {"ok": False, "error": "مسیر پروژه معتبر نیست."}
        try:
            from engine.services.inspector import project_inspector

            analysis = project_inspector.inspect(source_path)
            return {"ok": True, "source_path": source_path, "analysis": analysis.model_dump()}
        except (PermissionError, FileNotFoundError, ValueError) as error:
            return {"ok": False, "error": str(error)}

    app_name = arguments.get("app_name")
    if name in {"get_liara_app_details", "get_liara_app_logs", "get_liara_app_releases", "get_liara_app_events"}:
        if not isinstance(app_name, str) or not re.fullmatch(r"[a-z0-9-]{3,64}", app_name.strip()):
            return {"ok": False, "error": "نام اپلیکیشن معتبر نیست."}

    try:
        if name == "list_liara_apps":
            return await adapter.list_apps_result(api_token=api_token, team_id=team_id)
        if name == "get_liara_app_details":
            return await adapter.get_app_details_result(app_name=app_name.strip(), api_token=api_token, team_id=team_id)
        if name == "get_liara_app_logs":
            lines = arguments.get("lines", 100)
            if not isinstance(lines, int) or isinstance(lines, bool) or not 1 <= lines <= 200:
                return {"ok": False, "error": "تعداد خطوط لاگ باید بین ۱ تا ۲۰۰ باشد."}
            if log_fetcher is None:
                from engine.services.diagnoser import sre_diagnoser

                log_fetcher = sre_diagnoser
            return await log_fetcher.fetch_runtime_logs_result(
                app_id=app_name.strip(),
                api_token=api_token,
                team_id=team_id,
                lines=lines,
            )
        if name == "get_liara_app_releases":
            return await adapter.get_app_releases_result(app_id=app_name.strip(), api_token=api_token, team_id=team_id)
        if name == "get_liara_app_events":
            return await adapter.get_app_events_result(app_id=app_name.strip(), api_token=api_token, team_id=team_id)
        if name == "list_liara_databases":
            return await adapter.list_databases_result(api_token=api_token, team_id=team_id)
        if name == "list_liara_buckets":
            return await adapter.list_buckets_result(api_token=api_token, team_id=team_id)
        if name == "list_liara_dns_zones":
            return await adapter.list_dns_zones_result(api_token=api_token, team_id=team_id)
        if name == "list_liara_mail_servers":
            return await adapter.list_mail_servers_result(api_token=api_token, team_id=team_id)
    except Exception:
        return {"ok": False, "error": "اجرای ابزار Liara ناموفق بود؛ هیچ دستور یا نشانی خارج از کاتالوگ اجرا نشد."}
    return {"ok": False, "error": "اجرای این ابزار پیاده‌سازی نشده است."}
