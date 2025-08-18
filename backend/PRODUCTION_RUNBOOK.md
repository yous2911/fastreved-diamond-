# Production Runbook

## Table of Contents
1. [Emergency Contacts](#emergency-contacts)
2. [System Overview](#system-overview)
3. [Daily Operations](#daily-operations)
4. [Incident Response](#incident-response)
5. [Deployment Procedures](#deployment-procedures)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Recovery Procedures](#recovery-procedures)
8. [Performance Tuning](#performance-tuning)
9. [Security Procedures](#security-procedures)
10. [Monitoring & Alerts](#monitoring--alerts)

## Emergency Contacts

### Primary Contacts
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **System Administrator**: [Name] - [Phone] - [Email]
- **Database Administrator**: [Name] - [Phone] - [Email]
- **Security Officer**: [Name] - [Phone] - [Email]

### Escalation Matrix
1. **Level 1**: On-call engineer (15 minutes)
2. **Level 2**: DevOps lead (30 minutes)
3. **Level 3**: CTO/VP Engineering (1 hour)
4. **Level 4**: CEO (2 hours)

### External Contacts
- **Hosting Provider**: [Provider] - [Support Phone] - [Support Email]
- **CDN Provider**: [Provider] - [Support Phone] - [Support Email]
- **SSL Certificate Provider**: [Provider] - [Support Phone] - [Support Email]

## System Overview

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   CDN (CloudFront) │    │   Monitoring    │
│   (Nginx)       │    │                 │    │   (CloudWatch)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Static Assets │    │   Logs & Metrics│
│   (Node.js)     │    │   (S3/CDN)      │    │   (CloudWatch)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Cache         │
│   (MySQL)       │    │   (Redis)       │
└─────────────────┘    └─────────────────┘
```

### Infrastructure Details
- **Application Servers**: 3 instances (t3.medium)
- **Database**: RDS MySQL 8.0 (db.t3.medium)
- **Cache**: ElastiCache Redis (cache.t3.micro)
- **Load Balancer**: Application Load Balancer
- **CDN**: CloudFront
- **Storage**: S3 for static assets
- **Monitoring**: CloudWatch + Sentry

### Environment Variables
```bash
# Critical environment variables
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint.com
DB_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
REDIS_HOST=your-redis-endpoint.com
CDN_URL=https://cdn.your-domain.com
```

## Daily Operations

### Morning Checklist (8:00 AM)
```bash
# 1. Check system health
curl -f https://your-domain.com/health
curl -f https://your-domain.com/metrics

# 2. Check application logs
pm2 logs reved-kids-api --lines 50

# 3. Check database status
mysql -u reved_prod_user -p -e "SHOW PROCESSLIST;"

# 4. Check Redis status
redis-cli ping

# 5. Check disk space
df -h

# 6. Check memory usage
free -h

# 7. Check backup status
ls -la /var/backups/reved-kids/database/ | tail -5
```

### Evening Checklist (6:00 PM)
```bash
# 1. Review daily metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=your-alb \
  --start-time $(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# 2. Check error rates
grep "ERROR" /var/log/reved-kids/app.log | wc -l

# 3. Verify backup completion
tail -20 /var/log/reved-kids/backup_$(date +%Y%m%d).log
```

### Weekly Tasks (Every Sunday)
```bash
# 1. Review performance metrics
# 2. Update SSL certificates if needed
# 3. Clean up old log files
# 4. Review security alerts
# 5. Update system packages
# 6. Test backup restoration
```

## Incident Response

### Incident Classification

#### P0 - Critical
- **Definition**: Complete system outage, data loss, security breach
- **Response Time**: Immediate (within 15 minutes)
- **Escalation**: Level 3+ required
- **Examples**: Database corruption, security breach, complete downtime

#### P1 - High
- **Definition**: Major functionality broken, significant performance degradation
- **Response Time**: 30 minutes
- **Escalation**: Level 2+ required
- **Examples**: API down, login issues, payment processing down

#### P2 - Medium
- **Definition**: Minor functionality broken, performance issues
- **Response Time**: 2 hours
- **Escalation**: Level 1+ required
- **Examples**: Slow response times, non-critical features down

#### P3 - Low
- **Definition**: Cosmetic issues, minor bugs
- **Response Time**: 24 hours
- **Escalation**: Level 1
- **Examples**: UI glitches, minor display issues

### Incident Response Process

#### 1. Detection & Alerting
```bash
# Check if incident is real
curl -f https://your-domain.com/health
pm2 status
systemctl status nginx mysql redis
```

#### 2. Initial Assessment
```bash
# Gather initial information
echo "=== INCIDENT REPORT ===" > /tmp/incident_$(date +%Y%m%d_%H%M%S).txt
echo "Time: $(date)" >> /tmp/incident_*.txt
echo "Reporter: $USER" >> /tmp/incident_*.txt
echo "Severity: [P0/P1/P2/P3]" >> /tmp/incident_*.txt
echo "Description: [Brief description]" >> /tmp/incident_*.txt
```

#### 3. Immediate Actions
```bash
# For P0/P1 incidents
# 1. Enable maintenance mode
echo "true" > /var/www/reved-kids/maintenance.flag

# 2. Notify stakeholders
# Send immediate notification to escalation list

# 3. Begin investigation
# Start collecting logs and metrics
```

#### 4. Investigation
```bash
# Collect system information
system_info() {
    echo "=== SYSTEM INFO ==="
    uname -a
    uptime
    free -h
    df -h
    ps aux | head -20
}

# Collect application logs
app_logs() {
    echo "=== APPLICATION LOGS ==="
    pm2 logs reved-kids-api --lines 100
    tail -100 /var/log/nginx/error.log
    tail -100 /var/log/reved-kids/app.log
}

# Collect database information
db_info() {
    echo "=== DATABASE INFO ==="
    mysql -u reved_prod_user -p -e "SHOW PROCESSLIST;"
    mysql -u reved_prod_user -p -e "SHOW STATUS LIKE 'Threads_connected';"
}
```

#### 5. Resolution
```bash
# Document resolution steps
echo "=== RESOLUTION ===" >> /tmp/incident_*.txt
echo "Root Cause: [Description]" >> /tmp/incident_*.txt
echo "Resolution: [Steps taken]" >> /tmp/incident_*.txt
echo "Prevention: [Future measures]" >> /tmp/incident_*.txt
```

#### 6. Post-Incident
```bash
# 1. Disable maintenance mode
rm -f /var/www/reved-kids/maintenance.flag

# 2. Verify system health
curl -f https://your-domain.com/health

# 3. Send resolution notification

# 4. Schedule post-mortem meeting
```

### Common Incident Scenarios

#### Database Connection Issues
```bash
# Symptoms: 503 errors, database connection timeouts
# Immediate Actions:
mysql -u reved_prod_user -p -e "SELECT 1;"
systemctl status mysql
pm2 restart reved-kids-api

# Investigation:
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
tail -50 /var/log/mysql/error.log
```

#### High Memory Usage
```bash
# Symptoms: Slow response times, application crashes
# Immediate Actions:
pm2 monit
free -h
ps aux --sort=-%mem | head -10

# Investigation:
pm2 logs reved-kids-api --lines 100 | grep -i "memory\|heap"
node --inspect dist/server.js  # For memory profiling
```

#### SSL Certificate Expiry
```bash
# Symptoms: Browser SSL warnings, API failures
# Immediate Actions:
sudo certbot certificates
sudo certbot renew

# Investigation:
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

## Deployment Procedures

### Pre-Deployment Checklist
```bash
# 1. Verify staging environment
curl -f https://staging.your-domain.com/health

# 2. Run tests
npm run test
npm run test:integration

# 3. Check database migrations
npm run db:migrate:status

# 4. Verify environment variables
grep -E "^(DB_|JWT_|REDIS_)" .env.production

# 5. Check backup status
ls -la /var/backups/reved-kids/database/ | tail -1
```

### Deployment Process
```bash
#!/bin/bash
# scripts/deploy.sh

set -euo pipefail

echo "Starting deployment..."

# 1. Create backup
echo "Creating backup..."
/var/www/reved-kids/scripts/backup.sh

# 2. Pull latest code
echo "Pulling latest code..."
git pull origin main

# 3. Install dependencies
echo "Installing dependencies..."
npm ci --production

# 4. Run database migrations
echo "Running migrations..."
npm run db:migrate

# 5. Build application
echo "Building application..."
npm run build

# 6. Restart application
echo "Restarting application..."
pm2 reload ecosystem.config.js --env production

# 7. Health check
echo "Performing health check..."
sleep 10
curl -f https://your-domain.com/health

echo "Deployment completed successfully!"
```

### Rollback Procedure
```bash
#!/bin/bash
# scripts/rollback.sh

set -euo pipefail

echo "Starting rollback..."

# 1. Stop application
pm2 stop reved-kids-api

# 2. Revert code
git checkout HEAD~1

# 3. Install dependencies
npm ci --production

# 4. Rollback database if needed
npm run db:migrate:rollback

# 5. Build application
npm run build

# 6. Start application
pm2 start ecosystem.config.js --env production

# 7. Health check
sleep 10
curl -f https://your-domain.com/health

echo "Rollback completed successfully!"
```

## Maintenance Procedures

### Database Maintenance
```bash
# Weekly database maintenance
mysql_maintenance() {
    echo "Starting database maintenance..."
    
    # Analyze tables
    mysql -u reved_prod_user -p -e "ANALYZE TABLE users, lessons, progress;"
    
    # Optimize tables
    mysql -u reved_prod_user -p -e "OPTIMIZE TABLE users, lessons, progress;"
    
    # Check for slow queries
    mysql -u root -p -e "SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;"
    
    echo "Database maintenance completed."
}
```

### Log Rotation
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/reved-kids

# Add configuration:
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

### SSL Certificate Renewal
```bash
# Monthly SSL check
ssl_check() {
    echo "Checking SSL certificates..."
    
    # Check expiration
    openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
    
    # Test renewal
    sudo certbot renew --dry-run
    
    echo "SSL check completed."
}
```

## Recovery Procedures

### Database Recovery
```bash
#!/bin/bash
# scripts/recover-database.sh

set -euo pipefail

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting database recovery..."

# 1. Stop application
pm2 stop reved-kids-api

# 2. Backup current database
mysqldump -u reved_prod_user -p reved_kids_production > /tmp/pre_recovery_backup.sql

# 3. Drop and recreate database
mysql -u reved_prod_user -p -e "DROP DATABASE reved_kids_production;"
mysql -u reved_prod_user -p -e "CREATE DATABASE reved_kids_production;"

# 4. Restore from backup
if [[ "$BACKUP_FILE" == *.enc ]]; then
    # Decrypt backup
    openssl enc -d -aes-256-cbc -in "$BACKUP_FILE" -out "${BACKUP_FILE%.enc}" -k "$BACKUP_ENCRYPTION_KEY"
    BACKUP_FILE="${BACKUP_FILE%.enc}"
fi

gunzip -c "$BACKUP_FILE" | mysql -u reved_prod_user -p reved_kids_production

# 5. Start application
pm2 start ecosystem.config.js --env production

# 6. Verify recovery
sleep 10
curl -f https://your-domain.com/health

echo "Database recovery completed successfully!"
```

### Application Recovery
```bash
#!/bin/bash
# scripts/recover-application.sh

set -euo pipefail

echo "Starting application recovery..."

# 1. Check system resources
free -h
df -h

# 2. Restart services
sudo systemctl restart nginx
sudo systemctl restart mysql
sudo systemctl restart redis

# 3. Restart application
pm2 delete reved-kids-api
pm2 start ecosystem.config.js --env production

# 4. Verify recovery
sleep 10
curl -f https://your-domain.com/health

echo "Application recovery completed successfully!"
```

## Performance Tuning

### Application Performance
```bash
# Monitor application performance
performance_monitoring() {
    echo "=== APPLICATION PERFORMANCE ==="
    
    # CPU usage
    top -p $(pgrep -f "node.*server.js") -n 1
    
    # Memory usage
    pm2 monit
    
    # Response times
    curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/health
    
    # Database performance
    mysql -u reved_prod_user -p -e "SHOW STATUS LIKE 'Slow_queries';"
    mysql -u reved_prod_user -p -e "SHOW STATUS LIKE 'Questions';"
}
```

### Database Optimization
```sql
-- Check slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'reved_kids_production'
ORDER BY (data_length + index_length) DESC;

-- Check index usage
SELECT 
    table_name,
    index_name,
    cardinality
FROM information_schema.statistics 
WHERE table_schema = 'reved_kids_production';
```

### Cache Optimization
```bash
# Monitor Redis performance
redis-cli info memory
redis-cli info stats

# Check cache hit rate
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses
```

## Security Procedures

### Security Monitoring
```bash
# Check for security issues
security_check() {
    echo "=== SECURITY CHECK ==="
    
    # Check failed login attempts
    grep "Failed login" /var/log/reved-kids/app.log | tail -20
    
    # Check for suspicious IPs
    sudo netstat -tlnp | grep :3000
    
    # Check SSL certificate
    openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
    
    # Check file permissions
    find /var/www/reved-kids -type f -perm /o+w
}
```

### Incident Response for Security
```bash
# Security incident response
security_incident() {
    echo "=== SECURITY INCIDENT RESPONSE ==="
    
    # 1. Isolate system
    sudo ufw deny from all
    
    # 2. Preserve evidence
    sudo cp /var/log/nginx/access.log /var/backups/evidence/
    sudo cp /var/www/reved-kids/logs/app.log /var/backups/evidence/
    
    # 3. Stop services
    pm2 stop all
    sudo systemctl stop nginx mysql redis
    
    # 4. Notify security team
    # Send immediate notification
    
    echo "System isolated. Contact security team immediately."
}
```

## Monitoring & Alerts

### Key Metrics to Monitor
```yaml
Application Metrics:
  - Response time: < 500ms
  - Error rate: < 1%
  - Throughput: > 1000 req/min
  - Memory usage: < 80%
  - CPU usage: < 70%

Database Metrics:
  - Connection count: < 80% of max
  - Query response time: < 100ms
  - Slow queries: < 1% of total
  - Disk usage: < 80%

Infrastructure Metrics:
  - Disk space: > 20% free
  - Network bandwidth: < 80% utilization
  - SSL certificate: > 30 days until expiry
```

### Alert Configuration
```bash
# CloudWatch Alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "High-Error-Rate" \
  --alarm-description "High error rate detected" \
  --metric-name "5xxError" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2

# Custom application alerts
# Configure in your monitoring system
```

### Dashboard Setup
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "RevEd-Kids-Production" \
  --dashboard-body file://dashboard-config.json
```

---

## Quick Reference Commands

### System Status
```bash
# Check all services
systemctl status nginx mysql redis
pm2 status
pm2 monit

# Check logs
pm2 logs reved-kids-api --lines 50
tail -f /var/log/nginx/error.log
tail -f /var/log/reved-kids/app.log
```

### Emergency Commands
```bash
# Enable maintenance mode
echo "true" > /var/www/reved-kids/maintenance.flag

# Restart application
pm2 restart reved-kids-api

# Restart all services
sudo systemctl restart nginx mysql redis

# Check health
curl -f https://your-domain.com/health
```

### Backup Commands
```bash
# Create backup
/var/www/reved-kids/scripts/backup.sh

# List backups
ls -la /var/backups/reved-kids/database/

# Restore database
/var/www/reved-kids/scripts/recover-database.sh /path/to/backup.sql.gz
```

---

**Remember**: Always document any changes made during incidents and update this runbook with lessons learned! 