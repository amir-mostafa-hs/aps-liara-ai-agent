import logging
import uuid
from engine.config import settings
from engine.domain.models import DeploymentPlan, ProjectAnalysis, ProposedAction

logger = logging.getLogger(__name__)


class DeploymentPlanner:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model_name: str | None = None,
    ):
        self.api_key = api_key or settings.openai_api_key
        self.base_url = base_url or settings.openai_base_url
        self.model_name = model_name or settings.openai_model_name

    def generate_plan(
        self,
        analysis: ProjectAnalysis,
        target_app: str | None = None,
        port: int | None = None,
    ) -> DeploymentPlan:
        app_name = target_app or "demo-node-app"
        app_port = port or analysis.port or 3000

        # If LLM API key is present, attempt LLM-backed structured output planning via LangChain
        if self.api_key:
            try:
                from langchain_openai import ChatOpenAI

                kwargs = {
                    "model": self.model_name,
                    "api_key": self.api_key,
                }
                if self.base_url:
                    kwargs["base_url"] = self.base_url

                llm = ChatOpenAI(**kwargs)
                structured_llm = llm.with_structured_output(DeploymentPlan)

                prompt = (
                    f"Create a Liara deployment plan for a project with the following analysis:\n"
                    f"- Language: {analysis.detected_language}\n"
                    f"- Platform: {analysis.detected_platform}\n"
                    f"- Entrypoint: {analysis.entrypoint}\n"
                    f"- Start command: {analysis.start_command}\n"
                    f"- Port: {app_port}\n"
                    f"- Required environment variables: {analysis.required_env_names}\n"
                    f"- Target application name: {app_name}\n"
                    f"Ensure actions list contains create_app and deploy, impact level is assessed, and requires_approval is true."
                )

                plan: DeploymentPlan = structured_llm.invoke(prompt)
                if plan and isinstance(plan, DeploymentPlan):
                    if not plan.plan_id:
                        plan.plan_id = str(uuid.uuid4())
                    plan.target_app = app_name
                    plan.platform = analysis.detected_platform or "nodejs"
                    plan.port = app_port
                    plan.requires_approval = True
                    plan.digest = plan.compute_digest()
                    return plan
            except Exception as e:
                logger.warning(
                    "LLM planning failed or unavailable: %s. Using deterministic plan.",
                    e,
                )

        # Deterministic / safe baseline plan conforming to exact same schema
        actions = [
            ProposedAction(
                action_id=f"act-{uuid.uuid4().hex[:8]}",
                operation="create_app",
                target=app_name,
                description=f"Create Liara {analysis.detected_platform} application '{app_name}'",
                dangerous=False,
                requires_approval=True,
                cost_warning=True,
            ),
            ProposedAction(
                action_id=f"act-{uuid.uuid4().hex[:8]}",
                operation="deploy",
                target=app_name,
                description=f"Deploy source code to Liara app '{app_name}' on port {app_port}",
                dangerous=False,
                requires_approval=True,
                cost_warning=False,
            ),
        ]

        plan = DeploymentPlan(
            plan_id=str(uuid.uuid4()),
            target_app=app_name,
            platform=analysis.detected_platform or "nodejs",
            port=app_port,
            impact_level="medium",
            cost_warning=True,
            requires_approval=True,
            actions=actions,
            digest="",
        )
        plan.digest = plan.compute_digest()
        return plan


deployment_planner = DeploymentPlanner()
