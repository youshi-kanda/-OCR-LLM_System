# Multi-stage build for Railway deployment
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-jpn \
    nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./static

# Copy nginx config
COPY nginx.conf /etc/nginx/sites-available/default

# Create startup script with database readiness check
RUN echo '#!/bin/bash\n\
# Start nginx in background\n\
nginx &\n\
\n\
# Display environment variables for debugging\n\
echo "DATABASE_URL: ${DATABASE_URL}"\n\
echo "PORT: ${PORT}"\n\
\n\
# Function to check database connectivity\n\
check_db() {\n\
    python -c "import asyncio; import asyncpg; import os; import sys; \n\
async def test_conn():\n\
    try:\n\
        conn = await asyncpg.connect(os.getenv('"'"'DATABASE_URL'"'"'));\n\
        await conn.execute('"'"'SELECT 1'"'"');\n\
        await conn.close();\n\
        print('"'"'Database connection successful'"'"');\n\
        return True;\n\
    except Exception as e:\n\
        print(f'"'"'Database connection failed: {e}'"'"');\n\
        return False;\n\
loop = asyncio.new_event_loop();\n\
result = loop.run_until_complete(test_conn());\n\
sys.exit(0 if result else 1)"\n\
}\n\
\n\
# Wait for database to be ready (max 30 seconds)\n\
echo "Waiting for database to be ready..."\n\
for i in {1..30}; do\n\
    if check_db; then\n\
        echo "Database is ready!"\n\
        break\n\
    fi\n\
    echo "Database not ready, waiting... (attempt $i/30)"\n\
    sleep 2\n\
done\n\
\n\
# Run database migrations\n\
echo "Running database migrations..."\n\
python run_migrations.py\n\
\n\
# Start FastAPI\n\
echo "Starting FastAPI server..."\n\
exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1' > start.sh && chmod +x start.sh

EXPOSE $PORT

CMD ["./start.sh"]