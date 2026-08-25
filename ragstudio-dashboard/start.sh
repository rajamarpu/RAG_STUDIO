#!/bin/bash
# RAG AI Platform - Development Startup Script
# Starts Ollama (if needed), ChromaDB, Backend, and Frontend

set -e

echo "======================================"
echo "  RAG AI Platform - Startup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=5173
OLLAMA_URL="http://localhost:11434"

# Function to check if a port is in use
check_port() {
    nc -z localhost "$1" 2>/dev/null && return 0 || return 1
}

# Function to wait for a service
wait_for() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0

    echo -n "Waiting for $name"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404"; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗ Timeout${NC}"
    return 1
}

echo "Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check Python
PYTHON_CMD=""
if command -v python &> /dev/null; then
    PYTHON_CMD="python"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    echo -e "${RED}✗ Python not found. Please install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $($PYTHON_CMD --version)${NC}"

echo ""

# Check/start Ollama
echo "1. Ollama Setup"
if curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama is running at $OLLAMA_URL${NC}"
else
    echo -e "${YELLOW}⚠ Ollama is not running.${NC}"
    echo "  Install from https://ollama.ai and run: ollama serve"
    echo ""
    read -p "Continue without Ollama? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Check required models
echo ""
echo "   Checking models..."
MODELS=$(curl -s "$OLLAMA_URL/api/tags" 2>/dev/null | grep -o '"name":"[^"]*"' || echo "")

if echo "$MODELS" | grep -q "llama3"; then
    echo -e "   ${GREEN}✓ llama3 available${NC}"
else
    echo -e "   ${YELLOW}⚠ llama3 not found. Run: ollama pull llama3:8b${NC}"
fi

if echo "$MODELS" | grep -q "nomic-embed-text"; then
    echo -e "   ${GREEN}✓ nomic-embed-text available${NC}"
else
    echo -e "   ${YELLOW}⚠ nomic-embed-text not found. Run: ollama pull nomic-embed-text${NC}"
fi

# Check ChromaDB
echo ""
echo "2. ChromaDB Setup"
if check_port 8000 && curl -s "http://localhost:8000/api/v1/heartbeat" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ChromaDB is running on port 8000${NC}"
else
    echo -e "${YELLOW}⚠ ChromaDB is not running on port 8000.${NC}"
    echo "  Start with: chroma run --host 0.0.0.0 --port 8000"
    echo "  Or via Docker: docker run -d -p 8000:8000 chromadb/chroma"
    echo ""

    # Try to start ChromaDB with Docker
    if command -v docker &> /dev/null; then
        read -p "Start ChromaDB with Docker? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            docker run -d --name rag-chromadb -p 8000:8000 -v rag_chroma_data:/chroma/chroma chromadb/chroma
            wait_for "http://localhost:8000/api/v1/heartbeat" "ChromaDB"
        fi
    fi
fi

echo ""

# Setup and start Backend
echo "3. Backend Setup"
cd backend

# Create virtual environment if needed
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
echo "   Installing dependencies..."
pip install -r requirements.txt --quiet

# Copy .env if needed
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "   ${GREEN}✓ Created .env from template${NC}"
fi

# Start backend in background
echo -e "   ${GREEN}Starting backend on port $BACKEND_PORT...${NC}"
uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

cd ..

# Wait for backend
wait_for "http://localhost:$BACKEND_PORT/" "Backend API"

echo ""

# Setup and start Frontend
echo "4. Frontend Setup"
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi

# Copy .env if needed
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "   ${GREEN}✓ Created .env from template${NC}"
fi

# Update frontend env for correct backend URL
echo "VITE_API_URL=http://localhost:$BACKEND_PORT/api/v1" > .env

# Start frontend
echo -e "   ${GREEN}Starting frontend on port $FRONTEND_PORT...${NC}"
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "======================================"
echo -e "  ${GREEN}RAG AI Platform is starting!${NC}"
echo "======================================"
echo ""
echo -e "  Frontend:     ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend API:  ${GREEN}http://localhost:$BACKEND_PORT/api/v1${NC}"
echo -e "  API Docs:     ${GREEN}http://localhost:$BACKEND_PORT/docs${NC}"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C to kill all processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait