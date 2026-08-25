"""
Document processing service for extracting text from various file formats.
"""
import os
import uuid
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import structlog
from langchain_text_splitters import RecursiveCharacterTextSplitter
import tiktoken

from app.core.config import settings
from app.core.exceptions import DocumentProcessingError

logger = structlog.get_logger(__name__)


class DocumentProcessor:
    """Service for processing documents and extracting text chunks."""

    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.temp_dir = Path(settings.TEMP_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=self._token_length,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        # Initialize tokenizer for token counting
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = None

    def _token_length(self, text: str) -> int:
        """Calculate token length of text."""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        return len(text) // 4  # Rough approximation

    async def save_upload(
        self,
        file_content: bytes,
        filename: str,
        knowledge_base_id: str,
    ) -> Tuple[str, str, int]:
        """
        Save uploaded file to disk.

        Returns:
            Tuple of (file_path, file_id, file_size)
        """
        # Validate file size
        file_size = len(file_content)
        if file_size > settings.MAX_FILE_SIZE:
            raise DocumentProcessingError(
                f"File size {file_size} exceeds maximum {settings.MAX_FILE_SIZE}",
                details={"file_size": file_size, "max_size": settings.MAX_FILE_SIZE},
            )

        # Validate extension
        ext = Path(filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise DocumentProcessingError(
                f"File type {ext} not allowed",
                details={"extension": ext, "allowed": settings.ALLOWED_EXTENSIONS},
            )

        # Generate file ID and path
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}{ext}"
        kb_dir = self.upload_dir / knowledge_base_id
        kb_dir.mkdir(parents=True, exist_ok=True)
        file_path = kb_dir / safe_filename

        # Save file
        file_path.write_bytes(file_content)

        logger.info("File saved", file_id=file_id, filename=filename, size=file_size)
        return str(file_path), file_id, file_size

    async def extract_text(self, file_path: str, file_type: str) -> str:
        """Extract text from file based on type."""
        ext = Path(file_path).suffix.lower()

        try:
            if ext == ".pdf":
                return await self._extract_pdf(file_path)
            elif ext == ".txt":
                return await self._extract_text(file_path)
            elif ext == ".md":
                return await self._extract_markdown(file_path)
            elif ext == ".docx":
                return await self._extract_docx(file_path)
            elif ext in [".html", ".htm"]:
                return await self._extract_html(file_path)
            else:
                raise DocumentProcessingError(f"Unsupported file type: {ext}")
        except DocumentProcessingError:
            raise
        except Exception as e:
            logger.error("Text extraction failed", file_path=file_path, error=str(e))
            raise DocumentProcessingError(f"Failed to extract text: {str(e)}")

    async def _extract_pdf(self, file_path: str) -> str:
        """Extract text from PDF."""
        from pypdf import PdfReader

        reader = PdfReader(file_path)
        texts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                texts.append(text)
        return "\n\n".join(texts)

    async def _extract_text(self, file_path: str) -> str:
        """Extract text from plain text file."""
        return Path(file_path).read_text(encoding="utf-8", errors="ignore")

    async def _extract_markdown(self, file_path: str) -> str:
        """Extract text from Markdown file."""
        import markdown
        from bs4 import BeautifulSoup

        md_text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
        html = markdown.markdown(md_text)
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text(separator="\n\n")

    async def _extract_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        from docx import Document

        doc = Document(file_path)
        texts = []
        for para in doc.paragraphs:
            if para.text.strip():
                texts.append(para.text)
        return "\n\n".join(texts)

    async def _extract_html(self, file_path: str) -> str:
        """Extract text from HTML file."""
        from bs4 import BeautifulSoup

        html = Path(file_path).read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text(separator="\n\n")

    def chunk_text(
        self,
        text: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Split text into chunks.

        Returns:
            List of chunks with text, token count, and metadata
        """
        if chunk_size or chunk_overlap:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size or settings.CHUNK_SIZE,
                chunk_overlap=chunk_overlap or settings.CHUNK_OVERLAP,
                length_function=self._token_length,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
        else:
            splitter = self.text_splitter

        chunks = splitter.split_text(text)

        result = []
        for i, chunk in enumerate(chunks):
            result.append({
                "text": chunk,
                "token_count": self._token_length(chunk),
                "chunk_index": i,
                "metadata": {},
            })

        return result

    async def process_document(
        self,
        file_path: str,
        file_type: str,
        knowledge_base_id: str,
        document_id: str,
        title: str,
        metadata: Optional[Dict[str, Any]] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Process a document: extract text, chunk, and prepare for indexing.

        Returns:
            Dict with chunks, metadata, and stats
        """
        # Extract text
        text = await self.extract_text(file_path, file_type)

        if not text.strip():
            raise DocumentProcessingError("Document contains no extractable text")

        # Chunk text
        chunks = self.chunk_text(text, chunk_size, chunk_overlap)

        # Prepare chunk metadata
        base_metadata = {
            "document_id": document_id,
            "knowledge_base_id": knowledge_base_id,
            "title": title,
            "file_type": file_type,
            **(metadata or {}),
        }

        for chunk in chunks:
            chunk["metadata"] = {
                **base_metadata,
                "chunk_index": chunk["chunk_index"],
                "token_count": chunk["token_count"],
            }

        # Calculate stats
        total_tokens = sum(c["token_count"] for c in chunks)

        return {
            "document_id": document_id,
            "title": title,
            "full_text": text,
            "chunks": chunks,
            "chunk_count": len(chunks),
            "total_tokens": total_tokens,
            "file_type": file_type,
            "metadata": base_metadata,
        }

    def compute_file_hash(self, file_path: str) -> str:
        """Compute SHA256 hash of file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    async def delete_document_files(self, knowledge_base_id: str, file_id: str) -> bool:
        """Delete document files from disk."""
        try:
            kb_dir = self.upload_dir / knowledge_base_id
            for file_path in kb_dir.glob(f"{file_id}.*"):
                file_path.unlink()
            return True
        except Exception as e:
            logger.error("Failed to delete document files", error=str(e))
            return False


# Global service instance
document_processor = DocumentProcessor()