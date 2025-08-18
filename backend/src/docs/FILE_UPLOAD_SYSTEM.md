# Secure File Upload System Documentation

## Overview

The RevEd Kids platform includes a comprehensive, secure file upload system designed specifically for educational content. The system provides robust security features, image processing capabilities, and efficient storage management while maintaining GDPR compliance.

## Features

### 🔒 Security Features
- **File Type Validation**: Strict MIME type and extension checking
- **Content Scanning**: Malware and suspicious pattern detection
- **Size Limits**: Configurable per file type
- **Access Control**: Authentication and authorization
- **Audit Logging**: Complete file access tracking
- **Quarantine System**: Automatic threat isolation

### 🖼️ Image Processing
- **Thumbnail Generation**: Multiple sizes and formats
- **Format Conversion**: JPEG, PNG, WebP, AVIF support
- **Compression**: Quality-controlled optimization
- **Watermarking**: Text overlays with positioning
- **Metadata Extraction**: EXIF and technical details
- **Batch Processing**: Efficient bulk operations

### 💾 Storage Management
- **Organized Structure**: Category-based file organization
- **Duplicate Detection**: SHA256 checksum verification
- **Cleanup Jobs**: Automated expired file removal
- **Health Monitoring**: Storage usage and health checks
- **Optimization**: Space reclamation and compression

### 📚 Educational Content Support
- **Multiple Categories**: Images, videos, audio, documents, exercises
- **Metadata Management**: Subject, grade level, difficulty tagging
- **Accessibility Features**: Alt text and description support
- **Learning Objectives**: Educational goal tracking

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Upload API    │────│  Upload Service │────│ Security Service│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Image Processor│────│ Storage Service │────│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Installation and Setup

### 1. Dependencies

```bash
npm install @fastify/multipart sharp file-type mime-types fs-extra
npm install --save-dev @types/sharp @types/mime-types @types/fs-extra
```

### 2. Environment Configuration

```env
# File Upload Configuration
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760
ENABLE_IMAGE_PROCESSING=true
ENABLE_VIRUS_SCANNING=true
MAX_STORAGE_SIZE=10737418240

# Image Processing
THUMBNAIL_QUALITY=85
WATERMARK_ENABLED=false
COMPRESSION_QUALITY=85
```

### 3. Database Migration

```bash
npm run db:migrate
```

### 4. Plugin Registration

```typescript
// In your Fastify app
await fastify.register(fileUploadPlugin, {
  uploadPath: 'uploads',
  maxFileSize: 10 * 1024 * 1024,
  enableImageProcessing: true,
  enableVirusScanning: true
});
```

## API Endpoints

### Upload Files
```http
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <file-data>
category: image|video|audio|document|exercise|curriculum|assessment|resource
isPublic: boolean
generateThumbnails: boolean
educationalMetadata: JSON
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "uuid",
      "originalName": "lesson1.jpg",
      "filename": "secure-filename.jpg",
      "url": "/uploads/image/2024-01-15/secure-filename.jpg",
      "thumbnailUrl": "/uploads/thumbnails/secure-filename_small.webp",
      "size": 1024000,
      "mimetype": "image/jpeg",
      "category": "image",
      "status": "ready"
    }
  ],
  "processingJobs": ["job-id-123"],
  "warnings": []
}
```

### Get File Information
```http
GET /api/files/{fileId}
Authorization: Bearer <token>
```

### Download File
```http
GET /api/files/{fileId}/download?variant=original|thumbnail|small|medium|large
Authorization: Bearer <token>
```

### List Files
```http
GET /api/files?category=image&limit=20&offset=0&includePublic=false
Authorization: Bearer <token>
```

### Delete File
```http
DELETE /api/files/{fileId}
Authorization: Bearer <token>
```

### Process Image
```http
POST /api/images/{fileId}/process
Content-Type: application/json
Authorization: Bearer <token>

{
  "operation": "resize|compress|convert|watermark",
  "options": {
    "width": 400,
    "height": 300,
    "quality": 85,
    "format": "webp",
    "watermarkText": "RevEd Kids",
    "watermarkPosition": "bottom-right"
  }
}
```

### Storage Statistics
```http
GET /api/storage/stats
Authorization: Bearer <token>
```

### System Health
```http
GET /api/upload/health
```

## Security Implementation

### File Validation Pipeline

1. **Filename Validation**
   - Remove dangerous characters
   - Check for path traversal attempts
   - Validate extension against whitelist

2. **MIME Type Verification**
   - Compare declared vs detected types
   - Magic byte signature verification
   - Cross-reference with file extension

3. **Content Scanning**
   - Malware signature detection
   - Suspicious pattern analysis
   - Executable code detection
   - Script injection prevention

4. **Structure Validation**
   - File format integrity
   - Metadata analysis
   - Embedded file detection

### Supported File Types

#### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)
- SVG (.svg) - with sanitization

#### Videos
- MP4 (.mp4)
- WebM (.webm)
- QuickTime (.mov)
- AVI (.avi)

#### Audio
- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- AAC (.aac)

#### Documents
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- Text (.txt)
- CSV (.csv)

### Size Limits

| File Type | Max Size |
|-----------|----------|
| Images    | 10 MB    |
| Videos    | 100 MB   |
| Audio     | 50 MB    |
| Documents | 25 MB    |

## Image Processing Features

### Thumbnail Generation

```typescript
const thumbnailSizes = [
  { name: 'small', width: 150, height: 150, fit: 'cover', format: 'webp' },
  { name: 'medium', width: 300, height: 300, fit: 'cover', format: 'webp' },
  { name: 'large', width: 600, height: 600, fit: 'contain', format: 'webp' }
];
```

### Image Optimization

- **Automatic Format Selection**: WebP for modern browsers, JPEG fallback
- **Quality Optimization**: Perceptual quality maintenance
- **Progressive Loading**: Optimized for web delivery
- **Metadata Stripping**: Privacy and size optimization

### Watermarking

```typescript
const watermarkOptions = {
  text: 'RevEd Kids',
  position: 'bottom-right',
  opacity: 0.7,
  fontSize: 24,
  color: '#ffffff'
};
```

## Storage Organization

```
uploads/
├── image/
│   ├── 2024-01-15/
│   │   ├── file1.jpg
│   │   └── thumbnails/
│   │       ├── file1_small.webp
│   │       ├── file1_medium.webp
│   │       └── file1_large.webp
│   └── 2024-01-16/
├── video/
├── audio/
├── document/
├── exercise/
├── curriculum/
├── assessment/
└── resource/
```

## Database Schema

### Files Table
```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata TEXT, -- JSON
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    category TEXT NOT NULL,
    is_public INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    checksum TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### File Variants Table
```sql
CREATE TABLE file_variants (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES files(id),
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL,
    mimetype TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL,
    deleted_at TEXT
);
```

## Usage Examples

### Basic File Upload

```typescript
// Client-side
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('category', 'image');
formData.append('isPublic', 'false');

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Service Integration

```typescript
// Server-side service usage
const uploadService = new FileUploadService({
  maxFileSize: 10 * 1024 * 1024,
  enableImageProcessing: true,
  enableVirusScanning: true
});

const result = await uploadService.processUpload({
  files: [multerFile],
  category: 'image',
  generateThumbnails: true,
  educationalMetadata: {
    subject: 'Mathematics',
    gradeLevel: ['Grade 3', 'Grade 4'],
    difficulty: 'intermediate'
  }
}, userId);
```

### Image Processing

```typescript
const imageProcessor = new ImageProcessingService();

// Generate thumbnails
const variants = await imageProcessor.generateThumbnails(
  imagePath,
  thumbnailSizes
);

// Compress image
const compressed = await imageProcessor.compressImage(
  imageBuffer,
  { quality: 75 }
);

// Add watermark
const watermarked = await imageProcessor.addWatermark(
  imageBuffer,
  {
    text: 'RevEd Kids',
    position: 'bottom-right',
    opacity: 0.7
  }
);
```

## Monitoring and Maintenance

### Health Monitoring

```typescript
// Check system health
const health = await storageService.getStorageHealth();

if (health.status === 'critical') {
  // Alert administrators
  // Trigger cleanup
  // Scale storage
}
```

### Cleanup Jobs

```typescript
// Manual cleanup
const cleanedFiles = await storageService.cleanupExpiredFiles(30);
const cleanedOrphans = await storageService.cleanupOrphanedFiles();

// Scheduled cleanup (configured in plugin)
fastify.cron.createJob({
  cronTime: '0 2 * * *', // Daily at 2 AM
  onTick: async () => {
    await storageService.cleanupExpiredFiles(30);
    await storageService.cleanupOrphanedFiles();
  }
});
```

### Storage Optimization

```typescript
// Optimize storage
const result = await storageService.optimizeStorage();
console.log(`Processed ${result.filesProcessed} files`);
console.log(`Reclaimed ${result.spaceReclaimed} bytes`);
```

## GDPR Compliance

### Data Protection
- Automatic file encryption at rest
- Secure file deletion (overwriting)
- Access logging and audit trails
- Consent management integration

### User Rights
- Right of access: Complete file listing and metadata
- Right to rectification: File replacement capabilities
- Right to erasure: Secure file deletion
- Right to portability: Export in standard formats

### Retention Policies
- Configurable retention periods
- Automatic expiration and cleanup
- Legal hold exceptions
- Audit trail preservation

## Testing

### Unit Tests
```bash
npm test src/tests/file-upload.test.ts
```

### Integration Tests
```bash
npm test -- --testNamePattern="File Upload System"
```

### Performance Tests
```bash
npm test -- --testNamePattern="Performance"
```

## Troubleshooting

### Common Issues

#### Upload Failures
- Check file size limits
- Verify MIME type support
- Review security scan logs
- Validate authentication

#### Processing Errors
- Ensure Sharp library installation
- Check available disk space
- Verify image file integrity
- Review processing timeouts

#### Storage Issues
- Monitor disk usage
- Check file permissions
- Verify database connectivity
- Review cleanup job logs

### Logging

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Check upload logs
logger.info('File uploaded', { fileId, userId, size });
logger.error('Upload failed', { error, fileId });
```

### Performance Optimization

1. **Enable thumbnail caching**
2. **Use CDN for file delivery**
3. **Implement lazy loading**
4. **Configure appropriate cache headers**
5. **Monitor storage usage patterns**

## Security Best Practices

1. **Never trust client-provided data**
2. **Always validate file content**
3. **Use secure file naming**
4. **Implement rate limiting**
5. **Regular security scans**
6. **Monitor suspicious activity**
7. **Keep dependencies updated**
8. **Use HTTPS for all transfers**

## Contributing

When contributing to the file upload system:

1. Add tests for new features
2. Update documentation
3. Follow security guidelines
4. Test with various file types
5. Consider performance impact
6. Maintain GDPR compliance

## License

This file upload system is part of the RevEd Kids platform and is subject to the project's license terms.