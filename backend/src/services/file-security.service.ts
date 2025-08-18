import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '../utils/logger';
import { 
  SecurityScanResult,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZES
} from '../types/upload.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedMimeType?: string;
  actualFileType?: string;
}

export interface SecurityCheckOptions {
  enableVirusScanning: boolean;
  enableContentAnalysis: boolean;
  enableMetadataScanning: boolean;
  quarantineThreats: boolean;
  maxScanTimeMs: number;
}

export class FileSecurityService {
  private readonly dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar', 
    '.app', '.deb', '.pkg', '.dmg', '.run', '.msi', '.ps1', '.sh'
  ];

  private readonly suspiciousPatterns = [
    // Script injection patterns
    /<script[^>]*>/i,
    /javascript:/i,
    /data:.*base64/i,
    /vbscript:/i,
    /onclick|onload|onerror/i,
    
    // File inclusion patterns
    /\.\.[\/\\]/g, // Path traversal
    /\binclude\s*\(/i,
    /\brequire\s*\(/i,
    
    // SQL injection patterns
    /union\s+select/i,
    /\bselect\s.*from/i,
    /\bdrop\s+table/i,
    
    // Command injection patterns
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bsystem\s*\(/i,
    
    // Malware signatures (simplified)
    /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/,
  ];

  private readonly maliciousHeaders = [
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR',  // EICAR test file
    'MZ',                                    // Windows PE
    '\x7fELF',                              // Linux ELF
    '\xfe\xed\xfa',                         // macOS Mach-O
    '#!/bin/sh',                            // Shell script
    '#!/bin/bash',                          // Bash script
    'PK\x03\x04'                           // ZIP (potential executable)
  ];

  private readonly defaultOptions: SecurityCheckOptions = {
    enableVirusScanning: true,
    enableContentAnalysis: true,
    enableMetadataScanning: true,
    quarantineThreats: true,
    maxScanTimeMs: 30000 // 30 seconds
  };

  constructor(private options: Partial<SecurityCheckOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(
    buffer: Buffer,
    originalName: string,
    declaredMimeType: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // 1. Basic filename validation
      this.validateFilename(originalName, result);

      // 2. File size validation
      this.validateFileSize(buffer, declaredMimeType, result);

      // 3. MIME type validation
      await this.validateMimeType(buffer, declaredMimeType, result);

      // 4. File content validation
      await this.validateFileContent(buffer, result);

      // 5. Metadata validation
      await this.validateMetadata(buffer, declaredMimeType, result);

      // 6. Security pattern scanning
      this.scanForMaliciousPatterns(buffer, result);

      // 7. File structure validation
      await this.validateFileStructure(buffer, declaredMimeType, result);

      result.isValid = result.errors.length === 0;

    } catch (error) {
      logger.error('File validation error:', error);
      result.isValid = false;
      result.errors.push(`Validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Perform comprehensive security scan
   */
  async performSecurityScan(
    filePath: string,
    buffer: Buffer,
    options: Partial<SecurityCheckOptions> = {}
  ): Promise<SecurityScanResult> {
    const scanOptions = { ...this.defaultOptions, ...this.options, ...options };
    const startTime = Date.now();

    const result: SecurityScanResult = {
      isClean: true,
      threats: [],
      scanEngine: 'file-security-service',
      scanDate: new Date(),
      quarantined: false
    };

    try {
      // Timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Security scan timeout')), scanOptions.maxScanTimeMs);
      });

      const scanPromise = this.executeScan(buffer, scanOptions, result);
      
      await Promise.race([scanPromise, timeoutPromise]);

      // Determine if file should be quarantined
      if (result.threats.length > 0 && scanOptions.quarantineThreats) {
        result.quarantined = true;
        result.isClean = false;
      }

      const scanTime = Date.now() - startTime;
      logger.info('Security scan completed', {
        filePath,
        scanTime,
        threats: result.threats.length,
        quarantined: result.quarantined
      });

    } catch (error) {
      logger.error('Security scan failed:', error);
      result.isClean = false;
      result.threats.push(`Scan error: ${error.message}`);
    }

    return result;
  }

  /**
   * Execute the actual security scan
   */
  private async executeScan(
    buffer: Buffer,
    options: SecurityCheckOptions,
    result: SecurityScanResult
  ): Promise<void> {
    // 1. Virus scanning (mock implementation)
    if (options.enableVirusScanning) {
      await this.performVirusScan(buffer, result);
    }

    // 2. Content analysis
    if (options.enableContentAnalysis) {
      this.analyzeFileContent(buffer, result);
    }

    // 3. Metadata scanning
    if (options.enableMetadataScanning) {
      await this.scanMetadata(buffer, result);
    }

    // 4. Behavioral analysis
    this.performBehavioralAnalysis(buffer, result);
  }

  /**
   * Mock virus scanning (replace with actual AV engine)
   */
  private async performVirusScan(buffer: Buffer, result: SecurityScanResult): Promise<void> {
    // Check for EICAR test signature
    const content = buffer.toString('ascii', 0, Math.min(1024, buffer.length));
    if (content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      result.threats.push('EICAR test virus detected');
      return;
    }

    // Check for suspicious file headers
    const header = buffer.toString('ascii', 0, Math.min(16, buffer.length));
    for (const maliciousHeader of this.maliciousHeaders) {
      if (header.startsWith(maliciousHeader)) {
        result.threats.push(`Suspicious file header: ${maliciousHeader}`);
      }
    }

    // Simulate external virus scanner call
    // In production, integrate with ClamAV, Windows Defender, or cloud AV APIs
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate scan time
  }

  /**
   * Analyze file content for threats
   */
  private analyzeFileContent(buffer: Buffer, result: SecurityScanResult): void {
    const content = buffer.toString('utf-8', 0, Math.min(10240, buffer.length)); // First 10KB

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        result.threats.push(`Suspicious content pattern detected: ${pattern.source}`);
      }
    }

    // Check for embedded files or polyglots
    if (this.detectEmbeddedFiles(buffer)) {
      result.threats.push('Embedded file detected (potential polyglot attack)');
    }

    // Check for excessive entropy (could indicate encrypted/compressed malware)
    const entropy = this.calculateEntropy(buffer);
    if (entropy > 7.5) {
      result.threats.push(`High entropy detected (${entropy.toFixed(2)}) - possible encrypted content`);
    }
  }

  /**
   * Scan file metadata for threats
   */
  private async scanMetadata(buffer: Buffer, result: SecurityScanResult): Promise<void> {
    try {
      const fileType = await fileTypeFromBuffer(buffer);
      
      if (fileType) {
        // Check for file type mismatch attacks
        const header = buffer.toString('hex', 0, 16);
        if (this.isFileTypeMismatch(fileType.mime, header)) {
          result.threats.push('File type mismatch detected - potential file masquerading');
        }

        // Check for dangerous file types disguised as safe ones
        if (this.isDangerousFileTypeDisguised(fileType)) {
          result.threats.push(`Dangerous file type disguised as ${fileType.mime}`);
        }
      }
    } catch (error) {
      logger.warn('Metadata scanning failed:', error.message);
    }
  }

  /**
   * Perform behavioral analysis
   */
  private performBehavioralAnalysis(buffer: Buffer, result: SecurityScanResult): void {
    // Check for suspicious file size patterns
    if (buffer.length < 100) {
      result.threats.push('Suspiciously small file size');
    }

    // Check for null bytes (potential path traversal or injection)
    if (buffer.includes(0x00)) {
      result.threats.push('Null bytes detected in file content');
    }

    // Check for repeating patterns (could indicate padding attacks)
    if (this.hasExcessiveRepeatingPatterns(buffer)) {
      result.threats.push('Excessive repeating patterns detected');
    }
  }

  /**
   * Validation helper methods
   */
  private validateFilename(filename: string, result: ValidationResult): void {
    // Check for dangerous extensions
    const extension = filename.toLowerCase().split('.').pop();
    if (extension && this.dangerousExtensions.includes(`.${extension}`)) {
      result.errors.push(`Dangerous file extension: .${extension}`);
    }

    // Check for suspicious filename patterns
    if (/\.(exe|bat|cmd)\.txt$/i.test(filename)) {
      result.errors.push('Suspicious filename pattern detected');
    }

    // Check for path traversal in filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      result.errors.push('Invalid characters in filename');
    }

    // Check filename length
    if (filename.length > 255) {
      result.errors.push('Filename too long');
    }

    // Check for non-printable characters
    if (!/^[\w\s.-]+$/.test(filename)) {
      result.warnings.push('Filename contains special characters');
    }
  }

  private validateFileSize(buffer: Buffer, mimetype: string, result: ValidationResult): void {
    const fileSize = buffer.length;
    const maxSize = this.getMaxSizeForMimeType(mimetype);

    if (fileSize > maxSize) {
      result.errors.push(`File size (${fileSize}) exceeds maximum allowed (${maxSize})`);
    }

    if (fileSize === 0) {
      result.errors.push('Empty file not allowed');
    }
  }

  private async validateMimeType(
    buffer: Buffer, 
    declaredMimeType: string, 
    result: ValidationResult
  ): Promise<void> {
    try {
      const detectedType = await fileTypeFromBuffer(buffer);
      
      if (detectedType) {
        result.detectedMimeType = detectedType.mime;
        result.actualFileType = detectedType.ext;

        // Check if declared type matches detected type
        if (declaredMimeType !== detectedType.mime) {
          result.warnings.push(
            `MIME type mismatch: declared as ${declaredMimeType}, detected as ${detectedType.mime}`
          );
        }

        // Validate that detected type is allowed
        if (!this.isMimeTypeAllowed(detectedType.mime)) {
          result.errors.push(`File type not allowed: ${detectedType.mime}`);
        }
      } else {
        result.warnings.push('Could not detect file type from content');
      }

      // Validate declared MIME type is allowed
      if (!this.isMimeTypeAllowed(declaredMimeType)) {
        result.errors.push(`Declared MIME type not allowed: ${declaredMimeType}`);
      }
    } catch (error) {
      result.warnings.push(`MIME type detection failed: ${error.message}`);
    }
  }

  private async validateFileContent(buffer: Buffer, result: ValidationResult): Promise<void> {
    // Check for executable code in non-executable files
    if (this.containsExecutableCode(buffer)) {
      result.errors.push('File contains executable code');
    }

    // Check for script injections
    const content = buffer.toString('utf-8', 0, Math.min(1024, buffer.length));
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        result.warnings.push(`Suspicious pattern detected: ${pattern.source.substring(0, 50)}`);
      }
    }
  }

  private async validateMetadata(buffer: Buffer, mimetype: string, result: ValidationResult): Promise<void> {
    if (mimetype.startsWith('image/')) {
      await this.validateImageMetadata(buffer, result);
    }
  }

  private async validateImageMetadata(buffer: Buffer, result: ValidationResult): Promise<void> {
    try {
      // Basic image validation would go here
      // This is a simplified check - in production, use libraries like sharp
      const header = buffer.toString('hex', 0, 16);
      
      // Check for valid image headers
      const validImageHeaders = [
        'ffd8ff', // JPEG
        '89504e47', // PNG
        '47494638', // GIF
        '52494646', // WEBP
      ];

      const hasValidHeader = validImageHeaders.some(validHeader => 
        header.toLowerCase().startsWith(validHeader)
      );

      if (!hasValidHeader) {
        result.warnings.push('Invalid image file header');
      }
    } catch (error) {
      result.warnings.push(`Image metadata validation failed: ${error.message}`);
    }
  }

  private async validateFileStructure(buffer: Buffer, mimetype: string, result: ValidationResult): Promise<void> {
    // Validate file structure based on type
    if (mimetype.startsWith('image/')) {
      this.validateImageStructure(buffer, result);
    } else if (mimetype === 'application/pdf') {
      this.validatePDFStructure(buffer, result);
    }
  }

  private validateImageStructure(buffer: Buffer, result: ValidationResult): void {
    // Basic image structure validation
    const header = buffer.toString('hex', 0, 4);
    const footer = buffer.toString('hex', -4);

    // JPEG validation
    if (header.startsWith('ffd8') && !footer.includes('ffd9')) {
      result.warnings.push('JPEG file appears to be truncated');
    }

    // PNG validation
    if (header.startsWith('8950') && !buffer.includes(Buffer.from('IEND', 'ascii'))) {
      result.warnings.push('PNG file appears to be incomplete');
    }
  }

  private validatePDFStructure(buffer: Buffer, result: ValidationResult): void {
    const content = buffer.toString('ascii', 0, 1024);
    
    if (!content.startsWith('%PDF-')) {
      result.errors.push('Invalid PDF header');
    }

    // Check for suspicious PDF features
    if (content.includes('/JavaScript') || content.includes('/JS')) {
      result.warnings.push('PDF contains JavaScript');
    }

    if (content.includes('/Launch') || content.includes('/GoToE')) {
      result.warnings.push('PDF contains potentially dangerous actions');
    }
  }

  /**
   * Security analysis helper methods
   */
  private detectEmbeddedFiles(buffer: Buffer): boolean {
    // Look for multiple file signatures in the same buffer
    const signatures = [
      'ffd8ff', // JPEG
      '89504e47', // PNG
      '504b0304', // ZIP
      '25504446', // PDF
      'ffd8ffe0'  // JPEG variant
    ];

    let signatureCount = 0;
    const bufferHex = buffer.toString('hex');

    for (const sig of signatures) {
      const regex = new RegExp(sig, 'gi');
      const matches = bufferHex.match(regex);
      if (matches) {
        signatureCount += matches.length;
      }
    }

    return signatureCount > 1;
  }

  private calculateEntropy(buffer: Buffer): number {
    const frequencies: { [key: number]: number } = {};
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      frequencies[byte] = (frequencies[byte] || 0) + 1;
    }

    let entropy = 0;
    const length = buffer.length;

    for (const freq of Object.values(frequencies)) {
      const probability = freq / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private isFileTypeMismatch(detectedMime: string, header: string): boolean {
    // Check for common file type spoofing attempts
    const commonMismatches = [
      { mime: 'image/jpeg', expectedHeader: 'ffd8ff' },
      { mime: 'image/png', expectedHeader: '89504e47' },
      { mime: 'application/pdf', expectedHeader: '25504446' }
    ];

    for (const mismatch of commonMismatches) {
      if (detectedMime === mismatch.mime && !header.startsWith(mismatch.expectedHeader)) {
        return true;
      }
    }

    return false;
  }

  private isDangerousFileTypeDisguised(fileType: { mime: string; ext: string }): boolean {
    // Check for dangerous file types that might be disguised
    const dangerousTypes = ['application/x-msdownload', 'application/x-executable'];
    return dangerousTypes.includes(fileType.mime);
  }

  private hasExcessiveRepeatingPatterns(buffer: Buffer): boolean {
    const sampleSize = Math.min(1024, buffer.length);
    const sample = buffer.subarray(0, sampleSize);
    
    // Check for patterns that repeat more than 50% of the sample
    for (let patternLength = 1; patternLength <= 16; patternLength++) {
      for (let i = 0; i <= sampleSize - patternLength * 2; i++) {
        const pattern = sample.subarray(i, i + patternLength);
        let repeatCount = 1;
        
        for (let j = i + patternLength; j <= sampleSize - patternLength; j += patternLength) {
          if (sample.subarray(j, j + patternLength).equals(pattern)) {
            repeatCount++;
          } else {
            break;
          }
        }
        
        if (repeatCount * patternLength > sampleSize * 0.5) {
          return true;
        }
      }
    }
    
    return false;
  }

  private containsExecutableCode(buffer: Buffer): boolean {
    const executableSignatures = [
      'MZ',           // Windows PE
      '\x7fELF',      // Linux ELF
      '\xfe\xed\xfa', // macOS Mach-O
      '\xca\xfe\xba\xbe' // Java class file
    ];

    const header = buffer.toString('ascii', 0, 4);
    return executableSignatures.some(sig => header.startsWith(sig));
  }

  private isMimeTypeAllowed(mimetype: string): boolean {
    const allAllowedTypes = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_AUDIO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES
    ];

    return allAllowedTypes.includes(mimetype as any);
  }

  private getMaxSizeForMimeType(mimetype: string): number {
    if (ALLOWED_IMAGE_TYPES.includes(mimetype as any)) {
      return MAX_FILE_SIZES.image;
    } else if (ALLOWED_VIDEO_TYPES.includes(mimetype as any)) {
      return MAX_FILE_SIZES.video;
    } else if (ALLOWED_AUDIO_TYPES.includes(mimetype as any)) {
      return MAX_FILE_SIZES.audio;
    } else if (ALLOWED_DOCUMENT_TYPES.includes(mimetype as any)) {
      return MAX_FILE_SIZES.document;
    }
    return MAX_FILE_SIZES.default;
  }

  private scanForMaliciousPatterns(buffer: Buffer, result: ValidationResult): void {
    const content = buffer.toString('utf-8', 0, Math.min(10240, buffer.length));
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        result.warnings.push(`Suspicious pattern detected: ${pattern.source.substring(0, 50)}`);
      }
    }
  }
}