#!/bin/bash

# Railway provides PORT environment variable (defaults to 8080)
PORT=${PORT:-8080}
echo "Starting application with PORT=$PORT"

# Debug: Check environment variables
echo "DATABASE_URL is set: ${DATABASE_URL:+YES}"
echo "DATABASE_URL length: ${#DATABASE_URL}"

# Check static files
echo "Checking static files..."
ls -la /app/static/

# Run database migrations
echo "Running database migrations..."
python run_migrations.py

# Start FastAPI in background on a different internal port
echo "Starting FastAPI server on port 8001..."
uvicorn main:app --host 0.0.0.0 --port 8001 &
FASTAPI_PID=$!
echo "FastAPI started with PID: $FASTAPI_PID"

# Wait for FastAPI to be ready
sleep 3

# Configure nginx to listen on Railway's PORT
if [ -z "$PORT" ]; then
    PORT=80
fi

echo "Configuring nginx to listen on port $PORT..."

# Create nginx config dynamically with Railway's PORT
cat > /etc/nginx/sites-enabled/default <<EOF
server {
    listen $PORT default_server;
    server_name _;
    client_max_body_size 100M;

    # Serve static files from React build
    location / {
        root /app/static;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        add_header X-Served-By "nginx-static";
    }

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Direct endpoints
    location ~ ^/(upload|history|results)/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8001/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Test nginx configuration
nginx -t

# Start nginx in foreground
echo "Starting nginx on port $PORT..."
exec nginx -g "daemon off;"