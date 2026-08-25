"""
Ollama service for LLM inference and embeddings.
"""
import asyncio
import json
import time
from typing import AsyncGenerator, List, Optional, Dict, Any
import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.core.exceptions import OllamaConnectionError, EmbeddingError, GenerationError

logger = structlog.get_logger(__name__)


class OllamaService:
    """Service for interacting with Ollama API."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.timeout = httpx.Timeout(settings.OLLAMA_TIMEOUT)
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def health_check(self) -> Dict[str, Any]:
        """Check Ollama service health."""
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            return {
                "status": "healthy",
                "models": models,
                "llm_model_available": settings.OLLAMA_LLM_MODEL in models,
                "embedding_model_available": settings.OLLAMA_EMBEDDING_MODEL in models,
            }
        except Exception as e:
            logger.error("Ollama health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "error": str(e),
                "models": [],
                "llm_model_available": False,
                "embedding_model_available": False,
            }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
    )
    async def generate_embeddings(
        self,
        texts: List[str],
        model: Optional[str] = None,
    ) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        model = model or settings.OLLAMA_EMBEDDING_MODEL

        try:
            # Process in batches
            batch_size = settings.EMBEDDING_BATCH_SIZE
            all_embeddings = []

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                embeddings = await self._embed_batch(batch, model)
                all_embeddings.extend(embeddings)

            return all_embeddings

        except Exception as e:
            logger.error("Embedding generation failed", error=str(e), model=model)
            raise EmbeddingError(f"Failed to generate embeddings: {str(e)}")

    async def _embed_batch(self, texts: List[str], model: str) -> List[List[float]]:
        """Embed a single batch of texts."""
        payload = {
            "model": model,
            "prompt": texts,
        }

        response = await self.client.post("/api/embed", json=payload)
        response.raise_for_status()
        data = response.json()

        embeddings = data.get("embeddings", [])
        if len(embeddings) != len(texts):
            raise EmbeddingError(f"Expected {len(texts)} embeddings, got {len(embeddings)}")

        return embeddings

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
    )
    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 0.9,
        system: Optional[str] = None,
        stream: bool = False,
    ) -> str | AsyncGenerator[str, None]:
        """Generate text completion."""
        model = model or settings.OLLAMA_LLM_MODEL

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "top_p": top_p,
            },
        }

        if system:
            payload["system"] = system

        if stream:
            return self._stream_generate(payload)
        else:
            return await self._generate_once(payload)

    async def _generate_once(self, payload: Dict[str, Any]) -> str:
        """Single generation request."""
        try:
            response = await self.client.post("/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except Exception as e:
            logger.error("Generation failed", error=str(e))
            raise GenerationError(f"Failed to generate text: {str(e)}")

    async def _stream_generate(self, payload: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Stream generation response."""
        try:
            async with self.client.stream("POST", "/api/generate", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            yield chunk
                        if data.get("done", False):
                            break
        except Exception as e:
            logger.error("Stream generation failed", error=str(e))
            raise GenerationError(f"Failed to stream generation: {str(e)}")

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 0.9,
        stream: bool = False,
    ) -> str | AsyncGenerator[str, None]:
        """Chat completion with message history."""
        model = model or settings.OLLAMA_LLM_MODEL

        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "top_p": top_p,
            },
        }

        if stream:
            return self._stream_chat(payload)
        else:
            return await self._chat_once(payload)

    async def _chat_once(self, payload: Dict[str, Any]) -> str:
        """Single chat request."""
        try:
            response = await self.client.post("/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")
        except Exception as e:
            logger.error("Chat failed", error=str(e))
            raise GenerationError(f"Failed to chat: {str(e)}")

    async def _stream_chat(self, payload: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Stream chat response."""
        try:
            async with self.client.stream("POST", "/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk
                        if data.get("done", False):
                            break
        except Exception as e:
            logger.error("Stream chat failed", error=str(e))
            raise GenerationError(f"Failed to stream chat: {str(e)}")

    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models."""
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()
            return response.json().get("models", [])
        except Exception as e:
            logger.error("Failed to list models", error=str(e))
            raise OllamaConnectionError(f"Failed to list models: {str(e)}")

    async def pull_model(self, model: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Pull a model from Ollama registry."""
        try:
            async with self.client.stream("POST", "/api/pull", json={"name": model, "stream": True}) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield json.loads(line)
        except Exception as e:
            logger.error("Model pull failed", error=str(e), model=model)
            raise OllamaConnectionError(f"Failed to pull model: {str(e)}")

    async def get_model_info(self, model: str) -> Dict[str, Any]:
        """Get model information."""
        try:
            response = await self.client.post("/api/show", json={"name": model})
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("Failed to get model info", error=str(e), model=model)
            raise OllamaConnectionError(f"Failed to get model info: {str(e)}")


# Global service instance
ollama_service = OllamaService()