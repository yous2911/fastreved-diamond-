/**
 * Data Archiving Service for RevEd Kids
 * Implements automated archiving of old records to maintain optimal database performance
 */

import { connection, db } from '../db/connection';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import cron from 'node-cron';
import { eq, lt, and, sql, gte } from 'drizzle-orm';

interface ArchivingConfig {
  enabled: boolean;
  schedule: string; // Cron schedule for archiving
  retentionPolicies: RetentionPolicy[];
  archiveLocation: 'database' | 'file' | 'both';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  batchSize: number;
  maxArchiveTime: number; // Max time for archiving operation in minutes
}

interface RetentionPolicy {
  tableName: string;
  archiveAfterDays: number;
  deleteAfterDays?: number;
  whereClause?: string;
  partitionColumn: string; // Column to use for date filtering (e.g., 'created_at')
  archiveTableName?: string; // Custom archive table name
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

interface ArchiveJob {
  id: string;
  tableName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'archive' | 'delete' | 'restore';
  startTime?: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  batchesProcessed: number;
  totalBatches: number;
  progress: number; // 0-100
  error?: string;
  estimatedTimeRemaining?: number;
}

interface ArchiveStats {
  tableName: string;
  originalCount: number;
  archivedCount: number;
  deletedCount: number;
  spaceSaved: number; // in bytes
  lastArchived: Date;
  retentionDays: number;
  nextScheduledArchive: Date;
}

interface RestoreOptions {
  tableName: string;
  archiveTableName?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  whereClause?: string;
  dryRun?: boolean;
}

class DataArchivingService {
  private config: ArchivingConfig;
  private jobs = new Map<string, ArchiveJob>();
  private currentJob: ArchiveJob | null = null;
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private isInitialized = false;

  constructor() {
    this.config = {
      enabled: process.env.ARCHIVING_ENABLED !== 'false',
      schedule: process.env.ARCHIVING_SCHEDULE || '0 3 * * 0', // Weekly on Sundays at 3 AM
      compressionEnabled: process.env.ARCHIVING_COMPRESSION === 'true',
      encryptionEnabled: process.env.ARCHIVING_ENCRYPTION === 'true',
      archiveLocation: (process.env.ARCHIVING_LOCATION as any) || 'database',
      batchSize: parseInt(process.env.ARCHIVING_BATCH_SIZE || '10000'),
      maxArchiveTime: parseInt(process.env.ARCHIVING_MAX_TIME || '240'), // 4 hours
      retentionPolicies: [
        // Student sessions - archive after 90 days, delete after 365 days
        {
          tableName: 'sessions',
          archiveAfterDays: 90,
          deleteAfterDays: 365,
          partitionColumn: 'created_at',
          archiveTableName: 'sessions_archive',
          priority: 'medium',
          enabled: true
        },
        // Student progress - archive after 180 days (keep active progress)
        {
          tableName: 'student_progress',
          archiveAfterDays: 180,
          deleteAfterDays: 730, // 2 years
          partitionColumn: 'last_attempt_at',
          whereClause: 'completed = 1 AND mastery_level = "maitrise"',
          archiveTableName: 'student_progress_archive',
          priority: 'low',
          enabled: true
        },
        // Revisions - archive after 120 days
        {
          tableName: 'revisions',
          archiveAfterDays: 120,
          deleteAfterDays: 365,
          partitionColumn: 'created_at',
          archiveTableName: 'revisions_archive',
          priority: 'medium',
          enabled: true
        },
        // GDPR files - archive after 30 days, delete after 90 days
        {
          tableName: 'gdpr_files',
          archiveAfterDays: 30,
          deleteAfterDays: 90,
          partitionColumn: 'created_at',
          archiveTableName: 'gdpr_files_archive',
          priority: 'high',
          enabled: true
        },
        // GDPR data processing log - archive after 60 days
        {
          tableName: 'gdpr_data_processing_log',
          archiveAfterDays: 60,
          deleteAfterDays: 365,
          partitionColumn: 'created_at',
          archiveTableName: 'gdpr_processing_archive',
          priority: 'high',
          enabled: true
        },
        // Files - archive large files after 180 days
        {
          tableName: 'files',
          archiveAfterDays: 180,
          partitionColumn: 'uploaded_at',
          whereClause: 'size > 10485760', // Files larger than 10MB
          archiveTableName: 'files_archive',
          priority: 'low',
          enabled: true
        }
      ]
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Data archiving service disabled');
      return;
    }

    try {
      logger.info('Initializing data archiving service...', {
        policies: this.config.retentionPolicies.length,
        archiveLocation: this.config.archiveLocation,
        schedule: this.config.schedule
      });

      // Create archive tables
      await this.createArchiveTables();

      // Setup scheduled archiving
      this.setupScheduledArchiving();

      // Validate retention policies
      await this.validateRetentionPolicies();

      this.isInitialized = true;
      logger.info('Data archiving service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize data archiving service', { error });
      throw error;
    }
  }

  private async createArchiveTables(): Promise<void> {
    for (const policy of this.config.retentionPolicies) {
      if (!policy.enabled || !policy.archiveTableName) continue;

      try {
        await this.createArchiveTable(policy.tableName, policy.archiveTableName);
      } catch (error) {
        logger.error('Failed to create archive table', {
          sourceTable: policy.tableName,
          archiveTable: policy.archiveTableName,
          error
        });
      }
    }
  }

  private async createArchiveTable(sourceTable: string, archiveTable: string): Promise<void> {
    try {
      // Check if archive table already exists
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
      `, [archiveTable]);

      if ((tables as any[]).length > 0) {
        logger.debug('Archive table already exists', { archiveTable });
        return;
      }

      // Create archive table with same structure as source table
      await connection.execute(`
        CREATE TABLE ${archiveTable} LIKE ${sourceTable}
      `);

      // Add archiving metadata columns
      await connection.execute(`
        ALTER TABLE ${archiveTable}
        ADD COLUMN archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN archive_reason VARCHAR(255),
        ADD INDEX idx_archived_at (archived_at)
      `);

      logger.info('Archive table created', {
        sourceTable,
        archiveTable
      });

    } catch (error) {
      logger.error('Failed to create archive table', {
        sourceTable,
        archiveTable,
        error
      });
      throw error;
    }
  }

  private setupScheduledArchiving(): void {
    const task = cron.schedule(this.config.schedule, async () => {
      try {
        await this.runScheduledArchiving();
      } catch (error) {
        logger.error('Scheduled archiving failed', { error });
      }
    }, {
      scheduled: true,
      name: 'data-archiving',
      timezone: 'UTC'
    });

    this.scheduledTasks.set('archiving', task);
    logger.info('Scheduled data archiving configured', { schedule: this.config.schedule });
  }

  private async validateRetentionPolicies(): Promise<void> {
    for (const policy of this.config.retentionPolicies) {
      if (!policy.enabled) continue;

      try {
        // Check if source table exists
        const [tables] = await connection.execute(`
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ?
        `, [policy.tableName]);

        if ((tables as any[]).length === 0) {
          logger.warn('Table not found for retention policy', { tableName: policy.tableName });
          continue;
        }

        // Check if partition column exists
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = ?
        `, [policy.tableName, policy.partitionColumn]);

        if ((columns as any[]).length === 0) {
          logger.warn('Partition column not found', {
            tableName: policy.tableName,
            column: policy.partitionColumn
          });
        }

      } catch (error) {
        logger.error('Error validating retention policy', {
          tableName: policy.tableName,
          error
        });
      }
    }
  }

  async runScheduledArchiving(): Promise<void> {
    if (this.currentJob?.status === 'running') {
      logger.warn('Archiving job already running, skipping scheduled run');
      return;
    }

    logger.info('Starting scheduled data archiving...');

    // Sort policies by priority
    const sortedPolicies = [...this.config.retentionPolicies]
      .filter(p => p.enabled)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    for (const policy of sortedPolicies) {
      try {
        await this.archiveTable(policy);
        
        // Delete old archived data if specified
        if (policy.deleteAfterDays) {
          await this.deleteOldArchivedData(policy);
        }
      } catch (error) {
        logger.error('Failed to archive table', {
          tableName: policy.tableName,
          error
        });
      }
    }

    logger.info('Scheduled data archiving completed');
  }

  async archiveTable(policy: RetentionPolicy): Promise<string> {
    const jobId = this.generateJobId();
    const job: ArchiveJob = {
      id: jobId,
      tableName: policy.tableName,
      status: 'pending',
      type: 'archive',
      startTime: new Date(),
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      batchesProcessed: 0,
      totalBatches: 0,
      progress: 0
    };

    this.jobs.set(jobId, job);
    this.currentJob = job;

    try {
      logger.info('Starting table archiving', {
        jobId,
        tableName: policy.tableName,
        archiveAfterDays: policy.archiveAfterDays
      });

      job.status = 'running';

      // Calculate cutoff date for archiving
      const archiveCutoffDate = new Date();
      archiveCutoffDate.setDate(archiveCutoffDate.getDate() - policy.archiveAfterDays);

      // Count records to archive
      const recordCount = await this.countRecordsToArchive(policy, archiveCutoffDate);
      job.totalBatches = Math.ceil(recordCount / this.config.batchSize);

      if (recordCount === 0) {
        logger.info('No records to archive', { tableName: policy.tableName });
        job.status = 'completed';
        job.endTime = new Date();
        return jobId;
      }

      logger.info('Records to archive', {
        tableName: policy.tableName,
        recordCount,
        batches: job.totalBatches
      });

      // Process in batches
      let offset = 0;
      const maxEndTime = new Date(Date.now() + this.config.maxArchiveTime * 60 * 1000);

      while (offset < recordCount && new Date() < maxEndTime) {
        const batchRecords = await this.getRecordsBatch(policy, archiveCutoffDate, offset, this.config.batchSize);
        
        if (batchRecords.length === 0) break;

        // Archive batch
        await this.archiveBatch(policy, batchRecords);
        
        job.batchesProcessed++;
        job.recordsArchived += batchRecords.length;
        job.recordsProcessed += batchRecords.length;
        job.progress = Math.round((job.batchesProcessed / job.totalBatches) * 100);
        
        offset += this.config.batchSize;

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      job.endTime = new Date();

      logger.info('Table archiving completed', {
        jobId,
        tableName: policy.tableName,
        recordsArchived: job.recordsArchived,
        duration: job.endTime.getTime() - job.startTime!.getTime()
      });

      return jobId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      job.status = 'failed';
      job.error = errorMessage;
      job.endTime = new Date();

      logger.error('Table archiving failed', {
        jobId,
        tableName: policy.tableName,
        error: errorMessage
      });

      throw error;
    } finally {
      this.currentJob = null;
    }
  }

  private async countRecordsToArchive(policy: RetentionPolicy, cutoffDate: Date): Promise<number> {
    let query = `
      SELECT COUNT(*) as count 
      FROM ${policy.tableName} 
      WHERE ${policy.partitionColumn} < ?
    `;
    
    const params: any[] = [cutoffDate];

    if (policy.whereClause) {
      query += ` AND (${policy.whereClause})`;
    }

    const [rows] = await connection.execute(query, params);
    return (rows as any[])[0].count;
  }

  private async getRecordsBatch(
    policy: RetentionPolicy, 
    cutoffDate: Date, 
    offset: number, 
    batchSize: number
  ): Promise<any[]> {
    let query = `
      SELECT * 
      FROM ${policy.tableName} 
      WHERE ${policy.partitionColumn} < ?
    `;
    
    const params: any[] = [cutoffDate];

    if (policy.whereClause) {
      query += ` AND (${policy.whereClause})`;
    }

    query += ` ORDER BY ${policy.partitionColumn} ASC LIMIT ? OFFSET ?`;
    params.push(batchSize, offset);

    const [rows] = await connection.execute(query, params);
    return rows as any[];
  }

  private async archiveBatch(policy: RetentionPolicy, records: any[]): Promise<void> {
    if (!policy.archiveTableName || records.length === 0) return;

    const conn = await connection.getConnection();
    
    try {
      await conn.beginTransaction();

      // Insert records into archive table
      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        
        const placeholders = columns.map(() => '?').join(', ');
        const columnList = columns.join(', ');
        
        await conn.execute(`
          INSERT INTO ${policy.archiveTableName} 
          (${columnList}, archive_reason) 
          VALUES (${placeholders}, ?)
        `, [...values, `Archived after ${policy.archiveAfterDays} days`]);
      }

      // Delete records from source table
      const primaryKeys = await this.getPrimaryKeyColumns(policy.tableName);
      if (primaryKeys.length > 0) {
        for (const record of records) {
          const whereConditions = primaryKeys.map(pk => `${pk} = ?`).join(' AND ');
          const whereValues = primaryKeys.map(pk => record[pk]);
          
          await conn.execute(`
            DELETE FROM ${policy.tableName} 
            WHERE ${whereConditions}
          `, whereValues);
        }
      }

      await conn.commit();

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  private async getPrimaryKeyColumns(tableName: string): Promise<string[]> {
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = 'PRIMARY'
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    return (rows as any[]).map(row => row.COLUMN_NAME);
  }

  private async deleteOldArchivedData(policy: RetentionPolicy): Promise<void> {
    if (!policy.deleteAfterDays || !policy.archiveTableName) return;

    const deleteCutoffDate = new Date();
    deleteCutoffDate.setDate(deleteCutoffDate.getDate() - policy.deleteAfterDays);

    try {
      const [result] = await connection.execute(`
        DELETE FROM ${policy.archiveTableName} 
        WHERE archived_at < ?
      `, [deleteCutoffDate]);

      const deletedCount = (result as any).affectedRows;
      
      if (deletedCount > 0) {
        logger.info('Old archived data deleted', {
          tableName: policy.archiveTableName,
          deletedCount,
          cutoffDate: deleteCutoffDate
        });
      }

    } catch (error) {
      logger.error('Failed to delete old archived data', {
        tableName: policy.archiveTableName,
        error
      });
    }
  }

  async restoreFromArchive(options: RestoreOptions): Promise<string> {
    const jobId = this.generateJobId();
    const job: ArchiveJob = {
      id: jobId,
      tableName: options.tableName,
      status: 'pending',
      type: 'restore',
      startTime: new Date(),
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      batchesProcessed: 0,
      totalBatches: 0,
      progress: 0
    };

    this.jobs.set(jobId, job);

    try {
      logger.info('Starting data restore from archive', {
        jobId,
        tableName: options.tableName,
        archiveTableName: options.archiveTableName,
        dryRun: options.dryRun
      });

      job.status = 'running';

      const archiveTable = options.archiveTableName || `${options.tableName}_archive`;

      // Build restore query
      let query = `SELECT * FROM ${archiveTable} WHERE 1=1`;
      const params: any[] = [];

      if (options.dateRange) {
        query += ` AND archived_at BETWEEN ? AND ?`;
        params.push(options.dateRange.start, options.dateRange.end);
      }

      if (options.whereClause) {
        query += ` AND (${options.whereClause})`;
      }

      // Count records to restore
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const [countRows] = await connection.execute(countQuery, params);
      const recordCount = (countRows as any[])[0]['COUNT(*)'];

      if (recordCount === 0) {
        logger.info('No records to restore', { tableName: options.tableName });
        job.status = 'completed';
        job.endTime = new Date();
        return jobId;
      }

      if (options.dryRun) {
        logger.info('Dry run - would restore records', {
          tableName: options.tableName,
          recordCount
        });
        job.status = 'completed';
        job.endTime = new Date();
        return jobId;
      }

      // Restore records in batches
      job.totalBatches = Math.ceil(recordCount / this.config.batchSize);
      let offset = 0;

      while (offset < recordCount) {
        const batchQuery = `${query} LIMIT ${this.config.batchSize} OFFSET ${offset}`;
        const [batchRows] = await connection.execute(batchQuery, params);
        const records = batchRows as any[];

        if (records.length === 0) break;

        await this.restoreBatch(options.tableName, archiveTable, records);

        job.batchesProcessed++;
        job.recordsProcessed += records.length;
        job.progress = Math.round((job.batchesProcessed / job.totalBatches) * 100);

        offset += this.config.batchSize;

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      job.endTime = new Date();

      logger.info('Data restore completed', {
        jobId,
        recordsRestored: job.recordsProcessed
      });

      return jobId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      job.status = 'failed';
      job.error = errorMessage;
      job.endTime = new Date();

      logger.error('Data restore failed', { jobId, error: errorMessage });
      throw error;
    }
  }

  private async restoreBatch(targetTable: string, archiveTable: string, records: any[]): Promise<void> {
    const conn = await connection.getConnection();

    try {
      await conn.beginTransaction();

      for (const record of records) {
        // Remove archive-specific columns
        const { archived_at, archive_reason, ...originalRecord } = record;
        
        const columns = Object.keys(originalRecord);
        const values = Object.values(originalRecord);
        const placeholders = columns.map(() => '?').join(', ');
        const columnList = columns.join(', ');

        // Insert back into original table (use REPLACE to handle duplicates)
        await conn.execute(`
          REPLACE INTO ${targetTable} (${columnList}) 
          VALUES (${placeholders})
        `, values);

        // Delete from archive table
        const primaryKeys = await this.getPrimaryKeyColumns(archiveTable);
        if (primaryKeys.length > 0) {
          const whereConditions = primaryKeys
            .filter(pk => pk !== 'archived_at' && pk !== 'archive_reason')
            .map(pk => `${pk} = ?`)
            .join(' AND ');
          const whereValues = primaryKeys
            .filter(pk => pk !== 'archived_at' && pk !== 'archive_reason')
            .map(pk => record[pk]);

          if (whereConditions) {
            await conn.execute(`
              DELETE FROM ${archiveTable} 
              WHERE ${whereConditions}
            `, whereValues);
          }
        }
      }

      await conn.commit();

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getArchivingStats(): Promise<ArchiveStats[]> {
    const stats: ArchiveStats[] = [];

    for (const policy of this.config.retentionPolicies) {
      if (!policy.enabled) continue;

      try {
        // Get original table count
        const [originalRows] = await connection.execute(`
          SELECT COUNT(*) as count, 
                 COALESCE(SUM(LENGTH(CONCAT_WS('', ${await this.getAllColumns(policy.tableName)}))), 0) as size
          FROM ${policy.tableName}
        `);

        // Get archived table count if exists
        let archivedCount = 0;
        let lastArchived: Date | null = null;

        if (policy.archiveTableName) {
          try {
            const [archivedRows] = await connection.execute(`
              SELECT COUNT(*) as count, MAX(archived_at) as last_archived
              FROM ${policy.archiveTableName}
            `);
            archivedCount = (archivedRows as any[])[0].count;
            lastArchived = (archivedRows as any[])[0].last_archived;
          } catch (error) {
            // Archive table might not exist yet
          }
        }

        const originalData = (originalRows as any[])[0];
        
        // Calculate next scheduled archive
        const nextSchedule = this.getNextScheduledTime();

        stats.push({
          tableName: policy.tableName,
          originalCount: originalData.count,
          archivedCount,
          deletedCount: 0, // Would need to track this separately
          spaceSaved: 0, // Would need more complex calculation
          lastArchived: lastArchived || new Date(0),
          retentionDays: policy.archiveAfterDays,
          nextScheduledArchive: nextSchedule
        });

      } catch (error) {
        logger.error('Failed to get archiving stats for table', {
          tableName: policy.tableName,
          error
        });
      }
    }

    return stats;
  }

  private async getAllColumns(tableName: string): Promise<string> {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    return (columns as any[])
      .map(col => col.COLUMN_NAME)
      .join(', ');
  }

  private getNextScheduledTime(): Date {
    // Simple implementation - in production, use proper cron parsing
    const now = new Date();
    const next = new Date(now);
    
    // If schedule is weekly (0 3 * * 0), find next Sunday at 3 AM
    next.setDate(now.getDate() + (7 - now.getDay()));
    next.setHours(3, 0, 0, 0);
    
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
    
    return next;
  }

  async getJobStatus(jobId: string): Promise<ArchiveJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'cancelled';
      job.endTime = new Date();
      logger.info('Archiving job cancelled', { jobId });
      return true;
    }
    return false;
  }

  private generateJobId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `archive-${timestamp}-${random}`;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down data archiving service...');

    // Stop scheduled tasks
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.debug(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();

    // Cancel running job if any
    if (this.currentJob?.status === 'running') {
      await this.cancelJob(this.currentJob.id);
    }

    logger.info('Data archiving service shutdown completed');
  }
}

// Create and export singleton instance
export const dataArchivingService = new DataArchivingService();

// Export types
export {
  ArchivingConfig,
  RetentionPolicy,
  ArchiveJob,
  ArchiveStats,
  RestoreOptions
};

export default dataArchivingService;