import pytest
from httpx import Response, RequestError, TimeoutException
from unittest.mock import patch, AsyncMock
from engine.domain.models import VerificationResult


@pytest.mark.anyio
async def test_verifier_returns_healthy_on_200():
    from engine.services.verifier import EndpointVerifier

    verifier = EndpointVerifier()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text='{"status": "ok", "app": "demo-app"}',
        )

        result = await verifier.verify_endpoint(
            app_id="demo-app",
            provider_status="success",
        )

        assert isinstance(result, VerificationResult)
        assert result.endpoint_url == "https://demo-app.liara.run"
        assert result.provider_status == "success"
        assert result.application_health == "healthy"
        assert result.http_status_code == 200
        assert result.ready_for_sre is False


@pytest.mark.anyio
async def test_verifier_returns_unhealthy_on_500_and_readies_sre():
    from engine.services.verifier import EndpointVerifier

    verifier = EndpointVerifier()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=500,
            text="Internal Server Error: Missing SERVICE_SECRET",
        )

        result = await verifier.verify_endpoint(
            app_id="demo-node-app",
            provider_status="success",
        )

        assert isinstance(result, VerificationResult)
        assert result.provider_status == "success"
        assert result.application_health == "unhealthy"
        assert result.http_status_code == 500
        assert result.ready_for_sre is True
        assert "Missing SERVICE_SECRET" in (result.response_body_snippet or "")


@pytest.mark.anyio
async def test_verifier_returns_inconclusive_on_timeout():
    from engine.services.verifier import EndpointVerifier

    verifier = EndpointVerifier()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = TimeoutException("Connection timed out after 5s")

        result = await verifier.verify_endpoint(
            app_id="demo-app",
            provider_status="success",
            retries=1,
        )

        assert isinstance(result, VerificationResult)
        assert result.application_health == "inconclusive"
        assert result.ready_for_sre is False
        assert "timed out" in (result.error_message or "").lower()


def test_verify_api_endpoint():
    from fastapi.testclient import TestClient
    from engine.main import app
    from engine.config import settings

    client = TestClient(app)

    # 1. Reject without internal secret
    res_unauth = client.post("/agent/verify", json={"app_id": "demo-app"})
    assert res_unauth.status_code == 403

    # 2. Accept with internal secret and return VerificationResult
    with patch(
        "engine.services.verifier.endpoint_verifier.verify_endpoint",
        new_callable=AsyncMock,
    ) as mock_v:
        mock_v.return_value = VerificationResult(
            endpoint_url="https://demo-app.liara.run",
            provider_status="success",
            application_health="healthy",
            http_status_code=200,
            ready_for_sre=False,
        )

        res = client.post(
            "/agent/verify",
            headers={"X-Internal-Secret": settings.internal_agent_secret},
            json={"app_id": "demo-app", "provider_status": "success"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["verification"]["application_health"] == "healthy"
        assert data["verification"]["endpoint_url"] == "https://demo-app.liara.run"

