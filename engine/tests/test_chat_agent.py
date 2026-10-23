import pytest
from langchain_core.messages import AIMessage

from engine.services.chat_agent import LiaraChatAgent


class FakeAdapter:
    async def list_apps_result(self, **kwargs):
        return {"ok": True, "apps": [{"name": "simple-app", "platform": "nodejs", "status": "running"}]}


class FakeModel:
    def __init__(self, responses):
        self.responses = list(responses)
        self.bound_schemas = None

    def bind_tools(self, schemas):
        self.bound_schemas = schemas
        return self

    async def ainvoke(self, messages):
        return self.responses.pop(0)


@pytest.mark.anyio
async def test_chat_calls_the_allowlisted_apps_tool_and_returns_persian_answer():
    model = FakeModel([
        AIMessage(content="", tool_calls=[{"name": "list_liara_apps", "args": {}, "id": "call-1", "type": "tool_call"}]),
        AIMessage(content="یک اپلیکیشن فعال با نام simple-app پیدا شد."),
    ])
    agent = LiaraChatAgent(model=model, adapter=FakeAdapter())

    result = await agent.respond(
        message="اپلیکیشن‌های من در لیارا را نشان بده",
        history=[],
        api_token="user-secret-token",
        team_id="team-42",
    )

    assert "simple-app" in result["message"]
    assert result["tool_results"][0]["name"] == "list_liara_apps"
    assert model.bound_schemas
    assert "user-secret-token" not in str(result)


@pytest.mark.anyio
async def test_chat_rejects_model_tool_calls_outside_the_catalog():
    model = FakeModel([
        AIMessage(content="", tool_calls=[{"name": "run_arbitrary_shell", "args": {"command": "id"}, "id": "call-2", "type": "tool_call"}]),
        AIMessage(content="این درخواست قابل اجرا نیست؛ ابزار مجازی برای آن وجود ندارد."),
    ])
    agent = LiaraChatAgent(model=model, adapter=FakeAdapter())

    result = await agent.respond("این دستور را اجرا کن", [], "token", None)

    assert result["message"].startswith("این درخواست")
    assert result["tool_results"][0]["result"]["ok"] is False
