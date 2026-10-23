from datetime import datetime, timezone
import hashlib
import json
from pydantic import BaseModel, Field, field_validator


class ProjectSource(BaseModel):
    kind: str = "local"  # "local" or "github"
    path: str | None = None
    repository_url: str | None = None
    ref: str | None = None


class DetectedDatabase(BaseModel):
    db_type: str  # "postgres" | "mysql" | "redis" | "mongodb" | "mariadb"
    driver_or_orm: str
    default_port: int = 5432
    suggested_env_vars: list[str] = Field(default_factory=list)
    evidence: str = ""


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
    detected_databases: list[DetectedDatabase] = Field(default_factory=list)
    persian_summary: str | None = None
    has_liara_json: bool = False
    existing_app_name: str | None = None
    suggested_app_name: str | None = None


class InspectRequest(BaseModel):
    path: str


class CreateProjectRequest(BaseModel):
    project_id: str
    platform: str
    plan_id: str
    approved: bool = False
    api_token: str | None = None
    team_id: str | None = None


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

    @field_validator("impact_level", mode="before")
    @classmethod
    def normalize_impact_level(cls, v: str) -> str:
        if not v:
            return "medium"
        s = str(v).lower().strip()
        if s in ["moderate"]:
            return "medium"
        if s in ["low", "medium", "high"]:
            return s
        return "medium"


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

    def get_deploy_action(self) -> ProposedAction | None:
        """Returns the primary deploy action, or the first action if none has operation='deploy'."""
        return next(
            (a for a in self.actions if a.operation == "deploy"),
            self.actions[0] if self.actions else None,
        )


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


class DeployRequest(BaseModel):
    plan: DeploymentPlan
    approval: ActionApprovalModel
    source_path: str
    api_token: str | None = None
    team_id: str | None = None


class VerificationResult(BaseModel):
    endpoint_url: str
    provider_status: str = "success"
    application_health: str = "inconclusive"  # "healthy", "unhealthy", "inconclusive"
    http_status_code: int | None = None
    response_body_snippet: str | None = None
    error_message: str | None = None
    latency_ms: float | None = None
    checked_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ready_for_sre: bool = False


class VerifyRequest(BaseModel):
    app_id: str
    endpoint_url: str | None = None
    provider_status: str = "success"
    timeout_seconds: float = 5.0
    retries: int = 2


class RemediationAction(BaseModel):
    action_id: str
    operation: str = "set_env"
    target: str
    env_variable: str
    env_value: str
    description: str
    requires_approval: bool = True


class DiagnosisResult(BaseModel):
    diagnosis_id: str
    root_cause: str
    error_evidence: str
    missing_variable: str | None = None
    remediation: RemediationAction | None = None
    confidence: float = 1.0
    requires_approval: bool = True
    digest: str = ""

    def canonical_dict(self) -> dict:
        return {
            "diagnosis_id": self.diagnosis_id,
            "error_evidence": self.error_evidence,
            "missing_variable": self.missing_variable or "",
            "remediation": {
                "action_id": self.remediation.action_id,
                "description": self.remediation.description,
                "env_value": self.remediation.env_value,
                "env_variable": self.remediation.env_variable,
                "operation": self.remediation.operation,
                "requires_approval": self.remediation.requires_approval,
                "target": self.remediation.target,
            }
            if self.remediation
            else None,
            "requires_approval": self.requires_approval,
            "root_cause": self.root_cause,
        }

    def compute_digest(self) -> str:
        data = self.canonical_dict()
        canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def verify_digest(self) -> bool:
        if not self.digest:
            return False
        return self.compute_digest() == self.digest

    def get_deploy_action(self) -> ProposedAction | None:
        """Returns the primary deploy action, or the first action if none has operation='deploy'."""
        return next(
            (a for a in self.actions if a.operation == "deploy"),
            self.actions[0] if self.actions else None,
        )


class DiagnoseRequest(BaseModel):
    app_id: str
    logs: str = ""
    provider_status: str = "success"
    api_token: str | None = None
    team_id: str | None = None


class RemediateRequest(BaseModel):
    app_id: str
    remediation: RemediationAction
    approval: ActionApprovalModel
    api_token: str | None = None
    expected_digest: str | None = None
    team_id: str | None = None




