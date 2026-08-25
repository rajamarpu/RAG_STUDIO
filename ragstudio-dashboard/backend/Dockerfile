# Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Python path
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True)"

# Copy application code
COPY . .

# Create upload and temp directories
RUN mkdir -p /app/uploads /app/temp

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/system/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]