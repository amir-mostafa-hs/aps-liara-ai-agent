from fastapi import Depends, FastAPI
from engine.security import verify_internal_secret

app = FastAPI(
    title="Liara Agent Engine",
    description="Backend orchestration engine for Liara Deployment & SRE Agent",
    version="0.1.0",
)


@app.get("/health", dependencies=[Depends(verify_internal_secret)])
async def health_check():
    return {
        "status": "healthy",
        "service": "liara-agent-engine",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn
    from engine.config import settings

    uvicorn.run("engine.main:app", host=settings.host, port=settings.port, reload=True)

