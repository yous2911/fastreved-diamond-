# Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [SSL/TLS Configuration](#ssltls-configuration)
4. [Database Setup](#database-setup)
5. [Load Balancer Configuration](#load-balancer-configuration)
6. [Process Management](#process-management)
7. [Log Management](#log-management)
8. [Backup & Recovery](#backup--recovery)
9. [Monitoring & Observability](#monitoring--observability)
10. [CDN Configuration](#cdn-configuration)
11. [Security Hardening](#security-hardening)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended)
- **Storage**: 50GB+ SSD
- **Network**: Stable internet connection

### Software Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install MySQL 8.0+
sudo apt install mysql-server

# Install Redis
sudo apt install redis-server

# Install Nginx
sudo apt install nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx
```

## Environment Setup

### 1. Clone and Setup Repository
```bash
# Clone repository
git clone https://github.com/your-org/reved-kids-fastify.git
cd reved-kids-fastify

# Install dependencies
npm ci --production

# Build application
npm run build

# Copy environment file
cp env.production.example .env.production
```

### 2. Configure Environment Variables
Edit `.env.production` with your production values:

```bash
# Generate secure secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -hex 32  # For SESSION_SECRET
```

**Critical Security Settings:**
- Change all default passwords
- Use strong, unique secrets
- Enable SSL/TLS
- Configure proper CORS origins
- Set up monitoring credentials

## SSL/TLS Configuration

### 1. Using Let's Encrypt (Recommended)
```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Configure nginx with SSL
sudo nano /etc/nginx/sites-available/reved-kids
```

### 2. Nginx SSL Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static assets (if serving from nginx)
    location /static/ {
        alias /var/www/reved-kids/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Setup

### 1. MySQL Configuration
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE reved_kids_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'reved_prod_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON reved_kids_production.* TO 'reved_prod_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. MySQL Optimization
Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# Performance
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Connections
max_connections = 200
max_connect_errors = 100000

# Query cache
query_cache_type = 1
query_cache_size = 64M

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

### 3. Database Read Replicas (Optional)
For high availability, set up read replicas:

```bash
# On replica server
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
[mysqld]
server-id = 2
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
relay_log = /var/log/mysql/mysql-relay-bin
log_slave_updates = 1
read_only = 1
```

## Load Balancer Configuration

### 1. Nginx Load Balancer
```nginx
upstream reved_kids_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration...

    location / {
        proxy_pass http://reved_kids_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health checks
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 2. Health Check Endpoint
Ensure your app has a health check endpoint:

```javascript
// In your Fastify app
app.get('/health', async (request, reply) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    reply.status(503);
    return { status: 'unhealthy', error: error.message };
  }
});
```

## Process Management

### 1. PM2 Configuration
Your `ecosystem.config.js` is already configured. Start the application:

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 2. Systemd Service (Alternative)
Create `/etc/systemd/system/reved-kids.service`:

```ini
[Unit]
Description=RevEd Kids API
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/reved-kids
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

## Log Management

### 1. Log Rotation
Create `/etc/logrotate.d/reved-kids`:

```
/var/www/reved-kids/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Centralized Logging
For production, consider using:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Fluentd** for log aggregation
- **CloudWatch** (AWS)
- **Stackdriver** (GCP)

## Backup & Recovery

### 1. Database Backup Script
Create `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/reved-kids"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="reved_kids_production"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u reved_prod_user -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/reved-kids/uploads

# Upload to S3 (if configured)
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://$BACKUP_S3_BUCKET/database/
    aws s3 cp $BACKUP_DIR/app_backup_$DATE.tar.gz s3://$BACKUP_S3_BUCKET/uploads/
fi

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### 2. Automated Backup Schedule
```bash
# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /var/www/reved-kids/scripts/backup.sh
```

### 3. Recovery Procedures
```bash
# Database recovery
gunzip -c db_backup_20231201_020000.sql.gz | mysql -u reved_prod_user -p reved_kids_production

# Application files recovery
tar -xzf app_backup_20231201_020000.tar.gz -C /
```

## Monitoring & Observability

### 1. Application Monitoring
Your app already has monitoring endpoints. Set up external monitoring:

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

### 2. Sentry Integration
```javascript
// In your app
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 3. Prometheus Metrics
```javascript
// Install prometheus client
npm install prom-client

// In your app
const prometheus = require('prom-client');
const register = prometheus.register;

// Add metrics endpoint
app.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

## CDN Configuration

### 1. CloudFront Setup (AWS)
1. Create CloudFront distribution
2. Set origin to your domain
3. Configure cache behaviors for static assets
4. Update your app to use CDN URLs

### 2. Static Asset Optimization
```javascript
// Serve static assets through CDN
app.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/static/',
  decorateReply: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
  }
});
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Security Headers
Your nginx configuration already includes security headers. Additional considerations:

```nginx
# Additional security headers
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:;" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 3. Rate Limiting
```nginx
# Rate limiting in nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://reved_kids_backend;
}

location /api/auth/login {
    limit_req zone=login burst=5 nodelay;
    proxy_pass http://reved_kids_backend;
}
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs reved-kids-api
tail -f /var/www/reved-kids/logs/error.log

# Check environment
pm2 env reved-kids-api

# Check port availability
sudo netstat -tlnp | grep :3000
```

#### 2. Database Connection Issues
```bash
# Test database connection
mysql -u reved_prod_user -p -h localhost reved_kids_production

# Check MySQL status
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

#### 3. SSL Certificate Issues
```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiration
sudo certbot certificates

# Renew certificate manually
sudo certbot renew
```

#### 4. Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Check application performance
pm2 monit

# Check slow queries
sudo tail -f /var/log/mysql/slow.log
```

### Emergency Procedures

#### 1. Rollback Deployment
```bash
# Rollback to previous version
pm2 stop reved-kids-api
git checkout HEAD~1
npm ci --production
npm run build
pm2 start ecosystem.config.js --env production
```

#### 2. Database Recovery
```bash
# Stop application
pm2 stop reved-kids-api

# Restore from backup
gunzip -c /var/backups/reved-kids/db_backup_YYYYMMDD_HHMMSS.sql.gz | mysql -u reved_prod_user -p reved_kids_production

# Start application
pm2 start ecosystem.config.js --env production
```

#### 3. Emergency Maintenance Mode
```bash
# Enable maintenance mode
echo "true" > /var/www/reved-kids/maintenance.flag

# Restart application
pm2 restart reved-kids-api
```

## Performance Optimization

### 1. Node.js Optimization
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection logging
export NODE_OPTIONS="--trace-gc --trace-gc-verbose"
```

### 2. Database Optimization
```sql
-- Analyze table performance
ANALYZE TABLE users, lessons, progress;

-- Optimize tables
OPTIMIZE TABLE users, lessons, progress;

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

### 3. Redis Optimization
```bash
# Monitor Redis memory usage
redis-cli info memory

# Configure Redis for production
sudo nano /etc/redis/redis.conf
```

```ini
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Maintenance Schedule

### Daily
- Monitor application logs
- Check system resources
- Verify backup completion

### Weekly
- Review performance metrics
- Update security patches
- Clean old log files

### Monthly
- Review and rotate secrets
- Update SSL certificates
- Performance optimization
- Security audit

### Quarterly
- Full system backup
- Disaster recovery testing
- Capacity planning review
- Security penetration testing

---

## Support

For production support:
- **Emergency**: Create GitHub issue with [URGENT] tag
- **General**: Use GitHub Discussions
- **Security**: Email security@your-domain.com

**Remember**: Always test changes in staging environment before applying to production! 