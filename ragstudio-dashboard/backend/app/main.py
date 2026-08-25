"""
Main FastAPI application entry point.
"""
import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import (
    RAGException,
    rag_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.api.routes import (
    documents,
    knowledge_bases,
    query,
    chat,
    evaluations,
    analytics,
    system,
)

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting RAG AI Platform", version=settings.APP_VERSION)

    # Create upload directories
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.TEMP_DIR, exist_ok=True)

    # Init DB
    try:
        from app.core.database import init_db, db_health
        await init_db()
        health = await db_health()
        logger.info("Database initialized", health=health)
    except Exception as e:
        logger.error("Database init failed", error=str(e))

    # Check Ollama health on startup (non-blocking)
    try:
        from app.services.ollama import ollama_service
        ollama_health = await ollama_service.health_check()
        if ollama_health.get("status") != "healthy" or not ollama_health.get("llm_model_available"):
            logger.warning("Ollama not ready - models missing, pull required", ollama=ollama_health)
        else:
            logger.info("Ollama ready", ollama=ollama_health)
    except Exception as e:
        logger.warning("Ollama health check failed at startup", error=str(e))

    yield

    # Shutdown
    logger.info("Shutting down RAG AI Platform")

    # Close service connections
    from app.services.ollama import ollama_service
    from app.core.database import close_db
    await ollama_service.close()
    try:
        await close_db()
    except Exception:
        pass


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise-grade RAG AI Platform with local LLM support",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# Exception handlers
app.add_exception_handler(RAGException, rag_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)
# Note: FastAPI's default handlers cover HTTPException and RequestValidationError


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests."""
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Log request
    process_time = (time.time() - start_time) * 1000
    logger.info(
        "Request processed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time_ms=process_time,
    )

    return response


# Include routers
app.include_router(system.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(knowledge_bases.router, prefix=settings.API_PREFIX)
app.include_router(query.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(evaluations.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


# API info endpoint
@app.get(settings.API_PREFIX)
async def api_info():
    """API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "documents": f"{settings.API_PREFIX}/documents",
            "knowledge_bases": f"{settings.API_PREFIX}/knowledge-bases",
            "query": f"{settings.API_PREFIX}/query",
            "chat": f"{settings.API_PREFIX}/chat",
            "evaluations": f"{settings.API_PREFIX}/evaluations",
            "analytics": f"{settings.API_PREFIX}/analytics",
            "system": f"{settings.API_PREFIX}/system",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        workers=settings.API_WORKERS,
        reload=settings.DEBUG,
        log_config=None,  # Use structlog
    )