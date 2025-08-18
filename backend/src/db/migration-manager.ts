/**
 * Enhanced Database Migration Manager for RevEd Kids Backend
 * Provides rollback capabilities, validation, and safe schema changes
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { connection, db } from './connection';
import { logger } from '../utils/logger';
import { sql, eq } from 'drizzle-orm';
import { mysqlTable, varchar, timestamp, text, int, boolean } from 'drizzle-orm/mysql-core';
import * as schema from './schema';

// Migration metadata table
const migrations = mysqlTable('migrations', {
  id: int('id').primaryKey().autoincrement(),
  filename: varchar('filename', { length: 255 }).notNull().unique(),
  version: varchar('version', { length: 20 }).notNull(),
  description: text('description'),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  executionTime: int('execution_time').notNull(), // in milliseconds
  rollbackSql: text('rollback_sql'),
  status: varchar('status', { length: 20 }).notNull().default('completed'),
  error: text('error'),
});

interface Migration {
  filename: string;
  version: string;
  description: string;
  up: string;
  down: string;
  checksum: string;
}

interface MigrationResult {
  success: boolean;
  executionTime: number;
  error?: string;
}

interface RollbackOptions {
  steps?: number;
  toVersion?: string;
  dryRun?: boolean;
}

export class MigrationManager {
  private migrationDir: string;
  private isInitialized = false;

  constructor(migrationDir: string = path.join(__dirname, 'migrations')) {
    this.migrationDir = migrationDir;
  }

  /**
   * Legacy method for compatibility
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      await this.initialize();
      const result = await this.migrate();
      
      if (result.success) {
        console.log('✅ Migrations completed successfully');
      } else {
        throw new Error(`Migration failed: ${result.failed} failed migrations`);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method for compatibility
   */
  async checkMigrationStatus(): Promise<boolean> {
    try {
      // Check if core tables exist
      await db.select().from(schema.students).limit(1);
      await db.select().from(schema.modules).limit(1);
      await db.select().from(schema.exercises).limit(1);
      
      console.log('✅ Database schema is ready');
      return true;
    } catch (error) {
      console.log('⚠️  Database schema not found or incomplete');
      return false;
    }
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create migrations table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          version VARCHAR(20) NOT NULL,
          description TEXT,
          checksum VARCHAR(64) NOT NULL,
          executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          execution_time INT NOT NULL,
          rollback_sql TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'completed',
          error TEXT,
          INDEX idx_migrations_version (version),
          INDEX idx_migrations_executed_at (executed_at),
          INDEX idx_migrations_status (status)
        )
      `);

      this.isInitialized = true;
      logger.info('Migration system initialized');
    } catch (error) {
      logger.error('Failed to initialize migration system', { error });
      throw error;
    }
  }

  /**
   * Load migration files from disk
   */
  private async loadMigrationFiles(): Promise<Migration[]> {
    try {
      if (!existsSync(this.migrationDir)) {
        logger.warn('Migration directory does not exist', { dir: this.migrationDir });
        return [];
      }

      const files = await readdir(this.migrationDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure consistent ordering

      const migrations: Migration[] = [];

      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationDir, file);
        const content = await readFile(filePath, 'utf-8');
        
        const migration = this.parseMigrationFile(file, content);
        if (migration) {
          migrations.push(migration);
        }
      }

      return migrations;
    } catch (error) {
      logger.error('Failed to load migration files', { error });
      throw error;
    }
  }

  /**
   * Parse migration file content
   */
  private parseMigrationFile(filename: string, content: string): Migration | null {
    try {
      // Extract metadata from comments
      const versionMatch = content.match(/-- Version: (.+)/);
      const descriptionMatch = content.match(/-- Description: (.+)/);
      
      // For files without explicit version/description, generate from filename
      const version = versionMatch ? versionMatch[1].trim() : filename.replace('.sql', '');
      const description = descriptionMatch ? descriptionMatch[1].trim() : `Migration ${filename}`;

      // Split migration into UP and DOWN sections
      const sections = content.split(/-- === (UP|DOWN) ===/);
      
      let up = '';
      let down = '';

      if (sections.length >= 3) {
        const upIndex = sections.findIndex(section => section.trim() === 'UP') + 1;
        const downIndex = sections.findIndex(section => section.trim() === 'DOWN') + 1;

        up = upIndex > 0 && upIndex < sections.length ? sections[upIndex].trim() : '';
        down = downIndex > 0 && downIndex < sections.length ? sections[downIndex].trim() : '';
      } else {
        // If no UP/DOWN sections, treat entire content as UP
        up = content;
        down = '-- No rollback SQL provided';
      }

      // Generate checksum
      const checksum = this.generateChecksum(content);

      return {
        filename,
        version,
        description,
        up,
        down,
        checksum,
      };
    } catch (error) {
      logger.error('Failed to parse migration file', { filename, error });
      return null;
    }
  }

  /**
   * Generate checksum for migration content
   */
  private generateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const [rows] = await connection.execute(
        'SELECT filename FROM migrations WHERE status = ? ORDER BY executed_at ASC',
        ['completed']
      ) as any;

      return rows.map((row: any) => row.filename);
    } catch (error) {
      logger.error('Failed to get applied migrations', { error });
      throw error;
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    await this.initialize();
    
    const allMigrations = await this.loadMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    
    return allMigrations.filter(migration => 
      !appliedMigrations.includes(migration.filename)
    );
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing migration', { 
        filename: migration.filename,
        version: migration.version,
        description: migration.description
      });

      // Execute migration in a transaction
      const conn = await connection.getConnection();
      
      try {
        await conn.beginTransaction();

        // Execute UP statements
        const statements = this.splitSqlStatements(migration.up);
        for (const statement of statements) {
          if (statement.trim()) {
            await conn.execute(statement);
          }
        }

        // Record migration in database
        await conn.execute(
          `INSERT INTO migrations 
           (filename, version, description, checksum, execution_time, rollback_sql, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            migration.filename,
            migration.version,
            migration.description,
            migration.checksum,
            Date.now() - startTime,
            migration.down,
            'completed'
          ]
        );

        await conn.commit();
        
        const executionTime = Date.now() - startTime;
        logger.info('Migration executed successfully', { 
          filename: migration.filename,
          executionTime
        });

        return { success: true, executionTime };

      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Migration execution failed', { 
        filename: migration.filename,
        error: errorMessage,
        executionTime
      });

      return { success: false, executionTime, error: errorMessage };
    }
  }

  /**
   * Split SQL content into individual statements
   */
  private splitSqlStatements(sql: string): string[] {
    return sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<{
    success: boolean;
    executed: number;
    failed: number;
    results: MigrationResult[];
  }> {
    await this.initialize();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return { success: true, executed: 0, failed: 0, results: [] };
    }

    logger.info('Starting migration process', { 
      pendingCount: pendingMigrations.length 
    });

    const results: MigrationResult[] = [];
    let executed = 0;
    let failed = 0;

    for (const migration of pendingMigrations) {
      const result = await this.executeMigration(migration);
      results.push(result);
      
      if (result.success) {
        executed++;
      } else {
        failed++;
        // Stop on first failure to prevent cascade issues
        logger.error('Stopping migration process due to failure');
        break;
      }
    }

    const overallSuccess = failed === 0;
    
    logger.info('Migration process completed', { 
      success: overallSuccess,
      executed,
      failed,
      totalPending: pendingMigrations.length
    });

    return { success: overallSuccess, executed, failed, results };
  }

  /**
   * Rollback migrations
   */
  async rollback(options: RollbackOptions = {}): Promise<{
    success: boolean;
    rolledBack: number;
    failed: number;
  }> {
    await this.initialize();
    
    const { steps = 1, toVersion, dryRun = false } = options;

    try {
      // Get migrations to rollback
      let query = 'SELECT * FROM migrations WHERE status = ? ORDER BY executed_at DESC';
      const params: any[] = ['completed'];

      if (toVersion) {
        query += ' AND version >= ?';
        params.push(toVersion);
      }

      if (steps > 0 && !toVersion) {
        query += ' LIMIT ?';
        params.push(steps);
      }

      const [rows] = await connection.execute(query, params) as any;
      
      if (rows.length === 0) {
        logger.info('No migrations to rollback');
        return { success: true, rolledBack: 0, failed: 0 };
      }

      logger.info('Starting rollback process', { 
        migrationsToRollback: rows.length,
        dryRun
      });

      if (dryRun) {
        logger.info('Dry run - would rollback:', { 
          migrations: rows.map((row: any) => ({
            filename: row.filename,
            version: row.version,
            description: row.description
          }))
        });
        return { success: true, rolledBack: rows.length, failed: 0 };
      }

      let rolledBack = 0;
      let failed = 0;

      for (const row of rows) {
        try {
          await this.rollbackMigration(row);
          rolledBack++;
        } catch (error) {
          failed++;
          logger.error('Rollback failed for migration', { 
            filename: row.filename,
            error 
          });
          break; // Stop on first failure
        }
      }

      return { success: failed === 0, rolledBack, failed };

    } catch (error) {
      logger.error('Rollback process failed', { error });
      throw error;
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migrationRecord: any): Promise<void> {
    const conn = await connection.getConnection();
    
    try {
      await conn.beginTransaction();

      logger.info('Rolling back migration', { 
        filename: migrationRecord.filename,
        version: migrationRecord.version
      });

      if (!migrationRecord.rollback_sql || migrationRecord.rollback_sql.trim() === '') {
        throw new Error('No rollback SQL available for migration');
      }

      // Execute rollback statements
      const statements = this.splitSqlStatements(migrationRecord.rollback_sql);
      for (const statement of statements) {
        if (statement.trim()) {
          await conn.execute(statement);
        }
      }

      // Remove migration record
      await conn.execute(
        'DELETE FROM migrations WHERE id = ?',
        [migrationRecord.id]
      );

      await conn.commit();
      
      logger.info('Migration rolled back successfully', { 
        filename: migrationRecord.filename 
      });

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    appliedCount: number;
    pendingCount: number;
    lastMigration: string | null;
    appliedMigrations: Array<{
      filename: string;
      version: string;
      description: string;
      executedAt: Date;
      executionTime: number;
    }>;
    pendingMigrations: string[];
  }> {
    await this.initialize();
    
    const [appliedMigrations, pendingMigrations] = await Promise.all([
      this.getAppliedMigrationDetails(),
      this.getPendingMigrations()
    ]);

    return {
      appliedCount: appliedMigrations.length,
      pendingCount: pendingMigrations.length,
      lastMigration: appliedMigrations[0]?.filename || null,
      appliedMigrations,
      pendingMigrations: pendingMigrations.map(m => m.filename)
    };
  }

  /**
   * Get detailed applied migration information
   */
  private async getAppliedMigrationDetails() {
    const [rows] = await connection.execute(`
      SELECT filename, version, description, executed_at, execution_time 
      FROM migrations 
      WHERE status = 'completed'
      ORDER BY executed_at DESC
    `) as any;

    return rows.map((row: any) => ({
      filename: row.filename,
      version: row.version,
      description: row.description,
      executedAt: new Date(row.executed_at),
      executionTime: row.execution_time
    }));
  }

  /**
   * Legacy methods for compatibility
   */
  async createTables(): Promise<void> {
    logger.info('Tables creation handled by migration system');
  }

  async dropTables(): Promise<void> {
    try {
      logger.info('Dropping all tables...');
      // This should be handled through rollback migrations instead
      logger.warn('Use migration rollback instead of dropTables for safer operations');
    } catch (error) {
      logger.error('Error dropping tables:', error);
      throw error;
    }
  }
}

// Helper functions for backward compatibility
export async function connectDatabase(): Promise<void> {
  const migrationManager = new MigrationManager();
  await migrationManager.runMigrations();
}

export async function disconnectDatabase(): Promise<void> {
  logger.info('Disconnecting from database...');
  // Connection pool cleanup is handled automatically by mysql2
}

// Create and export singleton instance
export const migrationManager = new MigrationManager(); 