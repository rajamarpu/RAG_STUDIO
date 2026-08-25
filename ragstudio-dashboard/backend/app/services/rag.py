"""
RAG service combining retrieval and generation.
"""
import time
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
import structlog

from app.core.config import settings
from app.core.exceptions import RetrievalError, GenerationError
from app.services.ollama import ollama_service
from app.services.vector_store import vector_store_service
from app.models.schemas import (
    RetrievalResult,
    SourceCitation,
    QueryRequest,
    QueryResponse,
    GenerationRequest,
    GenerationResponse,
    StreamChunk,
)

logger = structlog.get_logger(__name__)


class RAGService:
    """Service for RAG pipeline: retrieval + generation."""

    def __init__(self):
        self.default_system_prompt = """You are a helpful AI assistant that answers questions based on the provided context.
Use only the information from the context to answer. If the context doesn't contain the answer, say so.
Cite your sources using the format [Source X] where X is the source number."""

    async def retrieve(self, request: QueryRequest) -> QueryResponse:
        """Retrieve relevant documents for a query."""
        start_time = time.time()

        try:
            # Query vector store
            results = await vector_store_service.query(
                query_text=request.query,
                n_results=request.top_k,
                where=request.filters if request.filters else None,
                collection_name=request.knowledge_base_id,
            )

            # Process results
            retrieval_results = []
            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]
            ids = results.get("ids", [[]])[0]

            for i, (doc, metadata, distance, doc_id) in enumerate(zip(documents, metadatas, distances, ids)):
                # Convert distance to similarity score
                score = 1.0 - distance

                # Apply similarity threshold
                if score < request.similarity_threshold:
                    continue

                retrieval_results.append(RetrievalResult(
                    id=doc_id,
                    document_id=metadata.get("document_id", ""),
                    content=doc,
                    score=score,
                    metadata=metadata if request.include_metadata else {},
                    document_title=metadata.get("title", "Unknown"),
                ))

            processing_time = (time.time() - start_time) * 1000

            return QueryResponse(
                query=request.query,
                results=retrieval_results,
                total_results=len(retrieval_results),
                processing_time_ms=processing_time,
                knowledge_base_id=request.knowledge_base_id,
            )

        except Exception as e:
            logger.error("Retrieval failed", error=str(e), query=request.query)
            raise RetrievalError(f"Retrieval failed: {str(e)}")

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Generate answer using RAG."""
        start_time = time.time()

        try:
            # Retrieve relevant documents
            retrieval_request = QueryRequest(
                query=request.query,
                knowledge_base_id=request.knowledge_base_id,
                top_k=request.top_k,
                similarity_threshold=request.similarity_threshold,
                filters={},
                include_metadata=True,
            )
            retrieval_response = await self.retrieve(retrieval_request)

            # Build context from retrieved documents
            context_parts = []
            sources = []
            for i, result in enumerate(retrieval_response.results):
                context_parts.append(f"[Source {i+1}] {result.content}")
                sources.append(SourceCitation(
                    document_id=result.document_id,
                    document_title=result.document_title,
                    content=result.content[:500] + "..." if len(result.content) > 500 else result.content,
                    score=result.score,
                    metadata=result.metadata,
                ))

            context = "\n\n".join(context_parts) if context_parts else "No relevant documents found."

            # Build prompt
            system_prompt = request.system_prompt or self.default_system_prompt
            user_prompt = f"""Context:
{context}

Question: {request.query}

Answer:"""

            # Generate response
            if request.conversation_history:
                messages = [{"role": "system", "content": system_prompt}]
                for msg in request.conversation_history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": user_prompt})

                answer = await ollama_service.chat(
                    messages=messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    top_p=request.top_p,
                )
            else:
                prompt = f"{system_prompt}\n\n{user_prompt}"
                answer = await ollama_service.generate(
                    prompt=prompt,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    top_p=request.top_p,
                )

            processing_time = (time.time() - start_time) * 1000

            return GenerationResponse(
                answer=answer.strip(),
                sources=sources if request.include_sources else [],
                query=request.query,
                processing_time_ms=processing_time,
                model=settings.OLLAMA_LLM_MODEL,
            )

        except Exception as e:
            logger.error("Generation failed", error=str(e), query=request.query)
            raise GenerationError(f"Generation failed: {str(e)}")

    async def stream_generate(self, request: GenerationRequest) -> AsyncGenerator[StreamChunk, None]:
        """Stream generated answer using RAG."""
        start_time = time.time()

        try:
            # Retrieve relevant documents
            retrieval_request = QueryRequest(
                query=request.query,
                knowledge_base_id=request.knowledge_base_id,
                top_k=request.top_k,
                similarity_threshold=request.similarity_threshold,
                filters={},
                include_metadata=True,
            )
            retrieval_response = await self.retrieve(retrieval_request)

            # Build context from retrieved documents
            context_parts = []
            sources = []
            for i, result in enumerate(retrieval_response.results):
                context_parts.append(f"[Source {i+1}] {result.content}")
                sources.append(SourceCitation(
                    document_id=result.document_id,
                    document_title=result.document_title,
                    content=result.content[:500] + "..." if len(result.content) > 500 else result.content,
                    score=result.score,
                    metadata=result.metadata,
                ))

            context = "\n\n".join(context_parts) if context_parts else "No relevant documents found."

            # Build prompt
            system_prompt = request.system_prompt or self.default_system_prompt
            user_prompt = f"""Context:
{context}

Question: {request.query}

Answer:"""

            # Stream response
            if request.conversation_history:
                messages = [{"role": "system", "content": system_prompt}]
                for msg in request.conversation_history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": user_prompt})

                async for chunk in ollama_service.chat(
                    messages=messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    top_p=request.top_p,
                    stream=True,
                ):
                    yield StreamChunk(type="content", content=chunk)
            else:
                prompt = f"{system_prompt}\n\n{user_prompt}"
                async for chunk in ollama_service.generate(
                    prompt=prompt,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    top_p=request.top_p,
                    stream=True,
                ):
                    yield StreamChunk(type="content", content=chunk)

            # Send sources at the end
            if request.include_sources and sources:
                yield StreamChunk(type="source", sources=sources)

            # Send done signal
            processing_time = (time.time() - start_time) * 1000
            yield StreamChunk(
                type="done",
                metadata={"processing_time_ms": processing_time, "model": settings.OLLAMA_LLM_MODEL}
            )

        except Exception as e:
            logger.error("Stream generation failed", error=str(e), query=request.query)
            yield StreamChunk(type="error", error=str(e))

    async def chat_with_context(
        self,
        conversation_history: List[Dict[str, str]],
        message: str,
        knowledge_base_id: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 0.9,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Chat with RAG context."""
        request = GenerationRequest(
            query=message,
            knowledge_base_id=knowledge_base_id,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
            stream=False,
            include_sources=True,
        )
        response = await self.generate(request)
        return {
            "answer": response.answer,
            "sources": [s.model_dump() for s in response.sources],
            "processing_time_ms": response.processing_time_ms,
        }


# Global service instance
rag_service = RAGService()