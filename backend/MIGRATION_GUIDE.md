# Database Migration System Guide

This guide explains how to use the comprehensive database migration system for the RevEd Kids backend.

## Overview

The migration system provides:
- ✅ **Version tracking** - Tracks applied migrations in database
- ✅ **Rollback capabilities** - Can rollback migrations in reverse order
- ✅ **Migration status** - Check which migrations are applied/pending
- ✅ **Database reset** - Complete database reset functionality
- ✅ **Drizzle integration** - Works with existing Drizzle migrations
- ✅ **SQLite support** - Optimized for SQLite database

## Quick Start

### 1. Run Migrations
```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Run Drizzle migrations only
npm run db:migrate:drizzle
```

### 2. Rollback Migrations
```bash
# Rollback last migration
npm run db:migrate:down

# Rollback multiple migrations (e.g., 3)
tsx src/db/migrate.ts down 3
```

### 3. Reset Database
```bash
# Complete database reset
npm run db:reset

# Check database statistics
npm run db:reset:stats

# Check if database is empty
npm run db:reset:empty
```

## Migration System Architecture

### Files Structure
```
src/db/
├── migrate.ts          # Main migration system
├── reset.ts           # Database reset functionality
├── schema.ts          # Drizzle schema definitions
├── connection.ts      # Database connection
└── seeds/            # Seed data files
```

### Migration Table Schema
The system creates a `__migrations__` table to track applied migrations:

```sql
CREATE TABLE __migrations__ (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  checksum TEXT NOT NULL,
  execution_time INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Types

### 1. Custom Migrations
Custom migrations are stored in the `drizzle/` directory and follow the naming convention:
```
0001_initial_schema.sql
0002_add_gdpr_tables.sql
0003_add_audit_logs.sql
```

### 2. Drizzle Migrations
The system also supports Drizzle-generated migrations:
```bash
# Generate new migration
npm run db:generate

# Run Drizzle migrations
npm run db:migrate:drizzle
```

## Migration Lifecycle

### 1. Migration Discovery
The system scans the `drizzle/` directory for `.sql` files and parses them:
- Extracts migration ID and name from filename
- Generates checksum for content validation
- Creates rollback SQL automatically

### 2. Migration Application
When applying migrations:
1. Checks if migration is already applied
2. Executes migration SQL
3. Records migration in `__migrations__` table
4. Logs execution time and status

### 3. Rollback Process
When rolling back:
1. Identifies migrations to rollback (LIFO order)
2. Executes rollback SQL
3. Removes migration record from tracking table
4. Logs rollback status

## Advanced Usage

### Programmatic Usage

```typescript
import { 
  runMigrations, 
  rollbackMigrations, 
  checkMigrationStatus,
  resetDatabase 
} from './src/db/migrate';

// Run migrations
await runMigrations();

// Rollback last 2 migrations
await rollbackMigrations(2);

// Check status
const status = await checkMigrationStatus();
console.log('Pending migrations:', status.pendingMigrations.length);

// Reset database
await resetDatabase();
```

### Database Reset System

```typescript
import { 
  resetDatabase, 
  isDatabaseEmpty, 
  getDatabaseStats 
} from './src/db/reset';

// Complete reset
await resetDatabase();

// Check if empty
const isEmpty = await isDatabaseEmpty();

// Get statistics
const stats = await getDatabaseStats();
console.log('Tables:', stats.tableCount);
```

## Migration Best Practices

### 1. Migration Naming
- Use descriptive names: `0001_create_students_table.sql`
- Include version numbers for ordering
- Use underscores for spaces

### 2. Migration Content
- Keep migrations atomic (one logical change per migration)
- Include both UP and DOWN operations when possible
- Test rollbacks before applying to production

### 3. Database Schema
The system creates these tables automatically:
- `students` - Student information
- `exercises` - Exercise definitions
- `student_progress` - Progress tracking
- `parental_consent` - GDPR consent management
- `gdpr_requests` - GDPR request handling
- `audit_logs` - Audit trail
- `encryption_keys` - Encryption key management
- `retention_policies` - Data retention policies
- `consent_preferences` - User consent preferences

## Error Handling

### Common Issues

1. **Migration Already Applied**
   ```
   ✅ Migration already applied, skipping
   ```

2. **Invalid Migration File**
   ```
   ⚠️  Invalid migration filename: invalid_file.sql
   ```

3. **Database Connection Error**
   ```
   ❌ Failed to apply migration: SQLITE_CANTOPEN
   ```

### Recovery Procedures

1. **Failed Migration**
   ```bash
   # Check status
   npm run db:migrate:status
   
   # Rollback if needed
   npm run db:migrate:down
   ```

2. **Corrupted Database**
   ```bash
   # Complete reset
   npm run db:reset
   ```

3. **Migration Tracking Issues**
   ```bash
   # Reset and re-run all migrations
   npm run db:reset
   npm run db:migrate
   ```

## Production Considerations

### 1. Backup Before Migrations
Always backup your database before running migrations in production:
```bash
cp reved_kids.db reved_kids.db.backup
```

### 2. Test Migrations
Test migrations in development environment first:
```bash
# Development
npm run db:migrate:status
npm run db:migrate

# Production (after testing)
NODE_ENV=production npm run db:migrate
```

### 3. Monitor Migration Logs
Check migration logs for any issues:
```bash
# Check recent migrations
npm run db:migrate:status
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Database Migrations
  run: |
    cd backend
    npm run db:migrate:status
    npm run db:migrate
```

### Docker Integration
```dockerfile
# Run migrations during container startup
CMD ["sh", "-c", "npm run db:migrate && npm start"]
```

## Troubleshooting

### Migration Status Issues
```bash
# Check current status
npm run db:migrate:status

# Force reset if needed
npm run db:reset
npm run db:migrate
```

### Database Lock Issues
```bash
# Check for database locks
ls -la reved_kids.db*

# Restart application if needed
npm run dev
```

### Performance Issues
- Large migrations may take time
- Monitor execution time in logs
- Consider breaking large migrations into smaller ones

## Support

For issues with the migration system:
1. Check the logs for error messages
2. Verify database file permissions
3. Ensure SQLite is properly installed
4. Check migration file syntax

## Migration System Features

| Feature | Description | Status |
|---------|-------------|--------|
| Version Tracking | Tracks applied migrations | ✅ |
| Rollback Support | Can rollback migrations | ✅ |
| Status Checking | Shows migration status | ✅ |
| Database Reset | Complete reset functionality | ✅ |
| Drizzle Integration | Works with Drizzle ORM | ✅ |
| SQLite Support | Optimized for SQLite | ✅ |
| CLI Interface | Command-line tools | ✅ |
| Programmatic API | TypeScript/JavaScript API | ✅ |
| Error Handling | Comprehensive error handling | ✅ |
| Logging | Detailed operation logging | ✅ | 