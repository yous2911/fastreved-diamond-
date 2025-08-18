// Service factory for consistent dependency injection and testing
import { EncryptionService } from './encryption.service';
import { EmailService } from './email.service';
import { AuditTrailService } from './audit-trail.service';
import { ParentalConsentService } from './parental-consent.service';
import { DataAnonymizationService } from './data-anonymization.service';
import { DataRetentionService } from './data-retention.service';
import { FileUploadService } from './file-upload.service';
import { ImageProcessingService } from './image-processing.service';
import { StorageService } from './storage.service';
import { FileSecurityService } from './file-security.service';

export class ServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getEncryptionService(): EncryptionService {
    if (!this.instances.has('encryption')) {
      this.instances.set('encryption', new EncryptionService());
    }
    return this.instances.get('encryption');
  }

  static getEmailService(): EmailService {
    if (!this.instances.has('email')) {
      this.instances.set('email', new EmailService());
    }
    return this.instances.get('email');
  }

  static getAuditTrailService(): AuditTrailService {
    if (!this.instances.has('audit')) {
      this.instances.set('audit', new AuditTrailService());
    }
    return this.instances.get('audit');
  }

  static getParentalConsentService(): ParentalConsentService {
    if (!this.instances.has('consent')) {
      this.instances.set('consent', new ParentalConsentService());
    }
    return this.instances.get('consent');
  }

  static getDataAnonymizationService(): DataAnonymizationService {
    if (!this.instances.has('anonymization')) {
      this.instances.set('anonymization', new DataAnonymizationService());
    }
    return this.instances.get('anonymization');
  }

  static getDataRetentionService(): DataRetentionService {
    if (!this.instances.has('retention')) {
      this.instances.set('retention', new DataRetentionService());
    }
    return this.instances.get('retention');
  }

  static getFileUploadService(): FileUploadService {
    if (!this.instances.has('fileUpload')) {
      this.instances.set('fileUpload', new FileUploadService());
    }
    return this.instances.get('fileUpload');
  }

  static getImageProcessingService(): ImageProcessingService {
    if (!this.instances.has('imageProcessing')) {
      this.instances.set('imageProcessing', new ImageProcessingService());
    }
    return this.instances.get('imageProcessing');
  }

  static getStorageService(): StorageService {
    if (!this.instances.has('storage')) {
      this.instances.set('storage', new StorageService());
    }
    return this.instances.get('storage');
  }

  static getFileSecurityService(): FileSecurityService {
    if (!this.instances.has('fileSecurity')) {
      this.instances.set('fileSecurity', new FileSecurityService());
    }
    return this.instances.get('fileSecurity');
  }

  // For testing - clear all instances
  static clearInstances(): void {
    this.instances.clear();
  }

  // For testing - set mock instance
  static setMockInstance(serviceName: string, mockInstance: any): void {
    this.instances.set(serviceName, mockInstance);
  }
}