# Multi-stage build for Railway deployment
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

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

# Create startup script
RUN echo '#!/bin/bash\n\
# Start nginx in background\n\
nginx &\n\
\n\
# Run database migrations if needed\n\
python -c "import os; print(os.getenv('"'"'DATABASE_URL'"'"', '"'"'Not set'"'"'))" \n\
\n\
# Start FastAPI\n\
exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1' > start.sh && chmod +x start.sh

EXPOSE $PORT

CMD ["./start.sh"]