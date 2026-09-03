@echo off
REM RAG AI Platform - Windows Development Startup Script
REM Starts Backend and Frontend (assumes Ollama and ChromaDB are running)

setlocal enabledelayedexpansion

echo ======================================
echo   RAG AI Platform - Windows Startup
echo ======================================
echo.

REM Configuration
set BACKEND_PORT=8000
set FRONTEND_PORT=5176

REM Check Python
echo Checking prerequisites...
echo.

python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python not found. Please install Python 3.11+
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

echo [OK] Python found: %PYTHON_CMD%

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 20+
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

echo.
echo 1. Ollama Check
echo ======================================

curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [WARN] Ollama is not running.
    echo        Install from https://ollama.ai and run: ollama serve
    echo.
    set /p CONTINUE="Continue without Ollama? (y/N): "
    if /i not "%CONTINUE%"=="y" exit /b 1
) else (
    echo [OK] Ollama is running at http://localhost:11434
)

REM Check models
echo.
echo    Checking models...
for /f "delims=" %%a in ('curl -s http://localhost:11434/api/tags 2^>nul ^| findstr /r "llama3 nomic-embed-text"') do set MODEL_FOUND=%%a
if defined MODEL_FOUND (
    echo [OK] Required models found
) else (
    echo [WARN] Some models may be missing. Run:
    echo         ollama pull llama3:8b
    echo         ollama pull nomic-embed-text
)

echo.
echo 2. ChromaDB Check
echo ======================================

curl -s http://localhost:8000/api/v1/heartbeat >nul 2>&1
if errorlevel 1 (
    echo [WARN] ChromaDB is not running on port 8000.
    echo        Start with: chroma run --host 0.0.0.0 --port 8000
    echo        Or via Docker: docker run -d -p 8000:8000 chromadb/chroma
    echo.
) else (
    echo [OK] ChromaDB is running on port 8000
)

echo.
echo 3. Backend Setup
echo ======================================

cd backend

REM Create virtual environment if needed
if not exist venv (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Copy .env if needed
if not exist .env (
    copy .env.example .env >nul
    echo [OK] Created .env from template
)

REM Start backend
echo Starting backend on port %BACKEND_PORT%...
start "RAG Backend" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --reload"

cd ..

REM Wait for backend
echo Waiting for backend...
:wait_backend
timeout /t 2 >nul
curl -s http://localhost:%BACKEND_PORT%/ >nul 2>&1
if errorlevel 1 goto wait_backend
echo [OK] Backend is ready

echo.
echo 4. Frontend Setup
echo ======================================

cd frontend

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

REM Copy .env if needed
if not exist .env (
    copy .env.example .env >nul
    echo [OK] Created .env from template
)

REM Update frontend env for correct backend URL
echo VITE_API_URL=http://localhost:%BACKEND_PORT%/api/v1 > .env

REM Start frontend
echo Starting frontend on port %FRONTEND_PORT%...
start "RAG Frontend" cmd /k "npm run dev"

cd ..

echo.
echo ======================================
echo  RAG AI Platform is starting!
echo ======================================
echo.
echo  Frontend:     http://localhost:%FRONTEND_PORT%
echo  Backend API:  http://localhost:%BACKEND_PORT%/api/v1
echo  API Docs:     http://localhost:%BACKEND_PORT%/docs
echo.
echo  Close the console windows to stop services
echo.

pause
