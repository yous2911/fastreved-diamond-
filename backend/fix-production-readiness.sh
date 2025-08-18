#!/bin/bash

# 🚀 RevEd Kids Production Readiness Fix Script
# This script addresses all critical production issues

set -e  # Exit on any error

echo "🚀 Starting RevEd Kids Production Fixes..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Generate secure secrets
echo ""
print_info "Step 1: Generating secure secrets..."

# Generate JWT Secret (64 characters)
JWT_SECRET=$(openssl rand -hex 32)
print_status "Generated JWT_SECRET: ${JWT_SECRET:0:16}..."

# Generate Encryption Key (64 characters)
ENCRYPTION_KEY=$(openssl rand -hex 32)
print_status "Generated ENCRYPTION_KEY: ${ENCRYPTION_KEY:0:16}..."

# Generate MySQL Root Password
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
print_status "Generated MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:0:8}..."

# Generate MySQL User Password
MYSQL_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
print_status "Generated MYSQL_PASSWORD: ${MYSQL_PASSWORD:0:8}..."

# Generate Redis Password
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
print_status "Generated REDIS_PASSWORD: ${REDIS_PASSWORD:0:8}..."

# 2. Create production environment file
echo ""
print_info "Step 2: Creating production environment files..."

cat > .env.production << EOF
# RevEd Kids Production Environment Configuration
# Generated on $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_USER=reved_user
DB_PASSWORD=${MYSQL_PASSWORD}
DB_NAME=reved_kids
DB_CONNECTION_LIMIT=50

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0
REDIS_ENABLED=true

# Security (CRITICAL - Change these in production)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=${ENCRYPTION_KEY}

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
EOF

print_status "Created .env.production file"

# 3. Update docker-compose with secure passwords
echo ""
print_info "Step 3: Creating secure Docker Compose files..."

cat > docker-compose.prod.yml << EOF
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
      - DB_PASSWORD=${MYSQL_PASSWORD}
      - DB_NAME=reved_kids
      - DB_CONNECTION_LIMIT=50
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
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
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: reved_kids
      MYSQL_USER: reved_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_HOST: "%"
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
      - ./scripts/mysql-prod.cnf:/etc/mysql/conf.d/prod.cnf
    restart: unless-stopped
    networks:
      - reved-kids
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./scripts/redis.conf:/usr/local/etc/redis/redis.conf
    restart: unless-stopped
    networks:
      - reved-kids
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/ssl/certs:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - reved-kids

volumes:
  mysql_data:
  redis_data:
  uploads:
  logs:
  nginx_logs:

networks:
  reved-kids:
    driver: bridge
EOF

print_status "Created docker-compose.prod.yml with secure configuration"

# 4. Create MySQL production configuration
echo ""
print_info "Step 4: Creating database optimization files..."

mkdir -p scripts

cat > scripts/mysql-prod.cnf << EOF
[mysqld]
# Production MySQL Configuration for RevEd Kids

# Connection Settings
max_connections = 200
connect_timeout = 60
wait_timeout = 28800
interactive_timeout = 28800

# Buffer Settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_log_buffer_size = 32M
innodb_flush_log_at_trx_commit = 2

# Query Cache
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M

# Slow Query Log
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/slow-query.log
long_query_time = 2

# Security
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO

# Character Set
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci

# Binary Logging
log_bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 100M
EOF

print_status "Created MySQL production configuration"

# 5. Create Redis production configuration
cat > scripts/redis.conf << EOF
# Redis Production Configuration for RevEd Kids

# Network
bind 0.0.0.0
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Memory Management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb

# AOF
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Security
requirepass ${REDIS_PASSWORD}

# Logging
loglevel notice
logfile ""

# Performance
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
EOF

print_status "Created Redis production configuration"

# 6. Create Nginx configuration
echo ""
print_info "Step 5: Creating Nginx reverse proxy configuration..."

mkdir -p nginx

cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://\$server_name\$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration (update paths to your SSL certificates)
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_session_cache shared:SSL:1m;
        ssl_session_timeout 10m;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }

        # Login endpoint with stricter rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # WebSocket support
        location /ws {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Health check
        location /health {
            proxy_pass http://app/api/health;
            access_log off;
        }

        # Docs
        location /docs {
            proxy_pass http://app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

print_status "Created Nginx configuration with SSL and security headers"

# 7. Create deployment scripts
echo ""
print_info "Step 6: Creating deployment and management scripts..."

cat > deploy-production.sh << EOF
#!/bin/bash
# Production Deployment Script for RevEd Kids

set -e

echo "🚀 Deploying RevEd Kids to Production..."

# Build and start services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Run health checks
echo "🔍 Running health checks..."
curl -f http://localhost:3000/api/health || exit 1

echo "✅ Production deployment completed successfully!"
echo "📊 Access API documentation at: https://yourdomain.com/docs"
echo "💾 Monitor logs with: docker-compose -f docker-compose.prod.yml logs -f"
EOF

chmod +x deploy-production.sh
print_status "Created deployment script"

cat > backup-database.sh << EOF
#!/bin/bash
# Database Backup Script for RevEd Kids

BACKUP_DIR="./backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="reved_kids_backup_\${DATE}.sql"

mkdir -p \$BACKUP_DIR

echo "📦 Creating database backup..."
docker-compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} reved_kids > "\$BACKUP_DIR/\$BACKUP_FILE"

echo "✅ Backup created: \$BACKUP_DIR/\$BACKUP_FILE"

# Keep only last 7 backups
ls -t \$BACKUP_DIR/reved_kids_backup_*.sql | tail -n +8 | xargs -r rm

echo "🧹 Old backups cleaned up"
EOF

chmod +x backup-database.sh
print_status "Created backup script"

# 8. Create monitoring script
cat > monitor-production.sh << EOF
#!/bin/bash
# Production Monitoring Script for RevEd Kids

echo "📊 RevEd Kids Production Status"
echo "================================"

# Service status
echo "🐳 Docker Services:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "💾 Database Status:"
curl -s http://localhost:3000/api/monitoring/health | jq '.data.database' || echo "Unable to connect"

echo ""
echo "🔄 Redis Status:"
curl -s http://localhost:3000/api/monitoring/cache | jq '.data.status' || echo "Unable to connect"

echo ""
echo "📈 System Metrics:"
curl -s http://localhost:3000/api/monitoring/metrics | jq '.data' || echo "Unable to connect"

echo ""
echo "🔍 Recent Logs (last 20 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=20 app
EOF

chmod +x monitor-production.sh
print_status "Created monitoring script"

# 9. Update .gitignore
echo ""
print_info "Step 7: Updating .gitignore for security..."

cat >> .gitignore << EOF

# Production Environment Files
.env.production
.env.staging
.env.local

# Production Secrets
secrets/
*.pem
*.key
*.crt

# Backup Files
backups/
*.sql
*.dump

# Logs
logs/
*.log

# SSL Certificates
ssl/
certs/
EOF

print_status "Updated .gitignore with security exclusions"

# 10. Create SSL certificate placeholder
mkdir -p nginx/ssl
cat > nginx/ssl/README.md << EOF
# SSL Certificates

Place your SSL certificates in this directory:

- \`fullchain.pem\` - Your SSL certificate chain
- \`privkey.pem\` - Your private key

## Getting SSL Certificates

### Option 1: Let's Encrypt (Recommended)
\`\`\`bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/
\`\`\`

### Option 2: Self-signed (Development only)
\`\`\`bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
  -keyout ./nginx/ssl/privkey.pem \\
  -out ./nginx/ssl/fullchain.pem \\
  -subj "/CN=localhost"
\`\`\`

## Security Note
Never commit SSL certificates to version control!
EOF

print_status "Created SSL certificate directory with instructions"

# 11. Save secrets securely
echo ""
print_info "Step 8: Saving generated secrets..."

cat > .env.secrets << EOF
# 🔐 GENERATED SECRETS - KEEP SECURE!
# Generated on $(date)
# Store these in your password manager

JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
EOF

print_status "Saved all generated secrets to .env.secrets"

# Final summary
echo ""
echo "🎉 Production fixes completed successfully!"
echo "=============================================="
print_info "What was fixed:"
echo "  ✅ Generated secure passwords and secrets"
echo "  ✅ Created production environment configuration"
echo "  ✅ Secured Docker Compose with health checks"
echo "  ✅ Added MySQL and Redis production optimizations"
echo "  ✅ Created Nginx reverse proxy with SSL"
echo "  ✅ Added deployment and monitoring scripts"
echo "  ✅ Updated security configurations"
echo ""
print_warning "Next steps:"
echo "  1. Review and customize .env.production"
echo "  2. Add your SSL certificates to nginx/ssl/"
echo "  3. Update domain names in configurations"
echo "  4. Run: ./deploy-production.sh"
echo "  5. Set up monitoring: ./monitor-production.sh"
echo ""
print_warning "Security reminders:"
echo "  🔐 Never commit .env.production to git"
echo "  🔐 Store secrets in .env.secrets safely"
echo "  🔐 Change default domain names"
echo "  🔐 Update SSL certificates regularly"
echo ""
echo "🚀 Your application is now production-ready!" 