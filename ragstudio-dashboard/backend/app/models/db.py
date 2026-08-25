"""
SQLAlchemy DB models for persistent storage.
Uses Postgres via asyncpg or SQLite via aiosqlite.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, Integer, Float, DateTime, Boolean, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

# Use JSON for SQLite compatibility; if Postgres, JSONB will be used via type handling
# SQLAlchemy will store JSON as JSON type which maps to JSONB on Postgres

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding_model: Mapped[str] = mapped_column(String(200), default="nomic-embed-text")
    chunk_size: Mapped[int] = mapped_column(Integer, default=1000)
    chunk_overlap: Mapped[int] = mapped_column(Integer, default=200)
    distance_metric: Mapped[str] = mapped_column(String(50), default="cosine")
    meta_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="active")
    document_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    last_indexed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    documents: Mapped[list["Document"]] = relationship("Document", back_populates="knowledge_base", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    doc_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    knowledge_base_id: Mapped[str] = mapped_column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    file_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    file_type: Mapped[str] = mapped_column(String(20), default=".txt")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    knowledge_base: Mapped["KnowledgeBase"] = relationship("KnowledgeBase", back_populates="documents")
    chunks: Mapped[list["Chunk"]] = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_doc_kb_status", "knowledge_base_id", "status"),
    )

class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(100), primary_key=True, default=gen_uuid)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    knowledge_base_id: Mapped[str] = mapped_column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("idx_chunk_kb", "knowledge_base_id"),
        Index("idx_chunk_doc", "document_id"),
    )

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(500), default="New Conversation")
    knowledge_base_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("knowledge_bases.id", ondelete="SET NULL"), nullable=True, index=True)
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model: Mapped[str] = mapped_column(String(100), default="llama3:8b")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    meta_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")

class QueryLog(Base):
    __tablename__ = "queries_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    knowledge_base_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)

    __table_args__ = (
        Index("idx_querylog_kb_time", "knowledge_base_id", "created_at"),
    )

class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    passed_cases: Mapped[int] = mapped_column(Integer, default=0)
    failed_cases: Mapped[int] = mapped_column(Integer, default=0)
    average_metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    test_cases: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    knowledge_base_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    evaluation_id: Mapped[str] = mapped_column(String(36), ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="running")
    model: Mapped[str] = mapped_column(String(100), default="llama3:8b")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[float] = mapped_column(Float, default=0)
