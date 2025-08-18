import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { 
  ThumbnailSize, 
  ProcessedVariant, 
  VariantType, 
  FileMetadata 
} from '../types/upload.types';

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  space: string;
  channels: number;
  density: number;
  hasAlpha: boolean;
  isAnimated?: boolean;
}

export interface ProcessingOptions {
  quality: number;
  progressive?: boolean;
  optimizeScans?: boolean;
  mozjpeg?: boolean;
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    fontSize: number;
    color: string;
  };
  compression?: {
    level: number;
    effort: number;
  };
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  background?: string;
  withoutEnlargement?: boolean;
}

export class ImageProcessingService {
  private readonly supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff', 'avif'];
  private readonly maxDimensions = { width: 8000, height: 8000 };
  private readonly defaultQuality = 85;

  /**
   * Get detailed image information
   */
  async getImageInfo(input: Buffer | string): Promise<ImageInfo> {
    try {
      const image = sharp(input);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
        space: metadata.space || 'unknown',
        channels: metadata.channels || 0,
        density: metadata.density || 0,
        hasAlpha: metadata.hasAlpha || false,
        isAnimated: metadata.pages ? metadata.pages > 1 : false
      };
    } catch (error) {
      logger.error('Error getting image info:', error);
      throw new Error(`Failed to get image information: ${error.message}`);
    }
  }

  /**
   * Validate image structure and integrity
   */
  async validateImageStructure(input: Buffer | string): Promise<boolean> {
    try {
      const image = sharp(input);
      const metadata = await image.metadata();
      
      // Check if image has valid dimensions
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      // Check for reasonable dimensions
      if (metadata.width > this.maxDimensions.width || 
          metadata.height > this.maxDimensions.height) {
        throw new Error('Image dimensions exceed maximum allowed size');
      }

      // Check if format is supported
      if (metadata.format && !this.supportedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      // Verify image can be processed
      const stats = await image.stats();
      if (!stats) {
        throw new Error('Unable to analyze image statistics');
      }

      return true;
    } catch (error) {
      logger.error('Image validation failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple thumbnail sizes
   */
  async generateThumbnails(
    sourcePath: string, 
    thumbnailSizes: ThumbnailSize[]
  ): Promise<ProcessedVariant[]> {
    try {
      const variants: ProcessedVariant[] = [];
      const sourceDir = path.dirname(sourcePath);
      const sourceBasename = path.basename(sourcePath, path.extname(sourcePath));

      for (const size of thumbnailSizes) {
        try {
          const variant = await this.generateSingleThumbnail(
            sourcePath, 
            sourceDir, 
            sourceBasename, 
            size
          );
          variants.push(variant);
        } catch (error) {
          logger.warn(`Failed to generate ${size.name} thumbnail:`, {
            source: sourcePath,
            size: size.name,
            error: error.message
          });
        }
      }

      logger.info('Generated thumbnails:', {
        source: sourcePath,
        count: variants.length,
        sizes: variants.map(v => v.type)
      });

      return variants;
    } catch (error) {
      logger.error('Error generating thumbnails:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Generate a single thumbnail
   */
  private async generateSingleThumbnail(
    sourcePath: string,
    outputDir: string,
    basename: string,
    size: ThumbnailSize
  ): Promise<ProcessedVariant> {
    const outputFormat = size.format || 'webp';
    const outputFilename = `${basename}_${size.name}.${outputFormat}`;
    const outputPath = path.join(outputDir, 'thumbnails', outputFilename);
    
    // Ensure thumbnails directory exists
    await fs.ensureDir(path.dirname(outputPath));

    const image = sharp(sourcePath);
    
    // Resize image
    let resized = image.resize({
      width: size.width,
      height: size.height,
      fit: size.fit,
      withoutEnlargement: true
    });

    // Apply format-specific optimizations
    switch (outputFormat) {
      case 'jpeg':
        resized = resized.jpeg({ 
          quality: size.quality || this.defaultQuality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        resized = resized.png({ 
          quality: size.quality || this.defaultQuality,
          compressionLevel: 9,
          progressive: true
        });
        break;
      case 'webp':
        resized = resized.webp({ 
          quality: size.quality || this.defaultQuality,
          effort: 6
        });
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    // Save the processed image
    await resized.toFile(outputPath);
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    const metadata = await this.getImageInfo(outputPath);

    return {
      id: `${basename}_${size.name}`,
      type: size.name as VariantType,
      filename: outputFilename,
      path: outputPath,
      url: `/uploads/thumbnails/${outputFilename}`,
      size: stats.size,
      mimetype: `image/${outputFormat}`,
      metadata,
      createdAt: new Date()
    };
  }

  /**
   * Compress image with quality control
   */
  async compressImage(
    input: Buffer | string, 
    options: ProcessingOptions = { quality: this.defaultQuality }
  ): Promise<Buffer> {
    try {
      let image = sharp(input);
      const metadata = await image.metadata();
      
      if (!metadata.format) {
        throw new Error('Unable to determine image format');
      }

      // Apply format-specific compression
      switch (metadata.format) {
        case 'jpeg':
          image = image.jpeg({
            quality: options.quality,
            progressive: options.progressive !== false,
            optimizeScans: options.optimizeScans !== false,
            mozjpeg: options.mozjpeg !== false
          });
          break;
          
        case 'png':
          image = image.png({
            quality: options.quality,
            compressionLevel: options.compression?.level || 9,
            progressive: options.progressive !== false
          });
          break;
          
        case 'webp':
          image = image.webp({
            quality: options.quality,
            effort: options.compression?.effort || 6
          });
          break;
          
        default:
          // For unsupported formats, convert to WebP
          image = image.webp({ quality: options.quality });
      }

      return await image.toBuffer();
    } catch (error) {
      logger.error('Error compressing image:', error);
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  /**
   * Resize image with advanced options
   */
  async resizeImage(
    input: Buffer | string,
    resizeOptions: ResizeOptions,
    processingOptions: ProcessingOptions = { quality: this.defaultQuality }
  ): Promise<Buffer> {
    try {
      let image = sharp(input);
      
      // Apply resize
      image = image.resize({
        width: resizeOptions.width,
        height: resizeOptions.height,
        fit: resizeOptions.fit || 'cover',
        position: resizeOptions.position,
        background: resizeOptions.background || { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: resizeOptions.withoutEnlargement !== false
      });

      // Apply quality settings
      const metadata = await sharp(input).metadata();
      const format = metadata.format || 'webp';
      
      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality: processingOptions.quality });
          break;
        case 'png':
          image = image.png({ quality: processingOptions.quality });
          break;
        case 'webp':
          image = image.webp({ quality: processingOptions.quality });
          break;
      }

      return await image.toBuffer();
    } catch (error) {
      logger.error('Error resizing image:', error);
      throw new Error(`Image resize failed: ${error.message}`);
    }
  }

  /**
   * Add watermark to image
   */
  async addWatermark(
    input: Buffer | string,
    watermarkOptions: NonNullable<ProcessingOptions['watermark']>
  ): Promise<Buffer> {
    try {
      const image = sharp(input);
      const { width, height } = await image.metadata();
      
      if (!width || !height) {
        throw new Error('Unable to determine image dimensions for watermarking');
      }

      // Create watermark SVG
      const fontSize = watermarkOptions.fontSize || Math.floor(Math.min(width, height) * 0.05);
      const watermarkSvg = this.createWatermarkSvg(
        watermarkOptions.text,
        fontSize,
        watermarkOptions.color || '#ffffff',
        watermarkOptions.opacity || 0.7
      );

      // Calculate position
      const position = this.calculateWatermarkPosition(
        watermarkOptions.position,
        width,
        height,
        fontSize
      );

      return await image
        .composite([{
          input: Buffer.from(watermarkSvg),
          gravity: position.gravity,
          left: position.left,
          top: position.top
        }])
        .toBuffer();
    } catch (error) {
      logger.error('Error adding watermark:', error);
      throw new Error(`Watermark application failed: ${error.message}`);
    }
  }

  /**
   * Convert image format
   */
  async convertFormat(
    input: Buffer | string,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    quality: number = this.defaultQuality
  ): Promise<Buffer> {
    try {
      let image = sharp(input);

      switch (targetFormat) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true });
          break;
        case 'png':
          image = image.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          image = image.webp({ quality, effort: 6 });
          break;
        case 'avif':
          image = image.avif({ quality, effort: 9 });
          break;
        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      return await image.toBuffer();
    } catch (error) {
      logger.error('Error converting image format:', error);
      throw new Error(`Format conversion failed: ${error.message}`);
    }
  }

  /**
   * Extract color palette from image
   */
  async extractColorPalette(input: Buffer | string, colors: number = 5): Promise<string[]> {
    try {
      const image = sharp(input);
      const { dominant } = await image.stats();
      
      // For now, return the dominant color
      // In a full implementation, you'd use a color quantization algorithm
      const { r, g, b } = dominant;
      const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      return [hexColor];
    } catch (error) {
      logger.error('Error extracting color palette:', error);
      throw new Error(`Color extraction failed: ${error.message}`);
    }
  }

  /**
   * Optimize image for web delivery
   */
  async optimizeForWeb(input: Buffer | string): Promise<{
    webp: Buffer;
    jpeg: Buffer;
    avif?: Buffer;
  }> {
    try {
      const image = sharp(input);
      
      const [webp, jpeg, avif] = await Promise.all([
        image.clone().webp({ quality: 85, effort: 6 }).toBuffer(),
        image.clone().jpeg({ quality: 85, progressive: true, mozjpeg: true }).toBuffer(),
        image.clone().avif({ quality: 80, effort: 9 }).toBuffer().catch(() => null)
      ]);

      const result: any = { webp, jpeg };
      if (avif) result.avif = avif;

      return result;
    } catch (error) {
      logger.error('Error optimizing image for web:', error);
      throw new Error(`Web optimization failed: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  private createWatermarkSvg(
    text: string, 
    fontSize: number, 
    color: string, 
    opacity: number
  ): string {
    return `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" 
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              fill="${color}" 
              fill-opacity="${opacity}"
              text-anchor="middle" 
              dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;
  }

  private calculateWatermarkPosition(
    position: string,
    imageWidth: number,
    imageHeight: number,
    fontSize: number
  ): { gravity: string; left?: number; top?: number } {
    const margin = fontSize;
    
    switch (position) {
      case 'top-left':
        return { gravity: 'northwest', left: margin, top: margin };
      case 'top-right':
        return { gravity: 'northeast', left: margin, top: margin };
      case 'bottom-left':
        return { gravity: 'southwest', left: margin, top: margin };
      case 'bottom-right':
        return { gravity: 'southeast', left: margin, top: margin };
      case 'center':
      default:
        return { gravity: 'center' };
    }
  }

  /**
   * Batch process images
   */
  async batchProcess(
    inputs: Array<{ input: Buffer | string; options: ProcessingOptions }>,
    operation: 'compress' | 'resize' | 'convert'
  ): Promise<Buffer[]> {
    try {
      const results = await Promise.all(
        inputs.map(async ({ input, options }) => {
          switch (operation) {
            case 'compress':
              return this.compressImage(input, options);
            case 'resize':
              return this.resizeImage(input, {}, options);
            case 'convert':
              return this.convertFormat(input, 'webp', options.quality);
            default:
              throw new Error(`Unsupported batch operation: ${operation}`);
          }
        })
      );

      return results;
    } catch (error) {
      logger.error('Error in batch processing:', error);
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }
}