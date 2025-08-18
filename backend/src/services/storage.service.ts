import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import { db } from '../db/connection';
import { files, fileVariants } from '../db/schema';
import { eq, and, lt, desc, sql } from 'drizzle-orm';
import { 
  UploadedFile, 
  StorageStats, 
  FileCategory, 
  ProcessedVariant 
} from '../types/upload.types';

export class StorageService {
  private uploadPath: string;
  private maxStorageSize: number;
  private cleanupBatchSize: number;

  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || path.resolve(process.cwd(), 'uploads');
    this.maxStorageSize = parseInt(process.env.MAX_STORAGE_SIZE || '10737418240'); // 10GB default
    this.cleanupBatchSize = 100;
  }

  /**
   * Save file metadata to database
   */
  async saveFileMetadata(file: UploadedFile): Promise<void> {
    try {
      const transaction = await db.transaction(async (tx) => {
        // Insert main file record
        const [insertedFile] = await tx.insert(files).values({
          id: file.id,
          originalName: file.originalName,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          metadata: JSON.stringify(file.metadata),
          uploadedBy: file.uploadedBy,
          uploadedAt: file.uploadedAt instanceof Date ? file.uploadedAt.toISOString() : file.uploadedAt,
          category: file.category,
          isPublic: file.isPublic,
          status: file.status,
          checksum: file.checksum,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).returning();

        // Insert processed variants if any
        if (file.processedVariants && file.processedVariants.length > 0) {
          const variantValues = file.processedVariants.map(variant => ({
            id: variant.id,
            fileId: file.id,
            type: variant.type,
            filename: variant.filename,
            path: variant.path,
            url: variant.url,
            size: variant.size,
            mimetype: variant.mimetype,
            metadata: JSON.stringify(variant.metadata),
            createdAt: variant.createdAt instanceof Date ? variant.createdAt.toISOString() : variant.createdAt
          }));

          await tx.insert(fileVariants).values(variantValues);
        }

        return insertedFile;
      });

      logger.info('File metadata saved to database', { fileId: file.id });
    } catch (error) {
      logger.error('Error saving file metadata:', { fileId: file.id, error: error.message });
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }
  }

  /**
   * Get file by ID with variants
   */
  async getFileById(fileId: string): Promise<UploadedFile | null> {
    try {
      const fileData = await db
        .select()
        .from(files)
        .where(eq(files.id, fileId))
        .limit(1);

      if (fileData.length === 0) {
        return null;
      }

      const file = fileData[0];

      // Get variants
      const variants = await db
        .select()
        .from(fileVariants)
        .where(eq(fileVariants.fileId, fileId));

      const processedVariants: ProcessedVariant[] = variants.map(variant => ({
        id: variant.id,
        type: variant.type as any,
        filename: variant.filename,
        path: variant.path,
        url: variant.url,
        size: variant.size,
        mimetype: variant.mimetype,
        metadata: JSON.parse(variant.metadata || '{}'),
        createdAt: new Date(variant.createdAt)
      }));

      return {
        id: file.id,
        originalName: file.originalName,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl || undefined,
        metadata: JSON.parse(file.metadata || '{}'),
        uploadedBy: file.uploadedBy,
        uploadedAt: new Date(file.uploadedAt),
        category: file.category as FileCategory,
        isPublic: file.isPublic,
        status: file.status as any,
        checksum: file.checksum,
        processedVariants
      };
    } catch (error) {
      logger.error('Error getting file by ID:', { fileId, error: error.message });
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Find file by checksum (for duplicate detection)
   */
  async findFileByChecksum(checksum: string): Promise<UploadedFile | null> {
    try {
      const fileData = await db
        .select()
        .from(files)
        .where(and(
          eq(files.checksum, checksum),
          eq(files.status, 'ready')
        ))
        .limit(1);

      if (fileData.length === 0) {
        return null;
      }

      return this.getFileById(fileData[0].id);
    } catch (error) {
      logger.error('Error finding file by checksum:', { checksum, error: error.message });
      return null;
    }
  }

  /**
   * Get files by user with pagination
   */
  async getFilesByUser(
    userId: string, 
    options: {
      category?: FileCategory;
      limit?: number;
      offset?: number;
      includePublic?: boolean;
    } = {}
  ): Promise<{ files: UploadedFile[]; total: number }> {
    try {
      const { category, limit = 20, offset = 0, includePublic = false } = options;

      let whereConditions = eq(files.uploadedBy, userId);
      
      if (category) {
        whereConditions = and(whereConditions, eq(files.category, category));
      }

      if (includePublic) {
        whereConditions = and(whereConditions, eq(files.isPublic, true));
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(whereConditions);

      // Get files
      const fileData = await db
        .select()
        .from(files)
        .where(whereConditions)
        .orderBy(desc(files.uploadedAt))
        .limit(limit)
        .offset(offset);

      const filesList: UploadedFile[] = [];
      for (const file of fileData) {
        const fullFile = await this.getFileById(file.id);
        if (fullFile) {
          filesList.push(fullFile);
        }
      }

      return { files: filesList, total: count };
    } catch (error) {
      logger.error('Error getting files by user:', { userId, error: error.message });
      throw new Error(`Failed to get user files: ${error.message}`);
    }
  }

  /**
   * Update file status
   */
  async updateFileStatus(fileId: string, status: string): Promise<void> {
    try {
      await db
        .update(files)
        .set({ status })
        .where(eq(files.id, fileId));

      logger.info('File status updated', { fileId, status });
    } catch (error) {
      logger.error('Error updating file status:', { fileId, status, error: error.message });
      throw new Error(`Failed to update file status: ${error.message}`);
    }
  }

  /**
   * Mark file as deleted
   */
  async markFileAsDeleted(fileId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Update file status
        await tx
          .update(files)
          .set({ 
            status: 'deleted',
            deletedAt: new Date().toISOString()
          })
          .where(eq(files.id, fileId));

        // Mark variants as deleted
        await tx
          .update(fileVariants)
          .set({ deletedAt: new Date() })
          .where(eq(fileVariants.fileId, fileId));
      });

      logger.info('File marked as deleted', { fileId });
    } catch (error) {
      logger.error('Error marking file as deleted:', { fileId, error: error.message });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      // Get total files and sizes
      const [totalStats] = await db
        .select({
          totalFiles: sql<number>`count(*)`,
          totalSize: sql<number>`sum(${files.size})`
        })
        .from(files)
        .where(eq(files.status, 'ready'));

      // Get category breakdown
      const categoryStats = await db
        .select({
          category: files.category,
          size: sql<number>`sum(${files.size})`
        })
        .from(files)
        .where(eq(files.status, 'ready'))
        .groupBy(files.category);

      const categorySizes: Record<FileCategory, number> = {} as any;
      for (const stat of categoryStats) {
        categorySizes[stat.category as FileCategory] = stat.size;
      }

      // Get recent uploads
      const recentFiles = await db
        .select()
        .from(files)
        .where(eq(files.status, 'ready'))
        .orderBy(desc(files.uploadedAt))
        .limit(10);

      const recentUploads: UploadedFile[] = [];
      for (const file of recentFiles) {
        const fullFile = await this.getFileById(file.id);
        if (fullFile) {
          recentUploads.push(fullFile);
        }
      }

      // Calculate storage usage
      const usedSpace = totalStats.totalSize || 0;
      const availableSpace = this.maxStorageSize - usedSpace;
      const percentage = (usedSpace / this.maxStorageSize) * 100;

      return {
        totalFiles: totalStats.totalFiles || 0,
        totalSize: usedSpace,
        categorySizes,
        recentUploads,
        storageUsage: {
          used: usedSpace,
          available: Math.max(0, availableSpace),
          percentage: Math.min(100, percentage)
        }
      };
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      throw new Error(`Failed to get storage statistics: ${error.message}`);
    }
  }

  /**
   * Cleanup expired files
   */
  async cleanupExpiredFiles(maxAgeDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      let deletedCount = 0;
      let hasMore = true;

      while (hasMore) {
        // Get batch of expired files
        const expiredFiles = await db
          .select()
          .from(files)
          .where(and(
            lt(files.uploadedAt, cutoffDate),
            eq(files.status, 'deleted')
          ))
          .limit(this.cleanupBatchSize);

        if (expiredFiles.length === 0) {
          hasMore = false;
          break;
        }

        for (const file of expiredFiles) {
          try {
            // Remove physical file
            await fs.remove(file.path);

            // Remove variants
            const variants = await db
              .select()
              .from(fileVariants)
              .where(eq(fileVariants.fileId, file.id));

            for (const variant of variants) {
              await fs.remove(variant.path).catch(() => {
                // Ignore errors for variant deletion
              });
            }

            // Remove from database
            await db.transaction(async (tx) => {
              await tx.delete(fileVariants).where(eq(fileVariants.fileId, file.id));
              await tx.delete(files).where(eq(files.id, file.id));
            });

            deletedCount++;
            logger.debug('Cleaned up expired file', { fileId: file.id });
          } catch (error) {
            logger.warn('Failed to cleanup file:', { 
              fileId: file.id, 
              error: error.message 
            });
          }
        }
      }

      if (deletedCount > 0) {
        logger.info('Cleanup completed', { deletedCount, maxAgeDays });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Cleanup orphaned files (files on disk not in database)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    try {
      const categories: FileCategory[] = ['image', 'video', 'audio', 'document', 'resource'];
      let cleanedCount = 0;

      for (const category of categories) {
        const categoryPath = path.join(this.uploadPath, category);
        
        if (!await fs.pathExists(categoryPath)) {
          continue;
        }

        const dateDirs = await fs.readdir(categoryPath);
        
        for (const dateDir of dateDirs) {
          const datePath = path.join(categoryPath, dateDir);
          const stat = await fs.stat(datePath);
          
          if (!stat.isDirectory()) {
            continue;
          }

          const diskFiles = await fs.readdir(datePath);
          
          for (const diskFile of diskFiles) {
            const fullPath = path.join(datePath, diskFile);
            
            // Check if file exists in database
            const dbFile = await db
              .select()
              .from(files)
              .where(eq(files.path, fullPath))
              .limit(1);

            if (dbFile.length === 0) {
              // Orphaned file - remove it
              await fs.remove(fullPath);
              cleanedCount++;
              logger.debug('Removed orphaned file', { path: fullPath });
            }
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info('Orphaned files cleanup completed', { cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning orphaned files:', error);
      throw new Error(`Orphaned files cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get storage health information
   */
  async getStorageHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    diskUsage: {
      total: number;
      used: number;
      available: number;
      percentage: number;
    };
  }> {
    try {
      const stats = await this.getStorageStats();
      const issues: string[] = [];
      const recommendations: string[] = [];
      
      // Check disk usage
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (stats.storageUsage.percentage > 90) {
        status = 'critical';
        issues.push('Storage usage is critical (>90%)');
        recommendations.push('Immediately cleanup old files or increase storage capacity');
      } else if (stats.storageUsage.percentage > 75) {
        status = 'warning';
        issues.push('Storage usage is high (>75%)');
        recommendations.push('Consider cleaning up old files or increasing storage capacity');
      }

      // Check for failed uploads
      const [failedUploads] = await db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(eq(files.status, 'failed'));

      if (failedUploads.count > 10) {
        issues.push(`${failedUploads.count} failed uploads detected`);
        recommendations.push('Investigate and cleanup failed uploads');
      }

      // Check for quarantined files
      const [quarantinedFiles] = await db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(eq(files.status, 'quarantined'));

      if (quarantinedFiles.count > 0) {
        issues.push(`${quarantinedFiles.count} quarantined files detected`);
        recommendations.push('Review and handle quarantined files');
      }

      return {
        status,
        issues,
        recommendations,
        diskUsage: {
          total: this.maxStorageSize,
          used: stats.storageUsage.used,
          available: stats.storageUsage.available,
          percentage: stats.storageUsage.percentage
        }
      };
    } catch (error) {
      logger.error('Error getting storage health:', error);
      return {
        status: 'critical',
        issues: ['Unable to assess storage health'],
        recommendations: ['Check storage service configuration'],
        diskUsage: {
          total: 0,
          used: 0,
          available: 0,
          percentage: 0
        }
      };
    }
  }

  /**
   * Optimize storage by compressing old files
   */
  async optimizeStorage(): Promise<{
    filesProcessed: number;
    spaceReclaimed: number;
  }> {
    try {
      let filesProcessed = 0;
      const spaceReclaimed = 0;

      // Find large image files older than 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const largeFiles = await db
        .select()
        .from(files)
        .where(and(
          eq(files.category, 'image'),
          eq(files.status, 'ready'),
          lt(files.uploadedAt, cutoffDate),
          sql`${files.size} > 1048576` // > 1MB
        ))
        .limit(50);

      for (const file of largeFiles) {
        try {
          const originalSize = file.size;
          
          // This would integrate with ImageProcessingService
          // For now, just log what would be optimized
          logger.info('Would optimize file', { 
            fileId: file.id, 
            originalSize,
            path: file.path 
          });
          
          filesProcessed++;
          // spaceReclaimed += (originalSize - newSize);
        } catch (error) {
          logger.warn('Failed to optimize file:', { 
            fileId: file.id, 
            error: error.message 
          });
        }
      }

      logger.info('Storage optimization completed', { 
        filesProcessed, 
        spaceReclaimed 
      });

      return { filesProcessed, spaceReclaimed };
    } catch (error) {
      logger.error('Error optimizing storage:', error);
      throw new Error(`Storage optimization failed: ${error.message}`);
    }
  }
}