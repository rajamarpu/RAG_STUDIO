"""
ChromaDB vector store service.
"""
import asyncio
import uuid
from typing import List, Dict, Any, Optional, Tuple
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    chromadb = None
    ChromaSettings = None
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.core.exceptions import VectorStoreError
from app.services.ollama import ollama_service

logger = structlog.get_logger(__name__)


class VectorStoreService:
    """Service for interacting with ChromaDB vector store."""

    def __init__(self):
        self._client: Optional[chromadb.HttpClient] = None
        self._ephemeral_client: Optional[chromadb.EphemeralClient] = None
        self._collection = None
        self._use_ephemeral = False

    @property
    def client(self):
        """Get or create ChromaDB client - falls back to ephemeral for dev."""
        if chromadb is None:
            raise VectorStoreError("ChromaDB is not installed. Install backend requirements to enable vector search.")
        if self._use_ephemeral:
            if self._ephemeral_client is None:
                self._ephemeral_client = chromadb.EphemeralClient()
            return self._ephemeral_client

        if self._client is None:
            try:
                self._client = chromadb.HttpClient(
                    host=settings.CHROMA_HOST,
                    port=settings.CHROMA_PORT,
                    settings=ChromaSettings(
                        anonymized_telemetry=False,
                        allow_reset=True,
                    ),
                )
                # Test connection
                self._client.heartbeat()
            except Exception as e:
                logger.warning("ChromaDB HTTP client failed, falling back to ephemeral", error=str(e))
                self._use_ephemeral = True
                self._client = None
                return self.client
        return self._client

    def get_collection(self, collection_name: Optional[str] = None):
        """Get or create collection."""
        name = collection_name or settings.CHROMA_COLLECTION_NAME
        client = self.client
        if self._collection is None or self._collection.name != name:
            self._collection = client.get_or_create_collection(
                name=name,
                metadata={
                    "hnsw:space": settings.CHROMA_HNSW_SPACE,
                    "hnsw:construction_ef": settings.CHROMA_HNSW_EF_CONSTRUCTION,
                    "hnsw:M": settings.CHROMA_HNSW_M,
                },
            )
        return self._collection

    async def health_check(self) -> Dict[str, Any]:
        """Check ChromaDB service health."""
        if chromadb is None:
            return {
                "status": "unavailable",
                "error": "ChromaDB dependency is not installed",
            }
        try:
            # Test connection
            client = self.client
            collections = client.list_collections()
            collection = self.get_collection()
            count = collection.count()
            mode = "ephemeral" if self._use_ephemeral else "http"
            return {
                "status": "healthy",
                "mode": mode,
                "collections": len(collections),
                "default_collection_count": count,
            }
        except Exception as e:
            logger.error("ChromaDB health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "error": str(e),
            }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception),
    )
    async def add_documents(
        self,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: Optional[List[str]] = None,
        collection_name: Optional[str] = None,
    ) -> List[str]:
        """Add documents to vector store."""
        if not documents:
            return []

        collection = self.get_collection(collection_name)

        # Generate embeddings
        embeddings = await ollama_service.generate_embeddings(documents)

        # Generate IDs if not provided
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]

        # Add to collection
        collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )

        logger.info("Documents added to vector store", count=len(documents), collection=collection.name)
        return ids

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception),
    )
    async def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Query vector store for similar documents."""
        collection = self.get_collection(collection_name)

        # Generate query embedding
        query_embedding = await ollama_service.generate_embeddings([query_text])
        query_embedding = query_embedding[0]

        # Query collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            where_document=where_document,
            include=["documents", "metadatas", "distances"],
        )

        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception),
    )
    async def query_by_embedding(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Query vector store with pre-computed embedding."""
        collection = self.get_collection(collection_name)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            where_document=where_document,
            include=["documents", "metadatas", "distances"],
        )

        return results

    async def get_document(
        self,
        document_id: str,
        collection_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get a document by ID."""
        collection = self.get_collection(collection_name)
        results = collection.get(ids=[document_id], include=["documents", "metadatas"])
        if results["ids"]:
            return {
                "id": results["ids"][0],
                "document": results["documents"][0],
                "metadata": results["metadatas"][0],
            }
        return None

    async def delete_documents(
        self,
        ids: List[str],
        collection_name: Optional[str] = None,
    ) -> bool:
        """Delete documents by IDs."""
        if not ids:
            return True

        collection = self.get_collection(collection_name)
        collection.delete(ids=ids)
        logger.info("Documents deleted", count=len(ids))
        return True

    async def delete_by_metadata(
        self,
        where: Dict[str, Any],
        collection_name: Optional[str] = None,
    ) -> int:
        """Delete documents matching metadata filter."""
        collection = self.get_collection(collection_name)
        results = collection.get(where=where, include=["metadatas"])
        if results["ids"]:
            collection.delete(ids=results["ids"])
            logger.info("Documents deleted by metadata", count=len(results["ids"]))
            return len(results["ids"])
        return 0

    async def update_document(
        self,
        document_id: str,
        document: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None,
    ) -> bool:
        """Update a document."""
        collection = self.get_collection(collection_name)

        # Get existing
        existing = await self.get_document(document_id, collection_name)
        if not existing:
            return False

        # Prepare update
        new_document = document if document is not None else existing["document"]
        new_metadata = metadata if metadata is not None else existing["metadata"]

        # Generate new embedding if document changed
        if document is not None:
            embedding = await ollama_service.generate_embeddings([new_document])
            collection.update(
                ids=[document_id],
                embeddings=embedding,
                documents=[new_document],
                metadatas=[new_metadata],
            )
        else:
            collection.update(
                ids=[document_id],
                metadatas=[new_metadata],
            )

        return True

    async def get_collection_stats(self, collection_name: Optional[str] = None) -> Dict[str, Any]:
        """Get collection statistics."""
        collection = self.get_collection(collection_name)
        count = collection.count()

        # Sample some documents to get embedding dimension
        sample = collection.peek(limit=1)
        embedding_dim = len(sample["embeddings"][0]) if sample["embeddings"] else 0

        return {
            "name": collection.name,
            "count": count,
            "embedding_dimension": embedding_dim,
            "metadata": collection.metadata,
        }

    async def reset_collection(self, collection_name: Optional[str] = None) -> bool:
        """Reset (delete and recreate) a collection."""
        name = collection_name or settings.CHROMA_COLLECTION_NAME
        try:
            self.client.delete_collection(name)
        except Exception:
            pass  # Collection might not exist

        self._collection = self.client.create_collection(
            name=name,
            metadata={
                "hnsw:space": settings.CHROMA_HNSW_SPACE,
                "hnsw:construction_ef": settings.CHROMA_HNSW_EF_CONSTRUCTION,
                "hnsw:M": settings.CHROMA_HNSW_M,
            },
        )
        logger.info("Collection reset", collection=name)
        return True

    async def list_collections(self) -> List[Dict[str, Any]]:
        """List all collections."""
        collections = self.client.list_collections()
        result = []
        for col in collections:
            stats = await self.get_collection_stats(col.name)
            result.append(stats)
        return result


# Global service instance
vector_store_service = VectorStoreService()