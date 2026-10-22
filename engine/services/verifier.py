import asyncio
import logging
import time
from datetime import datetime, timezone
import httpx
from engine.domain.models import VerificationResult
from engine.security.redaction import redact_text

logger = logging.getLogger(__name__)


class EndpointVerifier:
    def __init__(self, default_timeout: float = 5.0):
        self.default_timeout = default_timeout

    async def verify_endpoint(
        self,
        app_id: str,
        endpoint_url: str | None = None,
        provider_status: str = "success",
        timeout_seconds: float | None = None,
        retries: int = 2,
        retry_delay: float = 0.5,
    ) -> VerificationResult:
        """Queries the deployed application's public URL and determines application health strictly separate from provider status."""
        target_url = endpoint_url or f"https://{app_id.strip()}.liara.run"
        timeout = timeout_seconds or self.default_timeout

        last_error: str | None = None
        last_status: int | None = None
        last_body: str | None = None
        latency_ms: float | None = None

        headers = {
            "User-Agent": "LiaraAgentVerifier/0.1.0",
            "Accept": "*/*",
        }

        for attempt in range(max(1, retries)):
            start_time = time.perf_counter()
            try:
                async with httpx.AsyncClient(
                    timeout=timeout, follow_redirects=True, verify=False
                ) as client:
                    res = await client.get(target_url, headers=headers)
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    last_status = res.status_code
                    last_body = redact_text(res.text[:500])

                    if 200 <= res.status_code < 300:
                        return VerificationResult(
                            endpoint_url=target_url,
                            provider_status=provider_status,
                            application_health="healthy",
                            http_status_code=res.status_code,
                            response_body_snippet=last_body,
                            latency_ms=latency_ms,
                            ready_for_sre=False,
                        )
                    else:
                        # 4xx or 5xx indicates application failure
                        return VerificationResult(
                            endpoint_url=target_url,
                            provider_status=provider_status,
                            application_health="unhealthy",
                            http_status_code=res.status_code,
                            response_body_snippet=last_body,
                            error_message=f"HTTP status {res.status_code}",
                            latency_ms=latency_ms,
                            ready_for_sre=True,
                        )

            except httpx.TimeoutException as e:
                last_error = f"Request timed out after {timeout}s: {e}"
            except httpx.ConnectError as e:
                # Connection refused / reset usually indicates process crashed or is not listening
                last_error = f"Connection failed (process may have crashed): {e}"
            except Exception as e:
                last_error = f"Network or protocol error: {e}"

            if attempt < retries - 1:
                await asyncio.sleep(retry_delay)

        # Retries exhausted
        # If connection refused or failed connecting, mark unhealthy (ready for SRE)
        is_crash = "connection failed" in (last_error or "").lower()
        return VerificationResult(
            endpoint_url=target_url,
            provider_status=provider_status,
            application_health="unhealthy" if is_crash else "inconclusive",
            http_status_code=last_status,
            error_message=last_error,
            ready_for_sre=is_crash,
        )


endpoint_verifier = EndpointVerifier()

