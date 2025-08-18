import { db } from './connection';
import { config } from '../config/config';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Migration interface
interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  timestamp: number;
  checksum: string;
}

// Migration status interface
interface MigrationStatus {
  id: string;
  name: string;
  applied_at: string;
  checksum: string;
  execution_time: number;
}

// Migration manager class
export class MigrationManager {
  private migrationsTable = '__migrations__';
  private migrationsPath = path.join(process.cwd(), 'drizzle');
  private sqlite: Database.Database;

  constructor() {
    this.sqlite = new Database('reved_kids.db');
    this.ensureMigrationsTable();
  }

  /**
   * Ensure migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    try {
      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL,
          checksum TEXT NOT NULL,
          execution_time INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (error) {
      console.error('Failed to create migrations table:', error);
      throw error;
    }
  }

  /**
   * Get all available migrations from filesystem
   */
  private async getAvailableMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        console.warn('⚠️  Migrations directory not found:', this.migrationsPath);
        return migrations;
      }

      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const filePath = path.join(this.migrationsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Parse migration file
        const migration = this.parseMigrationFile(file, content);
        if (migration) {
          migrations.push(migration);
        }
      }
    } catch (error) {
      console.error('Failed to read migration files:', error);
      throw error;
    }

    return migrations;
  }

  /**
   * Parse migration file content
   */
  private parseMigrationFile(filename: string, content: string): Migration | null {
    try {
      // Extract migration ID and name from filename (e.g., "0001_slimy_storm.sql")
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`⚠️  Invalid migration filename: ${filename}`);
        return null;
      }

      const [, id, name] = match;
      const timestamp = parseInt(id);
      
      // For now, treat the entire content as the "up" migration
      const up = content;
      const down = this.generateRollbackSQL(content);
      const checksum = this.generateChecksum(content);

      return {
        id,
        name: name.replace(/_/g, ' '),
        up,
        down,
        timestamp,
        checksum
      };
    } catch (error) {
      console.error(`Failed to parse migration file ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate rollback SQL (simplified - in practice, you'd have explicit down migrations)
   */
  private generateRollbackSQL(upSQL: string): string {
    // This is a simplified rollback generator
    const rollbackStatements: string[] = [];
    
    // Extract table names from CREATE TABLE statements
    const createTableMatches = upSQL.match(/CREATE TABLE (\w+)/gi);
    if (createTableMatches) {
      createTableMatches.forEach(match => {
        const tableName = match.replace('CREATE TABLE ', '').trim();
        rollbackStatements.push(`DROP TABLE IF EXISTS ${tableName};`);
      });
    }

    return rollbackStatements.join('\n');
  }

  /**
   * Generate checksum for migration content
   */
  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<MigrationStatus[]> {
    try {
      const result = this.sqlite.prepare(`
        SELECT id, name, applied_at, checksum, execution_time 
        FROM ${this.migrationsTable} 
        ORDER BY id ASC
      `).all() as MigrationStatus[];
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to get applied migrations:', error);
      return [];
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Applying migration: ${migration.id} - ${migration.name}`);
      
      // Use transaction for atomicity
      const transaction = this.sqlite.transaction(() => {
        // Execute migration using raw SQL
        this.sqlite.prepare(migration.up).run();
        
        // Record migration
        const executionTime = Date.now() - startTime;
        this.sqlite.prepare(`
          INSERT INTO ${this.migrationsTable} 
          (id, name, applied_at, checksum, execution_time) 
          VALUES (?, ?, ?, ?, ?)
        `).run(migration.id, migration.name, new Date().toISOString(), migration.checksum, executionTime);
      });
      
      // Execute transaction
      transaction();
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Applied migration: ${migration.id} (${executionTime}ms)`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migration.id}:`, error);
      throw error;
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Rolling back migration: ${migration.id} - ${migration.name}`);
      
      // Use transaction for atomicity
      const transaction = this.sqlite.transaction(() => {
        // Execute rollback
        this.sqlite.prepare(migration.down).run();
        
        // Remove migration record
        this.sqlite.prepare(`
          DELETE FROM ${this.migrationsTable} 
          WHERE id = ?
        `).run(migration.id);
      });
      
      // Execute transaction
      transaction();
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Rolled back migration: ${migration.id} (${executionTime}ms)`);
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${migration.id}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Starting database migrations...');
      console.log(`📊 Environment: ${config.NODE_ENV}`);
      console.log(`📍 Database: SQLite (${config.DB_NAME})`);

      const availableMigrations = await this.getAvailableMigrations();
      const appliedMigrations = await this.getAppliedMigrations();
      
      const appliedIds = new Set(appliedMigrations.map(m => m.id));
      const pendingMigrations = availableMigrations.filter(m => !appliedIds.has(m.id));

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(count: number = 1): Promise<void> {
    try {
      console.log(`🔄 Rolling back ${count} migration(s)...`);

      const appliedMigrations = await this.getAppliedMigrations();
      const availableMigrations = await this.getAvailableMigrations();
      
      const migrationMap = new Map(availableMigrations.map(m => [m.id, m]));
      const migrationsToRollback = appliedMigrations
        .slice(-count)
        .reverse()
        .map(status => migrationMap.get(status.id))
        .filter(Boolean) as Migration[];

      if (migrationsToRollback.length === 0) {
        console.log('✅ No migrations to rollback');
        return;
      }

      for (const migration of migrationsToRollback) {
        await this.rollbackMigration(migration);
      }

      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Check migration status
   */
  async checkMigrationStatus(): Promise<{
    hasPendingMigrations: boolean;
    appliedMigrations: MigrationStatus[];
    pendingMigrations: Migration[];
    totalMigrations: number;
  }> {
    try {
      const availableMigrations = await this.getAvailableMigrations();
      const appliedMigrations = await this.getAppliedMigrations();
      
      const appliedIds = new Set(appliedMigrations.map(m => m.id));
      const pendingMigrations = availableMigrations.filter(m => !appliedIds.has(m.id));

      return {
        hasPendingMigrations: pendingMigrations.length > 0,
        appliedMigrations,
        pendingMigrations,
        totalMigrations: availableMigrations.length
      };
    } catch (error) {
      console.error('❌ Failed to check migration status:', error);
      throw error;
    }
  }

  /**
   * Run Drizzle migrations
   */
  async runDrizzleMigrations(): Promise<void> {
    try {
      console.log('🔄 Running Drizzle migrations...');
      
      // Use the correct migrator for SQLite
      const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
      await migrate(db, { 
        migrationsFolder: './drizzle',
        migrationsTable: '__drizzle_migrations__',
      });
      
      console.log('✅ Drizzle migrations completed');
    } catch (error) {
      console.error('❌ Drizzle migration failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (drop all tables and re-run migrations)
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('🔄 Resetting database...');
      
      // Drop all tables
      await this.dropAllTables();
      
      // Re-run migrations
      await this.runMigrations();
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Drop all tables
   */
  private async dropAllTables(): Promise<void> {
    try {
      console.log('🗑️  Dropping all tables...');
      
      // Get all table names
      const tables = this.sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];
      
      const tableNames = tables.map(row => row.name);

      // Drop tables in reverse dependency order
      const dropOrder = [
        'consent_preferences',
        'retention_policies', 
        'encryption_keys',
        'audit_logs',
        'gdpr_requests',
        'parental_consent',
        'student_progress',
        'exercises',
        'students',
        '__migrations__',
        '__drizzle_migrations__'
      ];

      for (const tableName of dropOrder) {
        if (tableNames.includes(tableName)) {
          this.sqlite.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
          console.log(`🗑️  Dropped table: ${tableName}`);
        }
      }

      console.log('✅ All tables dropped');
    } catch (error) {
      console.error('❌ Error dropping tables:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.sqlite.close();
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();

// Export convenience functions
export async function runMigrations(): Promise<void> {
  try {
    return await migrationManager.runMigrations();
  } finally {
    migrationManager.close();
  }
}

export async function rollbackMigrations(count: number = 1): Promise<void> {
  try {
    return await migrationManager.rollbackMigrations(count);
  } finally {
    migrationManager.close();
  }
}

export async function checkMigrationStatus(): Promise<{
  hasPendingMigrations: boolean;
  appliedMigrations: any[];
  pendingMigrations: any[];
  totalMigrations: number;
}> {
  try {
    return await migrationManager.checkMigrationStatus();
  } finally {
    migrationManager.close();
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    return await migrationManager.resetDatabase();
  } finally {
    migrationManager.close();
  }
}

export async function runDrizzleMigrations(): Promise<void> {
  try {
    return await migrationManager.runDrizzleMigrations();
  } finally {
    migrationManager.close();
  }
}

// CLI runner
if (require.main === module) {
  const command = process.argv[2];
  const count = parseInt(process.argv[3]) || 1;

  switch (command) {
    case 'up':
      runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'down':
      rollbackMigrations(count)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'status':
      checkMigrationStatus()
        .then(status => {
          console.log('Migration Status:', status);
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;
    case 'reset':
      resetDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'drizzle':
      runDrizzleMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: node migrate.ts [up|down|status|reset|drizzle] [count]');
      process.exit(1);
  }
}
