import pytest
from httpx import ASGITransport, AsyncClient

TEST_SECRET = "chat-endpoint-secret"


@pytest.mark.anyio
async def test_chat_endpoint_requires_engine_authentication():
    from engine.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/agent/chat", json={"conversation_id": "c1", "message": "اپ‌هایم را نشان بده", "api_token": "token"})
    assert response.status_code == 403


@pytest.mark.anyio
async def test_chat_endpoint_forwards_a_turn_and_returns_structured_tool_trace(monkeypatch):
    from engine.main import app, liara_chat_agent

    monkeypatch.setenv("INTERNAL_AGENT_SECRET", TEST_SECRET)
    captured = {}

    async def fake_respond(**kwargs):
        captured.update(kwargs)
        return {"message": "یک اپ پیدا شد.", "tool_results": [{"name": "list_liara_apps", "result": {"ok": True}}], "catalog_version": 1}

    monkeypatch.setattr(liara_chat_agent, "respond", fake_respond)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/agent/chat",
            headers={"X-Internal-Secret": TEST_SECRET},
            json={
                "conversation_id": "conversation-1",
                "message": "اپلیکیشن‌های من را نشان بده",
                "history": [{"role": "user", "content": "سلام"}],
                "api_token": "private-token",
                "team_id": "team-7",
            },
        )

    assert response.status_code == 200
    assert response.json()["message"] == "یک اپ پیدا شد."
    assert response.json()["tool_results"][0]["name"] == "list_liara_apps"
    assert captured["history"] == [{"role": "user", "content": "سلام"}]
    assert captured["team_id"] == "team-7"
    assert "private-token" not in response.text
