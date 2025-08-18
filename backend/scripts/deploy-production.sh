#!/bin/bash

# 🚀 RevEd Kids Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "This script must be run from the backend directory"
    exit 1
fi

log "🚀 Starting RevEd Kids Production Deployment..."

# Step 1: Pre-deployment checks
log "📋 Running pre-deployment checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    error ".env.production file not found. Please run the production readiness script first."
    exit 1
fi

# Check if production Docker Compose file exists
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml not found. Please run the production readiness script first."
    exit 1
fi

success "Pre-deployment checks passed"

# Step 2: Run production readiness check
log "🔍 Running production readiness check..."
if ! node scripts/production-checklist.js; then
    error "Production readiness check failed. Please fix the issues and try again."
    exit 1
fi

success "Production readiness check passed"

# Step 3: Stop existing containers
log "🛑 Stopping existing containers..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    docker-compose -f docker-compose.prod.yml down
    success "Existing containers stopped"
else
    log "No running containers found"
fi

# Step 4: Clean up old images (optional)
read -p "Do you want to clean up old Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "🧹 Cleaning up old Docker images..."
    docker system prune -f
    success "Docker cleanup completed"
fi

# Step 5: Build new images
log "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -ne 0 ]; then
    error "Docker build failed"
    exit 1
fi

success "Docker images built successfully"

# Step 6: Start services
log "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    error "Failed to start services"
    exit 1
fi

success "Services started successfully"

# Step 7: Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 30

# Step 8: Health checks
log "🔍 Running health checks..."

# Check if containers are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    error "Some containers are not running"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# Check application health
log "Checking application health..."
for i in {1..10}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "Application health check passed"
        break
    fi
    
    if [ $i -eq 10 ]; then
        error "Application health check failed after 10 attempts"
        docker-compose -f docker-compose.prod.yml logs app
        exit 1
    fi
    
    log "Health check attempt $i/10 failed, retrying in 10 seconds..."
    sleep 10
done

# Check database health
log "Checking database health..."
if curl -f http://localhost:3000/api/monitoring/health > /dev/null 2>&1; then
    success "Database health check passed"
else
    warning "Database health check failed - check logs"
fi

# Step 9: Final verification
log "✅ Final verification..."

# Check all services are running
services_running=$(docker-compose -f docker-compose.prod.yml ps --services --filter "status=running" | wc -l)
total_services=$(docker-compose -f docker-compose.prod.yml config --services | wc -l)

if [ "$services_running" -eq "$total_services" ]; then
    success "All services are running ($services_running/$total_services)"
else
    warning "Some services may not be running ($services_running/$total_services)"
fi

# Display service URLs
echo
log "📊 Deployment Summary:"
echo "====================="
echo "✅ Application deployed successfully"
echo "🌐 API URL: http://localhost:3000/api"
echo "📊 Health Check: http://localhost:3000/api/health"
echo "📚 API Docs: http://localhost:3000/docs"
echo "📈 Monitoring: http://localhost:3000/api/monitoring/health"
echo

# Display useful commands
log "📝 Useful Commands:"
echo "=================="
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "Monitor: ./scripts/monitor-production.sh"
echo "Backup: ./scripts/backup.sh"
echo "Stop: docker-compose -f docker-compose.prod.yml down"
echo "Restart: docker-compose -f docker-compose.prod.yml restart"
echo

success "🎉 Production deployment completed successfully!"

# Optional: Start monitoring
read -p "Do you want to start monitoring? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "📊 Starting monitoring..."
    ./scripts/monitor-production.sh &
    success "Monitoring started in background"
fi

log "🚀 RevEd Kids is now running in production!" 