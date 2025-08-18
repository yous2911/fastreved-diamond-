import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import mimeTypes from 'mime-types';
import { logger } from '../utils/logger';
import { 
  UploadedFile, 
  UploadRequest, 
  UploadResponse, 
  UploadConfig, 
  FileCategory, 
  SecurityScanResult,
  StorageStats,
  DEFAULT_UPLOAD_CONFIG,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZES
} from '../types/upload.types';
import { ImageProcessingService } from './image-processing.service';
import { StorageService } from './storage.service';

export class FileUploadService {
  private config: UploadConfig;
  private imageProcessor: ImageProcessingService;
  private storageService: StorageService;
  private uploadPath: string;

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = { ...DEFAULT_UPLOAD_CONFIG, ...config };
    this.uploadPath = path.resolve(process.cwd(), this.config.uploadPath);
    this.imageProcessor = new ImageProcessingService();
    this.storageService = new StorageService();
    this.initializeStorage();
  }

  /**
   * Process uploaded files with validation and security checks
   */
  async processUpload(request: UploadRequest, uploadedBy: string): Promise<UploadResponse> {
    try {
      const response: UploadResponse = {
        success: false,
        files: [],
        errors: [],
        warnings: [],
        processingJobs: []
      };

      // Validate upload request
      const validationResult = await this.validateUploadRequest(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          files: [],
          errors: validationResult.errors
        };
      }

      // Process each file
      for (const file of request.files) {
        try {
          const uploadedFile = await this.processFile(file, request, uploadedBy);
          response.files.push(uploadedFile);
          
          // Queue background processing if needed
          if (this.shouldProcessInBackground(uploadedFile)) {
            const jobId = await this.queueBackgroundProcessing(uploadedFile);
            response.processingJobs?.push(jobId);
          }
        } catch (error) {
          logger.error('Error processing file:', { 
            filename: file.originalname, 
            error: error.message 
          });
          response.errors?.push(`Failed to process ${file.originalname}: ${error.message}`);
        }
      }

      response.success = response.files.length > 0;
      return response;

    } catch (error) {
      logger.error('Error in file upload process:', error);
      throw new Error('File upload processing failed');
    }
  }

  /**
   * Process individual file
   */
  private async processFile(
    file: any, 
    request: UploadRequest, 
    uploadedBy: string
  ): Promise<UploadedFile> {
    // Generate unique file ID and secure filename
    const fileId = crypto.randomUUID();
    const sanitizedName = this.sanitizeFilename(file.originalname);
    const fileExtension = path.extname(sanitizedName).toLowerCase();
    const secureFilename = `${fileId}${fileExtension}`;
    
    // Determine file category
    const category = request.category || this.detectFileCategory(file.mimetype);
    
    // Create file directory structure
    const categoryPath = path.join(this.uploadPath, category);
    const datePath = path.join(categoryPath, new Date().toISOString().split('T')[0]);
    await fs.ensureDir(datePath);
    
    const filePath = path.join(datePath, secureFilename);
    
    // Security validation
    await this.validateFileContent(file.buffer);
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    
    // Check for duplicates
    const existingFile = await this.checkForDuplicate(checksum);
    if (existingFile) {
      logger.warn('Duplicate file detected', { 
        originalName: file.originalname, 
        existingFileId: existingFile.id 
      });
      return existingFile;
    }
    
    // Write file to disk
    await fs.writeFile(filePath, file.buffer);
    
    // Get file metadata
    const metadata = await this.extractFileMetadata(file.buffer, file.mimetype);
    
    // Create uploaded file object
    const uploadedFile: UploadedFile = {
      id: fileId,
      originalName: file.originalname,
      filename: secureFilename,
      mimetype: file.mimetype,
      size: file.size,
      path: filePath,
      url: this.generateFileUrl(category, datePath, secureFilename),
      metadata: {
        ...metadata,
        educationalMetadata: request.educationalMetadata
      },
      uploadedBy,
      uploadedAt: new Date(),
      category,
      isPublic: request.isPublic || false,
      status: 'ready',
      checksum,
      processedVariants: []
    };

    // Generate thumbnails for images
    if (category === 'image' && request.generateThumbnails !== false) {
      try {
        const thumbnails = await this.imageProcessor.generateThumbnails(
          filePath, 
          this.config.thumbnailSizes
        );
        uploadedFile.processedVariants = thumbnails;
        uploadedFile.thumbnailUrl = thumbnails.find(t => t.type === 'small')?.url;
      } catch (error) {
        logger.warn('Failed to generate thumbnails:', { fileId, error: error.message });
      }
    }

    // Perform security scan if enabled
    if (this.config.enableVirusScanning) {
      try {
        const scanResult = await this.performSecurityScan(filePath);
        if (!scanResult.isClean) {
          uploadedFile.status = 'quarantined';
          logger.warn('File quarantined due to security scan', { 
            fileId, 
            threats: scanResult.threats 
          });
        }
      } catch (error) {
        logger.error('Security scan failed:', { fileId, error: error.message });
      }
    }

    // Store file metadata in database
    await this.storageService.saveFileMetadata(uploadedFile);
    
    logger.info('File uploaded successfully', {
      fileId,
      originalName: file.originalname,
      size: file.size,
      category,
      uploadedBy
    });

    return uploadedFile;
  }

  /**
   * Validate upload request
   */
  private async validateUploadRequest(request: UploadRequest): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check file count
    if (request.files.length === 0) {
      errors.push('No files provided');
    }

    if (request.files.length > this.config.maxFilesPerUpload) {
      errors.push(`Too many files. Maximum allowed: ${this.config.maxFilesPerUpload}`);
    }

    // Validate each file
    for (const file of request.files) {
      // Check file size
      const maxSize = this.getMaxFileSizeForType(file.mimetype);
      if (file.size > maxSize) {
        errors.push(`File ${file.originalname} exceeds maximum size of ${this.formatFileSize(maxSize)}`);
      }

      // Check file type
      if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} is not allowed for ${file.originalname}`);
      }

      // Check file extension
      const extension = path.extname(file.originalname).toLowerCase();
      if (!this.config.allowedExtensions.includes(extension)) {
        errors.push(`File extension ${extension} is not allowed for ${file.originalname}`);
      }

      // Validate filename
      if (!this.isValidFilename(file.originalname)) {
        errors.push(`Invalid filename: ${file.originalname}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file content for security
   */
  private async validateFileContent(buffer: Buffer): Promise<void> {
    // Check file type from magic bytes
    const fileType = await fileTypeFromBuffer(buffer);
    
    // Check for executable files
    if (this.isExecutableFile(buffer)) {
      throw new Error('Executable files are not allowed');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(buffer)) {
      throw new Error('File contains suspicious patterns');
    }

    // Validate file structure based on type
    if (fileType) {
      await this.validateFileStructure(buffer, fileType.mime);
    }
  }

  /**
   * Extract file metadata
   */
  private async extractFileMetadata(buffer: Buffer, mimetype: string): Promise<any> {
    const metadata: any = {};

    if (mimetype.startsWith('image/')) {
      try {
        const imageInfo = await this.imageProcessor.getImageInfo(buffer);
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
        metadata.format = imageInfo.format;
        metadata.colorSpace = imageInfo.space;
        metadata.hasAlpha = imageInfo.hasAlpha;
      } catch (error) {
        logger.warn('Failed to extract image metadata:', error.message);
      }
    }

    return metadata;
  }

  /**
   * Security helpers
   */
  private isExecutableFile(buffer: Buffer): boolean {
    const executableSignatures = [
      'MZ',      // Windows PE
      '\x7fELF', // Linux ELF
      '\xfe\xed\xfa', // macOS Mach-O
      'PK\x03\x04' // ZIP (could contain executables)
    ];

    const header = buffer.toString('ascii', 0, 4);
    return executableSignatures.some(sig => header.startsWith(sig));
  }

  private containsSuspiciousPatterns(buffer: Buffer): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /data:.*base64/i,
      /<!--.*-->/i,
      /%3Cscript/i
    ];

    const content = buffer.toString('utf-8', 0, Math.min(1024, buffer.length));
    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private async validateFileStructure(buffer: Buffer, mimetype: string): Promise<void> {
    // Basic file structure validation
    if (mimetype.startsWith('image/')) {
      try {
        await this.imageProcessor.validateImageStructure(buffer);
      } catch (error) {
        throw new Error(`Invalid image structure: ${error.message}`);
      }
    }
  }

  /**
   * Security scanning
   */
  private async performSecurityScan(filePath: string): Promise<SecurityScanResult> {
    // Mock implementation - replace with actual virus scanner
    return {
      isClean: true,
      threats: [],
      scanEngine: 'mock-scanner',
      scanDate: new Date(),
      quarantined: false
    };
  }

  /**
   * Utility methods
   */
  private detectFileCategory(mimetype: string): FileCategory {
    if (ALLOWED_IMAGE_TYPES.includes(mimetype as any)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(mimetype as any)) return 'video';
    if (ALLOWED_AUDIO_TYPES.includes(mimetype as any)) return 'audio';
    if (ALLOWED_DOCUMENT_TYPES.includes(mimetype as any)) return 'document';
    return 'resource';
  }

  private getMaxFileSizeForType(mimetype: string): number {
    const category = this.detectFileCategory(mimetype);
    return MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
  }

  private sanitizeFilename(filename: string): string {
    // Remove dangerous characters and normalize
    return filename
      .replace(/[^\w\s.-]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .trim();
  }

  private isValidFilename(filename: string): boolean {
    // Check for valid filename patterns
    const invalidPatterns = [
      /^\.+$/, // Only dots
      /[<>:"|?*]/,  // Windows reserved characters
      /\x00/,  // Null bytes
      /\.(exe|bat|cmd|scr|pif|com)$/i // Executable extensions
    ];

    return !invalidPatterns.some(pattern => pattern.test(filename));
  }

  private generateFileUrl(category: string, datePath: string, filename: string): string {
    const relativePath = path.relative(this.uploadPath, path.join(datePath, filename));
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    
    return `${size.toFixed(1)} ${units[unit]}`;
  }

  private async checkForDuplicate(checksum: string): Promise<UploadedFile | null> {
    return await this.storageService.findFileByChecksum(checksum);
  }

  private shouldProcessInBackground(file: UploadedFile): boolean {
    return file.category === 'video' || 
           (file.category === 'image' && file.size > 5 * 1024 * 1024);
  }

  private async queueBackgroundProcessing(file: UploadedFile): Promise<string> {
    // Mock implementation - replace with actual job queue
    const jobId = crypto.randomUUID();
    logger.info('Queued background processing job', { fileId: file.id, jobId });
    return jobId;
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.ensureDir(this.uploadPath);
      
      // Create category directories
      const categories: FileCategory[] = ['image', 'video', 'audio', 'document', 'resource'];
      for (const category of categories) {
        await fs.ensureDir(path.join(this.uploadPath, category));
      }

      logger.info('File upload storage initialized', { uploadPath: this.uploadPath });
    } catch (error) {
      logger.error('Failed to initialize upload storage:', error);
      throw new Error('Storage initialization failed');
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<UploadedFile | null> {
    return await this.storageService.getFileById(fileId);
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const file = await this.getFile(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Check permissions
      if (file.uploadedBy !== userId) {
        throw new Error('Insufficient permissions to delete file');
      }

      // Delete physical files
      await fs.remove(file.path);
      
      // Delete thumbnails and variants
      if (file.processedVariants) {
        for (const variant of file.processedVariants) {
          await fs.remove(variant.path).catch(() => {
            // Ignore errors for variant deletion
          });
        }
      }

      // Update database
      await this.storageService.markFileAsDeleted(fileId);

      logger.info('File deleted successfully', { fileId, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting file:', { fileId, error: error.message });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return await this.storageService.getStorageStats();
  }

  /**
   * Cleanup expired files
   */
  async cleanupExpiredFiles(maxAge: number = 30): Promise<number> {
    return await this.storageService.cleanupExpiredFiles(maxAge);
  }
}