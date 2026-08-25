"""
Pydantic models for API schemas.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, HttpUrl, field_validator
from datetime import datetime
from enum import Enum


# ==================== Enums ====================

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class KnowledgeBaseStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    INDEXING = "indexing"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class EvaluationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ==================== Base Models ====================

class BaseResponse(BaseModel):
    """Base response model."""
    success: bool = True
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = False
    error: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel):
    """Paginated response model."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== Document Models ====================

class DocumentBase(BaseModel):
    """Base document model."""
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    knowledge_base_id: str


class DocumentCreate(DocumentBase):
    """Document creation model."""
    file_url: Optional[HttpUrl] = None


class DocumentUpdate(BaseModel):
    """Document update model."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentResponse(DocumentBase):
    """Document response model."""
    id: str
    status: DocumentStatus
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    """Document upload response."""
    document_id: str
    status: DocumentStatus
    message: str


class DocumentListParams(BaseModel):
    """Document list query parameters."""
    knowledge_base_id: Optional[str] = None
    status: Optional[DocumentStatus] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    sort_order: Literal["asc", "desc"] = Field(default="desc")


# ==================== Knowledge Base Models ====================

class KnowledgeBaseBase(BaseModel):
    """Base knowledge base model."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    embedding_model: str = Field(default="nomic-embed-text")
    chunk_size: int = Field(default=1000, ge=100, le=8000)
    chunk_overlap: int = Field(default=200, ge=0, le=2000)
    distance_metric: str = Field(default="cosine")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeBaseCreate(KnowledgeBaseBase):
    """Knowledge base creation model."""
    pass


class KnowledgeBaseUpdate(BaseModel):
    """Knowledge base update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = Field(None, ge=100, le=8000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=2000)
    distance_metric: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeBaseResponse(KnowledgeBaseBase):
    """Knowledge base response model."""
    id: str
    status: KnowledgeBaseStatus
    document_count: int = 0
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime
    last_indexed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KnowledgeBaseDetail(KnowledgeBaseResponse):
    """Knowledge base detail with documents."""
    documents: List[DocumentResponse] = []


# ==================== Query/Retrieval Models ====================

class QueryRequest(BaseModel):
    """Query request model."""
    query: str = Field(..., min_length=1, max_length=10000)
    knowledge_base_id: str
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    filters: Dict[str, Any] = Field(default_factory=dict)
    include_metadata: bool = True
    rerank: bool = False


class RetrievalResult(BaseModel):
    """Single retrieval result."""
    id: str
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)
    document_title: Optional[str] = None


class QueryResponse(BaseResponse):
    """Query response model."""
    query: str
    results: List[RetrievalResult]
    total_results: int
    processing_time_ms: float
    knowledge_base_id: str


# ==================== RAG Generation Models ====================

class GenerationRequest(BaseModel):
    """Generation request model."""
    query: str = Field(..., min_length=1, max_length=10000)
    knowledge_base_id: str
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    system_prompt: Optional[str] = None
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    stream: bool = False
    include_sources: bool = True


class SourceCitation(BaseModel):
    """Source citation model."""
    document_id: str
    document_title: str
    content: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GenerationResponse(BaseResponse):
    """Generation response model."""
    answer: str
    sources: List[SourceCitation] = []
    query: str
    processing_time_ms: float
    tokens_used: Optional[int] = None
    model: str


class StreamChunk(BaseModel):
    """Streaming response chunk."""
    type: Literal["content", "source", "done", "error"]
    content: Optional[str] = None
    sources: Optional[List[SourceCitation]] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==================== Chat Models ====================

class ChatMessage(BaseModel):
    """Chat message model."""
    role: MessageRole
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    sources: List[SourceCitation] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConversationBase(BaseModel):
    """Base conversation model."""
    title: str = Field(default="New Conversation", max_length=200)
    knowledge_base_id: Optional[str] = None
    system_prompt: Optional[str] = None
    model: str = Field(default="llama3:8b")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)


class ConversationCreate(ConversationBase):
    """Conversation creation model."""
    pass


class ConversationUpdate(BaseModel):
    """Conversation update model."""
    title: Optional[str] = Field(None, max_length=200)
    knowledge_base_id: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=8192)


class ConversationResponse(ConversationBase):
    """Conversation response model."""
    id: str
    message_count: int = 0
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationDetail(ConversationResponse):
    """Conversation with messages."""
    messages: List[ChatMessage] = []


class ChatRequest(BaseModel):
    """Chat request model."""
    conversation_id: str
    message: str = Field(..., min_length=1, max_length=10000)
    stream: bool = False
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=8192)


class ChatResponse(BaseResponse):
    """Chat response model."""
    conversation_id: str
    message: ChatMessage
    processing_time_ms: float


# ==================== Evaluation Models ====================

class EvaluationMetric(BaseModel):
    """Evaluation metric model."""
    name: str
    value: float
    description: Optional[str] = None


class TestCase(BaseModel):
    """Test case model."""
    id: str
    query: str
    expected_answer: Optional[str] = None
    expected_sources: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvaluationRunRequest(BaseModel):
    """Evaluation run request."""
    evaluation_id: str
    test_cases: List[TestCase]
    model: str = Field(default="llama3:8b")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class EvaluationResult(BaseModel):
    """Evaluation result model."""
    test_case_id: str
    query: str
    generated_answer: str
    expected_answer: Optional[str] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    sources: List[SourceCitation] = Field(default_factory=list)
    passed: bool
    processing_time_ms: float


class EvaluationSummary(BaseModel):
    """Evaluation summary model."""
    evaluation_id: str
    status: EvaluationStatus
    total_cases: int
    passed_cases: int
    failed_cases: int
    average_metrics: Dict[str, float] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


class EvaluationResponse(BaseResponse):
    """Evaluation response model."""
    evaluation: EvaluationSummary


# ==================== Analytics Models ====================

class TimeSeriesPoint(BaseModel):
    """Time series data point."""
    timestamp: datetime
    value: float


class QueryAnalytics(BaseModel):
    """Query analytics model."""
    total_queries: int
    avg_response_time_ms: float
    avg_tokens_per_query: float
    success_rate: float
    queries_over_time: List[TimeSeriesPoint]
    top_queries: List[Dict[str, Any]]


class UsageAnalytics(BaseModel):
    """Usage analytics model."""
    total_documents: int
    total_chunks: int
    total_knowledge_bases: int
    total_conversations: int
    storage_used_mb: float
    api_calls_today: int
    active_users: int


class PerformanceAnalytics(BaseModel):
    """Performance analytics model."""
    avg_embedding_time_ms: float
    avg_retrieval_time_ms: float
    avg_generation_time_ms: float
    p50_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate: float
    throughput_qps: float


# ==================== System Models ====================

class HealthCheck(BaseModel):
    """Health check response."""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    uptime_seconds: float
    checks: Dict[str, Dict[str, Any]]


class SystemStats(BaseModel):
    """System statistics."""
    ollama: Dict[str, Any]
    chromadb: Dict[str, Any]
    redis: Dict[str, Any]
    api: Dict[str, Any]


class SettingsResponse(BaseModel):
    """Settings response."""
    ollama_url: str
    ollama_llm_model: str
    ollama_embedding_model: str
    chroma_url: str
    chroma_collection: str
    api_port: int
    cors_origins: List[str]
    rate_limit: int
    enable_auth: bool
    chunk_size: int
    chunk_overlap: int
    enable_cache: bool
    cache_ttl: int