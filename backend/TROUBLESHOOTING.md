# Troubleshooting Guide

## Table of Contents
1. [Quick Diagnostics](#quick-diagnostics)
2. [Application Issues](#application-issues)
3. [Database Issues](#database-issues)
4. [Network & SSL Issues](#network--ssl-issues)
5. [Performance Issues](#performance-issues)
6. [Security Issues](#security-issues)
7. [Deployment Issues](#deployment-issues)
8. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Health Check Commands
```bash
# Application status
pm2 status
pm2 logs reved-kids-api --lines 50

# System resources
htop
df -h
free -h
netstat -tlnp | grep :3000

# Database connectivity
mysql -u reved_prod_user -p -e "SELECT 1;"

# Redis connectivity
redis-cli ping

# SSL certificate status
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Common Error Codes
- **500**: Internal server error - check application logs
- **502**: Bad gateway - check if app is running
- **503**: Service unavailable - check database/Redis
- **504**: Gateway timeout - check app response time
- **SSL errors**: Certificate issues or configuration problems

## Application Issues

### Application Won't Start

#### Symptoms
- PM2 shows "errored" status
- Port 3000 not listening
- Application crashes immediately

#### Diagnosis
```bash
# Check PM2 status
pm2 status
pm2 logs reved-kids-api --lines 100

# Check if port is in use
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000

# Check environment variables
pm2 env reved-kids-api

# Test manual start
cd /var/www/reved-kids
NODE_ENV=production node dist/server.js
```

#### Common Causes & Solutions

**1. Missing Environment Variables**
```bash
# Check if .env.production exists
ls -la .env.production

# Verify required variables
grep -E "^(DB_|JWT_|REDIS_)" .env.production
```

**2. Database Connection Issues**
```bash
# Test database connection
mysql -u reved_prod_user -p -h localhost reved_kids_production -e "SELECT 1;"

# Check MySQL service
sudo systemctl status mysql
```

**3. Port Already in Use**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

**4. Permission Issues**
```bash
# Check file permissions
ls -la dist/server.js
ls -la .env.production

# Fix permissions
sudo chown -R www-data:www-data /var/www/reved-kids
sudo chmod 644 .env.production
```

### Application Crashes Randomly

#### Symptoms
- Application restarts frequently
- Memory usage spikes
- CPU usage high

#### Diagnosis
```bash
# Check memory usage
pm2 monit

# Check system resources
htop
free -h

# Check for memory leaks
node --inspect dist/server.js
```

#### Solutions

**1. Memory Leaks**
```javascript
// Add memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 30000);
```

**2. Increase Memory Limit**
```bash
# In ecosystem.config.js
max_memory_restart: '2G'

# Or set NODE_OPTIONS
export NODE_OPTIONS="--max-old-space-size=4096"
```

**3. Optimize Database Connections**
```javascript
// Check connection pool settings
const pool = mysql.createPool({
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});
```

### High CPU Usage

#### Diagnosis
```bash
# Check CPU usage by process
top -p $(pgrep -f "node.*server.js")

# Check for infinite loops
pm2 logs reved-kids-api --lines 100 | grep -i "error\|exception"

# Profile CPU usage
node --prof dist/server.js
```

#### Solutions

**1. Optimize Database Queries**
```sql
-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- Analyze slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

**2. Implement Caching**
```javascript
// Add Redis caching for expensive operations
const cacheKey = `user:${userId}:profile`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... expensive operation ...
await redis.setex(cacheKey, 3600, JSON.stringify(result));
```

## Database Issues

### Connection Timeouts

#### Symptoms
- "Connection timeout" errors
- Database queries fail intermittently
- High connection count

#### Diagnosis
```bash
# Check MySQL status
sudo systemctl status mysql

# Check connection count
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# Check max connections
mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections';"
```

#### Solutions

**1. Increase Connection Limits**
```ini
# In /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
max_connections = 500
max_connect_errors = 100000
wait_timeout = 28800
interactive_timeout = 28800
```

**2. Optimize Connection Pool**
```javascript
const pool = mysql.createPool({
  connectionLimit: 50,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  queueLimit: 0
});
```

### Slow Queries

#### Diagnosis
```bash
# Enable slow query log
mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"
mysql -u root -p -e "SET GLOBAL long_query_time = 2;"

# Check slow queries
sudo tail -f /var/log/mysql/slow.log
```

#### Solutions

**1. Add Indexes**
```sql
-- Analyze table performance
ANALYZE TABLE users, lessons, progress;

-- Add missing indexes
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_lesson_category ON lessons(category);
CREATE INDEX idx_progress_user_lesson ON progress(user_id, lesson_id);
```

**2. Optimize Queries**
```sql
-- Use EXPLAIN to analyze queries
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- Use LIMIT for large result sets
SELECT * FROM lessons WHERE category = 'math' LIMIT 100;
```

### Database Corruption

#### Symptoms
- "Table is marked as crashed" errors
- Inconsistent data
- Application crashes on specific queries

#### Solutions

**1. Check and Repair Tables**
```bash
# Check all tables
mysqlcheck -u root -p --all-databases --check

# Repair corrupted tables
mysqlcheck -u root -p --all-databases --repair
```

**2. Restore from Backup**
```bash
# Stop application
pm2 stop reved-kids-api

# Restore database
gunzip -c /var/backups/reved-kids/db_backup_YYYYMMDD_HHMMSS.sql.gz | mysql -u reved_prod_user -p reved_kids_production

# Start application
pm2 start ecosystem.config.js --env production
```

## Network & SSL Issues

### SSL Certificate Problems

#### Symptoms
- Browser shows SSL errors
- Certificate expired warnings
- Mixed content errors

#### Diagnosis
```bash
# Check certificate expiration
sudo certbot certificates

# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate chain
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```

#### Solutions

**1. Renew Certificate**
```bash
# Manual renewal
sudo certbot renew

# Check renewal status
sudo certbot renew --dry-run
```

**2. Fix Certificate Chain**
```bash
# Ensure full chain is used
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /etc/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /etc/nginx/ssl/
```

### Nginx Issues

#### Symptoms
- 502 Bad Gateway errors
- Static files not loading
- Redirect loops

#### Diagnosis
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx configuration
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

#### Solutions

**1. Fix Configuration**
```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**2. Check Upstream Health**
```bash
# Test upstream connection
curl -I http://localhost:3000/health

# Check if app is responding
netstat -tlnp | grep :3000
```

## Performance Issues

### Slow Response Times

#### Diagnosis
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/api/health"

# Monitor application performance
pm2 monit

# Check database performance
mysql -u root -p -e "SHOW PROCESSLIST;"
```

#### Solutions

**1. Enable Compression**
```javascript
// In your Fastify app
app.register(require('@fastify/compress'), {
  threshold: 1024,
  level: 6
});
```

**2. Implement Caching**
```javascript
// Add response caching
app.register(require('@fastify/cache'), {
  ttl: 300,
  checkPeriod: 600
});
```

**3. Optimize Database**
```sql
-- Add query cache
SET GLOBAL query_cache_type = 1;
SET GLOBAL query_cache_size = 67108864;

-- Optimize InnoDB
SET GLOBAL innodb_buffer_pool_size = 1073741824;
```

### Memory Leaks

#### Diagnosis
```bash
# Monitor memory usage
watch -n 1 'ps aux | grep node'

# Check for memory leaks
node --inspect dist/server.js
```

#### Solutions

**1. Fix Memory Leaks**
```javascript
// Clear intervals and timeouts
const intervals = [];
const timeouts = [];

// Store references
const interval = setInterval(() => {}, 1000);
intervals.push(interval);

// Clean up on shutdown
process.on('SIGTERM', () => {
  intervals.forEach(clearInterval);
  timeouts.forEach(clearTimeout);
});
```

**2. Increase Memory Limit**
```bash
# In ecosystem.config.js
max_memory_restart: '2G'

# Or set environment variable
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Security Issues

### Unauthorized Access

#### Symptoms
- Failed login attempts in logs
- Unusual traffic patterns
- Security alerts

#### Diagnosis
```bash
# Check failed login attempts
grep "Failed login" /var/www/reved-kids/logs/app.log

# Check access logs
sudo tail -f /var/log/nginx/access.log | grep -E "(POST|PUT|DELETE)"

# Check for suspicious IPs
sudo netstat -tlnp | grep :3000
```

#### Solutions

**1. Implement Rate Limiting**
```javascript
// Add rate limiting
app.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  skipOnError: false
});
```

**2. Block Suspicious IPs**
```bash
# Block IP with iptables
sudo iptables -A INPUT -s SUSPICIOUS_IP -j DROP

# Or use fail2ban
sudo apt install fail2ban
```

### Data Breach

#### Symptoms
- Unusual data access patterns
- Unauthorized data exports
- Security alerts from monitoring tools

#### Emergency Response
```bash
# 1. Isolate the system
sudo ufw deny from all

# 2. Stop all services
pm2 stop all
sudo systemctl stop mysql redis nginx

# 3. Preserve evidence
sudo cp /var/log/nginx/access.log /var/backups/evidence/
sudo cp /var/www/reved-kids/logs/app.log /var/backups/evidence/

# 4. Notify stakeholders
# Contact security team and legal department
```

## Deployment Issues

### Failed Deployments

#### Symptoms
- Application not starting after deployment
- Database migration failures
- Configuration errors

#### Diagnosis
```bash
# Check deployment logs
pm2 logs reved-kids-api --lines 100

# Check if build succeeded
ls -la dist/

# Verify environment variables
pm2 env reved-kids-api
```

#### Solutions

**1. Rollback Deployment**
```bash
# Stop current version
pm2 stop reved-kids-api

# Rollback to previous version
git checkout HEAD~1
npm ci --production
npm run build
pm2 start ecosystem.config.js --env production
```

**2. Fix Migration Issues**
```bash
# Check migration status
npm run db:migrate:status

# Run migrations manually
npm run db:migrate

# Rollback if needed
npm run db:migrate:rollback
```

### Configuration Issues

#### Symptoms
- Environment variables not loaded
- Wrong configuration values
- Feature flags not working

#### Diagnosis
```bash
# Check environment file
cat .env.production

# Verify environment variables
pm2 env reved-kids-api

# Test configuration loading
node -e "console.log(require('dotenv').config())"
```

#### Solutions

**1. Fix Environment Variables**
```bash
# Reload environment
pm2 reload reved-kids-api

# Or restart completely
pm2 restart reved-kids-api
```

**2. Validate Configuration**
```javascript
// Add configuration validation
const requiredEnvVars = ['DB_HOST', 'JWT_SECRET', 'REDIS_HOST'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

## Emergency Procedures

### System Down

#### Immediate Actions
```bash
# 1. Check system status
sudo systemctl status nginx mysql redis

# 2. Check application status
pm2 status

# 3. Check logs for errors
pm2 logs reved-kids-api --lines 50

# 4. Restart services if needed
sudo systemctl restart nginx mysql redis
pm2 restart reved-kids-api
```

### Data Loss

#### Recovery Steps
```bash
# 1. Stop application
pm2 stop reved-kids-api

# 2. Restore from latest backup
gunzip -c /var/backups/reved-kids/db_backup_YYYYMMDD_HHMMSS.sql.gz | mysql -u reved_prod_user -p reved_kids_production

# 3. Verify data integrity
mysql -u reved_prod_user -p -e "SELECT COUNT(*) FROM users;"

# 4. Start application
pm2 start ecosystem.config.js --env production
```

### Security Breach

#### Emergency Response
```bash
# 1. Isolate system
sudo ufw deny from all

# 2. Stop all services
pm2 stop all
sudo systemctl stop nginx mysql redis

# 3. Preserve logs
sudo cp -r /var/log /var/backups/incident_logs_$(date +%Y%m%d_%H%M%S)

# 4. Contact security team
# Send incident report with preserved evidence
```

### Performance Crisis

#### Immediate Actions
```bash
# 1. Enable maintenance mode
echo "true" > /var/www/reved-kids/maintenance.flag

# 2. Scale up resources
# Increase PM2 instances
pm2 scale reved-kids-api 4

# 3. Optimize database
mysql -u root -p -e "SET GLOBAL query_cache_size = 134217728;"

# 4. Monitor performance
pm2 monit
htop
```

## Monitoring & Alerts

### Setup Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Setup log monitoring
sudo apt install logwatch

# Configure alerts
# Set up email/SMS alerts for critical issues
```

### Key Metrics to Monitor
- CPU usage > 80%
- Memory usage > 90%
- Disk usage > 85%
- Response time > 5 seconds
- Error rate > 5%
- Database connections > 80%

### Alert Thresholds
```bash
# Example alert script
#!/bin/bash
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if [ $CPU_USAGE -gt 80 ]; then
    echo "High CPU usage: ${CPU_USAGE}%" | mail -s "Alert: High CPU" admin@your-domain.com
fi
```

## Prevention

### Regular Maintenance
```bash
# Daily
- Check application logs
- Monitor system resources
- Verify backup completion

# Weekly
- Review performance metrics
- Update security patches
- Clean old log files

# Monthly
- Review and rotate secrets
- Update SSL certificates
- Performance optimization
- Security audit
```

### Best Practices
1. **Always test in staging first**
2. **Keep backups current**
3. **Monitor proactively**
4. **Document changes**
5. **Have rollback procedures ready**
6. **Train team on emergency procedures**

---

## Support Contacts

- **Emergency**: Create GitHub issue with [URGENT] tag
- **General**: Use GitHub Discussions
- **Security**: Email security@your-domain.com
- **Infrastructure**: Contact DevOps team

**Remember**: When in doubt, prioritize system stability over quick fixes! 