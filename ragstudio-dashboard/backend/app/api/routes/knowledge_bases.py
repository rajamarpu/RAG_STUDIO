"""
Knowledge Base API routes - DB persisted with zero defaults.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import structlog

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.db import KnowledgeBase, Document, Chunk
from app.models.schemas import (
    KnowledgeBaseResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    KnowledgeBaseDetail,
    KnowledgeBaseStatus,
    PaginatedResponse,
    BaseResponse,
)
from app.services.vector_store import vector_store_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/knowledge-bases", tags=["Knowledge Bases"])


def kb_to_dict(kb: KnowledgeBase, chunk_count_override: Optional[int] = None) -> dict:
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "embedding_model": kb.embedding_model,
        "chunk_size": kb.chunk_size,
        "chunk_overlap": kb.chunk_overlap,
        "distance_metric": kb.distance_metric,
        "metadata": kb.meta_data or {},
        "status": kb.status,
        "document_count": kb.document_count or 0,
        "chunk_count": chunk_count_override if chunk_count_override is not None else (kb.chunk_count or 0),
        "created_at": kb.created_at,
        "updated_at": kb.updated_at,
        "last_indexed_at": kb.last_indexed_at,
    }


@router.post("", response_model=KnowledgeBaseResponse, status_code=201)
async def create_knowledge_base(kb: KnowledgeBaseCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    kb_id = str(uuid.uuid4())
    db_kb = KnowledgeBase(
        id=kb_id,
        name=kb.name,
        description=kb.description,
        embedding_model=kb.embedding_model or "nomic-embed-text",
        chunk_size=kb.chunk_size or 1000,
        chunk_overlap=kb.chunk_overlap or 200,
        distance_metric=kb.distance_metric or "cosine",
        meta_data=kb.metadata or {},
        status=KnowledgeBaseStatus.ACTIVE.value if isinstance(KnowledgeBaseStatus.ACTIVE, str) else KnowledgeBaseStatus.ACTIVE,
        document_count=0,
        chunk_count=0,
    )
    db.add(db_kb)
    await db.commit()
    await db.refresh(db_kb)

    background_tasks.add_task(
        vector_store_service.get_collection,
        collection_name=kb_id,
    )

    return KnowledgeBaseResponse(**kb_to_dict(db_kb))


@router.get("", response_model=PaginatedResponse)
async def list_knowledge_bases(
    status: Optional[KnowledgeBaseStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(KnowledgeBase)
    if status:
        stmt = stmt.where(KnowledgeBase.status == status.value if hasattr(status, "value") else status)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(or_(KnowledgeBase.name.ilike(like), KnowledgeBase.description.ilike(like)))
    # sorting
    reverse = sort_order == "desc"
    col = getattr(KnowledgeBase, sort_by, KnowledgeBase.created_at)
    stmt = stmt.order_by(col.desc() if reverse else col.asc())

    # pagination via query
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    # enrich chunk counts from vector store if needed but keep 0 default
    # For list we keep stored chunk_count (updated on doc upload) to avoid N queries
    resp_items = []
    for kb in items:
        # try vector count for accuracy but fallback to stored
        chunk_count = kb.chunk_count or 0
        try:
            stats = await vector_store_service.get_collection_stats(kb.id)
            chunk_count = stats.get("count", chunk_count)
        except Exception:
            pass
        resp_items.append(KnowledgeBaseResponse(**kb_to_dict(kb, chunk_count_override=chunk_count)))

    return PaginatedResponse(
        items=resp_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/{kb_id}", response_model=KnowledgeBaseDetail)
async def get_knowledge_base(kb_id: str, include_documents: bool = Query(False), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise NotFoundError("Knowledge Base", kb_id)

    chunk_count = kb.chunk_count or 0
    try:
        stats = await vector_store_service.get_collection_stats(kb_id)
        chunk_count = stats.get("count", chunk_count)
        # sync if different
        if chunk_count != kb.chunk_count:
            kb.chunk_count = chunk_count
            await db.commit()
    except Exception:
        pass

    docs = []
    if include_documents:
        res = await db.execute(select(Document).where(Document.knowledge_base_id == kb_id))
        docs = res.scalars().all()
        # convert to simple dict for response extra field (schema expects documents list but not strictly typed)
        docs = [{"id": d.id, "title": d.title, "status": d.status, "chunk_count": d.chunk_count} for d in docs]

    data = kb_to_dict(kb, chunk_count_override=chunk_count)
    return KnowledgeBaseDetail(**data, documents=docs)


@router.patch("/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge_base(kb_id: str, update: KnowledgeBaseUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise NotFoundError("Knowledge Base", kb_id)

    if update.name is not None:
        kb.name = update.name
    if update.description is not None:
        kb.description = update.description
    if update.embedding_model is not None:
        kb.embedding_model = update.embedding_model
    if update.chunk_size is not None:
        kb.chunk_size = update.chunk_size
    if update.chunk_overlap is not None:
        kb.chunk_overlap = update.chunk_overlap
    if update.distance_metric is not None:
        kb.distance_metric = update.distance_metric
    if update.metadata is not None:
        kb.meta_data = update.metadata

    if update.embedding_model or update.distance_metric:
        kb.status = KnowledgeBaseStatus.INDEXING.value if hasattr(KnowledgeBaseStatus.INDEXING, "value") else "indexing"

    await db.commit()
    await db.refresh(kb)
    return KnowledgeBaseResponse(**kb_to_dict(kb))


@router.delete("/{kb_id}", response_model=BaseResponse)
async def delete_knowledge_base(kb_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise NotFoundError("Knowledge Base", kb_id)

    await vector_store_service.reset_collection(kb_id)
    await db.delete(kb)
    await db.commit()
    return BaseResponse(success=True)


@router.post("/{kb_id}/reindex", response_model=BaseResponse)
async def reindex_knowledge_base(kb_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise NotFoundError("Knowledge Base", kb_id)

    kb.status = KnowledgeBaseStatus.INDEXING.value if hasattr(KnowledgeBaseStatus.INDEXING, "value") else "indexing"
    await db.commit()
    background_tasks.add_task(vector_store_service.reset_collection, kb_id)
    return BaseResponse(success=True)


@router.get("/{kb_id}/stats")
async def get_knowledge_base_stats(kb_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise NotFoundError("Knowledge Base", kb_id)

    # count documents from DB for truth
    cnt_res = await db.execute(select(func.count()).select_from(Document).where(Document.knowledge_base_id == kb_id))
    doc_count = cnt_res.scalar() or 0

    try:
        stats = await vector_store_service.get_collection_stats(kb_id)
    except Exception as e:
        stats = {"count": 0, "embedding_dimension": 0, "error": str(e)}

    # sync counts
    kb.document_count = doc_count
    kb.chunk_count = stats.get("count", 0)
    await db.commit()

    return {
        "knowledge_base_id": kb_id,
        "name": kb.name,
        "document_count": doc_count,
        "chunk_count": stats.get("count", 0),
        "embedding_dimension": stats.get("embedding_dimension", 0),
        "embedding_model": kb.embedding_model,
        "chunk_size": kb.chunk_size,
        "chunk_overlap": kb.chunk_overlap,
        "distance_metric": kb.distance_metric,
        "status": kb.status,
    }
