import json
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from engine.domain.models import (
    DeployRequest,
    DiagnoseRequest,
    InspectRequest,
    PlanRequest,
    RemediateRequest,
    VerifyRequest,
)
from engine.providers.liara_adapter import liara_adapter
from engine.security import verify_internal_secret
from engine.services.approval import verify_action_approval
from engine.services.deployer import deployment_executor
from engine.services.diagnoser import sre_diagnoser
from engine.services.db_provisioner import db_provisioner
from engine.services.config_manager import config_manager
from engine.services.env_manager import env_manager
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
    team_id: str | None = None


class CreateDatabaseRequest(BaseModel):
    db_name: str
    db_type: str
    plan_id: str
    api_token: str
    team_id: str | None = None


class ConfigDiffRequest(BaseModel):
    source_path: str
    app_name: str
    platform: str
    port: int = 3000
    start_command: str | None = None
    env_vars: dict[str, str] = {}


class ConfigApplyRequest(BaseModel):
    source_path: str
    app_name: str
    platform: str
    port: int = 3000
    start_command: str | None = None
    apply_liara_json: bool = True
    apply_local_env: bool = False
    env_vars: dict[str, str] = {}


class CloudEnvSetRequest(BaseModel):
    app_name: str
    env_vars: dict[str, str]
    api_token: str
    team_id: str | None = None



@app.get("/health", dependencies=[Depends(verify_internal_secret)])
async def health_check():
    return {
        "status": "healthy",
        "service": "liara-agent-engine",
        "version": "0.1.0",
    }


@app.get("/liara/plans", dependencies=[Depends(verify_internal_secret)])
async def list_liara_plans(api_token: str | None = None):
    plans = await db_provisioner.get_available_plans(api_token=api_token)
    return {
        "ok": True,
        "plans": plans,
    }


@app.post("/agent/database/create", dependencies=[Depends(verify_internal_secret)])
async def create_database(payload: CreateDatabaseRequest):
    try:
        result = await db_provisioner.provision_database(
            db_name=payload.db_name,
            db_type=payload.db_type,
            plan_id=payload.plan_id,
            api_token=payload.api_token,
            team_id=payload.team_id,
        )
        return result
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )


@app.post("/agent/config/diff", dependencies=[Depends(verify_internal_secret)])
async def get_config_diff(payload: ConfigDiffRequest):
    try:
        diff_result = config_manager.generate_diff(
            source_path=payload.source_path,
            app_name=payload.app_name,
            platform=payload.platform,
            port=payload.port,
            start_command=payload.start_command,
            env_vars=payload.env_vars,
        )
        return diff_result
    except (PermissionError, FileNotFoundError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )


@app.post("/agent/config/apply", dependencies=[Depends(verify_internal_secret)])
async def apply_config_changes(payload: ConfigApplyRequest):
    try:
        apply_result = config_manager.apply_changes(
            source_path=payload.source_path,
            apply_liara_json=payload.apply_liara_json,
            apply_local_env=payload.apply_local_env,
            app_name=payload.app_name,
            platform=payload.platform,
            port=payload.port,
            start_command=payload.start_command,
            env_vars=payload.env_vars,
        )
        return apply_result
    except (PermissionError, FileNotFoundError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )


@app.post("/agent/cloud/env/set", dependencies=[Depends(verify_internal_secret)])
async def set_cloud_environment_variables(payload: CloudEnvSetRequest):
    try:
        result = await env_manager.set_cloud_env(
            app_name=payload.app_name,
            env_vars=payload.env_vars,
            api_token=payload.api_token,
            team_id=payload.team_id,
        )
        return result
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )




@app.post("/liara/test-connection", dependencies=[Depends(verify_internal_secret)])
async def test_liara_connection(payload: TestConnectionRequest):
    result = await liara_adapter.test_connection(
        api_token=payload.api_token, team_id=payload.team_id
    )
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
                team_id=payload.team_id,
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


@app.post("/agent/diagnose", dependencies=[Depends(verify_internal_secret)])
async def diagnose_failure(payload: DiagnoseRequest):
    logs = payload.logs
    if not logs or not logs.strip():
        logs = await sre_diagnoser.fetch_runtime_logs(
            app_id=payload.app_id,
            api_token=payload.api_token,
            team_id=payload.team_id,
        )

    diagnosis = sre_diagnoser.diagnose_logs(
        logs=logs,
        app_id=payload.app_id,
        provider_status=payload.provider_status,
    )
    return {
        "ok": True,
        "diagnosis": diagnosis.model_dump(),
    }


@app.post("/agent/remediate", dependencies=[Depends(verify_internal_secret)])
async def apply_sre_remediation(payload: RemediateRequest):
    try:
        rem_result = await sre_diagnoser.apply_remediation(
            remediation=payload.remediation,
            approval=payload.approval,
            api_token=payload.api_token,
            expected_digest=payload.expected_digest,
            team_id=payload.team_id,
        )
    except PermissionError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )

    # Automatically re-verify public endpoint health to confirm recovery
    verification = await endpoint_verifier.verify_endpoint(
        app_id=payload.app_id,
        provider_status="success",
    )

    return {
        "ok": rem_result.get("ok", False),
        "remediation_result": rem_result,
        "verification": verification.model_dump(),
    }






if __name__ == "__main__":
    import uvicorn
    from engine.config import settings

    uvicorn.run("engine.main:app", host=settings.host, port=settings.port, reload=True)
