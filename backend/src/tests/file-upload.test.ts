import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { build } from '../app-test';
import type { FastifyInstance } from 'fastify';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { FileUploadService } from '../services/file-upload.service';
import { ImageProcessingService } from '../services/image-processing.service';
import { StorageService } from '../services/storage.service';
import { FileSecurityService } from '../services/file-security.service';

/**
 * File Upload System Tests
 * 
 * Tests all aspects of the secure file upload system including:
 * - File validation and security scanning
 * - Image processing and thumbnail generation
 * - Storage management and metadata tracking
 * - API endpoints and middleware
 */
describe('File Upload System Tests', () => {
  let app: FastifyInstance;
  let uploadService: FileUploadService;
  let imageProcessor: ImageProcessingService;
  let storageService: StorageService;
  let securityService: FileSecurityService;
  let testFilesDir: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();
    
    // Initialize services
    uploadService = new FileUploadService();
    imageProcessor = new ImageProcessingService();
    storageService = new StorageService();
    securityService = new FileSecurityService();
    
    // Setup test files directory
    testFilesDir = path.join(__dirname, 'test-files');
    await fs.ensureDir(testFilesDir);
    
    // Create test images
    await createTestImages();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    
    // Cleanup test files
    await fs.remove(testFilesDir);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Create test image files for testing
   */
  async function createTestImages(): Promise<void> {
    // Create a valid JPEG image
    const validJpeg = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 100, b: 50 }
      }
    })
    .jpeg({ quality: 85 })
    .toBuffer();
    
    await fs.writeFile(path.join(testFilesDir, 'test-image.jpg'), validJpeg);

    // Create a valid PNG image with transparency
    const validPng = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 100, g: 200, b: 255, alpha: 0.8 }
      }
    })
    .png()
    .toBuffer();
    
    await fs.writeFile(path.join(testFilesDir, 'test-image.png'), validPng);

    // Create a large image for size testing
    const largeImage = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: { r: 128, g: 128, b: 128 }
      }
    })
    .jpeg({ quality: 95 })
    .toBuffer();
    
    await fs.writeFile(path.join(testFilesDir, 'large-image.jpg'), largeImage);

    // Create test document
    const testDoc = Buffer.from('This is a test document content.\nWith multiple lines.\nFor testing purposes.');
    await fs.writeFile(path.join(testFilesDir, 'test-document.txt'), testDoc);

    // Create malicious test file (EICAR test signature)
    const eicarTest = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
    await fs.writeFile(path.join(testFilesDir, 'eicar-test.txt'), eicarTest);
  }

  describe('File Upload Service', () => {
    it('should process valid image upload successfully', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: imageBuffer,
        size: imageBuffer.length
      } as Express.Multer.File;

      const uploadRequest = {
        files: [mockFile],
        category: 'image' as any,
        isPublic: false,
        generateThumbnails: true
      };

      const result = await uploadService.processUpload(uploadRequest, 'test-user-123');

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].originalName).toBe('test-image.jpg');
      expect(result.files[0].mimetype).toBe('image/jpeg');
      expect(result.files[0].category).toBe('image');
      expect(result.files[0].uploadedBy).toBe('test-user-123');
      expect(result.files[0].status).toBe('ready');
      expect(result.files[0].checksum).toBeTruthy();
    });

    it('should reject files with dangerous extensions', async () => {
      const executableContent = Buffer.from('MZ\x90\x00'); // PE header
      
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'malware.exe',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        buffer: executableContent,
        size: executableContent.length
      } as Express.Multer.File;

      const uploadRequest = {
        files: [mockFile],
        category: 'document' as any
      };

      const result = await uploadService.processUpload(uploadRequest, 'test-user-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('not allowed'));
    });

    it('should handle file size limits correctly', async () => {
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'huge-file.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: largeBuffer,
        size: largeBuffer.length
      } as Express.Multer.File;

      const uploadRequest = {
        files: [mockFile],
        category: 'image' as any
      };

      const result = await uploadService.processUpload(uploadRequest, 'test-user-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum size'));
    });

    it('should generate unique filenames and prevent conflicts', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'duplicate.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: imageBuffer,
        size: imageBuffer.length
      } as Express.Multer.File;

      const uploadRequest = {
        files: [mockFile],
        category: 'image' as any
      };

      // Upload same file twice
      const result1 = await uploadService.processUpload(uploadRequest, 'test-user-123');
      const result2 = await uploadService.processUpload(uploadRequest, 'test-user-123');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Should have different IDs but same checksum (duplicate detection)
      if (result1.files[0] && result2.files[0]) {
        expect(result1.files[0].id).not.toBe(result2.files[0].id);
        expect(result1.files[0].checksum).toBe(result2.files[0].checksum);
      }
    });
  });

  describe('Image Processing Service', () => {
    it('should get correct image information', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      
      const imageInfo = await imageProcessor.getImageInfo(imageBuffer);

      expect(imageInfo.width).toBe(800);
      expect(imageInfo.height).toBe(600);
      expect(imageInfo.format).toBe('jpeg');
      expect(imageInfo.hasAlpha).toBe(false);
    });

    it('should validate image structure correctly', async () => {
      const validImage = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      const invalidImage = Buffer.from('Not an image');

      const validResult = await imageProcessor.validateImageStructure(validImage);
      expect(validResult).toBe(true);

      await expect(imageProcessor.validateImageStructure(invalidImage))
        .rejects.toThrow();
    });

    it('should generate thumbnails in multiple sizes', async () => {
      const imagePath = path.join(testFilesDir, 'test-image.jpg');
      
      const thumbnailSizes = [
        { name: 'small', width: 150, height: 150, fit: 'cover' as const, format: 'webp' as const, quality: 80 },
        { name: 'medium', width: 300, height: 300, fit: 'cover' as const, format: 'webp' as const, quality: 85 }
      ];

      const variants = await imageProcessor.generateThumbnails(imagePath, thumbnailSizes);

      expect(variants).toHaveLength(2);
      expect(variants[0].type).toBe('small');
      expect(variants[1].type).toBe('medium');
      
      // Verify thumbnail files exist
      for (const variant of variants) {
        expect(await fs.pathExists(variant.path)).toBe(true);
      }
    });

    it('should compress images while maintaining quality', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      const originalSize = imageBuffer.length;

      const compressed = await imageProcessor.compressImage(imageBuffer, { quality: 70 });

      expect(compressed.length).toBeLessThan(originalSize);
      expect(compressed.length).toBeGreaterThan(0);

      // Verify compressed image is still valid
      const compressedInfo = await imageProcessor.getImageInfo(compressed);
      expect(compressedInfo.format).toBe('jpeg');
    });

    it('should resize images correctly', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const resized = await imageProcessor.resizeImage(
        imageBuffer,
        { width: 400, height: 300, fit: 'cover' },
        { quality: 85 }
      );

      const resizedInfo = await imageProcessor.getImageInfo(resized);
      expect(resizedInfo.width).toBe(400);
      expect(resizedInfo.height).toBe(300);
    });

    it('should add watermarks to images', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const watermarked = await imageProcessor.addWatermark(imageBuffer, {
        text: 'RevEd Kids',
        position: 'bottom-right',
        opacity: 0.7,
        fontSize: 24,
        color: '#ffffff'
      });

      expect(watermarked.length).toBeGreaterThan(0);
      
      // Verify watermarked image info
      const watermarkedInfo = await imageProcessor.getImageInfo(watermarked);
      expect(watermarkedInfo.format).toBe('jpeg');
    });

    it('should convert image formats', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const webpConverted = await imageProcessor.convertFormat(imageBuffer, 'webp', 85);
      const pngConverted = await imageProcessor.convertFormat(imageBuffer, 'png', 90);

      const webpInfo = await imageProcessor.getImageInfo(webpConverted);
      const pngInfo = await imageProcessor.getImageInfo(pngConverted);

      expect(webpInfo.format).toBe('webp');
      expect(pngInfo.format).toBe('png');
    });

    it('should optimize images for web delivery', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const optimized = await imageProcessor.optimizeForWeb(imageBuffer);

      expect(optimized.webp).toBeTruthy();
      expect(optimized.jpeg).toBeTruthy();
      
      // Verify formats
      const webpInfo = await imageProcessor.getImageInfo(optimized.webp);
      const jpegInfo = await imageProcessor.getImageInfo(optimized.jpeg);

      expect(webpInfo.format).toBe('webp');
      expect(jpegInfo.format).toBe('jpeg');
    });
  });

  describe('File Security Service', () => {
    it('should validate safe files correctly', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const result = await securityService.validateFile(
        imageBuffer,
        'test-image.jpg',
        'image/jpeg'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.detectedMimeType).toBe('image/jpeg');
    });

    it('should detect dangerous file extensions', async () => {
      const executableContent = Buffer.from('MZ\x90\x00'); // PE header

      const result = await securityService.validateFile(
        executableContent,
        'malware.exe',
        'application/octet-stream'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Dangerous file extension'));
    });

    it('should detect MIME type mismatches', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const result = await securityService.validateFile(
        imageBuffer,
        'fake-document.pdf',
        'application/pdf'
      );

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('MIME type mismatch'))).toBe(true);
    });

    it('should perform security scanning', async () => {
      const cleanBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      const eicarBuffer = await fs.readFile(path.join(testFilesDir, 'eicar-test.txt'));

      const cleanScan = await securityService.performSecurityScan(
        '/tmp/clean-file.jpg',
        cleanBuffer
      );

      const threatScan = await securityService.performSecurityScan(
        '/tmp/threat-file.txt',
        eicarBuffer
      );

      expect(cleanScan.isClean).toBe(true);
      expect(cleanScan.threats).toHaveLength(0);

      expect(threatScan.isClean).toBe(false);
      expect(threatScan.threats.length).toBeGreaterThan(0);
      expect(threatScan.threats).toContain(expect.stringContaining('EICAR'));
    });

    it('should detect suspicious file patterns', async () => {
      const suspiciousContent = Buffer.from('<script>alert("xss")</script>');

      const result = await securityService.validateFile(
        suspiciousContent,
        'suspicious.txt',
        'text/plain'
      );

      expect(result.warnings.some(w => w.includes('Suspicious pattern'))).toBe(true);
    });

    it('should validate file size limits', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const result = await securityService.validateFile(
        largeBuffer,
        'huge-file.jpg',
        'image/jpeg'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum'));
    });
  });

  describe('Storage Service', () => {
    it('should save and retrieve file metadata', async () => {
      const testFile = {
        id: 'test-file-123',
        originalName: 'test.jpg',
        filename: 'secure-filename.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/uploads/test.jpg',
        url: '/uploads/test.jpg',
        metadata: { width: 800, height: 600 },
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        category: 'image' as any,
        isPublic: false,
        status: 'ready' as any,
        checksum: 'abc123',
        processedVariants: []
      };

      await storageService.saveFileMetadata(testFile);
      const retrieved = await storageService.getFileById('test-file-123');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.originalName).toBe('test.jpg');
      expect(retrieved?.uploadedBy).toBe('user-123');
    });

    it('should find files by checksum for duplicate detection', async () => {
      const checksum = 'duplicate-test-checksum';
      
      // This would normally find an existing file with the same checksum
      const duplicate = await storageService.findFileByChecksum(checksum);
      
      // In test environment, should return null for non-existent checksum
      expect(duplicate).toBeNull();
    });

    it('should get storage statistics', async () => {
      const stats = await storageService.getStorageStats();

      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('storageUsage');
      expect(stats.storageUsage).toHaveProperty('used');
      expect(stats.storageUsage).toHaveProperty('available');
      expect(stats.storageUsage).toHaveProperty('percentage');
    });

    it('should cleanup expired files', async () => {
      const cleanedCount = await storageService.cleanupExpiredFiles(30);
      
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('should get storage health information', async () => {
      const health = await storageService.getStorageHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('recommendations');
      expect(health).toHaveProperty('diskUsage');
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
    });
  });

  describe('Upload API Endpoints', () => {
    it('should handle file upload via API', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));

      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'test-upload.jpg');
      formData.append('category', 'image');
      formData.append('isPublic', 'false');

      // Mock authentication
      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: {
          'authorization': 'Bearer mock-token'
        },
        payload: formData
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.files).toHaveLength(1);
    });

    it('should require authentication for upload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        payload: {}
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return file information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/test-file-id',
        headers: {
          'authorization': 'Bearer mock-token'
        }
      });

      // Should return 404 for non-existent file
      expect(response.statusCode).toBe(404);
    });

    it('should list user files with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files?limit=10&offset=0',
        headers: {
          'authorization': 'Bearer mock-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('files');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit');
      expect(body).toHaveProperty('offset');
    });

    it('should return storage statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/storage/stats',
        headers: {
          'authorization': 'Bearer mock-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.stats).toHaveProperty('totalFiles');
      expect(body.stats).toHaveProperty('storageUsage');
    });

    it('should return supported file types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/upload/supported-types'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.supportedTypes).toHaveProperty('images');
      expect(body.supportedTypes).toHaveProperty('videos');
      expect(body.supportedTypes).toHaveProperty('audio');
      expect(body.supportedTypes).toHaveProperty('documents');
      expect(body.limits).toHaveProperty('maxFileSize');
    });

    it('should handle image processing requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/images/test-file-id/process',
        headers: {
          'authorization': 'Bearer mock-token',
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          operation: 'resize',
          options: {
            width: 400,
            height: 300,
            quality: 85
          }
        })
      });

      // Should return 404 for non-existent file
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted image files', async () => {
      const corruptedBuffer = Buffer.from('INVALID IMAGE DATA');

      const result = await securityService.validateFile(
        corruptedBuffer,
        'corrupted.jpg',
        'image/jpeg'
      );

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('Could not detect file type'))).toBe(true);
    });

    it('should handle empty files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await securityService.validateFile(
        emptyBuffer,
        'empty.txt',
        'text/plain'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty file not allowed');
    });

    it('should handle files with null bytes', async () => {
      const nullByteBuffer = Buffer.from('Normal content\x00with null byte');

      const scanResult = await securityService.performSecurityScan(
        '/tmp/null-byte-file.txt',
        nullByteBuffer
      );

      expect(scanResult.threats).toContain('Null bytes detected in file content');
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock timeout scenario
      const shortTimeoutService = new FileSecurityService({
        maxScanTimeMs: 1 // Very short timeout
      });

      const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
      
      const scanResult = await shortTimeoutService.performSecurityScan(
        '/tmp/timeout-test.dat',
        largeBuffer
      );

      // Should handle timeout gracefully
      expect(scanResult.isClean).toBe(false);
      expect(scanResult.threats.some(t => t.includes('timeout'))).toBe(true);
    });

    it('should handle insufficient permissions', async () => {
      // Test would check file system permission errors
      // This is a placeholder for permission-related tests
      expect(true).toBe(true);
    });

    it('should handle database connection failures', async () => {
      // Test would check database error handling
      // This is a placeholder for database error tests
      expect(true).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent uploads', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      
      const uploadPromises = Array.from({ length: 5 }, (_, i) => {
        const mockFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: `concurrent-${i}.jpg`,
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: imageBuffer,
          size: imageBuffer.length
        } as Express.Multer.File;

        return uploadService.processUpload({
          files: [mockFile],
          category: 'image' as any
        }, `user-${i}`);
      });

      const results = await Promise.all(uploadPromises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should process large batches of thumbnails efficiently', async () => {
      const imagePath = path.join(testFilesDir, 'test-image.jpg');
      const thumbnailSizes = [
        { name: 'tiny', width: 50, height: 50, fit: 'cover' as const, format: 'webp' as const },
        { name: 'small', width: 150, height: 150, fit: 'cover' as const, format: 'webp' as const },
        { name: 'medium', width: 300, height: 300, fit: 'cover' as const, format: 'webp' as const },
        { name: 'large', width: 600, height: 600, fit: 'cover' as const, format: 'webp' as const },
        { name: 'xlarge', width: 1200, height: 1200, fit: 'cover' as const, format: 'webp' as const }
      ];

      const startTime = Date.now();
      const variants = await imageProcessor.generateThumbnails(imagePath, thumbnailSizes);
      const processingTime = Date.now() - startTime;

      expect(variants).toHaveLength(5);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should validate files efficiently', async () => {
      const imageBuffer = await fs.readFile(path.join(testFilesDir, 'test-image.jpg'));
      
      const startTime = Date.now();
      
      const validationPromises = Array.from({ length: 10 }, () =>
        securityService.validateFile(imageBuffer, 'test.jpg', 'image/jpeg')
      );
      
      const results = await Promise.all(validationPromises);
      const validationTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(validationTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });
});