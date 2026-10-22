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
