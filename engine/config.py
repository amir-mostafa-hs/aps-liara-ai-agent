import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    internal_agent_secret: str = os.getenv("INTERNAL_AGENT_SECRET", "dev-secret-change-me")
    host: str = "127.0.0.1"
    port: int = 8000
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_base_url: str | None = os.getenv("OPENAI_BASE_URL")
    openai_model_name: str = os.getenv("OPENAI_MODEL_NAME", "gpt-6-luna")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

