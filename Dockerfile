FROM python:3.11-slim

WORKDIR /app

# Set environment flags
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APSE_HOST=0.0.0.0 \
    PORT=8765 \
    APSE_DATA_DIR=/app/data/runtime_store

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose default port
EXPOSE 8765

# Container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request, os; p=os.environ.get('PORT', '8765'); urllib.request.urlopen(f'http://127.0.0.1:{p}/apse-service/health')" || exit 1

# Run APSE server
CMD ["sh", "-c", "python run.py --host 0.0.0.0 --port ${PORT:-8765} --no-browser"]

