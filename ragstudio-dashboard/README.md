# RAG AI Platform

A premium, enterprise-grade 3D RAG (Retrieval-Augmented Generation) AI Platform with real-time visualizations, NYC-inspired theming, and full-stack local LLM support via Ollama.

## Features

### 🎨 Premium UI/UX
- **Three Themes**: Light, Dark, and NYC (city-inspired) with animated 400ms transitions
- **3D Visualizations**: Real-time RAG pipeline, vector space, knowledge graphs, and particle fields
- **Global Command Palette**: Ctrl+K for instant navigation
- **Animated Sidebar**: Collapsible with smooth transitions
- **Page Transitions**: Framer Motion powered transitions
- **Full Accessibility**: WCAG 2.1 AA, prefers-reduced-motion, keyboard navigation

### 🧠 RAG Pipeline
- **Document Processing**: PDF, TXT, MD, DOCX, HTML support with intelligent chunking
- **Vector Storage**: ChromaDB with HNSW indexing
- **Embeddings**: Local via Ollama (nomic-embed-text, mxbai-embed-large, etc.)
- **LLM Inference**: Local via Ollama (Llama 3, Mistral, Code Llama, Phi-3, etc.)
- **Real-time Streaming**: SSE for live generation updates
- **Source Citations**: Automatic citation tracking

### 📊 Enterprise Features
- **Knowledge Base Management**: Multi-tenant KB support with custom settings
- **Conversational Chat**: Multi-turn conversations with context
- **Evaluation Suite**: Automated RAG evaluation with metrics
- **Analytics Dashboard**: Query, usage, and performance analytics
- **Settings Management**: Full configuration via UI

### ⚡ Performance
- **WebGL Detection**: Graceful fallback to 2D Canvas
- **LOD System**: Adaptive quality based on device capabilities
- **Performance Monitoring**: Real-time FPS and memory tracking
- **Lazy Loading**: Code-split pages and components

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Three.js** / **React Three Fiber** / **Drei** for 3D
- **Framer Motion** for animations
- **Zustand** for state management
- **Tailwind CSS** with CSS custom properties for theming
- **React Router v6** for routing

### Backend
- **FastAPI** (Python 3.11+)
- **Ollama** for local LLM/embeddings
- **ChromaDB** for vector storage
- **Redis** for caching (optional)
- **Structlog** for structured logging
- **Pydantic v2** for validation

### Infrastructure
- **Docker Compose** for local development
- **Nginx** for production frontend serving
- **Prometheus** metrics endpoint (optional)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- OR: Node.js 20+, Python 3.11+, Ollama, ChromaDB

### Using Docker (Recommended)

```bash
# Clone and navigate
cd RAG

# Start all services
docker-compose up -d

# Pull required models (run once)
docker-compose exec ollama ollama pull llama3:8b
docker-compose exec ollama ollama pull nomic-embed-text

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8001/api/v1
# API Docs: http://localhost:8001/docs
```

### Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start services (Ollama, ChromaDB, Redis)
# See docker-compose.yml for service definitions

# Run backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API URL

# Run development server
npm run dev
```

## Project Structure

```
ragstudio-dashboard/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # Base components (Button, Input, Card, etc.)
│   │   │   ├── 3d/         # 3D visualization components
│   │   │   ├── layout/     # Layout components (Sidebar, TopNav, etc.)
│   │   │   └── feedback/   # Toast, Modal, Loading
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── themes/         # Theme system
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utilities
│   ├── public/             # Static assets
│   └── ...
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/routes/     # API route handlers
│   │   ├── core/           # Core config, logging, exceptions
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic services
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt
│   └── ...
├── client/                   # Dashboard client (React 19 + Tailwind v4)
├── server/                   # Dashboard Express server
├── shared/                   # Shared code between dashboard client/server
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Documents
- `POST /api/v1/documents/upload` - Upload document
- `GET /api/v1/documents` - List documents
- `GET /api/v1/documents/{id}` - Get document
- `PATCH /api/v1/documents/{id}` - Update document
- `DELETE /api/v1/documents/{id}` - Delete document
- `POST /api/v1/documents/{id}/reprocess` - Reprocess document

### Knowledge Bases
- `POST /api/v1/knowledge-bases` - Create KB
- `GET /api/v1/knowledge-bases` - List KBs
- `GET /api/v1/knowledge-bases/{id}` - Get KB
- `PATCH /api/v1/knowledge-bases/{id}` - Update KB
- `DELETE /api/v1/knowledge-bases/{id}` - Delete KB
- `POST /api/v1/knowledge-bases/{id}/reindex` - Reindex KB

### Query & Retrieval
- `POST /api/v1/query/retrieve` - Retrieve documents
- `POST /api/v1/query/generate` - Generate answer
- `POST /api/v1/query/stream` - Stream generation (SSE)

### Chat
- `POST /api/v1/chat/conversations` - Create conversation
- `GET /api/v1/chat/conversations` - List conversations
- `GET /api/v1/chat/conversations/{id}` - Get conversation
- `POST /api/v1/chat/conversations/{id}/messages` - Send message
- `POST /api/v1/chat/conversations/{id}/messages/stream` - Stream message

### Evaluations
- `POST /api/v1/evaluations` - Create evaluation
- `GET /api/v1/evaluations` - List evaluations
- `POST /api/v1/evaluations/{id}/run` - Run evaluation
- `GET /api/v1/evaluations/{id}/runs` - List runs

### Analytics
- `GET /api/v1/analytics/queries` - Query analytics
- `GET /api/v1/analytics/usage` - Usage analytics
- `GET /api/v1/analytics/performance` - Performance analytics
- `GET /api/v1/analytics/overview` - Combined overview

### System
- `GET /api/v1/system/health` - Health check
- `GET /api/v1/system/stats` - System stats
- `GET /api/v1/system/settings` - Get settings

## Configuration

### Environment Variables

Key backend settings (see `.env.example`):

```env
# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=llama3:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# API
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

Frontend settings (`.env`):

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
```

## Adding Models

```bash
# Pull models via Ollama
ollama pull llama3:8b
ollama pull llama3:70b
ollama pull mistral:7b
ollama pull codellama:7b
ollama pull phi3:mini
ollama pull nomic-embed-text
ollama pull mxbai-embed-large
ollama pull all-minilm
ollama pull bge-small
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend (Docker)
docker build -t rag-backend ./backend

# Full stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Accessibility

The platform follows WCAG 2.1 AA guidelines:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Reduced motion support
- Color contrast compliance
- Screen reader compatible

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Support

For issues and questions, please open a GitHub issue.