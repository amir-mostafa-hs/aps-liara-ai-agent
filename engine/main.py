from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from engine.domain.models import InspectRequest
from engine.providers.liara_adapter import liara_adapter
from engine.security import verify_internal_secret
from engine.services.inspector import project_inspector

app = FastAPI(
    title="Liara Agent Engine",
    description="Backend orchestration engine for Liara Deployment & SRE Agent",
    version="0.1.0",
)


class TestConnectionRequest(BaseModel):
    api_token: str


@app.get("/health", dependencies=[Depends(verify_internal_secret)])
async def health_check():
    return {
        "status": "healthy",
        "service": "liara-agent-engine",
        "version": "0.1.0",
    }


@app.post("/liara/test-connection", dependencies=[Depends(verify_internal_secret)])
async def test_liara_connection(payload: TestConnectionRequest):
    result = await liara_adapter.test_connection(payload.api_token)
    return result


@app.post("/agent/inspect", dependencies=[Depends(verify_internal_secret)])
async def inspect_project(payload: InspectRequest):
    try:
        analysis = project_inspector.inspect(payload.path)
        return {
            "ok": True,
            "analysis": analysis.model_dump(),
        }
    except (PermissionError, FileNotFoundError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )


if __name__ == "__main__":
    import uvicorn
    from engine.config import settings

    uvicorn.run("engine.main:app", host=settings.host, port=settings.port, reload=True)
