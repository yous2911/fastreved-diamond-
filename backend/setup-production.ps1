# 🚀 RevEd Kids Production Setup Script

Write-Host "🚀 Starting RevEd Kids Production Setup..." -ForegroundColor Blue

# Generate secure secrets
$JWT_SECRET = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$ENCRYPTION_KEY = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$MYSQL_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 25 | ForEach-Object {[char]$_})
$REDIS_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 25 | ForEach-Object {[char]$_})

Write-Host "✅ Generated secure passwords" -ForegroundColor Green

# Create production environment file
$envContent = @"
# RevEd Kids Production Environment
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=reved_user
DB_PASSWORD=$MYSQL_PASSWORD
DB_NAME=reved_kids
DB_CONNECTION_LIMIT=50

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_DB=0
REDIS_ENABLED=true

# Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Rate Limiting
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=900000

# CORS
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8
Write-Host "✅ Created .env.production" -ForegroundColor Green

# Create Docker Compose file
$dockerContent = @"
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PASSWORD=$MYSQL_PASSWORD
      - REDIS_PASSWORD=$REDIS_PASSWORD
      - JWT_SECRET=$JWT_SECRET
      - ENCRYPTION_KEY=$ENCRYPTION_KEY
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: reved_kids
      MYSQL_USER: reved_user
      MYSQL_PASSWORD: $MYSQL_PASSWORD
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass $REDIS_PASSWORD
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
"@

$dockerContent | Out-File -FilePath "docker-compose.prod.yml" -Encoding UTF8
Write-Host "✅ Created docker-compose.prod.yml" -ForegroundColor Green

# Create SSL directory
if (!(Test-Path "nginx/ssl")) {
    New-Item -ItemType Directory -Path "nginx/ssl" -Force
    Write-Host "✅ Created nginx/ssl directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Production Setup Complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Docker Desktop" -ForegroundColor Yellow
Write-Host "2. Run: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Yellow 