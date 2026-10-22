import hashlib
import json
from pydantic import BaseModel, Field


class ProjectSource(BaseModel):
    kind: str = "local"  # "local" or "github"
    path: str | None = None
    repository_url: str | None = None
    ref: str | None = None


class ProjectAnalysis(BaseModel):
    detected_language: str
    detected_platform: str
    confidence: float
    entrypoint: str | None = None
    start_command: str | None = None
    port: int = 3000
    evidence_files: list[str] = Field(default_factory=list)
    required_env_names: list[str] = Field(default_factory=list)
    missing_configurations: list[str] = Field(default_factory=list)


class InspectRequest(BaseModel):
    path: str


class ProposedAction(BaseModel):
    action_id: str
    operation: str  # "create_app", "deploy", "set_env"
    target: str
    description: str
    dangerous: bool = False
    requires_approval: bool = True
    cost_warning: bool = False


class DeploymentPlan(BaseModel):
    plan_id: str
    target_app: str
    platform: str
    port: int = 3000
    impact_level: str = "medium"  # "low", "medium", "high"
    cost_warning: bool = True
    requires_approval: bool = True
    actions: list[ProposedAction] = Field(default_factory=list)
    digest: str = ""

    def canonical_dict(self) -> dict:
        return {
            "plan_id": self.plan_id,
            "target_app": self.target_app,
            "platform": self.platform,
            "port": self.port,
            "impact_level": self.impact_level,
            "cost_warning": self.cost_warning,
            "requires_approval": self.requires_approval,
            "actions": [
                {
                    "action_id": a.action_id,
                    "operation": a.operation,
                    "target": a.target,
                    "description": a.description,
                    "dangerous": a.dangerous,
                    "requires_approval": a.requires_approval,
                    "cost_warning": a.cost_warning,
                }
                for a in self.actions
            ],
        }

    def compute_digest(self) -> str:
        data = self.canonical_dict()
        canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def verify_digest(self) -> bool:
        if not self.digest:
            return False
        return self.compute_digest() == self.digest


class PlanRequest(BaseModel):
    analysis: ProjectAnalysis
    target_app: str | None = None
    port: int | None = None


class ActionApprovalModel(BaseModel):
    run_id: str
    action_id: str
    operation: str
    target: str
    approved: bool
    plan_digest: str

