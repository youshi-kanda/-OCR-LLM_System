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

# Remove default nginx config
RUN rm -f /etc/nginx/sites-enabled/default

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Copy migration script
COPY backend/run_migrations.py ./

# Railway will set PORT dynamically
EXPOSE ${PORT:-80}

CMD ["./start.sh"]