"""Chunk browsing API."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db import Chunk, Document

router = APIRouter(prefix="/chunks", tags=["Chunks"])


@router.get("")
async def list_chunks(
    knowledge_base_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if knowledge_base_id:
        filters.append(Chunk.knowledge_base_id == knowledge_base_id)
    if search:
        filters.append(Chunk.text.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(Chunk)
    data_query = select(Chunk, Document.title).join(Document, Document.id == Chunk.document_id)
    if filters:
        count_query = count_query.where(*filters)
        data_query = data_query.where(*filters)

    total = (await db.execute(count_query)).scalar() or 0
    rows = (await db.execute(
        data_query.order_by(Chunk.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).all()

    items = [
        {
            "id": chunk.id,
            "document_id": chunk.document_id,
            "knowledge_base_id": chunk.knowledge_base_id,
            "document_title": title,
            "chunk_index": chunk.chunk_index,
            "text": chunk.text,
            "token_count": chunk.token_count or 0,
            "metadata": chunk.chunk_metadata or {},
            "created_at": chunk.created_at,
        }
        for chunk, title in rows
    ]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }
