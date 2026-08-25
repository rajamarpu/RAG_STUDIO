"""
System API routes (health, settings, stats).
"""
from fastapi import APIRouter, Depends, HTTPException
import structlog
import time
import psutil
import os

from app.core.config import settings
from app.models.schemas import (
    HealthCheck,
    SystemStats,
    SettingsResponse,
    BaseResponse,
)
from app.services.ollama import ollama_service
from app.services.vector_store import vector_store_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/system", tags=["System"])

# Track startup time
START_TIME = time.time()


@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    checks = {}

    # Check Ollama
    try:
        ollama_health = await ollama_service.health_check()
        checks["ollama"] = ollama_health
    except Exception as e:
        checks["ollama"] = {"status": "unhealthy", "error": str(e)}

    # Check ChromaDB
    try:
        chroma_health = await vector_store_service.health_check()
        checks["chromadb"] = chroma_health
    except Exception as e:
        checks["chromadb"] = {"status": "unhealthy", "error": str(e)}

    # Check Database
    try:
        from app.core.database import db_health
        db_h = await db_health()
        checks["database"] = db_h
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    # Determine overall status
    all_healthy = all(c.get("status") == "healthy" for c in checks.values())
    any_unhealthy = any(c.get("status") == "unhealthy" for c in checks.values())

    if all_healthy:
        status = "healthy"
    elif any_unhealthy:
        status = "degraded"
    else:
        status = "unhealthy"

    return HealthCheck(
        status=status,
        version=settings.APP_VERSION,
        uptime_seconds=time.time() - START_TIME,
        checks=checks,
    )


@router.get("/stats", response_model=SystemStats)
async def system_stats():
    """Get system statistics."""
    # Get service stats
    ollama_health = await ollama_service.health_check()
    chroma_health = await vector_store_service.health_check()
    try:
        from app.core.database import db_health
        db_h = await db_health()
    except Exception as e:
        db_h = {"status": "unhealthy", "error": str(e)}

    # Get system stats
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    # include db in api for visibility
    return SystemStats(
        ollama=ollama_health,
        chromadb=chroma_health,
        redis={"status": "not_configured"},
        api={
            "status": "healthy",
            "database": db_h,
            "uptime_seconds": time.time() - START_TIME,
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
        },
    )


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """Get current system settings (non-sensitive)."""
    return SettingsResponse(
        ollama_url=settings.OLLAMA_BASE_URL,
        ollama_llm_model=settings.OLLAMA_LLM_MODEL,
        ollama_embedding_model=settings.OLLAMA_EMBEDDING_MODEL,
        chroma_url=f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}",
        chroma_collection=settings.CHROMA_COLLECTION_NAME,
        api_port=settings.API_PORT,
        cors_origins=settings.CORS_ORIGINS,
        rate_limit=settings.RATE_LIMIT_REQUESTS,
        enable_auth=False,  # Would check actual auth config
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        enable_cache=settings.ENABLE_CACHE,
        cache_ttl=settings.CACHE_TTL,
    )


@router.post("/ollama/pull", response_model=BaseResponse)
async def pull_ollama_model(model: str = "llama3:8b"):
    """Pull an Ollama model (e.g., llama3:8b, nomic-embed-text)."""
    try:
        async for _ in ollama_service.pull_model(model):
            pass
        return BaseResponse(success=True)
    except Exception as e:
        logger.error("Pull failed", model=model, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/reload", response_model=BaseResponse)
async def reload_settings():
    """Reload settings from environment."""
    # In a real app, this would reload config
    from app.core.config import get_settings
    get_settings.cache_clear()
    return BaseResponse(success=True, timestamp="now")