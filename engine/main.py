import json
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from engine.domain.models import DeployRequest, InspectRequest, PlanRequest, VerifyRequest
from engine.providers.liara_adapter import liara_adapter
from engine.security import verify_internal_secret
from engine.services.approval import verify_action_approval
from engine.services.deployer import deployment_executor
from engine.services.inspector import project_inspector
from engine.services.planner import deployment_planner
from engine.services.verifier import endpoint_verifier

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


@app.post("/agent/plan", dependencies=[Depends(verify_internal_secret)])
async def generate_plan(payload: PlanRequest):
    plan = deployment_planner.generate_plan(
        analysis=payload.analysis,
        target_app=payload.target_app,
        port=payload.port,
    )
    return {
        "ok": True,
        "plan": plan.model_dump(),
    }


@app.post("/agent/deploy", dependencies=[Depends(verify_internal_secret)])
async def execute_deploy(payload: DeployRequest):
    if not verify_action_approval(
        payload.plan, payload.approval.action_id, payload.approval
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval required: Invalid or missing ActionApproval.",
        )

    async def sse_event_generator():
        try:
            async for line in deployment_executor.execute_deployment(
                plan=payload.plan,
                approval=payload.approval,
                source_path=payload.source_path,
                api_token=payload.api_token or "",
            ):
                yield f"data: {json.dumps({'text': line})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")


@app.post("/agent/verify", dependencies=[Depends(verify_internal_secret)])
async def verify_deployment_endpoint(payload: VerifyRequest):
    result = await endpoint_verifier.verify_endpoint(
        app_id=payload.app_id,
        endpoint_url=payload.endpoint_url,
        provider_status=payload.provider_status,
        timeout_seconds=payload.timeout_seconds,
        retries=payload.retries,
    )
    return {
        "ok": True,
        "verification": result.model_dump(),
    }





if __name__ == "__main__":
    import uvicorn
    from engine.config import settings

    uvicorn.run("engine.main:app", host=settings.host, port=settings.port, reload=True)
