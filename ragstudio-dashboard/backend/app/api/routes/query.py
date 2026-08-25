"""
Query and Retrieval API routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import json
import structlog

from app.core.exceptions import RetrievalError, GenerationError
from app.models.schemas import (
    QueryRequest,
    QueryResponse,
    GenerationRequest,
    GenerationResponse,
    StreamChunk,
)
from app.services.rag import rag_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/query", tags=["Query & Retrieval"])


@router.post("/retrieve", response_model=QueryResponse)
async def retrieve(request: QueryRequest):
    """Retrieve relevant documents for a query."""
    try:
        resp = await rag_service.retrieve(request)
        # log query
        try:
            from app.core.database import AsyncSessionLocal
            from app.models.db import QueryLog
            async with AsyncSessionLocal() as db:
                db.add(QueryLog(query_text=request.query, knowledge_base_id=request.knowledge_base_id, latency_ms=resp.processing_time_ms, tokens_used=0, status="success"))
                await db.commit()
        except Exception:
            pass
        return resp
    except RetrievalError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Retrieve endpoint error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    """Generate answer using RAG."""
    try:
        resp = await rag_service.generate(request)
        # log query with tokens if available
        try:
            from app.core.database import AsyncSessionLocal
            from app.models.db import QueryLog
            async with AsyncSessionLocal() as db:
                db.add(QueryLog(query_text=request.query, knowledge_base_id=request.knowledge_base_id, latency_ms=resp.processing_time_ms, tokens_used=resp.tokens_used or 0, status="success"))
                await db.commit()
        except Exception:
            pass
        return resp
    except GenerationError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except RetrievalError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Generate endpoint error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/stream")
async def stream_generate(request: GenerationRequest):
    """Stream generated answer using RAG."""

    async def generate_stream():
        try:
            async for chunk in rag_service.stream_generate(request):
                yield f"data: {json.dumps(chunk.model_dump())}\n\n"
        except Exception as e:
            logger.error("Stream generate error", error=str(e))
            error_chunk = StreamChunk(type="error", error=str(e))
            yield f"data: {json.dumps(error_chunk.model_dump())}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat")
async def chat_with_context(
    conversation_history: list = [],
    message: str = "",
    knowledge_base_id: str = "",
    top_k: int = 5,
    similarity_threshold: float = 0.7,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    top_p: float = 0.9,
    system_prompt: Optional[str] = None,
):
    """Chat with RAG context."""
    try:
        result = await rag_service.chat_with_context(
            conversation_history=conversation_history,
            message=message,
            knowledge_base_id=knowledge_base_id,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            system_prompt=system_prompt,
        )
        return result
    except Exception as e:
        logger.error("Chat endpoint error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")