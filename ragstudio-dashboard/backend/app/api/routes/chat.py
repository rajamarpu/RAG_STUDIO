"""
Chat and Conversation API routes - DB persisted with history and zero defaults.
"""
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import structlog
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.db import Conversation, Message, QueryLog
from app.models.schemas import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationDetail,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    MessageRole,
    StreamChunk,
    BaseResponse,
)
from app.services.rag import rag_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(conversation: ConversationCreate, db: AsyncSession = Depends(get_db)):
    conv = Conversation(
        title=conversation.title or "New Conversation",
        knowledge_base_id=conversation.knowledge_base_id,
        system_prompt=conversation.system_prompt,
        model=conversation.model or "llama3:8b",
        temperature=conversation.temperature or 0.7,
        max_tokens=conversation.max_tokens or 2048,
        message_count=0,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationResponse(
        id=conv.id, title=conv.title, knowledge_base_id=conv.knowledge_base_id,
        system_prompt=conv.system_prompt, model=conv.model, temperature=conv.temperature,
        max_tokens=conv.max_tokens, message_count=conv.message_count,
        created_at=conv.created_at, updated_at=conv.updated_at, last_message_at=conv.last_message_at
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    knowledge_base_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation)
    if knowledge_base_id:
        stmt = stmt.where(Conversation.knowledge_base_id == knowledge_base_id)
    stmt = stmt.order_by(desc(Conversation.last_message_at), desc(Conversation.created_at)).limit(limit)
    res = await db.execute(stmt)
    convs = res.scalars().all()
    return [
        ConversationResponse(
            id=c.id, title=c.title, knowledge_base_id=c.knowledge_base_id,
            system_prompt=c.system_prompt, model=c.model, temperature=c.temperature,
            max_tokens=c.max_tokens, message_count=c.message_count,
            created_at=c.created_at, updated_at=c.updated_at, last_message_at=c.last_message_at
        ) for c in convs
    ]


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
async def get_conversation(conv_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = res.scalar_one_or_none()
    if not conv:
        raise NotFoundError("Conversation", conv_id)

    msg_res = await db.execute(select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at))
    msgs = msg_res.scalars().all()
    msg_models = [
        ChatMessage(role=m.role, content=m.content, sources=m.sources or [], metadata=m.meta_data, timestamp=m.created_at)
        for m in msgs
    ]
    return ConversationDetail(
        id=conv.id, title=conv.title, knowledge_base_id=conv.knowledge_base_id,
        system_prompt=conv.system_prompt, model=conv.model, temperature=conv.temperature,
        max_tokens=conv.max_tokens, message_count=conv.message_count,
        created_at=conv.created_at, updated_at=conv.updated_at, last_message_at=conv.last_message_at,
        messages=msg_models
    )


@router.patch("/conversations/{conv_id}", response_model=ConversationResponse)
async def update_conversation(conv_id: str, update: ConversationUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = res.scalar_one_or_none()
    if not conv:
        raise NotFoundError("Conversation", conv_id)

    if update.title is not None:
        conv.title = update.title
    if update.knowledge_base_id is not None:
        conv.knowledge_base_id = update.knowledge_base_id
    if update.system_prompt is not None:
        conv.system_prompt = update.system_prompt
    if update.model is not None:
        conv.model = update.model
    if update.temperature is not None:
        conv.temperature = update.temperature
    if update.max_tokens is not None:
        conv.max_tokens = update.max_tokens

    await db.commit()
    await db.refresh(conv)
    return ConversationResponse(
        id=conv.id, title=conv.title, knowledge_base_id=conv.knowledge_base_id,
        system_prompt=conv.system_prompt, model=conv.model, temperature=conv.temperature,
        max_tokens=conv.max_tokens, message_count=conv.message_count,
        created_at=conv.created_at, updated_at=conv.updated_at, last_message_at=conv.last_message_at
    )


@router.delete("/conversations/{conv_id}", response_model=BaseResponse)
async def delete_conversation(conv_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = res.scalar_one_or_none()
    if not conv:
        raise NotFoundError("Conversation", conv_id)
    await db.delete(conv)
    await db.commit()
    return BaseResponse(success=True)


@router.post("/conversations/{conv_id}/messages", response_model=ChatResponse)
async def send_message(conv_id: str, request: ChatRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = res.scalar_one_or_none()
    if not conv:
        raise NotFoundError("Conversation", conv_id)

    # Load history
    msg_res = await db.execute(select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at).limit(20))
    history_msgs = msg_res.scalars().all()
    conversation_history = [{"role": m.role, "content": m.content} for m in history_msgs]

    # Save user message
    user_msg = Message(conversation_id=conv_id, role=MessageRole.USER.value if hasattr(MessageRole.USER, "value") else "user", content=request.message)
    db.add(user_msg)
    await db.commit()

    try:
        result = await rag_service.chat_with_context(
            conversation_history=conversation_history,
            message=request.message,
            knowledge_base_id=conv.knowledge_base_id or "",
            top_k=5,
            similarity_threshold=0.7,
            temperature=request.temperature or conv.temperature,
            max_tokens=request.max_tokens or conv.max_tokens,
            system_prompt=conv.system_prompt,
        )

        assistant_message = ChatMessage(
            role=MessageRole.ASSISTANT,
            content=result["answer"],
            sources=result.get("sources", []),
        )
        # persist assistant
        asst = Message(conversation_id=conv_id, role="assistant", content=result["answer"], sources=result.get("sources", []))
        db.add(asst)
        conv.message_count = (conv.message_count or 0) + 2
        conv.last_message_at = datetime.now(timezone.utc)
        await db.commit()

        # log query
        try:
            qlog = QueryLog(query_text=request.message, knowledge_base_id=conv.knowledge_base_id or "", latency_ms=result.get("processing_time_ms", 0), tokens_used=0, status="success")
            db.add(qlog)
            await db.commit()
        except Exception:
            pass

        return ChatResponse(
            conversation_id=conv_id,
            message=assistant_message,
            processing_time_ms=result["processing_time_ms"],
        )

    except Exception as e:
        logger.error("Send message error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conv_id}/messages/stream")
async def stream_message(conv_id: str, request: ChatRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = res.scalar_one_or_none()
    if not conv:
        raise NotFoundError("Conversation", conv_id)

    # history at stream start
    msg_res = await db.execute(select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at).limit(20))
    history = [{"role": m.role, "content": m.content} for m in msg_res.scalars().all()]

    # save user message early
    user_msg = Message(conversation_id=conv_id, role="user", content=request.message)
    db.add(user_msg)
    await db.commit()

    async def generate_stream():
        try:
            user_message = ChatMessage(role=MessageRole.USER, content=request.message)
            yield f"data: {json.dumps({'type': 'user_message', 'message': user_message.model_dump(mode='json')}, default=str)}\n\n"

            req_gen = type('Req', (), {
                'query': request.message,
                'knowledge_base_id': conv.knowledge_base_id or "",
                'top_k': 5,
                'similarity_threshold': 0.7,
                'temperature': request.temperature or conv.temperature,
                'max_tokens': request.max_tokens or conv.max_tokens,
                'top_p': 0.9,
                'system_prompt': conv.system_prompt,
                'conversation_history': history,
                'stream': True,
                'include_sources': True,
            })()

            full_answer = ""
            async for chunk in rag_service.stream_generate(req_gen):
                if chunk.type == "content" and chunk.content:
                    full_answer += chunk.content
                yield f"data: {json.dumps(chunk.model_dump(mode='json'), default=str)}\n\n"

            # persist after stream
            if full_answer:
                async with db.bind.begin() as _:
                    pass
                from app.core.database import AsyncSessionLocal
                async with AsyncSessionLocal() as s:
                    asst = Message(conversation_id=conv_id, role="assistant", content=full_answer)
                    s.add(asst)
                    c_res = await s.execute(select(Conversation).where(Conversation.id == conv_id))
                    c = c_res.scalar_one_or_none()
                    if c:
                        c.message_count = (c.message_count or 0) + 1  # user already counted? adjust to +1 here (total +2)
                        c.message_count = c.message_count + 1
                        c.last_message_at = datetime.now(timezone.utc)
                    await s.commit()

        except Exception as e:
            logger.error("Stream message error", error=str(e))
            error_chunk = StreamChunk(type="error", error=str(e))
            yield f"data: {json.dumps(error_chunk.model_dump(mode='json'), default=str)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
