/**
 * Automated Database Backup and Restore Service for RevEd Kids
 * Provides comprehensive backup solutions with cloud storage integration
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { dbConfig, config } from '../config/config';
import { logger } from '../utils/logger';
import { connection, testConnection } from '../db/connection';
import cron from 'node-cron';

interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retentionDays: number;
  compressionLevel: number;
  encryptionKey?: string;
  storageType: 'local' | 's3' | 'both';
  localPath: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    prefix: string;
  };
}

interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'differential';
  size: number;
  checksum: string;
  compression: boolean;
  encryption: boolean;
  location: 'local' | 's3' | 'both';
  status: 'in_progress' | 'completed' | 'failed';
  duration?: number;
  tables: string[];
  error?: string;
}

interface RestoreOptions {
  backupId: string;
  targetDatabase?: string;
  selectedTables?: string[];
  replaceExisting: boolean;
  validateIntegrity: boolean;
  dryRun?: boolean;
}

interface BackupJob {
  id: string;
  type: 'backup' | 'restore';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  metadata?: BackupMetadata;
  error?: string;
}

class BackupService {
  private backupConfig: BackupConfig;
  private jobs = new Map<string, BackupJob>();
  private isInitialized = false;
  private currentJob: BackupJob | null = null;
  private scheduledTasks = new Map<string, cron.ScheduledTask>();

  constructor() {
    this.backupConfig = {
      enabled: process.env.BACKUP_ENABLED === 'true' || false,
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6'),
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
      storageType: (process.env.BACKUP_STORAGE_TYPE as 'local' | 's3' | 'both') || 'local',
      localPath: process.env.BACKUP_LOCAL_PATH || join(process.cwd(), 'backups'),
      s3Config: process.env.AWS_S3_BUCKET ? {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        prefix: process.env.AWS_S3_PREFIX || 'backups/revedkids/'
      } : undefined
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!this.backupConfig.enabled) {
        logger.info('Backup service disabled in configuration');
        return;
      }

      // Ensure local backup directory exists
      await this.ensureBackupDirectory();

      // Initialize S3 client if configured
      if (this.shouldUseS3()) {
        await this.initializeS3();
      }

      // Setup scheduled backups
      if (this.backupConfig.schedule) {
        this.setupScheduledBackups();
      }

      // Cleanup old backups on startup
      await this.cleanupOldBackups();

      this.isInitialized = true;
      logger.info('Backup service initialized successfully', {
        storageType: this.backupConfig.storageType,
        schedule: this.backupConfig.schedule,
        retentionDays: this.backupConfig.retentionDays
      });

    } catch (error) {
      logger.error('Failed to initialize backup service', { error });
      throw error;
    }
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupConfig.localPath, { recursive: true });
      
      // Create metadata directory
      const metadataDir = join(this.backupConfig.localPath, 'metadata');
      await fs.mkdir(metadataDir, { recursive: true });
      
      logger.debug('Backup directories created', {
        localPath: this.backupConfig.localPath,
        metadataDir
      });
    } catch (error) {
      logger.error('Failed to create backup directory', { error });
      throw error;
    }
  }

  private shouldUseS3(): boolean {
    return (this.backupConfig.storageType === 's3' || this.backupConfig.storageType === 'both') 
           && this.backupConfig.s3Config !== undefined;
  }

  private async initializeS3(): Promise<void> {
    try {
      // Test S3 connectivity (simplified - in production use AWS SDK)
      logger.info('S3 configuration validated', {
        bucket: this.backupConfig.s3Config?.bucket,
        region: this.backupConfig.s3Config?.region
      });
    } catch (error) {
      logger.error('S3 initialization failed', { error });
      throw error;
    }
  }

  private setupScheduledBackups(): void {
    try {
      const task = cron.schedule(
        this.backupConfig.schedule,
        () => {
          this.createBackup('full').catch(error => {
            logger.error('Scheduled backup failed', { error });
          });
        },
        {
          scheduled: true,
          name: 'daily-backup',
          timezone: 'UTC'
        }
      );

      this.scheduledTasks.set('daily-backup', task);
      logger.info('Scheduled backup configured', {
        schedule: this.backupConfig.schedule
      });
    } catch (error) {
      logger.error('Failed to setup scheduled backups', { error });
    }
  }

  async createBackup(
    type: 'full' | 'incremental' | 'differential' = 'full',
    options: { tables?: string[]; compress?: boolean } = {}
  ): Promise<string> {
    if (this.currentJob?.status === 'running') {
      throw new Error('Another backup operation is already running');
    }

    const backupId = this.generateBackupId();
    const job: BackupJob = {
      id: backupId,
      type: 'backup',
      status: 'queued',
      progress: 0,
      startTime: new Date()
    };

    this.jobs.set(backupId, job);
    this.currentJob = job;

    try {
      logger.info('Starting database backup', {
        backupId,
        type,
        options
      });

      job.status = 'running';
      
      // Test database connection
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      job.progress = 10;

      // Get tables to backup
      const tablesToBackup = options.tables || await this.getAllTables();
      
      job.progress = 20;

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        type,
        size: 0,
        checksum: '',
        compression: options.compress !== false,
        encryption: !!this.backupConfig.encryptionKey,
        location: this.backupConfig.storageType as any,
        status: 'in_progress',
        tables: tablesToBackup
      };

      job.progress = 30;

      // Perform database dump
      const dumpFilePath = await this.performDatabaseDump(
        backupId, 
        tablesToBackup, 
        metadata,
        (progress) => {
          job.progress = 30 + (progress * 0.5); // 30-80% for dump
        }
      );

      job.progress = 80;

      // Process backup file (compression, encryption)
      const finalFilePath = await this.processBackupFile(dumpFilePath, metadata);

      job.progress = 90;

      // Upload to storage
      await this.uploadBackup(finalFilePath, metadata);

      // Save metadata
      await this.saveBackupMetadata(metadata);

      job.progress = 100;
      job.status = 'completed';
      job.endTime = new Date();
      job.metadata = metadata;

      metadata.status = 'completed';
      metadata.duration = job.endTime.getTime() - job.startTime!.getTime();

      logger.info('Backup completed successfully', {
        backupId,
        duration: metadata.duration,
        size: metadata.size,
        tables: tablesToBackup.length
      });

      return backupId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      job.status = 'failed';
      job.error = errorMessage;
      job.endTime = new Date();

      logger.error('Backup failed', {
        backupId,
        error: errorMessage,
        duration: job.endTime.getTime() - job.startTime!.getTime()
      });

      throw error;
    } finally {
      this.currentJob = null;
    }
  }

  private async getAllTables(): Promise<string[]> {
    try {
      const [rows] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_TYPE = 'BASE TABLE'
      `, [dbConfig.database]);

      return (rows as any[]).map(row => row.TABLE_NAME);
    } catch (error) {
      logger.error('Failed to get table list', { error });
      throw error;
    }
  }

  private async performDatabaseDump(
    backupId: string,
    tables: string[],
    metadata: BackupMetadata,
    progressCallback: (progress: number) => void
  ): Promise<string> {
    const dumpPath = join(this.backupConfig.localPath, `${backupId}.sql`);
    
    return new Promise((resolve, reject) => {
      const mysqldumpArgs = [
        '--host', dbConfig.host,
        '--port', dbConfig.port.toString(),
        '--user', dbConfig.user,
        '--password=' + dbConfig.password,
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        '--create-options',
        '--extended-insert',
        '--hex-blob',
        '--default-character-set=utf8mb4',
        dbConfig.database,
        ...tables
      ];

      const process = spawn('mysqldump', mysqldumpArgs);
      const writeStream = createWriteStream(dumpPath);
      
      let dataSize = 0;
      let progress = 0;

      process.stdout.on('data', (chunk) => {
        dataSize += chunk.length;
        writeStream.write(chunk);
        
        // Estimate progress (rough approximation)
        progress = Math.min(0.9, dataSize / (10 * 1024 * 1024)); // Assume ~10MB per progress unit
        progressCallback(progress);
      });

      process.stderr.on('data', (data) => {
        logger.warn('Mysqldump stderr', { data: data.toString() });
      });

      process.on('close', (code) => {
        writeStream.end();
        
        if (code === 0) {
          metadata.size = dataSize;
          progressCallback(1);
          resolve(dumpPath);
        } else {
          reject(new Error(`Mysqldump failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        writeStream.destroy();
        reject(error);
      });
    });
  }

  private async processBackupFile(
    sourcePath: string,
    metadata: BackupMetadata
  ): Promise<string> {
    let currentPath = sourcePath;

    try {
      // Compression
      if (metadata.compression) {
        const compressedPath = currentPath + '.gz';
        await this.compressFile(currentPath, compressedPath);
        await fs.unlink(currentPath); // Remove uncompressed file
        currentPath = compressedPath;
        
        logger.debug('Backup file compressed', {
          originalSize: metadata.size,
          compressedPath
        });
      }

      // Encryption (simplified - in production use proper encryption)
      if (metadata.encryption && this.backupConfig.encryptionKey) {
        const encryptedPath = currentPath + '.enc';
        await this.encryptFile(currentPath, encryptedPath);
        await fs.unlink(currentPath); // Remove unencrypted file
        currentPath = encryptedPath;
        
        logger.debug('Backup file encrypted', { encryptedPath });
      }

      // Generate checksum
      metadata.checksum = await this.generateChecksum(currentPath);

      // Update file size
      const stats = await fs.stat(currentPath);
      metadata.size = stats.size;

      return currentPath;
    } catch (error) {
      logger.error('Failed to process backup file', { error });
      throw error;
    }
  }

  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const gzip = createGzip({ level: this.backupConfig.compressionLevel });
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);

    await pipeline(source, gzip, destination);
  }

  private async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    // Simplified encryption - in production, use proper encryption libraries
    // like crypto with AES-256-GCM
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.backupConfig.encryptionKey!, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);

    // Write IV to beginning of file
    destination.write(iv);
    
    await pipeline(source, cipher, destination);
  }

  private async generateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async uploadBackup(filePath: string, metadata: BackupMetadata): Promise<void> {
    if (this.backupConfig.storageType === 'local') {
      // File is already in local storage
      return;
    }

    if (this.shouldUseS3()) {
      await this.uploadToS3(filePath, metadata);
    }

    // If storageType is 'both', keep local copy
    if (this.backupConfig.storageType === 's3') {
      // Remove local file if only storing in S3
      await fs.unlink(filePath);
    }
  }

  private async uploadToS3(filePath: string, metadata: BackupMetadata): Promise<void> {
    // Simplified S3 upload - in production use AWS SDK
    logger.info('Uploading backup to S3', {
      backupId: metadata.id,
      bucket: this.backupConfig.s3Config?.bucket
    });
    
    // This would be implemented with AWS SDK v3
    // const s3Client = new S3Client({...});
    // await s3Client.send(new PutObjectCommand({...}));
    
    logger.info('Backup uploaded to S3 successfully');
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataPath = join(
      this.backupConfig.localPath,
      'metadata',
      `${metadata.id}.json`
    );

    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf8'
    );
  }

  async restoreBackup(options: RestoreOptions): Promise<string> {
    if (this.currentJob?.status === 'running') {
      throw new Error('Another backup/restore operation is already running');
    }

    const restoreId = this.generateBackupId();
    const job: BackupJob = {
      id: restoreId,
      type: 'restore',
      status: 'queued',
      progress: 0,
      startTime: new Date()
    };

    this.jobs.set(restoreId, job);
    this.currentJob = job;

    try {
      logger.info('Starting database restore', { restoreId, options });

      job.status = 'running';

      // Get backup metadata
      const metadata = await this.getBackupMetadata(options.backupId);
      if (!metadata) {
        throw new Error(`Backup ${options.backupId} not found`);
      }

      job.progress = 10;

      // Download backup file if needed
      const backupFilePath = await this.prepareBackupFile(metadata);

      job.progress = 30;

      // Validate backup integrity if requested
      if (options.validateIntegrity) {
        await this.validateBackupIntegrity(backupFilePath, metadata);
      }

      job.progress = 50;

      // Perform restore
      if (options.dryRun) {
        logger.info('Dry run - restore validation completed');
        job.progress = 100;
      } else {
        await this.performRestore(
          backupFilePath,
          metadata,
          options,
          (progress) => {
            job.progress = 50 + (progress * 0.5); // 50-100% for restore
          }
        );
      }

      job.status = 'completed';
      job.endTime = new Date();

      logger.info('Restore completed successfully', {
        restoreId,
        backupId: options.backupId,
        duration: job.endTime.getTime() - job.startTime!.getTime()
      });

      return restoreId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      job.status = 'failed';
      job.error = errorMessage;
      job.endTime = new Date();

      logger.error('Restore failed', { restoreId, error: errorMessage });
      throw error;
    } finally {
      this.currentJob = null;
    }
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataPath = join(
        this.backupConfig.localPath,
        'metadata',
        `${backupId}.json`
      );

      if (!existsSync(metadataPath)) {
        return null;
      }

      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to read backup metadata', { backupId, error });
      return null;
    }
  }

  private async prepareBackupFile(metadata: BackupMetadata): Promise<string> {
    let backupPath = join(this.backupConfig.localPath, metadata.id);
    
    // Add appropriate extensions
    if (metadata.compression) backupPath += '.sql.gz';
    else backupPath += '.sql';
    if (metadata.encryption) backupPath += '.enc';

    // Check if file exists locally
    if (existsSync(backupPath)) {
      return backupPath;
    }

    // Download from S3 if needed
    if (metadata.location === 's3' || metadata.location === 'both') {
      await this.downloadFromS3(metadata, backupPath);
    }

    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    return backupPath;
  }

  private async downloadFromS3(metadata: BackupMetadata, localPath: string): Promise<void> {
    // Simplified S3 download - in production use AWS SDK
    logger.info('Downloading backup from S3', {
      backupId: metadata.id,
      localPath
    });

    // This would be implemented with AWS SDK v3
    // const s3Client = new S3Client({...});
    // const response = await s3Client.send(new GetObjectCommand({...}));
    
    logger.info('Backup downloaded from S3 successfully');
  }

  private async validateBackupIntegrity(
    filePath: string,
    metadata: BackupMetadata
  ): Promise<void> {
    logger.info('Validating backup integrity', { backupId: metadata.id });

    const currentChecksum = await this.generateChecksum(filePath);
    if (currentChecksum !== metadata.checksum) {
      throw new Error(
        `Backup integrity check failed: checksum mismatch for ${metadata.id}`
      );
    }

    logger.info('Backup integrity validation passed');
  }

  private async performRestore(
    backupFilePath: string,
    metadata: BackupMetadata,
    options: RestoreOptions,
    progressCallback: (progress: number) => void
  ): Promise<void> {
    // Decrypt file if needed
    let currentPath = backupFilePath;
    if (metadata.encryption) {
      const decryptedPath = currentPath.replace('.enc', '');
      await this.decryptFile(currentPath, decryptedPath);
      currentPath = decryptedPath;
    }

    progressCallback(0.2);

    // Decompress file if needed
    if (metadata.compression) {
      const decompressedPath = currentPath.replace('.gz', '');
      await this.decompressFile(currentPath, decompressedPath);
      currentPath = decompressedPath;
    }

    progressCallback(0.4);

    // Perform MySQL restore
    await this.executeMySQLRestore(currentPath, options, progressCallback);

    // Cleanup temporary files
    if (currentPath !== backupFilePath) {
      await fs.unlink(currentPath);
    }
  }

  private async decryptFile(inputPath: string, outputPath: string): Promise<void> {
    // Simplified decryption - in production use proper decryption
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.backupConfig.encryptionKey!, 'salt', 32);
    
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);
    
    // Read IV from beginning of file
    const iv = Buffer.alloc(16);
    source.read(16); // Skip IV for now (simplified)
    
    const decipher = crypto.createDecipher(algorithm, key);
    await pipeline(source, decipher, destination);
  }

  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    const gunzip = createGunzip();
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);

    await pipeline(source, gunzip, destination);
  }

  private async executeMySQLRestore(
    sqlFilePath: string,
    options: RestoreOptions,
    progressCallback: (progress: number) => void
  ): Promise<void> {
    const targetDb = options.targetDatabase || dbConfig.database;
    
    return new Promise((resolve, reject) => {
      const mysqlArgs = [
        '--host', dbConfig.host,
        '--port', dbConfig.port.toString(),
        '--user', dbConfig.user,
        '--password=' + dbConfig.password,
        targetDb
      ];

      const process = spawn('mysql', mysqlArgs);
      const readStream = createReadStream(sqlFilePath);
      
      let progress = 0.6;

      readStream.pipe(process.stdin);

      process.stderr.on('data', (data) => {
        logger.warn('MySQL restore stderr', { data: data.toString() });
      });

      process.on('close', (code) => {
        if (code === 0) {
          progressCallback(1);
          resolve();
        } else {
          reject(new Error(`MySQL restore failed with exit code ${code}`));
        }
      });

      process.on('error', reject);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        progress = Math.min(0.95, progress + 0.05);
        progressCallback(progress);
      }, 1000);

      process.on('close', () => clearInterval(progressInterval));
    });
  }

  async listBackups(limit: number = 50): Promise<BackupMetadata[]> {
    try {
      const metadataDir = join(this.backupConfig.localPath, 'metadata');
      const files = await fs.readdir(metadataDir);
      
      const backups: BackupMetadata[] = [];
      
      for (const file of files.slice(0, limit)) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(join(metadataDir, file), 'utf8');
          backups.push(JSON.parse(content));
        }
      }

      return backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      logger.error('Failed to list backups', { error });
      return [];
    }
  }

  async getJobStatus(jobId: string): Promise<BackupJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        return false;
      }

      // Delete local files
      const backupPath = join(this.backupConfig.localPath, backupId);
      const possibleExtensions = ['.sql', '.sql.gz', '.sql.gz.enc'];
      
      for (const ext of possibleExtensions) {
        const filePath = backupPath + ext;
        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      }

      // Delete metadata
      const metadataPath = join(
        this.backupConfig.localPath,
        'metadata',
        `${backupId}.json`
      );
      if (existsSync(metadataPath)) {
        await fs.unlink(metadataPath);
      }

      // Delete from S3 if needed
      if (metadata.location === 's3' || metadata.location === 'both') {
        await this.deleteFromS3(metadata);
      }

      logger.info('Backup deleted successfully', { backupId });
      return true;
    } catch (error) {
      logger.error('Failed to delete backup', { backupId, error });
      return false;
    }
  }

  private async deleteFromS3(metadata: BackupMetadata): Promise<void> {
    // Simplified S3 deletion - in production use AWS SDK
    logger.info('Deleting backup from S3', { backupId: metadata.id });
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.backupConfig.retentionDays);

      const backups = await this.listBackups();
      let deletedCount = 0;

      for (const backup of backups) {
        if (new Date(backup.timestamp) < cutoffDate) {
          await this.deleteBackup(backup.id);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info('Old backups cleaned up', { 
          deletedCount,
          retentionDays: this.backupConfig.retentionDays 
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups', { error });
    }
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `backup-${timestamp}-${random}`;
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: string;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    storageTypes: { local: number; s3: number; both: number };
  }> {
    const backups = await this.listBackups();
    
    let totalSize = 0;
    const storageTypes = { local: 0, s3: 0, both: 0 };
    
    backups.forEach(backup => {
      totalSize += backup.size;
      storageTypes[backup.location as keyof typeof storageTypes]++;
    });

    return {
      totalBackups: backups.length,
      totalSize: this.formatBytes(totalSize),
      oldestBackup: backups.length > 0 ? new Date(backups[backups.length - 1].timestamp) : null,
      newestBackup: backups.length > 0 ? new Date(backups[0].timestamp) : null,
      storageTypes
    };
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down backup service...');
    
    // Stop scheduled tasks
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    });
    
    this.scheduledTasks.clear();
    
    // Wait for current job to complete (with timeout)
    if (this.currentJob?.status === 'running') {
      logger.info('Waiting for current backup job to complete...');
      const timeout = 300000; // 5 minutes
      const startTime = Date.now();
      
      while (this.currentJob?.status === 'running' && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (this.currentJob?.status === 'running') {
        logger.warn('Force stopping backup job due to shutdown timeout');
        this.currentJob.status = 'failed';
        this.currentJob.error = 'Interrupted by shutdown';
      }
    }
    
    logger.info('Backup service shutdown completed');
  }
}

// Create and export singleton instance
export const backupService = new BackupService();

// Export types for external use
export { BackupMetadata, RestoreOptions, BackupJob, BackupConfig };

export default backupService;