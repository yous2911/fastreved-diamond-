import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import { FileUploadService } from '../services/file-upload.service';
import { ImageProcessingService } from '../services/image-processing.service';
import { StorageService } from '../services/storage.service';
import { FileSecurityService } from '../services/file-security.service';

declare module 'fastify' {
  interface FastifyInstance {
    uploadService: FileUploadService;
    imageProcessor: ImageProcessingService;
    storageService: StorageService;
    securityService: FileSecurityService;
    fs: typeof fs;
  }
}

export interface FileUploadPluginOptions {
  uploadPath?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  enableImageProcessing?: boolean;
  enableVirusScanning?: boolean;
  thumbnailSizes?: Array<{
    name: string;
    width: number;
    height: number;
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
  }>;
}

const fileUploadPlugin: FastifyPluginAsync<FileUploadPluginOptions> = async (
  fastify,
  options
) => {
  const {
    uploadPath = 'uploads',
    maxFileSize = 10 * 1024 * 1024, // 10MB
    enableImageProcessing = true,
    enableVirusScanning = true,
    thumbnailSizes = [
      { name: 'small', width: 150, height: 150, fit: 'cover', format: 'webp', quality: 80 },
      { name: 'medium', width: 300, height: 300, fit: 'cover', format: 'webp', quality: 85 },
      { name: 'large', width: 600, height: 600, fit: 'contain', format: 'webp', quality: 90 }
    ]
  } = options;

  try {
    // Initialize upload directory
    const fullUploadPath = path.resolve(process.cwd(), uploadPath);
    await fs.ensureDir(fullUploadPath);

    // Create category directories
    const categories = ['image', 'video', 'audio', 'document', 'exercise', 'curriculum', 'assessment', 'resource'];
    for (const category of categories) {
      await fs.ensureDir(path.join(fullUploadPath, category));
    }

    // Initialize services with configuration
    const uploadConfig = {
      maxFileSize,
      uploadPath: fullUploadPath,
      enableImageProcessing,
      enableVirusScanning,
      thumbnailSizes
    };

    const uploadService = new FileUploadService(uploadConfig);
    const imageProcessor = new ImageProcessingService();
    const storageService = new StorageService();
    const securityService = new FileSecurityService({
      enableVirusScanning,
      enableContentAnalysis: true,
      enableMetadataScanning: true,
      quarantineThreats: true,
      maxScanTimeMs: 30000
    });

    // Register services as decorators
    fastify.decorate('uploadService', uploadService);
    fastify.decorate('imageProcessor', imageProcessor);
    fastify.decorate('storageService', storageService);
    fastify.decorate('securityService', securityService);
    fastify.decorate('fs', fs);

    // Add middleware for file serving
    fastify.register(import('@fastify/static'), {
      root: fullUploadPath,
      prefix: '/uploads/',
      decorateReply: false,
      schemaHide: true,
      setHeaders: (res, path) => {
        // Set security headers for uploaded files
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        
        // Set cache headers
        if (path.includes('/thumbnails/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year for thumbnails
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for originals
        }
      }
    });

    // Register upload routes
    await fastify.register(import('../routes/upload'), { prefix: '/api' });

    // Add cleanup job (commented out until cron plugin is available)
    // if (fastify.cron) {
    //   // Daily cleanup job at 2 AM
    //   fastify.cron.createJob({
    //     cronTime: '0 2 * * *',
    //     onTick: async () => {
    //       try {
    //         logger.info('Starting scheduled file cleanup');
    //         const cleanedFiles = await storageService.cleanupExpiredFiles(30);
    //         const cleanedOrphans = await storageService.cleanupOrphanedFiles();
    //         logger.info('Scheduled cleanup completed', { 
    //           cleanedFiles, 
    //           cleanedOrphans 
    //         });
    //       } catch (error) {
    //         logger.error('Scheduled cleanup failed:', error);
    //       }
    //     },
    //     start: true
    //   });
    // }

    // Add health check endpoint
    fastify.get('/api/upload/health', {
      schema: {
        description: 'File upload system health check',
        tags: ['Upload', 'Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              uploadPath: { type: 'string' },
              storageHealth: { type: 'object' },
              services: {
                type: 'object',
                properties: {
                  upload: { type: 'boolean' },
                  imageProcessing: { type: 'boolean' },
                  storage: { type: 'boolean' },
                  security: { type: 'boolean' }
                }
              }
            }
          }
        }
      },
      handler: async (request, reply) => {
        try {
          const storageHealth = await storageService.getStorageHealth();
          
          return reply.send({
            status: 'healthy',
            uploadPath: fullUploadPath,
            storageHealth,
            services: {
              upload: true,
              imageProcessing: true,
              storage: true,
              security: true
            },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Upload health check failed:', error);
          return reply.status(500).send({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Add storage optimization endpoint (admin only)
    fastify.post('/api/upload/optimize', {
      schema: {
        description: 'Optimize storage (admin only)',
        tags: ['Upload', 'Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              filesProcessed: { type: 'number' },
              spaceReclaimed: { type: 'number' }
            }
          }
        }
      },
      preHandler: [fastify.authenticate], // TODO: Add admin authorization when available
      handler: async (request, reply) => {
        try {
          const result = await storageService.optimizeStorage();
          
          logger.info('Storage optimization completed', result);
          
          return reply.send({
            success: true,
            ...result
          });
        } catch (error) {
          logger.error('Storage optimization failed:', error);
          return reply.status(500).send({
            success: false,
            error: error.message
          });
        }
      }
    });

    logger.info('File upload plugin initialized', {
      uploadPath: fullUploadPath,
      maxFileSize,
      enableImageProcessing,
      enableVirusScanning,
      thumbnailSizes: thumbnailSizes.length
    });

  } catch (error) {
    logger.error('Failed to initialize file upload plugin:', error);
    throw error;
  }
};

export default fp(fileUploadPlugin, {
  name: 'file-upload',
  dependencies: ['database', 'authentication']
});