# 🚀 RevEd Kids Backend - Installation & Setup Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **Redis** >= 6.0 (optional, falls back to memory cache)
- **Docker** (optional, for containerized deployment)

## 📦 Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp env.example .env

# Generate secure secrets (minimum 32 characters each)
# You can use: openssl rand -hex 32

# Edit .env file with your configuration
nano .env
```

**Required Environment Variables:**

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=reved_kids

# Security (IMPORTANT: Generate secure random strings)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
ENCRYPTION_KEY=your-encryption-key-32-characters-minimum-length-required
COOKIE_SECRET=your-cookie-secret-32-characters-minimum-length-required
```

### 3. Database Setup

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE reved_kids;
CREATE USER 'reved_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON reved_kids.* TO 'reved_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update .env with your database credentials
```

### 4. Database Migration

```bash
# Generate migration files (if schema changes)
npm run db:generate

# Run migrations
npm run db:migrate

# Optional: Seed with sample data
npm run db:seed
```

### 5. Redis Setup (Optional)

```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Or using Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Update .env
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# The server will start on http://localhost:3000
# API documentation: http://localhost:3000/docs
# Health check: http://localhost:3000/api/health
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t reved-kids-fastify .
docker run -p 3000:3000 --env-file .env reved-kids-fastify
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run performance tests
npm run test:performance
```

## 🔧 Development Tools

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Tools

```bash
# Open Drizzle Studio (Database GUI)
npm run db:studio

# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

- **Basic Health**: `GET /api/health`
- **Detailed Metrics**: `GET /api/monitoring/metrics`
- **System Info**: `GET /api/monitoring/system`
- **Cache Stats**: `GET /api/monitoring/cache`

### Example Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "connections": 5,
      "responseTime": 45
    },
    "cache": {
      "status": "healthy",
      "connected": true
    }
  },
  "system": {
    "memory": {
      "used": 134217728,
      "total": 8589934592,
      "percentage": 1.6
    },
    "cpu": {
      "usage": 2.5,
      "loadAverage": [1.2, 1.1, 0.9]
    }
  }
}
```

## 🛡️ Security Features Enabled

- ✅ **Input Validation**: TypeBox schemas with sanitization
- ✅ **Rate Limiting**: 100 requests per minute (configurable)
- ✅ **CORS Protection**: Configurable origins
- ✅ **Security Headers**: Helmet.js integration
- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Password Hashing**: bcrypt with salt rounds
- ✅ **Request Size Limits**: 5MB default (configurable)
- ✅ **SQL Injection Protection**: Drizzle ORM parameterized queries

## 📈 Performance Optimizations

- ✅ **Database Connection Pooling**: MySQL connection pool
- ✅ **Response Compression**: gzip/deflate
- ✅ **Caching Strategy**: Redis with memory fallback
- ✅ **Request Monitoring**: Performance metrics collection
- ✅ **Memory Management**: Automatic cleanup and monitoring

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Failed**

```bash
# Check MySQL service
sudo systemctl status mysql

# Verify credentials in .env
mysql -u your_user -p your_database
```

**2. Redis Connection Issues**

```bash
# Check Redis service
redis-cli ping

# Or disable Redis in .env
REDIS_ENABLED=false
```

**3. Permission Errors**

```bash
# Fix upload directory permissions
sudo chown -R $USER:$USER ./uploads
chmod 755 ./uploads
```

**4. Port Already in Use**

```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Or set in .env
LOG_LEVEL=debug
```

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

## 🔄 Deployment

### Production Checklist

- [ ] Update environment variables for production
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Test all endpoints
- [ ] Run performance tests
- [ ] Set up logging aggregation

### Quick Production Deployment

```bash
# Deploy to production
npm run deploy:prod

# Or using Docker
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support

- **Documentation**: `/docs` endpoint
- **Health Check**: `/api/health` endpoint
- **Logs**: Check application logs for detailed error information
- **Issues**: Report bugs via GitHub issues

## 🎉 Success!

Your RevEd Kids backend is now production-ready with:

- **Type-safe API** with comprehensive validation
- **High-performance architecture** with caching and pooling
- **Enterprise-grade security** with multiple protection layers
- **Comprehensive monitoring** with health checks and metrics
- **Production deployment** ready with Docker support

The backend is now ready to handle educational content, student authentication, progress tracking, and spaced repetition learning algorithms at scale!
