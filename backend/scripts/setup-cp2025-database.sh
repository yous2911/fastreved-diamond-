#!/bin/bash

# CP2025 Database Setup Script
# This script sets up the complete CP2025 educational database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"fastrevedkids"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"password"}

echo -e "${BLUE}🚀 CP2025 Database Setup Script${NC}"
echo "=================================="
echo -e "Database: ${YELLOW}${DB_NAME}${NC}"
echo -e "Host: ${YELLOW}${DB_HOST}:${DB_PORT}${NC}"
echo -e "User: ${YELLOW}${DB_USER}${NC}"
echo ""

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Function to check if PostgreSQL is running
check_postgres() {
    log "Checking PostgreSQL connection..."
    
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL. Please check your database configuration."
    fi
    
    log "✅ PostgreSQL connection successful"
}

# Function to create database if it doesn't exist
create_database() {
    log "Creating database if it doesn't exist..."
    
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | grep -q 1; then
        PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
        log "✅ Database '$DB_NAME' created"
    else
        log "✅ Database '$DB_NAME' already exists"
    fi
}

# Function to run SQL schema
run_schema() {
    log "Running CP2025 database schema..."
    
    if [ ! -f "scripts/cp2025_database_schema.sql" ]; then
        error "Schema file not found: scripts/cp2025_database_schema.sql"
    fi
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/cp2025_database_schema.sql
    
    log "✅ Database schema applied successfully"
}

# Function to populate data
populate_data() {
    log "Populating database with CP2025 data..."
    
    if [ ! -f "scripts/populate_cp2025_data.sql" ]; then
        error "Data file not found: scripts/populate_cp2025_data.sql"
    fi
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/populate_cp2025_data.sql
    
    log "✅ Database populated successfully"
}

# Function to run Node.js population script
run_node_population() {
    log "Running Node.js population script..."
    
    if [ ! -f "scripts/populate-cp2025-database.js" ]; then
        error "Node.js script not found: scripts/populate-cp2025-database.js"
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js to run the population script."
    fi
    
    # Check if pg package is installed
    if [ ! -d "node_modules/pg" ]; then
        log "Installing PostgreSQL client..."
        npm install pg
    fi
    
    node scripts/populate-cp2025-database.js
    
    log "✅ Node.js population script completed"
}

# Function to verify setup
verify_setup() {
    log "Verifying database setup..."
    
    # Check if tables exist
    TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'cp2025_%';" | tr -d ' ')
    
    if [ "$TABLE_COUNT" -lt 7 ]; then
        error "Expected at least 7 CP2025 tables, found $TABLE_COUNT"
    fi
    
    # Check module count
    MODULE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM cp2025_modules;" | tr -d ' ')
    
    if [ "$MODULE_COUNT" -lt 10 ]; then
        error "Expected at least 10 modules, found $MODULE_COUNT"
    fi
    
    # Check exercise count
    EXERCISE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM cp2025_exercises;" | tr -d ' ')
    
    if [ "$EXERCISE_COUNT" -lt 50 ]; then
        error "Expected at least 50 exercises, found $EXERCISE_COUNT"
    fi
    
    log "✅ Database verification successful"
    log "   • Tables: $TABLE_COUNT"
    log "   • Modules: $MODULE_COUNT"
    log "   • Exercises: $EXERCISE_COUNT"
}

# Function to display statistics
show_statistics() {
    log "Database Statistics:"
    echo ""
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        'Total Modules' as metric,
        COUNT(*) as value
    FROM cp2025_modules
    UNION ALL
    SELECT 
        'Total Exercises' as metric,
        COUNT(*) as value
    FROM cp2025_exercises
    UNION ALL
    SELECT 
        'CP Modules' as metric,
        COUNT(*) as value
    FROM cp2025_modules
    WHERE niveau = 'CP'
    UNION ALL
    SELECT 
        'CP-CE1 Bridge Modules' as metric,
        COUNT(*) as value
    FROM cp2025_modules
    WHERE niveau = 'CP-CE1'
    UNION ALL
    SELECT 
        'French Exercises' as metric,
        COUNT(*) as value
    FROM cp2025_exercises e
    JOIN cp2025_modules m ON e.module_id = m.id
    WHERE m.matiere = 'FRANCAIS'
    UNION ALL
    SELECT 
        'Mathematics Exercises' as metric,
        COUNT(*) as value
    FROM cp2025_exercises e
    JOIN cp2025_modules m ON e.module_id = m.id
    WHERE m.matiere = 'MATHEMATIQUES'
    ORDER BY metric;
    "
}

# Function to create backup
create_backup() {
    log "Creating database backup..."
    
    BACKUP_FILE="cp2025_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "backups/$BACKUP_FILE"
    
    log "✅ Backup created: backups/$BACKUP_FILE"
}

# Main execution
main() {
    echo -e "${BLUE}Starting CP2025 database setup...${NC}"
    echo ""
    
    # Create backups directory
    mkdir -p backups
    
    # Run setup steps
    check_postgres
    create_database
    run_schema
    populate_data
    
    # Try Node.js population if available
    if [ -f "scripts/populate-cp2025-database.js" ]; then
        run_node_population
    fi
    
    verify_setup
    show_statistics
    
    # Create backup
    create_backup
    
    echo ""
    echo -e "${GREEN}🎉 CP2025 Database setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Start your backend server"
    echo "2. Test the API endpoints at /api/cp2025/*"
    echo "3. Access the database directly with:"
    echo "   PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo ""
    echo -e "${YELLOW}API Endpoints available:${NC}"
    echo "• GET /api/cp2025/modules - List all modules"
    echo "• GET /api/cp2025/exercises - List all exercises"
    echo "• GET /api/cp2025/statistics - Database statistics"
    echo "• GET /api/cp2025/export - Export all data"
    echo ""
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "verify")
        verify_setup
        show_statistics
        ;;
    "backup")
        create_backup
        ;;
    "schema")
        run_schema
        ;;
    "populate")
        populate_data
        ;;
    "node-populate")
        run_node_population
        ;;
    "help"|"-h"|"--help")
        echo "CP2025 Database Setup Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup        Complete database setup (default)"
        echo "  verify       Verify the database setup"
        echo "  backup       Create a database backup"
        echo "  schema       Run only the schema"
        echo "  populate     Run only the data population"
        echo "  node-populate Run Node.js population script"
        echo "  help         Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  DB_HOST      PostgreSQL host (default: localhost)"
        echo "  DB_PORT      PostgreSQL port (default: 5432)"
        echo "  DB_NAME      Database name (default: fastrevedkids)"
        echo "  DB_USER      Database user (default: postgres)"
        echo "  DB_PASSWORD  Database password (default: password)"
        ;;
    *)
        error "Unknown command: $1. Use 'help' for usage information."
        ;;
esac 