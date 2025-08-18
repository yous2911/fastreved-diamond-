import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { FileUploadService } from '../services/file-upload.service';
import { ImageProcessingService } from '../services/image-processing.service';
import { StorageService } from '../services/storage.service';
import { 
  UploadRequest, 
  FileCategory, 
  DEFAULT_UPLOAD_CONFIG,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_DOCUMENT_TYPES 
} from '../types/upload.types';
import { logger } from '../utils/logger';

// Validation schemas
const uploadParamsSchema = z.object({
  category: z.enum(['image', 'video', 'audio', 'document', 'exercise', 'curriculum', 'assessment', 'resource']).optional(),
  generateThumbnails: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  compressionLevel: z.number().min(0).max(100).optional()
});

const educationalMetadataSchema = z.object({
  subject: z.string().optional(),
  gradeLevel: z.array(z.string()).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(500).optional(),
  learningObjectives: z.array(z.string()).optional(),
  accessibilityFeatures: z.array(z.string()).optional()
});

const fileIdSchema = z.object({
  fileId: z.string().uuid()
});

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  const uploadService = new FileUploadService();
  const imageProcessor = new ImageProcessingService();
  const storageService = new StorageService();

  // Register multipart support
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000,
      fields: 10,
      fileSize: DEFAULT_UPLOAD_CONFIG.maxFileSize,
      files: DEFAULT_UPLOAD_CONFIG.maxFilesPerUpload,
      headerPairs: 2000,
      parts: 1000
    },
    attachFieldsToBody: true
  });

  /**
   * Upload files endpoint
   */
  fastify.post('/upload', {
    schema: {
      description: 'Upload files with metadata and processing options',
      tags: ['Upload'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  originalName: { type: 'string' },
                  filename: { type: 'string' },
                  url: { type: 'string' },
                  thumbnailUrl: { type: 'string' },
                  size: { type: 'number' },
                  mimetype: { type: 'string' },
                  category: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            },
            processingJobs: { type: 'array', items: { type: 'string' } },
            warnings: { type: 'array', items: { type: 'string' } }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            errors: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    preHandler: [fastify.authenticate], // Require authentication
    handler: async (request, reply) => {
      try {
        // Parse multipart data
        const data = request.body as any;
        
        // Extract and validate parameters
        const params = uploadParamsSchema.parse({
          category: data.category?.value,
          generateThumbnails: data.generateThumbnails?.value === 'true',
          isPublic: data.isPublic?.value === 'true',
          compressionLevel: data.compressionLevel?.value ? parseInt(data.compressionLevel.value) : undefined
        });

        // Parse educational metadata if provided
        let educationalMetadata;
        if (data.educationalMetadata?.value) {
          try {
            const metadata = JSON.parse(data.educationalMetadata.value);
            educationalMetadata = educationalMetadataSchema.parse(metadata);
          } catch (error) {
            return reply.status(400).send({
              success: false,
              errors: ['Invalid educational metadata format']
            });
          }
        }

        // Extract files from multipart data
        const files: any[] = [];
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('file') && value && typeof value === 'object' && 'data' in value) {
            const file = value as any;
            files.push({
              fieldname: key,
              originalname: file.filename,
              encoding: file.encoding,
              mimetype: file.mimetype,
              buffer: file.data,
              size: file.data.length
            });
          }
        }

        if (files.length === 0) {
          return reply.status(400).send({
            success: false,
            errors: ['No files provided']
          });
        }

        // Get user ID from authentication
        const userId = (request as any).user?.id || 'anonymous';

        // Create upload request
        const uploadRequest: UploadRequest = {
          files,
          category: params.category || 'resource',
          isPublic: params.isPublic,
          educationalMetadata,
          generateThumbnails: params.generateThumbnails,
          compressionLevel: params.compressionLevel
        };

        // Process upload
        const result = await uploadService.processUpload(uploadRequest, userId);

        logger.info('Files uploaded successfully', {
          userId,
          fileCount: result.files.length,
          category: params.category
        });

        return reply.send(result);

      } catch (error) {
        logger.error('Upload error:', error);
        return reply.status(500).send({
          success: false,
          errors: ['Internal server error during upload']
        });
      }
    }
  });

  /**
   * Get file information
   */
  fastify.get('/files/:fileId', {
    schema: {
      description: 'Get file information by ID',
      tags: ['Upload'],
      params: fileIdSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            file: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                originalName: { type: 'string' },
                filename: { type: 'string' },
                url: { type: 'string' },
                thumbnailUrl: { type: 'string' },
                size: { type: 'number' },
                mimetype: { type: 'string' },
                category: { type: 'string' },
                status: { type: 'string' },
                uploadedAt: { type: 'string' },
                metadata: { type: 'object' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            error: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const { fileId } = request.params as any;
        const file = await uploadService.getFile(fileId);

        if (!file) {
          return reply.status(404).send({
            success: false,
            error: 'File not found'
          });
        }

        // Check permissions
        const userId = (request as any).user?.id;
        if (!file.isPublic && file.uploadedBy !== userId) {
          return reply.status(403).send({
            success: false,
            error: 'Access denied'
          });
        }

        return reply.send({
          success: true,
          file
        });

      } catch (error) {
        logger.error('Error getting file:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  });

  /**
   * Download file
   */
  fastify.get('/files/:fileId/download', {
    schema: {
      description: 'Download file by ID',
      tags: ['Upload'],
      params: fileIdSchema,
      querystring: {
        type: 'object',
        properties: {
          variant: { type: 'string', enum: ['original', 'thumbnail', 'small', 'medium', 'large'] }
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const { fileId } = request.params as any;
        const { variant = 'original' } = request.query as any;
        
        const file = await uploadService.getFile(fileId);

        if (!file) {
          return reply.status(404).send({
            success: false,
            error: 'File not found'
          });
        }

        // Check permissions
        const userId = (request as any).user?.id;
        if (!file.isPublic && file.uploadedBy !== userId) {
          return reply.status(403).send({
            success: false,
            error: 'Access denied'
          });
        }

        // Determine file path
        let filePath = file.path;
        let filename = file.filename;
        let mimetype = file.mimetype;

        if (variant !== 'original' && file.processedVariants) {
          const requestedVariant = file.processedVariants.find(v => v.type === variant);
          if (requestedVariant) {
            filePath = requestedVariant.path;
            filename = requestedVariant.filename;
            mimetype = requestedVariant.mimetype;
          }
        }

        // Set headers for file download
        reply.header('Content-Type', mimetype);
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        reply.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache

        // Stream file
        const stream = fastify.fs.createReadStream(filePath);
        return reply.send(stream);

      } catch (error) {
        logger.error('Error downloading file:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  });

  /**
   * Delete file
   */
  fastify.delete('/files/:fileId', {
    schema: {
      description: 'Delete file by ID',
      tags: ['Upload'],
      params: fileIdSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const { fileId } = request.params as any;
        const userId = (request as any).user?.id;

        const success = await uploadService.deleteFile(fileId, userId);

        if (success) {
          return reply.send({
            success: true,
            message: 'File deleted successfully'
          });
        } else {
          return reply.status(404).send({
            success: false,
            error: 'File not found or access denied'
          });
        }

      } catch (error) {
        logger.error('Error deleting file:', error);
        return reply.status(500).send({
          success: false,
          error: error.message
        });
      }
    }
  });

  /**
   * List user files
   */
  fastify.get('/files', {
    schema: {
      description: 'List user files with pagination and filtering',
      tags: ['Upload'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['image', 'video', 'audio', 'document', 'exercise', 'curriculum', 'assessment', 'resource'] },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 },
          includePublic: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  originalName: { type: 'string' },
                  url: { type: 'string' },
                  thumbnailUrl: { type: 'string' },
                  size: { type: 'number' },
                  category: { type: 'string' },
                  uploadedAt: { type: 'string' }
                }
              }
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = (request as any).user?.id;
        const query = request.query as any;

        const result = await storageService.getFilesByUser(userId, {
          category: query.category as FileCategory,
          limit: query.limit,
          offset: query.offset,
          includePublic: query.includePublic
        });

        return reply.send({
          success: true,
          files: result.files,
          total: result.total,
          limit: query.limit,
          offset: query.offset
        });

      } catch (error) {
        logger.error('Error listing files:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  });

  /**
   * Get storage statistics
   */
  fastify.get('/storage/stats', {
    schema: {
      description: 'Get storage usage statistics',
      tags: ['Upload'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                totalFiles: { type: 'number' },
                totalSize: { type: 'number' },
                storageUsage: {
                  type: 'object',
                  properties: {
                    used: { type: 'number' },
                    available: { type: 'number' },
                    percentage: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const stats = await uploadService.getStorageStats();

        return reply.send({
          success: true,
          stats
        });

      } catch (error) {
        logger.error('Error getting storage stats:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  });

  /**
   * Process image (resize, compress, convert)
   */
  fastify.post('/images/:fileId/process', {
    schema: {
      description: 'Process image file with various operations',
      tags: ['Upload'],
      params: fileIdSchema,
      body: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['resize', 'compress', 'convert', 'watermark'] },
          options: {
            type: 'object',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' },
              quality: { type: 'number', minimum: 1, maximum: 100 },
              format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
              watermarkText: { type: 'string' },
              watermarkPosition: { type: 'string', enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] }
            }
          }
        },
        required: ['operation']
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const { fileId } = request.params as any;
        const { operation, options = {} } = request.body as any;
        const userId = (request as any).user?.id;

        const file = await uploadService.getFile(fileId);

        if (!file) {
          return reply.status(404).send({
            success: false,
            error: 'File not found'
          });
        }

        // Check permissions
        if (file.uploadedBy !== userId) {
          return reply.status(403).send({
            success: false,
            error: 'Access denied'
          });
        }

        // Verify it's an image
        if (!file.mimetype.startsWith('image/')) {
          return reply.status(400).send({
            success: false,
            error: 'File is not an image'
          });
        }

        let result: Buffer;
        
        switch (operation) {
          case 'resize':
            result = await imageProcessor.resizeImage(file.path, {
              width: options.width,
              height: options.height,
              fit: 'cover'
            }, {
              quality: options.quality || 85
            });
            break;
            
          case 'compress':
            result = await imageProcessor.compressImage(file.path, {
              quality: options.quality || 85
            });
            break;
            
          case 'convert':
            result = await imageProcessor.convertFormat(file.path, options.format || 'webp', options.quality || 85);
            break;
            
          case 'watermark':
            if (!options.watermarkText) {
              return reply.status(400).send({
                success: false,
                error: 'Watermark text is required'
              });
            }
            result = await imageProcessor.addWatermark(file.path, {
              text: options.watermarkText,
              position: options.watermarkPosition || 'bottom-right',
              opacity: 0.7,
              fontSize: 24,
              color: '#ffffff'
            });
            break;
            
          default:
            return reply.status(400).send({
              success: false,
              error: 'Invalid operation'
            });
        }

        // Return processed image
        const format = options.format || 'jpeg';
        reply.header('Content-Type', `image/${format}`);
        reply.header('Content-Disposition', `attachment; filename="processed_${file.filename}"`);
        
        return reply.send(result);

      } catch (error) {
        logger.error('Error processing image:', error);
        return reply.status(500).send({
          success: false,
          error: error.message
        });
      }
    }
  });

  /**
   * Get supported file types
   */
  fastify.get('/upload/supported-types', {
    schema: {
      description: 'Get list of supported file types and limits',
      tags: ['Upload'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            supportedTypes: {
              type: 'object',
              properties: {
                images: { type: 'array', items: { type: 'string' } },
                videos: { type: 'array', items: { type: 'string' } },
                audio: { type: 'array', items: { type: 'string' } },
                documents: { type: 'array', items: { type: 'string' } }
              }
            },
            limits: {
              type: 'object',
              properties: {
                maxFileSize: { type: 'number' },
                maxFilesPerUpload: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      return reply.send({
        success: true,
        supportedTypes: {
          images: [...ALLOWED_IMAGE_TYPES],
          videos: [...ALLOWED_VIDEO_TYPES],
          audio: [...ALLOWED_AUDIO_TYPES],
          documents: [...ALLOWED_DOCUMENT_TYPES]
        },
        limits: {
          maxFileSize: DEFAULT_UPLOAD_CONFIG.maxFileSize,
          maxFilesPerUpload: DEFAULT_UPLOAD_CONFIG.maxFilesPerUpload
        }
      });
    }
  });
};

export default uploadRoutes;