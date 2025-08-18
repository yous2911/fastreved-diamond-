#!/bin/bash

# RevEd Kids Backup and Recovery Script
# This script handles database backups, file backups, and automated recovery procedures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/reved-kids}"
LOG_DIR="${LOG_DIR:-/var/log/reved-kids}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${BACKUP_COMPRESSION_LEVEL:-6}"
ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION_ENABLED:-true}"

# Timestamp for this backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)

# Logging
LOG_FILE="${LOG_DIR}/backup_${DATE}.log"
ERROR_LOG_FILE="${LOG_DIR}/backup_${DATE}_error.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$ERROR_LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Load environment variables
load_env() {
    if [[ -f "${PROJECT_ROOT}/.env.production" ]]; then
        export $(grep -v '^#' "${PROJECT_ROOT}/.env.production" | xargs)
    elif [[ -f "${PROJECT_ROOT}/.env" ]]; then
        export $(grep -v '^#' "${PROJECT_ROOT}/.env" | xargs)
    else
        error "No environment file found"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    mkdir -p "$BACKUP_DIR"/{database,uploads,config,logs}
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"/temp
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if mysqldump is available
    if ! command -v mysqldump &> /dev/null; then
        error "mysqldump is not installed"
        exit 1
    fi
    
    # Check if gzip is available
    if ! command -v gzip &> /dev/null; then
        error "gzip is not installed"
        exit 1
    fi
    
    # Check if openssl is available (for encryption)
    if [[ "$ENCRYPTION_ENABLED" == "true" ]] && ! command -v openssl &> /dev/null; then
        error "openssl is not installed (required for encryption)"
        exit 1
    fi
    
    # Check if AWS CLI is available (for S3 upload)
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && ! command -v aws &> /dev/null; then
        warn "AWS CLI is not installed (S3 upload will be skipped)"
    fi
    
    log "Prerequisites check completed"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    local db_backup_file="${BACKUP_DIR}/database/db_backup_${TIMESTAMP}.sql"
    local db_backup_compressed="${db_backup_file}.gz"
    local db_backup_encrypted="${db_backup_compressed}.enc"
    
    # Database connection parameters
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-3306}"
    local db_user="${DB_USER:-root}"
    local db_password="${DB_PASSWORD:-}"
    local db_name="${DB_NAME:-reved_kids}"
    
    # Create mysqldump command
    local mysqldump_cmd="mysqldump"
    if [[ -n "$db_host" ]]; then
        mysqldump_cmd="$mysqldump_cmd -h $db_host"
    fi
    if [[ -n "$db_port" ]]; then
        mysqldump_cmd="$mysqldump_cmd -P $db_port"
    fi
    if [[ -n "$db_user" ]]; then
        mysqldump_cmd="$mysqldump_cmd -u $db_user"
    fi
    if [[ -n "$db_password" ]]; then
        mysqldump_cmd="$mysqldump_cmd -p$db_password"
    fi
    
    # Add additional options
    mysqldump_cmd="$mysqldump_cmd --single-transaction --routines --triggers --events --add-drop-database --databases $db_name"
    
    # Execute backup
    if $mysqldump_cmd > "$db_backup_file" 2>> "$ERROR_LOG_FILE"; then
        log "Database backup completed: $db_backup_file"
        
        # Compress backup
        if gzip -${COMPRESSION_LEVEL} "$db_backup_file" 2>> "$ERROR_LOG_FILE"; then
            log "Database backup compressed: $db_backup_compressed"
            
            # Encrypt backup if enabled
            if [[ "$ENCRYPTION_ENABLED" == "true" ]] && [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
                if openssl enc -aes-256-cbc -salt -in "$db_backup_compressed" -out "$db_backup_encrypted" -k "$BACKUP_ENCRYPTION_KEY" 2>> "$ERROR_LOG_FILE"; then
                    log "Database backup encrypted: $db_backup_encrypted"
                    rm "$db_backup_compressed"
                    echo "$db_backup_encrypted"
                else
                    error "Failed to encrypt database backup"
                    echo "$db_backup_compressed"
                fi
            else
                echo "$db_backup_compressed"
            fi
        else
            error "Failed to compress database backup"
            echo "$db_backup_file"
        fi
    else
        error "Database backup failed"
        return 1
    fi
}

# File uploads backup
backup_uploads() {
    log "Starting uploads backup..."
    
    local uploads_dir="${UPLOAD_PATH:-${PROJECT_ROOT}/uploads}"
    local uploads_backup_file="${BACKUP_DIR}/uploads/uploads_backup_${TIMESTAMP}.tar.gz"
    local uploads_backup_encrypted="${uploads_backup_file}.enc"
    
    if [[ ! -d "$uploads_dir" ]]; then
        warn "Uploads directory does not exist: $uploads_dir"
        return 0
    fi
    
    # Create tar archive
    if tar -czf "$uploads_backup_file" -C "$(dirname "$uploads_dir")" "$(basename "$uploads_dir")" 2>> "$ERROR_LOG_FILE"; then
        log "Uploads backup completed: $uploads_backup_file"
        
        # Encrypt backup if enabled
        if [[ "$ENCRYPTION_ENABLED" == "true" ]] && [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            if openssl enc -aes-256-cbc -salt -in "$uploads_backup_file" -out "$uploads_backup_encrypted" -k "$BACKUP_ENCRYPTION_KEY" 2>> "$ERROR_LOG_FILE"; then
                log "Uploads backup encrypted: $uploads_backup_encrypted"
                rm "$uploads_backup_file"
                echo "$uploads_backup_encrypted"
            else
                error "Failed to encrypt uploads backup"
                echo "$uploads_backup_file"
            fi
        else
            echo "$uploads_backup_file"
        fi
    else
        error "Uploads backup failed"
        return 1
    fi
}

# Configuration backup
backup_config() {
    log "Starting configuration backup..."
    
    local config_backup_file="${BACKUP_DIR}/config/config_backup_${TIMESTAMP}.tar.gz"
    local config_backup_encrypted="${config_backup_file}.enc"
    
    # Files to backup
    local config_files=(
        "${PROJECT_ROOT}/.env.production"
        "${PROJECT_ROOT}/ecosystem.config.js"
        "${PROJECT_ROOT}/drizzle.config.ts"
        "${PROJECT_ROOT}/package.json"
        "${PROJECT_ROOT}/package-lock.json"
    )
    
    # Create temporary directory for config files
    local temp_config_dir="${BACKUP_DIR}/temp/config_${TIMESTAMP}"
    mkdir -p "$temp_config_dir"
    
    # Copy config files
    for file in "${config_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$temp_config_dir/"
        fi
    done
    
    # Create tar archive
    if tar -czf "$config_backup_file" -C "$temp_config_dir" . 2>> "$ERROR_LOG_FILE"; then
        log "Configuration backup completed: $config_backup_file"
        
        # Encrypt backup if enabled
        if [[ "$ENCRYPTION_ENABLED" == "true" ]] && [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            if openssl enc -aes-256-cbc -salt -in "$config_backup_file" -out "$config_backup_encrypted" -k "$BACKUP_ENCRYPTION_KEY" 2>> "$ERROR_LOG_FILE"; then
                log "Configuration backup encrypted: $config_backup_encrypted"
                rm "$config_backup_file"
                echo "$config_backup_encrypted"
            else
                error "Failed to encrypt configuration backup"
                echo "$config_backup_file"
            fi
        else
            echo "$config_backup_file"
        fi
        
        # Clean up temp directory
        rm -rf "$temp_config_dir"
    else
        error "Configuration backup failed"
        rm -rf "$temp_config_dir"
        return 1
    fi
}

# Logs backup
backup_logs() {
    log "Starting logs backup..."
    
    local logs_backup_file="${BACKUP_DIR}/logs/logs_backup_${TIMESTAMP}.tar.gz"
    local logs_backup_encrypted="${logs_backup_file}.enc"
    
    # Log files to backup
    local log_files=(
        "${LOG_DIR}/*.log"
        "${PROJECT_ROOT}/logs/*.log"
        "/var/log/nginx/access.log"
        "/var/log/nginx/error.log"
    )
    
    # Create temporary directory for log files
    local temp_logs_dir="${BACKUP_DIR}/temp/logs_${TIMESTAMP}"
    mkdir -p "$temp_logs_dir"
    
    # Copy log files
    for pattern in "${log_files[@]}"; do
        for file in $pattern; do
            if [[ -f "$file" ]]; then
                cp "$file" "$temp_logs_dir/"
            fi
        done
    done
    
    # Create tar archive
    if tar -czf "$logs_backup_file" -C "$temp_logs_dir" . 2>> "$ERROR_LOG_FILE"; then
        log "Logs backup completed: $logs_backup_file"
        
        # Encrypt backup if enabled
        if [[ "$ENCRYPTION_ENABLED" == "true" ]] && [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            if openssl enc -aes-256-cbc -salt -in "$logs_backup_file" -out "$logs_backup_encrypted" -k "$BACKUP_ENCRYPTION_KEY" 2>> "$ERROR_LOG_FILE"; then
                log "Logs backup encrypted: $logs_backup_encrypted"
                rm "$logs_backup_file"
                echo "$logs_backup_encrypted"
            else
                error "Failed to encrypt logs backup"
                echo "$logs_backup_file"
            fi
        else
            echo "$logs_backup_file"
        fi
        
        # Clean up temp directory
        rm -rf "$temp_logs_dir"
    else
        error "Logs backup failed"
        rm -rf "$temp_logs_dir"
        return 1
    fi
}

# Upload to S3
upload_to_s3() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]] || [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
        warn "S3 upload skipped - AWS credentials or bucket not configured"
        return 0
    fi
    
    if ! command -v aws &> /dev/null; then
        warn "S3 upload skipped - AWS CLI not installed"
        return 0
    fi
    
    local s3_key="backups/${backup_type}/$(basename "$backup_file")"
    
    log "Uploading $backup_file to S3..."
    
    if aws s3 cp "$backup_file" "s3://${BACKUP_S3_BUCKET}/${s3_key}" \
        --region "${BACKUP_S3_REGION:-us-east-1}" \
        --storage-class STANDARD_IA \
        --metadata "backup-type=${backup_type},timestamp=${TIMESTAMP}" \
        2>> "$ERROR_LOG_FILE"; then
        log "S3 upload completed: s3://${BACKUP_S3_BUCKET}/${s3_key}"
    else
        error "S3 upload failed for $backup_file"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        if rm "$file" 2>> "$ERROR_LOG_FILE"; then
            ((deleted_count++))
            info "Deleted old backup: $file"
        else
            error "Failed to delete old backup: $file"
        fi
    done < <(find "$BACKUP_DIR" -name "*.gz" -o -name "*.enc" -mtime +$RETENTION_DAYS -print0)
    
    log "Cleanup completed: $deleted_count files deleted"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    local backup_type="$2"
    
    log "Verifying backup integrity: $backup_file"
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check file size
    local file_size=$(stat -c%s "$backup_file")
    if [[ $file_size -eq 0 ]]; then
        error "Backup file is empty: $backup_file"
        return 1
    fi
    
    # Test compression/encryption
    if [[ "$backup_file" == *.enc ]]; then
        # Test encrypted file
        if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            if ! openssl enc -d -aes-256-cbc -in "$backup_file" -out /dev/null -k "$BACKUP_ENCRYPTION_KEY" 2>/dev/null; then
                error "Encrypted backup file is corrupted: $backup_file"
                return 1
            fi
        fi
    elif [[ "$backup_file" == *.gz ]]; then
        # Test compressed file
        if ! gzip -t "$backup_file" 2>/dev/null; then
            error "Compressed backup file is corrupted: $backup_file"
            return 1
        fi
    fi
    
    log "Backup verification passed: $backup_file"
    return 0
}

# Create backup manifest
create_manifest() {
    local manifest_file="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.json"
    
    local manifest=$(cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "backup_type": "full",
  "retention_days": $RETENTION_DAYS,
  "compression_level": $COMPRESSION_LEVEL,
  "encryption_enabled": $ENCRYPTION_ENABLED,
  "files": [
EOF
)
    
    # Add database backup
    if [[ -n "${DB_BACKUP_FILE:-}" ]]; then
        local db_size=$(stat -c%s "$DB_BACKUP_FILE" 2>/dev/null || echo "0")
        manifest="$manifest"$'\n    {'
        manifest="$manifest"$'\n      "type": "database",'
        manifest="$manifest"$'\n      "file": "'$(basename "$DB_BACKUP_FILE")'",'
        manifest="$manifest"$'\n      "size": '$db_size','
        manifest="$manifest"$'\n      "verified": true'
        manifest="$manifest"$'\n    },'
    fi
    
    # Add uploads backup
    if [[ -n "${UPLOADS_BACKUP_FILE:-}" ]]; then
        local uploads_size=$(stat -c%s "$UPLOADS_BACKUP_FILE" 2>/dev/null || echo "0")
        manifest="$manifest"$'\n    {'
        manifest="$manifest"$'\n      "type": "uploads",'
        manifest="$manifest"$'\n      "file": "'$(basename "$UPLOADS_BACKUP_FILE")'",'
        manifest="$manifest"$'\n      "size": '$uploads_size','
        manifest="$manifest"$'\n      "verified": true'
        manifest="$manifest"$'\n    },'
    fi
    
    # Add config backup
    if [[ -n "${CONFIG_BACKUP_FILE:-}" ]]; then
        local config_size=$(stat -c%s "$CONFIG_BACKUP_FILE" 2>/dev/null || echo "0")
        manifest="$manifest"$'\n    {'
        manifest="$manifest"$'\n      "type": "config",'
        manifest="$manifest"$'\n      "file": "'$(basename "$CONFIG_BACKUP_FILE")'",'
        manifest="$manifest"$'\n      "size": '$config_size','
        manifest="$manifest"$'\n      "verified": true'
        manifest="$manifest"$'\n    },'
    fi
    
    # Add logs backup
    if [[ -n "${LOGS_BACKUP_FILE:-}" ]]; then
        local logs_size=$(stat -c%s "$LOGS_BACKUP_FILE" 2>/dev/null || echo "0")
        manifest="$manifest"$'\n    {'
        manifest="$manifest"$'\n      "type": "logs",'
        manifest="$manifest"$'\n      "file": "'$(basename "$LOGS_BACKUP_FILE")'",'
        manifest="$manifest"$'\n      "size": '$logs_size','
        manifest="$manifest"$'\n      "verified": true'
        manifest="$manifest"$'\n    }'
    fi
    
    manifest="$manifest"$'\n  ]'
    manifest="$manifest"$'\n}'
    
    echo "$manifest" > "$manifest_file"
    log "Backup manifest created: $manifest_file"
}

# Main backup function
perform_backup() {
    log "Starting RevEd Kids backup process..."
    
    # Initialize variables
    DB_BACKUP_FILE=""
    UPLOADS_BACKUP_FILE=""
    CONFIG_BACKUP_FILE=""
    LOGS_BACKUP_FILE=""
    
    # Load environment
    load_env
    
    # Create directories
    create_directories
    
    # Check prerequisites
    check_prerequisites
    
    # Perform backups
    if DB_BACKUP_FILE=$(backup_database); then
        log "Database backup successful"
    else
        error "Database backup failed"
        exit 1
    fi
    
    if UPLOADS_BACKUP_FILE=$(backup_uploads); then
        log "Uploads backup successful"
    else
        warn "Uploads backup failed (continuing...)"
    fi
    
    if CONFIG_BACKUP_FILE=$(backup_config); then
        log "Configuration backup successful"
    else
        warn "Configuration backup failed (continuing...)"
    fi
    
    if LOGS_BACKUP_FILE=$(backup_logs); then
        log "Logs backup successful"
    else
        warn "Logs backup failed (continuing...)"
    fi
    
    # Verify backups
    if [[ -n "$DB_BACKUP_FILE" ]]; then
        verify_backup "$DB_BACKUP_FILE" "database"
    fi
    
    if [[ -n "$UPLOADS_BACKUP_FILE" ]]; then
        verify_backup "$UPLOADS_BACKUP_FILE" "uploads"
    fi
    
    if [[ -n "$CONFIG_BACKUP_FILE" ]]; then
        verify_backup "$CONFIG_BACKUP_FILE" "config"
    fi
    
    if [[ -n "$LOGS_BACKUP_FILE" ]]; then
        verify_backup "$LOGS_BACKUP_FILE" "logs"
    fi
    
    # Upload to S3
    if [[ -n "$DB_BACKUP_FILE" ]]; then
        upload_to_s3 "$DB_BACKUP_FILE" "database"
    fi
    
    if [[ -n "$UPLOADS_BACKUP_FILE" ]]; then
        upload_to_s3 "$UPLOADS_BACKUP_FILE" "uploads"
    fi
    
    if [[ -n "$CONFIG_BACKUP_FILE" ]]; then
        upload_to_s3 "$CONFIG_BACKUP_FILE" "config"
    fi
    
    if [[ -n "$LOGS_BACKUP_FILE" ]]; then
        upload_to_s3 "$LOGS_BACKUP_FILE" "logs"
    fi
    
    # Create manifest
    create_manifest
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Cleanup temp directory
    rm -rf "${BACKUP_DIR}/temp"
    
    log "Backup process completed successfully"
}

# Recovery functions
recover_database() {
    local backup_file="$1"
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-3306}"
    local db_user="${DB_USER:-root}"
    local db_password="${DB_PASSWORD:-}"
    local db_name="${DB_NAME:-reved_kids}"
    
    log "Starting database recovery from: $backup_file"
    
    # Create mysql command
    local mysql_cmd="mysql"
    if [[ -n "$db_host" ]]; then
        mysql_cmd="$mysql_cmd -h $db_host"
    fi
    if [[ -n "$db_port" ]]; then
        mysql_cmd="$mysql_cmd -P $db_port"
    fi
    if [[ -n "$db_user" ]]; then
        mysql_cmd="$mysql_cmd -u $db_user"
    fi
    if [[ -n "$db_password" ]]; then
        mysql_cmd="$mysql_cmd -p$db_password"
    fi
    
    # Decrypt if needed
    local temp_file=""
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            error "Encryption key not provided for encrypted backup"
            return 1
        fi
        
        temp_file="${backup_file%.enc}"
        if ! openssl enc -d -aes-256-cbc -in "$backup_file" -out "$temp_file" -k "$BACKUP_ENCRYPTION_KEY"; then
            error "Failed to decrypt backup file"
            return 1
        fi
        backup_file="$temp_file"
    fi
    
    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        if ! gunzip -c "$backup_file" | $mysql_cmd; then
            error "Database recovery failed"
            [[ -n "$temp_file" ]] && rm -f "$temp_file"
            return 1
        fi
    else
        if ! $mysql_cmd < "$backup_file"; then
            error "Database recovery failed"
            [[ -n "$temp_file" ]] && rm -f "$temp_file"
            return 1
        fi
    fi
    
    # Cleanup temp file
    [[ -n "$temp_file" ]] && rm -f "$temp_file"
    
    log "Database recovery completed successfully"
}

recover_uploads() {
    local backup_file="$1"
    local uploads_dir="${UPLOAD_PATH:-${PROJECT_ROOT}/uploads}"
    
    log "Starting uploads recovery from: $backup_file"
    
    # Create uploads directory if it doesn't exist
    mkdir -p "$uploads_dir"
    
    # Decrypt if needed
    local temp_file=""
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            error "Encryption key not provided for encrypted backup"
            return 1
        fi
        
        temp_file="${backup_file%.enc}"
        if ! openssl enc -d -aes-256-cbc -in "$backup_file" -out "$temp_file" -k "$BACKUP_ENCRYPTION_KEY"; then
            error "Failed to decrypt backup file"
            return 1
        fi
        backup_file="$temp_file"
    fi
    
    # Extract archive
    if ! tar -xzf "$backup_file" -C "$(dirname "$uploads_dir")"; then
        error "Uploads recovery failed"
        [[ -n "$temp_file" ]] && rm -f "$temp_file"
        return 1
    fi
    
    # Cleanup temp file
    [[ -n "$temp_file" ]] && rm -f "$temp_file"
    
    log "Uploads recovery completed successfully"
}

# Main function
main() {
    case "${1:-backup}" in
        "backup")
            perform_backup
            ;;
        "recover-db")
            if [[ -z "${2:-}" ]]; then
                error "Backup file path required for database recovery"
                echo "Usage: $0 recover-db <backup_file>"
                exit 1
            fi
            load_env
            recover_database "$2"
            ;;
        "recover-uploads")
            if [[ -z "${2:-}" ]]; then
                error "Backup file path required for uploads recovery"
                echo "Usage: $0 recover-uploads <backup_file>"
                exit 1
            fi
            load_env
            recover_uploads "$2"
            ;;
        "list")
            echo "Available backups:"
            find "$BACKUP_DIR" -name "*.gz" -o -name "*.enc" | sort
            ;;
        "verify")
            if [[ -z "${2:-}" ]]; then
                error "Backup file path required for verification"
                echo "Usage: $0 verify <backup_file>"
                exit 1
            fi
            verify_backup "$2" "unknown"
            ;;
        "cleanup")
            load_env
            create_directories
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|recover-db|recover-uploads|list|verify|cleanup}"
            echo ""
            echo "Commands:"
            echo "  backup           - Perform full backup"
            echo "  recover-db       - Recover database from backup"
            echo "  recover-uploads  - Recover uploads from backup"
            echo "  list             - List available backups"
            echo "  verify           - Verify backup integrity"
            echo "  cleanup          - Clean up old backups"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 