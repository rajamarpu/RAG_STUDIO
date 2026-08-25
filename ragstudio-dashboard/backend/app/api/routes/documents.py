"""
Document API routes - DB persisted, zero defaults, Ollama-aware.
"""
import os
import uuid
import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import structlog

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import NotFoundError, DocumentProcessingError
from app.models.db import Document as DBDocument, KnowledgeBase, Chunk, QueryLog
from app.models.schemas import (
    DocumentResponse,
    DocumentCreate,
    DocumentUpdate,
    DocumentUploadResponse,
    DocumentStatus,
    PaginatedResponse,
    BaseResponse,
)
from app.services.document_processor import document_processor
from app.services.vector_store import vector_store_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    knowledge_base_id: str = Form(...),
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    metadata: Optional[str] = Form("{}"),
    db: AsyncSession = Depends(get_db),
):
    # Validate knowledge base exists
    res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id))
    kb = res.scalar_one_or_none()
    if not kb:
        raise NotFoundError("Knowledge Base", knowledge_base_id)

    try:
        meta = json.loads(metadata) if metadata else {}
    except json.JSONDecodeError:
        meta = {}

    document_id = str(uuid.uuid4())
    file_title = title or file.filename or "Untitled"
    file_content = await file.read()
    file_type = os.path.splitext(file.filename)[1].lower() if file.filename else ".txt"

    try:
        file_path, file_id, file_size = await document_processor.save_upload(
            file_content=file_content,
            filename=file.filename or f"document{file_type}",
            knowledge_base_id=knowledge_base_id,
        )
    except DocumentProcessingError as e:
        raise HTTPException(status_code=400, detail=str(e))

    doc = DBDocument(
        id=document_id,
        title=file_title,
        content=None,
        doc_metadata=meta,
        knowledge_base_id=knowledge_base_id,
        status=DocumentStatus.PENDING.value if hasattr(DocumentStatus.PENDING, "value") else "pending",
        file_path=file_path,
        file_size=file_size,
        file_type=file_type,
        chunk_count=0,
    )
    db.add(doc)
    # increment KB doc count
    kb.document_count = (kb.document_count or 0) + 1
    await db.commit()

    background_tasks.add_task(
        process_document_background,
        document_id=document_id,
        file_path=file_path,
        file_type=file_type,
        knowledge_base_id=knowledge_base_id,
        title=file_title,
        metadata=meta,
    )

    return DocumentUploadResponse(
        document_id=document_id,
        status=DocumentStatus.PENDING,
        message="Document uploaded successfully. Processing started.",
    )


async def process_document_background(
    document_id: str,
    file_path: str,
    file_type: str,
    knowledge_base_id: str,
    title: str,
    metadata: dict,
):
    """Background task to process document with Ollama embeddings."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
            doc = res.scalar_one_or_none()
            if not doc:
                logger.error("Document not found for background processing", document_id=document_id)
                return
            doc.status = DocumentStatus.PROCESSING.value if hasattr(DocumentStatus.PROCESSING, "value") else "processing"
            await db.commit()

            result = await document_processor.process_document(
                file_path=file_path,
                file_type=file_type,
                knowledge_base_id=knowledge_base_id,
                document_id=document_id,
                title=title,
                metadata=metadata,
            )

            # Add chunks to vector store (requires Ollama embeddings)
            if result["chunks"]:
                chunk_texts = [c["text"] for c in result["chunks"]]
                chunk_metadatas = [c["metadata"] for c in result["chunks"]]
                chunk_ids = [f"{document_id}_chunk_{c['chunk_index']}" for c in result["chunks"]]

                try:
                    await vector_store_service.add_documents(
                        documents=chunk_texts,
                        metadatas=chunk_metadatas,
                        ids=chunk_ids,
                        collection_name=knowledge_base_id,
                    )
                except Exception as e:
                    logger.error("Vector store add failed - Ollama may be unavailable", error=str(e), document_id=document_id)
                    raise

                # persist chunks for /chunks page
                for c in result["chunks"]:
                    chunk = Chunk(
                        id=f"{document_id}_chunk_{c['chunk_index']}",
                        document_id=document_id,
                        knowledge_base_id=knowledge_base_id,
                        chunk_index=c["chunk_index"],
                        text=c["text"],
                        token_count=c["token_count"],
                        chunk_metadata=c["metadata"],
                    )
                    db.add(chunk)

            # Update doc
            res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
            doc = res.scalar_one_or_none()
            if doc:
                doc.status = DocumentStatus.COMPLETED.value if hasattr(DocumentStatus.COMPLETED, "value") else "completed"
                doc.content = result["full_text"][:10000]
                doc.chunk_count = result["chunk_count"]
                doc.processed_at = datetime.datetime.now(datetime.timezone.utc)
                await db.commit()

            # update KB chunk_count from vector store
            try:
                stats = await vector_store_service.get_collection_stats(knowledge_base_id)
                kb_res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id))
                kb = kb_res.scalar_one_or_none()
                if kb:
                    kb.chunk_count = stats.get("count", kb.chunk_count)
                    kb.last_indexed_at = datetime.datetime.now(datetime.timezone.utc)
                    await db.commit()
            except Exception:
                pass

            logger.info("Document processed successfully", document_id=document_id, chunks=result["chunk_count"])

        except Exception as e:
            logger.error("Document processing failed", document_id=document_id, error=str(e))
            try:
                res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
                doc = res.scalar_one_or_none()
                if doc:
                    doc.status = DocumentStatus.FAILED.value if hasattr(DocumentStatus.FAILED, "value") else "failed"
                    doc.error_message = str(e)
                    await db.commit()
            except Exception:
                pass


@router.get("", response_model=PaginatedResponse)
async def list_documents(
    knowledge_base_id: Optional[str] = Query(None),
    status: Optional[DocumentStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DBDocument)
    if knowledge_base_id:
        stmt = stmt.where(DBDocument.knowledge_base_id == knowledge_base_id)
    if status:
        val = status.value if hasattr(status, "value") else status
        stmt = stmt.where(DBDocument.status == val)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(DBDocument.title.ilike(like))

    col = getattr(DBDocument, sort_by, DBDocument.created_at)
    stmt = stmt.order_by(col.desc() if sort_order == "desc" else col.asc())

    cnt_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(cnt_stmt)).scalar() or 0

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = result.scalars().all()

    def to_resp(d: DBDocument) -> DocumentResponse:
        return DocumentResponse(
            id=d.id,
            title=d.title,
            content=d.content,
            metadata=d.doc_metadata or {},
            knowledge_base_id=d.knowledge_base_id,
            status=d.status,
            file_path=d.file_path or "",
            file_size=d.file_size or 0,
            file_type=d.file_type or ".txt",
            chunk_count=d.chunk_count or 0,
            created_at=d.created_at,
            updated_at=d.updated_at,
            processed_at=d.processed_at,
            error_message=d.error_message,
        )

    return PaginatedResponse(
        items=[to_resp(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document", document_id)
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        metadata=doc.doc_metadata or {},
        knowledge_base_id=doc.knowledge_base_id,
        status=doc.status,
        file_path=doc.file_path or "",
        file_size=doc.file_size or 0,
        file_type=doc.file_type or ".txt",
        chunk_count=doc.chunk_count or 0,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        processed_at=doc.processed_at,
        error_message=doc.error_message,
    )


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(document_id: str, update: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document", document_id)

    if update.title is not None:
        doc.title = update.title
    if update.content is not None:
        doc.content = update.content
    if update.metadata is not None:
        doc.doc_metadata = update.metadata

    await db.commit()
    await db.refresh(doc)
    return DocumentResponse(
        id=doc.id, title=doc.title, content=doc.content, metadata=doc.doc_metadata or {},
        knowledge_base_id=doc.knowledge_base_id, status=doc.status, file_path=doc.file_path or "",
        file_size=doc.file_size or 0, file_type=doc.file_type or ".txt", chunk_count=doc.chunk_count or 0,
        created_at=doc.created_at, updated_at=doc.updated_at, processed_at=doc.processed_at, error_message=doc.error_message
    )


@router.delete("/{document_id}", response_model=BaseResponse)
async def delete_document(document_id: str, knowledge_base_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document", document_id)

    chunk_ids = [f"{document_id}_chunk_{i}" for i in range(doc.chunk_count or 0)]
    try:
        await vector_store_service.delete_documents(chunk_ids, collection_name=knowledge_base_id)
    except Exception as e:
        logger.warning("Vector delete failed", error=str(e))

    await document_processor.delete_document_files(knowledge_base_id, document_id)

    # also delete chunks table
    await db.execute(select(Chunk).where(Chunk.document_id == document_id))
    # delete chunks via ORM
    chunk_res = await db.execute(select(Chunk).where(Chunk.document_id == document_id))
    for ch in chunk_res.scalars().all():
        await db.delete(ch)

    await db.delete(doc)
    # decrement KB doc count
    kb_res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id))
    kb = kb_res.scalar_one_or_none()
    if kb:
        kb.document_count = max(0, (kb.document_count or 1) - 1)
        # sync chunk_count
        try:
            stats = await vector_store_service.get_collection_stats(knowledge_base_id)
            kb.chunk_count = stats.get("count", 0)
        except Exception:
            pass

    await db.commit()
    return BaseResponse(success=True)


@router.post("/{document_id}/reprocess", response_model=BaseResponse)
async def reprocess_document(document_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document", document_id)

    doc.status = DocumentStatus.PENDING.value if hasattr(DocumentStatus.PENDING, "value") else "pending"
    doc.error_message = None
    await db.commit()

    background_tasks.add_task(
        process_document_background,
        document_id=document_id,
        file_path=doc.file_path,
        file_type=doc.file_type,
        knowledge_base_id=doc.knowledge_base_id,
        title=doc.title,
        metadata=doc.doc_metadata or {},
    )

    return BaseResponse(success=True)


@router.get("/{document_id}/download")
async def download_document(document_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBDocument).where(DBDocument.id == document_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document", document_id)

    file_path = doc.file_path
    if not file_path or not os.path.exists(file_path):
        raise NotFoundError("File", file_path or document_id)

    return FileResponse(
        path=file_path,
        filename=f"{doc.title}{doc.file_type}",
        media_type="application/octet-stream",
    )
