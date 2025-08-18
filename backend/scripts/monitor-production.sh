#!/bin/bash

# 📊 RevEd Kids Production Monitoring Script
# This script provides comprehensive monitoring of the production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MONITOR_INTERVAL=60  # seconds
LOG_FILE="./logs/monitoring.log"
ALERT_LOG="./logs/alerts.log"
MAX_LOG_SIZE=10485760  # 10MB

# Create logs directory if it doesn't exist
mkdir -p ./logs

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" "$ALERT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "This script must be run from the backend directory"
    exit 1
fi

# Function to rotate logs if they get too large
rotate_logs() {
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
        mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d_%H%M%S)"
        touch "$LOG_FILE"
        info "Log file rotated"
    fi
}

# Function to check Docker services
check_docker_services() {
    local services_status=()
    local failed_services=()
    
    # Get list of services from docker-compose
    local services=$(docker-compose -f docker-compose.prod.yml config --services 2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        error "Could not get services from docker-compose.prod.yml"
        return 1
    fi
    
    for service in $services; do
        local status=$(docker-compose -f docker-compose.prod.yml ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "unknown")
        
        if [ "$status" = "running" ]; then
            services_status+=("✅ $service: $status")
        else
            services_status+=("❌ $service: $status")
            failed_services+=("$service")
        fi
    done
    
    # Display status
    info "Docker Services Status:"
    for status in "${services_status[@]}"; do
        echo "  $status"
    done
    
    # Return error if any service failed
    if [ ${#failed_services[@]} -gt 0 ]; then
        warning "Failed services: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Function to check application health
check_application_health() {
    local health_url="http://localhost:3000/api/health"
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$health_url" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        local response_body=$(cat /tmp/health_response 2>/dev/null || echo "{}")
        success "Application health check passed (HTTP $http_code)"
        echo "  Response: $response_body"
        return 0
    else
        error "Application health check failed (HTTP $http_code)"
        return 1
    fi
}

# Function to check monitoring endpoint
check_monitoring_health() {
    local monitoring_url="http://localhost:3000/api/monitoring/health"
    local response=$(curl -s -w "%{http_code}" -o /tmp/monitoring_response "$monitoring_url" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        local response_body=$(cat /tmp/monitoring_response 2>/dev/null || echo "{}")
        success "Monitoring health check passed (HTTP $http_code)"
        echo "  Response: $response_body"
        return 0
    else
        warning "Monitoring health check failed (HTTP $http_code)"
        return 1
    fi
}

# Function to check database connectivity
check_database_connectivity() {
    # Try to connect to database through the application
    local db_check_url="http://localhost:3000/api/monitoring/database"
    local response=$(curl -s -w "%{http_code}" -o /tmp/db_response "$db_check_url" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        success "Database connectivity check passed"
        return 0
    else
        warning "Database connectivity check failed (HTTP $http_code)"
        return 1
    fi
}

# Function to check Redis connectivity
check_redis_connectivity() {
    # Try to connect to Redis through the application
    local redis_check_url="http://localhost:3000/api/monitoring/redis"
    local response=$(curl -s -w "%{http_code}" -o /tmp/redis_response "$redis_check_url" 2>/dev/null || echo "000")
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        success "Redis connectivity check passed"
        return 0
    else
        warning "Redis connectivity check failed (HTTP $http_code)"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    info "System Resources:"
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "  CPU Usage: ${cpu_usage}%"
    
    # Memory usage
    local mem_info=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    echo "  Memory Usage: $mem_info"
    
    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2{print $5}')
    echo "  Disk Usage: $disk_usage"
    
    # Docker disk usage
    local docker_usage=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null || echo "Unable to get Docker disk usage")
    echo "  Docker Disk Usage:"
    echo "$docker_usage" | while read line; do
        echo "    $line"
    done
}

# Function to check recent logs for errors
check_recent_logs() {
    info "Recent Application Logs (last 10 lines):"
    docker-compose -f docker-compose.prod.yml logs --tail=10 app 2>/dev/null | while read line; do
        if [[ $line == *"ERROR"* ]] || [[ $line == *"error"* ]]; then
            echo -e "  ${RED}$line${NC}"
        elif [[ $line == *"WARN"* ]] || [[ $line == *"warn"* ]]; then
            echo -e "  ${YELLOW}$line${NC}"
        else
            echo "  $line"
        fi
    done
}

# Function to display summary
display_summary() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo
    echo "=========================================="
    echo "📊 RevEd Kids Production Monitoring"
    echo "=========================================="
    echo "Timestamp: $timestamp"
    echo "Monitoring Interval: ${MONITOR_INTERVAL}s"
    echo "Log File: $LOG_FILE"
    echo "=========================================="
}

# Function to handle cleanup on exit
cleanup() {
    info "Monitoring stopped"
    rm -f /tmp/health_response /tmp/monitoring_response /tmp/db_response /tmp/redis_response
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main monitoring loop
main() {
    display_summary
    
    while true; do
        local start_time=$(date +%s)
        
        log "Starting monitoring cycle..."
        
        # Rotate logs if needed
        rotate_logs
        
        # Check Docker services
        if ! check_docker_services; then
            error "Docker services check failed"
        fi
        
        # Check application health
        if ! check_application_health; then
            error "Application health check failed"
        fi
        
        # Check monitoring endpoint
        if ! check_monitoring_health; then
            warning "Monitoring health check failed"
        fi
        
        # Check database connectivity
        if ! check_database_connectivity; then
            warning "Database connectivity check failed"
        fi
        
        # Check Redis connectivity
        if ! check_redis_connectivity; then
            warning "Redis connectivity check failed"
        fi
        
        # Check system resources
        check_system_resources
        
        # Check recent logs
        check_recent_logs
        
        # Calculate time to next cycle
        local end_time=$(date +%s)
        local elapsed=$((end_time - start_time))
        local sleep_time=$((MONITOR_INTERVAL - elapsed))
        
        if [ $sleep_time -gt 0 ]; then
            log "Monitoring cycle completed in ${elapsed}s. Sleeping for ${sleep_time}s..."
            sleep $sleep_time
        else
            log "Monitoring cycle took longer than interval (${elapsed}s). Starting next cycle immediately..."
        fi
        
        echo
    done
}

# Start monitoring
main 