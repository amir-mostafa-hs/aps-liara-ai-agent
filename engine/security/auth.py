import os
from fastapi import Header, HTTPException, status
from engine.config import settings


async def verify_internal_secret(
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> str:
    expected_secret = os.getenv("INTERNAL_AGENT_SECRET") or settings.internal_agent_secret
    if not expected_secret or x_internal_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing internal secret",
        )
    return x_internal_secret

