import pytest

from engine.domain.models import VerificationResult
from engine.services.post_deploy_monitor import PostDeployMonitor


class SequenceVerifier:
    def __init__(self, results):
        self.results = list(results)
        self.calls = 0

    async def verify_endpoint(self, **kwargs):
        result = self.results[min(self.calls, len(self.results) - 1)]
        self.calls += 1
        return result


class SequenceLogs:
    def __init__(self, results):
        self.results = list(results)
        self.calls = 0

    async def fetch_runtime_logs_result(self, **kwargs):
        result = self.results[min(self.calls, len(self.results) - 1)]
        self.calls += 1
        return result


class ReleaseProvider:
    async def get_latest_release_result(self, **kwargs):
        return {"ok": True, "state": "ready", "tag": "v8"}


@pytest.mark.anyio
async def test_post_deploy_waits_for_runtime_logs_and_healthy_http_before_success():
    verifier = SequenceVerifier([
        VerificationResult(endpoint_url="https://demo.liara.run", application_health="unhealthy", http_status_code=503),
        VerificationResult(endpoint_url="https://demo.liara.run", application_health="healthy", http_status_code=200),
    ])
    logs = SequenceLogs([
        {"ok": False, "logs": "", "error": "logs are not available yet", "status_code": 503, "retryable": True},
        {"ok": True, "logs": "Server listening on port 3000", "error": None, "status_code": 200},
    ])
    sleeps = []

    async def sleep(seconds):
        sleeps.append(seconds)

    monitor = PostDeployMonitor(verifier=verifier, log_provider=logs, provider=ReleaseProvider(), sleep=sleep)
    result = await monitor.check(
        app_id="demo",
        api_token="token",
        provider_deployment_state="succeeded",
        max_wait_seconds=180,
    )

    assert result.outcome == "healthy"
    assert result.provider_deployment_state == "succeeded"
    assert result.provider_release_state == "ready"
    assert result.application_health == "healthy"
    assert result.runtime_logs_status == "available"
    assert "Server listening" in result.runtime_logs
    assert verifier.calls == 2
    assert logs.calls == 2
    assert sleeps == [5]


@pytest.mark.anyio
async def test_post_deploy_stops_polling_on_provider_authentication_failure():
    verifier = SequenceVerifier([
        VerificationResult(endpoint_url="https://demo.liara.run", application_health="healthy", http_status_code=200),
    ])
    logs = SequenceLogs([
        {"ok": False, "logs": "", "error": "unauthorized", "status_code": 401, "retryable": False},
    ])
    sleeps = []

    async def sleep(seconds):
        sleeps.append(seconds)

    monitor = PostDeployMonitor(verifier=verifier, log_provider=logs, provider=ReleaseProvider(), sleep=sleep)
    result = await monitor.check(
        app_id="demo",
        api_token="token",
        provider_deployment_state="succeeded",
        max_wait_seconds=180,
    )

    assert result.outcome == "healthy"
    assert result.runtime_logs_status == "unauthorized"
    assert result.runtime_logs_warning
    assert logs.calls == 1
    assert sleeps == []


@pytest.mark.anyio
async def test_post_deploy_stops_polling_when_app_logs_return_not_found():
    verifier = SequenceVerifier([
        VerificationResult(endpoint_url="https://demo.liara.run", application_health="unhealthy", http_status_code=503),
    ])
    logs = SequenceLogs([
        {"ok": False, "logs": "", "error": "app not found", "status_code": 404, "retryable": False},
    ])
    sleeps = []

    async def sleep(seconds):
        sleeps.append(seconds)

    monitor = PostDeployMonitor(verifier=verifier, log_provider=logs, provider=ReleaseProvider(), sleep=sleep)
    result = await monitor.check(
        app_id="demo",
        api_token="token",
        provider_deployment_state="succeeded",
        max_wait_seconds=180,
    )

    assert result.outcome == "unhealthy"
    assert result.runtime_logs_status == "failed"
    assert "پیدا نشد" in result.runtime_logs_warning
    assert logs.calls == 1
    assert sleeps == []


@pytest.mark.anyio
async def test_post_deploy_reports_inconclusive_when_health_and_logs_never_arrive():
    verifier = SequenceVerifier([
        VerificationResult(endpoint_url="https://demo.liara.run", application_health="unhealthy", http_status_code=503),
    ])
    logs = SequenceLogs([
        {"ok": False, "logs": "", "error": "temporarily unavailable", "status_code": 503, "retryable": True},
    ])
    sleeps = []
    clock = [0.0]

    async def sleep(seconds):
        sleeps.append(seconds)
        clock[0] += seconds

    monitor = PostDeployMonitor(
        verifier=verifier,
        log_provider=logs,
        provider=ReleaseProvider(),
        sleep=sleep,
        monotonic=lambda: clock[0],
    )
    result = await monitor.check(
        app_id="demo",
        api_token="token",
        provider_deployment_state="succeeded",
        max_wait_seconds=15,
    )

    assert result.outcome == "inconclusive"
    assert result.provider_deployment_state == "succeeded"
    assert result.application_health == "unhealthy"
    assert result.runtime_logs_status == "unavailable"
    assert result.attempts == 2
    assert sleeps == [5, 10]
