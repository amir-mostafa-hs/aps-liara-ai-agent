import time
from collections.abc import Awaitable, Callable

from engine.domain.models import PostDeployCheckResult, VerificationResult
from engine.providers.liara_adapter import liara_adapter
from engine.services.diagnoser import sre_diagnoser
from engine.services.verifier import endpoint_verifier


class PostDeployMonitor:
    """Collect independent provider, endpoint, and runtime-log evidence after deploy."""

    RETRY_DELAYS_SECONDS = (5, 10, 20, 30, 30, 30, 30, 25)

    def __init__(
        self,
        verifier=endpoint_verifier,
        log_provider=sre_diagnoser,
        provider=liara_adapter,
        sleep: Callable[[float], Awaitable[None]] | None = None,
        monotonic: Callable[[], float] = time.monotonic,
    ):
        import asyncio

        self.verifier = verifier
        self.log_provider = log_provider
        self.provider = provider
        self.sleep = sleep or asyncio.sleep
        self.monotonic = monotonic

    @staticmethod
    def _log_status(result: dict) -> tuple[str, str, bool]:
        if result.get("ok") and str(result.get("logs", "")).strip():
            return "available", "", False

        status_code = result.get("status_code")
        if status_code == 401:
            return "unauthorized", "دسترسی Liara برای دریافت لاگ‌ها تأیید نشد (401).", False
        if status_code == 403:
            return "forbidden", "اجازهٔ خواندن لاگ‌های این سرویس در Liara وجود ندارد (403).", False
        if status_code == 404:
            return "failed", "سرویس در حساب یا تیم انتخاب‌شدهٔ Liara پیدا نشد (404).", False

        warning = result.get("error") or "لاگ runtime هنوز در دسترس نیست."
        if status_code == 429 or (isinstance(status_code, int) and status_code >= 500):
            return "unavailable", warning, True
        if status_code is None and result.get("retryable") is True:
            return "unavailable", warning, True
        if status_code is None and not result.get("error"):
            return "unavailable", warning, True
        if not str(result.get("logs", "")).strip():
            return "unavailable", warning, True
        return "failed", warning, False

    async def check(
        self,
        app_id: str,
        api_token: str,
        team_id: str | None = None,
        endpoint_url: str | None = None,
        provider_deployment_state: str = "succeeded",
        max_wait_seconds: int = 180,
    ) -> PostDeployCheckResult:
        import asyncio

        budget = min(max(int(max_wait_seconds), 0), 180)
        started_at = self.monotonic()
        release_state: str | None = None
        release_warning: str | None = None
        remaining = max(0.0, budget - (self.monotonic() - started_at))
        if remaining > 0:
            try:
                release_lookup = await asyncio.wait_for(
                    self.provider.get_latest_release_result(
                        app_id=app_id, api_token=api_token, team_id=team_id
                    ),
                    timeout=remaining,
                )
                if release_lookup.get("ok"):
                    release_state = release_lookup.get("state")
                else:
                    release_warning = release_lookup.get("error") or "وضعیت release از Liara دریافت نشد."
            except asyncio.TimeoutError:
                release_warning = "مهلت بررسی وضعیت release در Liara تمام شد."
        else:
            release_warning = "مهلت بررسی پس از دپلوی تمام شد؛ وضعیت release دریافت نشد."

        verification = VerificationResult(
            endpoint_url=endpoint_url or f"https://{app_id.strip()}.liara.run",
            application_health="inconclusive",
        )
        logs_status = "unavailable"
        logs_text = ""
        logs_warning: str | None = None
        attempts = 0
        schedule_index = 0

        while True:
            remaining = budget - (self.monotonic() - started_at)
            if remaining <= 0:
                outcome = "healthy" if verification.application_health == "healthy" else (
                    "unhealthy" if verification.application_health == "unhealthy" and logs_status == "available" else "inconclusive"
                )
                if logs_status != "available" and not logs_warning:
                    logs_warning = "مهلت سه‌دقیقه‌ای بررسی پس از دپلوی تمام شد و لاگ runtime دریافت نشد."
                break
            attempts += 1
            try:
                verification = await asyncio.wait_for(
                    self.verifier.verify_endpoint(
                        app_id=app_id,
                        endpoint_url=endpoint_url,
                        provider_status=provider_deployment_state,
                        timeout_seconds=min(5.0, remaining),
                        retries=1,
                    ),
                    timeout=remaining,
                )
            except asyncio.TimeoutError:
                verification = VerificationResult(
                    endpoint_url=endpoint_url or f"https://{app_id.strip()}.liara.run",
                    application_health="inconclusive",
                    error_message="مهلت درخواست بررسی HTTP تمام شد.",
                )

            remaining = budget - (self.monotonic() - started_at)
            if remaining <= 0:
                logs_status, logs_warning, retryable = "unavailable", "مهلت دریافت لاگ runtime تمام شد.", True
                log_result = {"ok": False, "logs": "", "error": logs_warning, "retryable": True}
            else:
                try:
                    log_result = await asyncio.wait_for(
                        self.log_provider.fetch_runtime_logs_result(
                            app_id=app_id,
                            api_token=api_token,
                            team_id=team_id,
                        ),
                        timeout=remaining,
                    )
                except asyncio.TimeoutError:
                    log_result = {"ok": False, "logs": "", "error": "مهلت دریافت لاگ runtime تمام شد.", "retryable": True}
            logs_status, logs_warning, retryable = self._log_status(log_result)
            if logs_status == "available":
                logs_text = log_result["logs"]

            if verification.application_health == "healthy" and logs_status == "available":
                outcome = "healthy"
                break
            if verification.application_health == "unhealthy" and logs_status == "available":
                outcome = "unhealthy"
                break
            if not retryable and logs_status in ("unauthorized", "forbidden", "failed"):
                outcome = "healthy" if verification.application_health == "healthy" else (
                    "unhealthy" if verification.application_health == "unhealthy" else "inconclusive"
                )
                break

            elapsed = self.monotonic() - started_at
            remaining = budget - elapsed
            if remaining <= 0 or schedule_index >= len(self.RETRY_DELAYS_SECONDS):
                outcome = "healthy" if verification.application_health == "healthy" else (
                    "unhealthy" if verification.application_health == "unhealthy" and logs_status == "available" else "inconclusive"
                )
                break

            delay = min(self.RETRY_DELAYS_SECONDS[schedule_index], remaining)
            schedule_index += 1
            await self.sleep(delay)

        return PostDeployCheckResult(
            outcome=outcome,
            provider_deployment_state=provider_deployment_state,
            provider_release_state=release_state,
            provider_release_warning=release_warning,
            application_health=verification.application_health,
            endpoint_url=verification.endpoint_url,
            http_status_code=verification.http_status_code,
            runtime_logs_status=logs_status,
            runtime_logs=logs_text,
            runtime_logs_warning=logs_warning,
            attempts=attempts,
            elapsed_seconds=round(max(0, self.monotonic() - started_at), 2),
        )


post_deploy_monitor = PostDeployMonitor()
