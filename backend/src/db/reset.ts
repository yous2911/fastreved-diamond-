import { db } from './connection';
import { sql } from 'drizzle-orm';
import { config } from '../config/config';
import Database from 'better-sqlite3';
import * as schema from './schema';

/**
 * Database reset functionality
 * This module provides functions to reset the database to a clean state
 */

export class DatabaseReset {
  private sqlite: Database.Database;

  constructor() {
    this.sqlite = new Database('reved_kids.db');
  }

  /**
   * Reset the entire database (drop all tables and recreate schema)
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('🔄 Starting database reset...');
      console.log(`📊 Environment: ${config.NODE_ENV}`);
      console.log(`📍 Database: SQLite (${config.DB_NAME})`);

      // Drop all tables
      await this.dropAllTables();
      
      // Create fresh schema
      await this.createSchema();
      
      // Run migrations if any exist
      await this.runMigrationsIfNeeded();

      console.log('✅ Database reset completed successfully');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    } finally {
      this.sqlite.close();
    }
  }

  /**
   * Drop all tables in the correct order
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
   * Create fresh database schema
   */
  private async createSchema(): Promise<void> {
    try {
      console.log('🔄 Creating database schema...');
      
      // Create all tables based on schema
      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prenom TEXT NOT NULL,
          nom TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          niveau_actuel TEXT NOT NULL,
          total_points INTEGER DEFAULT 0,
          serie_jours INTEGER DEFAULT 0,
          mascotte_type TEXT DEFAULT 'dragon',
          dernier_acces TEXT,
          est_connecte INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titre TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          difficulte TEXT NOT NULL,
          xp INTEGER DEFAULT 10,
          configuration TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS student_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          exercise_id INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          score INTEGER DEFAULT 0,
          time_spent INTEGER DEFAULT 0,
          attempts INTEGER DEFAULT 0,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (student_id) REFERENCES students (id),
          FOREIGN KEY (exercise_id) REFERENCES exercises (id)
        )
      `).run();

      // Create GDPR tables
      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS parental_consent (
          id TEXT PRIMARY KEY,
          parent_email TEXT NOT NULL,
          parent_name TEXT NOT NULL,
          child_name TEXT NOT NULL,
          child_age INTEGER NOT NULL,
          consent_types TEXT NOT NULL,
          status TEXT NOT NULL,
          first_consent_token TEXT NOT NULL,
          second_consent_token TEXT,
          first_consent_date TEXT,
          second_consent_date TEXT,
          verification_date TEXT,
          expiry_date TEXT NOT NULL,
          ip_address TEXT NOT NULL,
          user_agent TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS gdpr_requests (
          id TEXT PRIMARY KEY,
          request_type TEXT NOT NULL,
          requester_type TEXT NOT NULL,
          requester_email TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          student_id INTEGER,
          student_name TEXT,
          parent_email TEXT,
          request_details TEXT NOT NULL,
          urgent_request INTEGER DEFAULT 0,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          submitted_at TEXT NOT NULL,
          due_date TEXT NOT NULL,
          verification_token TEXT,
          verified_at TEXT,
          assigned_to TEXT,
          processed_at TEXT,
          completed_at TEXT,
          ip_address TEXT NOT NULL,
          user_agent TEXT NOT NULL,
          verification_method TEXT NOT NULL,
          legal_basis TEXT,
          response_details TEXT,
          actions_taken TEXT,
          exported_data TEXT,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          user_id TEXT,
          parent_id TEXT,
          student_id INTEGER,
          details TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          timestamp TEXT NOT NULL,
          severity TEXT NOT NULL,
          category TEXT,
          session_id TEXT,
          correlation_id TEXT,
          checksum TEXT NOT NULL,
          encrypted INTEGER DEFAULT 0,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS encryption_keys (
          id TEXT PRIMARY KEY,
          key_data TEXT NOT NULL,
          algorithm TEXT NOT NULL,
          version INTEGER NOT NULL,
          usage TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS retention_policies (
          id TEXT PRIMARY KEY,
          policy_name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          retention_period_days INTEGER NOT NULL,
          trigger_condition TEXT NOT NULL,
          action TEXT NOT NULL,
          priority TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          legal_basis TEXT,
          exceptions TEXT,
          notification_days INTEGER DEFAULT 30,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_executed TEXT,
          records_processed INTEGER DEFAULT 0
        )
      `).run();

      this.sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS consent_preferences (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          student_id INTEGER,
          essential INTEGER DEFAULT 1,
          functional INTEGER DEFAULT 0,
          analytics INTEGER DEFAULT 0,
          marketing INTEGER DEFAULT 0,
          personalization INTEGER DEFAULT 0,
          version TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `).run();

      console.log('✅ Database schema created successfully');
    } catch (error) {
      console.error('❌ Failed to create schema:', error);
      throw error;
    }
  }

  /**
   * Run migrations if they exist
   */
  private async runMigrationsIfNeeded(): Promise<void> {
    try {
      // Check if drizzle migrations directory exists
      const fs = require('fs');
      const path = require('path');
      const migrationsPath = path.join(process.cwd(), 'drizzle');
      
      if (fs.existsSync(migrationsPath)) {
        console.log('🔄 Running Drizzle migrations...');
        
        // Import and run drizzle migrations
        const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
        await migrate(db, { 
          migrationsFolder: './drizzle',
          migrationsTable: '__drizzle_migrations__',
        });
        
        console.log('✅ Drizzle migrations completed');
      } else {
        console.log('ℹ️  No Drizzle migrations found, skipping...');
      }
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      // Don't throw error here as schema is already created
    }
  }

  /**
   * Check if database is empty
   */
  async isDatabaseEmpty(): Promise<boolean> {
    try {
      const tables = this.sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];
      
      return tables.length === 0;
    } catch (error) {
      console.error('❌ Failed to check database state:', error);
      return true; // Assume empty if we can't check
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    tableCount: number;
    tableNames: string[];
    totalSize: number;
  }> {
    try {
      const tables = this.sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];
      
      const tableNames = tables.map(row => row.name);
      const totalSize = this.sqlite.prepare('PRAGMA page_count').get() as { page_count: number };
      
      return {
        tableCount: tableNames.length,
        tableNames,
        totalSize: totalSize.page_count || 0
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return {
        tableCount: 0,
        tableNames: [],
        totalSize: 0
      };
    }
  }
}

// Export singleton instance
export const databaseReset = new DatabaseReset();

// Export convenience functions
export async function resetDatabase(): Promise<void> {
  return databaseReset.resetDatabase();
}

export async function isDatabaseEmpty(): Promise<boolean> {
  return databaseReset.isDatabaseEmpty();
}

export async function getDatabaseStats(): Promise<{
  tableCount: number;
  tableNames: string[];
  totalSize: number;
}> {
  return databaseReset.getDatabaseStats();
}

// CLI runner
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'reset':
      resetDatabase()
        .then(() => {
          console.log('✅ Database reset completed');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Database reset failed:', error);
          process.exit(1);
        });
      break;
    case 'stats':
      getDatabaseStats()
        .then((stats) => {
          console.log('Database Statistics:', stats);
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Failed to get database stats:', error);
          process.exit(1);
        });
      break;
    case 'empty':
      isDatabaseEmpty()
        .then((isEmpty) => {
          console.log('Database is empty:', isEmpty);
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Failed to check database state:', error);
          process.exit(1);
        });
      break;
    default:
      console.log('Usage: node reset.ts [reset|stats|empty]');
      process.exit(1);
  }
} 