export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  metadata: FileMetadata;
  uploadedBy: string;
  uploadedAt: Date;
  category: FileCategory;
  isPublic: boolean;
  status: FileStatus;
  checksum: string;
  processedVariants?: ProcessedVariant[];
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
  encoding?: string;
  format?: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  compressionLevel?: number;
  educationalMetadata?: EducationalMetadata;
}

export interface EducationalMetadata {
  subject?: string;
  gradeLevel?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  description?: string;
  learningObjectives?: string[];
  accessibilityFeatures?: string[];
}

export interface ProcessedVariant {
  id: string;
  type: VariantType;
  filename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
  metadata: FileMetadata;
  createdAt: Date;
}

export type FileCategory = 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'document' 
  | 'presentation' 
  | 'exercise' 
  | 'curriculum' 
  | 'assessment' 
  | 'resource';

export type FileStatus = 
  | 'uploading' 
  | 'processing' 
  | 'ready' 
  | 'failed' 
  | 'deleted' 
  | 'quarantined';

export type VariantType = 
  | 'thumbnail' 
  | 'small' 
  | 'medium' 
  | 'large' 
  | 'compressed' 
  | 'watermarked' 
  | 'pdf_preview';

export interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  uploadPath: string;
  enableImageProcessing: boolean;
  enableVirusScanning: boolean;
  requireAuthentication: boolean;
  maxFilesPerUpload: number;
  thumbnailSizes: ThumbnailSize[];
  compressionQuality: number;
  watermarkEnabled: boolean;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface UploadRequest {
  files: any[];
  category: FileCategory;
  isPublic?: boolean;
  educationalMetadata?: EducationalMetadata;
  generateThumbnails?: boolean;
  compressionLevel?: number;
  watermark?: boolean;
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  errors?: string[];
  warnings?: string[];
  processingJobs?: string[];
}

export interface SecurityScanResult {
  isClean: boolean;
  threats: string[];
  scanEngine: string;
  scanDate: Date;
  quarantined: boolean;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  categorySizes: Record<FileCategory, number>;
  recentUploads: UploadedFile[];
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

// Validation schemas
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
] as const;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo'
] as const;

export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp3',
  'audio/aac'
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
] as const;

export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,    // 10MB
  video: 100 * 1024 * 1024,   // 100MB
  audio: 50 * 1024 * 1024,    // 50MB
  document: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024   // 10MB
} as const;

export const THUMBNAIL_SIZES: ThumbnailSize[] = [
  { name: 'small', width: 150, height: 150, fit: 'cover', format: 'webp', quality: 80 },
  { name: 'medium', width: 300, height: 300, fit: 'cover', format: 'webp', quality: 85 },
  { name: 'large', width: 600, height: 600, fit: 'contain', format: 'webp', quality: 90 }
];

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: MAX_FILE_SIZES.default,
  allowedMimeTypes: [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_AUDIO_TYPES,
    ...ALLOWED_DOCUMENT_TYPES
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
    '.mp4', '.webm', '.mov', '.avi',
    '.mp3', '.wav', '.ogg', '.aac',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'
  ],
  uploadPath: 'uploads',
  enableImageProcessing: true,
  enableVirusScanning: true,
  requireAuthentication: true,
  maxFilesPerUpload: 10,
  thumbnailSizes: THUMBNAIL_SIZES,
  compressionQuality: 85,
  watermarkEnabled: false
};