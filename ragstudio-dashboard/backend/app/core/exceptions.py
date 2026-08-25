"""
Custom exceptions for the RAG Platform.
"""
from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
import structlog

logger = structlog.get_logger(__name__)


class RAGException(Exception):
    """Base exception for RAG Platform."""

    def __init__(
        self,
        message: str,
        code: str = "RAG_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class DocumentProcessingError(RAGException):
    """Error during document processing."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="DOCUMENT_PROCESSING_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class EmbeddingError(RAGException):
    """Error during embedding generation."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="EMBEDDING_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details,
        )


class RetrievalError(RAGException):
    """Error during document retrieval."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="RETRIEVAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class GenerationError(RAGException):
    """Error during text generation."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="GENERATION_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details,
        )


class VectorStoreError(RAGException):
    """Error interacting with vector store."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VECTOR_STORE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class OllamaConnectionError(RAGException):
    """Error connecting to Ollama."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="OLLAMA_CONNECTION_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


class AuthenticationError(RAGException):
    """Authentication error."""

    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class AuthorizationError(RAGException):
    """Authorization error."""

    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class NotFoundError(RAGException):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier},
        )


class RateLimitError(RAGException):
    """Rate limit exceeded error."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"retry_after": retry_after},
        )


# Exception handlers
async def rag_exception_handler(request: Request, exc: RAGException) -> JSONResponse:
    """Handle RAG exceptions."""
    logger.error(
        "RAG exception",
        code=exc.code,
        message=exc.message,
        details=exc.details,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "details": {},
            }
        },
    )


async def validation_exception_handler(request: Request, exc: PydanticValidationError) -> JSONResponse:
    """Handle validation exceptions."""
    logger.warning(
        "Validation error",
        errors=exc.errors(),
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": exc.errors()},
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle generic exceptions."""
    logger.exception(
        "Unhandled exception",
        error=str(exc),
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
            }
        },
    )