"""
Core configuration for the RAG Platform backend.
"""
from functools import lru_cache
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "RAG AI Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_WORKERS: int = 1
    API_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5176", "http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./ragstudio.db"
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Security
    SECRET_KEY: str = Field(default="your-secret-key-change-in-production", min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_LLM_MODEL: str = "llama3:8b"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    OLLAMA_TIMEOUT: int = 120
    OLLAMA_MAX_RETRIES: int = 3

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    CHROMA_COLLECTION_NAME: str = "rag_documents"
    CHROMA_DISTANCE_METRIC: str = "cosine"
    CHROMA_HNSW_SPACE: str = "cosine"
    CHROMA_HNSW_M: int = 16
    CHROMA_HNSW_EF_CONSTRUCTION: int = 200

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_SSL: bool = False

    # Document Processing
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".txt", ".md", ".docx", ".html", ".htm"]

    # Embedding
    EMBEDDING_BATCH_SIZE: int = 32
    EMBEDDING_DIMENSION: int = 768

    # Retrieval
    DEFAULT_TOP_K: int = 5
    MAX_TOP_K: int = 20
    SIMILARITY_THRESHOLD: float = 0.7

    # Generation
    DEFAULT_TEMPERATURE: float = 0.7
    DEFAULT_MAX_TOKENS: int = 2048
    DEFAULT_TOP_P: float = 0.9

    # Cache
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    CACHE_PREFIX: str = "rag:"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_MESSAGE_SIZE: int = 1024 * 1024  # 1MB

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    TEMP_DIR: str = "./temp"

    # Evaluation
    EVALUATION_ENABLED: bool = True
    EVALUATION_SAMPLE_SIZE: int = 100

    @property
    def chroma_url(self) -> str:
        return f"http://{self.CHROMA_HOST}:{self.CHROMA_PORT}"

    @property
    def redis_url(self) -> str:
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        scheme = "rediss" if self.REDIS_SSL else "redis"
        return f"{scheme}://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()