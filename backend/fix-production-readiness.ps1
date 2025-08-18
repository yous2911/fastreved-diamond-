# 🚀 RevEd Kids Production Readiness Fix Script (PowerShell)
# This script addresses all critical production issues

Write-Host "🚀 Starting RevEd Kids Production Fixes..." -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# 1. Generate secure secrets
Write-Host ""
Write-Info "Step 1: Generating secure secrets..."

# Generate JWT Secret (64 characters)
$JWT_SECRET = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Status "Generated JWT_SECRET: $($JWT_SECRET.Substring(0,16))..."

# Generate Encryption Key (64 characters)
$ENCRYPTION_KEY = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Status "Generated ENCRYPTION_KEY: $($ENCRYPTION_KEY.Substring(0,16))..."

# Generate MySQL Root Password
$MYSQL_ROOT_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 25 | ForEach-Object {[char]$_})
Write-Status "Generated MYSQL_ROOT_PASSWORD: $($MYSQL_ROOT_PASSWORD.Substring(0,8))..."

# Generate MySQL User Password
$MYSQL_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 25 | ForEach-Object {[char]$_})
Write-Status "Generated MYSQL_PASSWORD: $($MYSQL_PASSWORD.Substring(0,8))..."

# Generate Redis Password
$REDIS_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 25 | ForEach-Object {[char]$_})
Write-Status "Generated REDIS_PASSWORD: $($REDIS_PASSWORD.Substring(0,8))..."

# 2. Create production environment file
Write-Host ""
Write-Info "Step 2: Creating production environment files..."

$envContent = @"
# RevEd Kids Production Environment Configuration
# Generated on $(Get-Date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_USER=reved_user
DB_PASSWORD=$MYSQL_PASSWORD
DB_NAME=reved_kids
DB_CONNECTION_LIMIT=50

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_DB=0
REDIS_ENABLED=true

# Security (CRITICAL - Change these in production)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Rate Limiting
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=900000

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH=/app/uploads

# Monitoring
ENABLE_METRICS=true
METRICS_INTERVAL=30000

# Cache
CACHE_TTL=1800
CACHE_MAX_SIZE=5000

# Performance
REQUEST_TIMEOUT=60000
BODY_LIMIT=52428800

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=2000
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8
Write-Status "Created .env.production file"

# 3. Create secure Docker Compose file
Write-Host ""
Write-Info "Step 3: Creating secure Docker Compose files..."

$dockerComposeContent = @"
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=reved_user
      - DB_PASSWORD=$MYSQL_PASSWORD
      - DB_NAME=reved_kids
      - DB_CONNECTION_LIMIT=50
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=$REDIS_PASSWORD
      - JWT_SECRET=$JWT_SECRET
      - ENCRYPTION_KEY=$ENCRYPTION_KEY
      - CORS_ORIGIN=https://yourdomain.com
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    restart: unless-stopped
    networks:
      - reved-kids
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: $MYSQL_ROOT_PASSWORD
      MYSQL_DATABASE: reved_kids
      MYSQL_USER: reved_user
      MYSQL_PASSWORD: $MYSQL_PASSWORD
      MYSQL_ROOT_HOST: "%"
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - reved-kids
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$MYSQL_ROOT_PASSWORD"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass $REDIS_PASSWORD
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - reved-kids
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  mysql_data:
  redis_data:
  uploads:
  logs:

networks:
  reved-kids:
    driver: bridge
"@

$dockerComposeContent | Out-File -FilePath "docker-compose.prod.yml" -Encoding UTF8
Write-Status "Created docker-compose.prod.yml file"

# 4. Create Nginx configuration
Write-Host ""
Write-Info "Step 4: Creating Nginx configuration..."

if (!(Test-Path "nginx")) {
    New-Item -ItemType Directory -Path "nginx"
}

$nginxContent = @"
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://`$server_name`$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # API Proxy
    location /api/ {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health Check
    location /health {
        proxy_pass http://app:3000/api/health;
        access_log off;
    }

    # Static Files (if serving frontend)
    location / {
        root /var/www/html;
        try_files `$uri `$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
"@

$nginxContent | Out-File -FilePath "nginx/nginx.conf" -Encoding UTF8
Write-Status "Created nginx/nginx.conf file"

# 5. Create SSL directory and self-signed certificate
Write-Host ""
Write-Info "Step 5: Creating SSL directory and self-signed certificate..."

if (!(Test-Path "nginx/ssl")) {
    New-Item -ItemType Directory -Path "nginx/ssl"
}

# Create self-signed certificate (for development)
$sslCommand = "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem -subj '/CN=localhost'"
try {
    Invoke-Expression $sslCommand
    Write-Status "Created self-signed SSL certificate"
} catch {
    Write-Warning "Could not create SSL certificate. You'll need to add your own certificates to nginx/ssl/"
}

# 6. Create MySQL production configuration
Write-Host ""
Write-Info "Step 6: Creating MySQL production configuration..."

$mysqlConfigContent = @"
[mysqld]
# Performance Settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Connection Settings
max_connections = 200
max_connect_errors = 1000000
wait_timeout = 28800
interactive_timeout = 28800

# Query Cache
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Security
local_infile = 0
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO
"@

$mysqlConfigContent | Out-File -FilePath "scripts/mysql-prod.cnf" -Encoding UTF8
Write-Status "Created scripts/mysql-prod.cnf file"

# 7. Create Redis configuration
Write-Host ""
Write-Info "Step 7: Creating Redis configuration..."

$redisConfigContent = @"
# Redis Production Configuration
bind 0.0.0.0
port 6379
requirepass $REDIS_PASSWORD

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Memory Management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security
protected-mode yes
tcp-keepalive 300
"@

$redisConfigContent | Out-File -FilePath "scripts/redis.conf" -Encoding UTF8
Write-Status "Created scripts/redis.conf file"

# 8. Create deployment script
Write-Host ""
Write-Info "Step 8: Creating deployment script..."

$deployScriptContent = @"
#!/bin/bash
# RevEd Kids Production Deployment Script

echo "🚀 Deploying RevEd Kids to production..."

# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Build new images
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🔍 Running health checks..."
if curl -f http://localhost:3000/api/health; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi
"@

$deployScriptContent | Out-File -FilePath "scripts/deploy-production.sh" -Encoding UTF8
Write-Status "Created scripts/deploy-production.sh file"

# 9. Create monitoring script
Write-Host ""
Write-Info "Step 9: Creating monitoring script..."

$monitorScriptContent = @"
#!/bin/bash
# RevEd Kids Production Monitoring Script

echo "📊 Monitoring RevEd Kids production environment..."

# Check Docker services
echo "🐳 Docker Services:"
docker-compose -f docker-compose.prod.yml ps

# Check application health
echo "🏥 Application Health:"
curl -s http://localhost:3000/api/health | jq .

# Check database
echo "🗄️ Database Status:"
docker-compose -f docker-compose.prod.yml exec mysql mysqladmin ping -h localhost -u root -p

# Check Redis
echo "🔴 Redis Status:"
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# System resources
echo "💻 System Resources:"
docker stats --no-stream
"@

$monitorScriptContent | Out-File -FilePath "scripts/monitor-production.sh" -Encoding UTF8
Write-Status "Created scripts/monitor-production.sh file"

# 10. Create backup script
Write-Host ""
Write-Info "Step 10: Creating backup script..."

$backupScriptContent = @"
#!/bin/bash
# RevEd Kids Database Backup Script

BACKUP_DIR="./backups"
DATE=`date +%Y%m%d_%H%M%S`
BACKUP_FILE="reved_kids_backup_`$DATE.sql"

echo "💾 Creating database backup..."

# Create backup directory
mkdir -p `$BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p reved_kids > `$BACKUP_DIR/`$BACKUP_FILE

echo "✅ Backup created: `$BACKUP_DIR/`$BACKUP_FILE"

# Keep only last 7 backups
find `$BACKUP_DIR -name "reved_kids_backup_*.sql" -mtime +7 -delete
"@

$backupScriptContent | Out-File -FilePath "scripts/backup.sh" -Encoding UTF8
Write-Status "Created scripts/backup.sh file"

# Summary
Write-Host ""
Write-Host "🎉 Production Readiness Setup Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Generated secure passwords and secrets" -ForegroundColor Green
Write-Host "✅ Created production environment files" -ForegroundColor Green
Write-Host "✅ Created Docker Compose configuration" -ForegroundColor Green
Write-Host "✅ Created Nginx reverse proxy setup" -ForegroundColor Green
Write-Host "✅ Created MySQL and Redis configs" -ForegroundColor Green
Write-Host "✅ Created deployment and monitoring scripts" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Install Docker Desktop (if not already installed)" -ForegroundColor Yellow
Write-Host "2. Update domain names in nginx/nginx.conf" -ForegroundColor Yellow
Write-Host "3. Add SSL certificates to nginx/ssl/" -ForegroundColor Yellow
Write-Host "4. Run: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 Security Note: Change default passwords in production!" -ForegroundColor Red 