#!/bin/bash

# RevEd Kids Backend - Environment Setup Script
echo "🔐 RevEd Kids Backend - Environment Setup"
echo "=========================================="

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Generate secure secrets
echo "🔑 Generating secure secrets..."
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
# Environment Variables for RevEd Kids Backend
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=reved_user
DB_PASSWORD=your_secure_password_here
DB_NAME=reved_kids
DB_CONNECTION_LIMIT=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true

# Security (Generated automatically - KEEP THESE SECRET!)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Monitoring
ENABLE_METRICS=true
METRICS_INTERVAL=60000

# Cache
CACHE_TTL=900
CACHE_MAX_SIZE=1000

# Performance
REQUEST_TIMEOUT=30000
BODY_LIMIT=10485760

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=1000
EOF

echo "✅ .env file created successfully!"
echo ""
echo "🔒 IMPORTANT SECURITY NOTES:"
echo "   - Your JWT_SECRET and ENCRYPTION_KEY have been generated automatically"
echo "   - These are unique to your installation - DO NOT SHARE THEM"
echo "   - The .env file is already in .gitignore and will not be committed"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Update DB_PASSWORD with your actual database password"
echo "   2. Update DB_USER if different from 'reved_user'"
echo "   3. Run: npm install"
echo "   4. Run: npm run db:migrate"
echo "   5. Run: npm run dev"
echo ""
echo "🚀 Happy coding!" 