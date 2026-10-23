import json
import os
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from engine.domain.models import (
    CreateProjectRequest,
    DeployRequest,
    DiagnoseRequest,
    InspectRequest,
    PlanRequest,
    RemediateRequest,
    RuntimeLogsRequest,
    VerifyRequest,
)
from engine.providers.liara_adapter import liara_adapter
from engine.providers.liara_app_plan_provider import liara_app_plan_provider
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


class PlanLookupRequest(BaseModel):
    api_token: str
    team_id: str | None = None


class ProjectNameAvailabilityRequest(BaseModel):
    name: str
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
    return {"ok": True, "plans": plans}


@app.post("/liara/app-plans", dependencies=[Depends(verify_internal_secret)])
async def list_liara_app_plans(payload: PlanLookupRequest):
    try:
        catalog = await liara_app_plan_provider.list_catalog(
            api_token=payload.api_token, team_id=payload.team_id
        )
        return {"ok": True, **catalog}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@app.post("/liara/projects/availability", dependencies=[Depends(verify_internal_secret)])
async def check_liara_project_name(payload: ProjectNameAvailabilityRequest):
    result = await liara_adapter.check_project_name(
        payload.name, payload.api_token, payload.team_id
    )
    if result.get("reason") == "invalid_name":
        return result
    if not result.get("ok"):
        return {**result, "error": "Liara app inventory could not be verified."}
    return result


@app.get("/liara/services", dependencies=[Depends(verify_internal_secret)])
async def list_liara_services(
    api_token: str | None = None, team_id: str | None = None
):
    if not api_token or not api_token.strip():
        return {
            "ok": False,
            "error": "Liara API token is required to list services.",
            "services": [],
            "count": 0,
        }
    services = await liara_adapter.get_services(
        api_token=api_token, team_id=team_id
    )
    return {
        "ok": True,
        "services": services,
        "count": len(services),
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


@app.post("/liara/projects", dependencies=[Depends(verify_internal_secret)])
async def create_liara_project(payload: CreateProjectRequest):
    if not payload.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Explicit user approval is required before creating a Liara app.",
        )

    token = payload.api_token or os.getenv("LIARA_API_TOKEN", "")
    team = payload.team_id or os.getenv("LIARA_TEAM_ID", "")
    try:
        result = await liara_adapter.create_project(
            project_id=payload.project_id,
            platform=payload.platform,
            plan_id=payload.plan_id,
            bundle_plan_id=payload.bundle_plan_id,
            network_id=payload.network_id,
            api_token=token,
            team_id=team,
        )
        if not result.get("ok"):
            response_status = (
                    status.HTTP_409_CONFLICT
                    if result.get("reason") == "already_exists"
                    else status.HTTP_502_BAD_GATEWAY
                    if result.get("reason") == "unverified"
                    else status.HTTP_400_BAD_REQUEST
            )
            return JSONResponse(status_code=response_status, content=result)
        return result
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )


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
    log_source = "deployment" if logs and logs.strip() else "runtime"
    logs_warning = None
    if payload.fetch_runtime_logs or not logs or not logs.strip():
        runtime_result = await sre_diagnoser.fetch_runtime_logs_result(
            app_id=payload.app_id,
            api_token=payload.api_token,
            team_id=payload.team_id,
        )
        if runtime_result["ok"]:
            logs = runtime_result["logs"]
            log_source = "runtime"
        else:
            logs_warning = "دریافت لاگ‌های اجرای برنامه از Liara ناموفق بود."
            # A caller requesting runtime evidence after a failed health check must
            # never silently fall back to successful deployment output.
            if payload.fetch_runtime_logs or not payload.logs.strip():
                logs = ""
                log_source = "none"

    diagnosis = sre_diagnoser.diagnose_logs(
        logs=logs,
        app_id=payload.app_id,
        provider_status=payload.provider_status,
        project_evidence=payload.project_evidence,
    )
    diagnosis_data = diagnosis.model_dump()
    diagnosis_data["log_source"] = log_source
    diagnosis_data["logs_warning"] = logs_warning
    if diagnosis.diagnosis_status == "inconclusive":
        diagnosis_data["next_step"] = "دسترسی لاگ‌های اجرایی یا شواهد پروژه را بررسی و دوباره تلاش کنید."
    elif diagnosis.missing_variable:
        diagnosis_data["next_step"] = "مقدار متغیر را از کاربر دریافت کنید یا برای secret مجاز، تولید امن را پیشنهاد دهید."
    else:
        diagnosis_data["next_step"] = "این مورد اقدام خودکار ندارد؛ راهنمایی را با توجه به شواهد ارائه‌شده دنبال کنید."
    return {
        "ok": True,
        "diagnosis": diagnosis_data,
    }


@app.post("/agent/runtime-logs", dependencies=[Depends(verify_internal_secret)])
async def get_runtime_logs(payload: RuntimeLogsRequest):
    result = await sre_diagnoser.fetch_runtime_logs_result(
        app_id=payload.app_id,
        lines=payload.lines,
        api_token=payload.api_token,
        team_id=payload.team_id,
    )
    return {"ok": result["ok"], "log_source": "runtime", **result}


@app.post("/agent/remediate", dependencies=[Depends(verify_internal_secret)])
async def apply_sre_remediation(payload: RemediateRequest):
    if payload.app_id != payload.remediation.target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="سرویس مقصد با هدف راهکار مطابقت ندارد؛ هیچ تغییری اعمال نشد.",
        )
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

    if not rem_result.get("ok", False):
        return {
            "ok": False,
            "remediation_result": rem_result,
            "verification": None,
        }

    # Verify only after Liara confirms the environment write.
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
