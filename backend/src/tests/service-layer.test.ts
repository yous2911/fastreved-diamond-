import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceFactory } from '../services/service-factory';
import { TestHelpers } from './helpers/test-helpers';

describe('Service Layer Integration', () => {
  beforeEach(() => {
    TestHelpers.resetMocks();
    ServiceFactory.clearInstances();
  });

  describe('Service Factory', () => {
    it('should create and return service instances', () => {
      const encryptionService = ServiceFactory.getEncryptionService();
      const emailService = ServiceFactory.getEmailService();
      const auditService = ServiceFactory.getAuditTrailService();

      expect(encryptionService).toBeDefined();
      expect(emailService).toBeDefined();
      expect(auditService).toBeDefined();
    });

    it('should return same instance on subsequent calls (singleton pattern)', () => {
      const encryption1 = ServiceFactory.getEncryptionService();
      const encryption2 = ServiceFactory.getEncryptionService();

      expect(encryption1).toBe(encryption2);
    });

    it('should clear instances when requested', () => {
      const encryption1 = ServiceFactory.getEncryptionService();
      ServiceFactory.clearInstances();
      const encryption2 = ServiceFactory.getEncryptionService();

      expect(encryption1).not.toBe(encryption2);
    });
  });

  describe('EncryptionService Basic Functions', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const encryptionService = ServiceFactory.getEncryptionService();
      
      const testData = { message: 'Hello World', id: 123 };
      const encrypted = await encryptionService.encryptStudentData(testData);
      
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      const decrypted = await encryptionService.decryptStudentData(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should generate secure tokens', () => {
      const encryptionService = ServiceFactory.getEncryptionService();
      
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should generate consistent hashes', () => {
      const encryptionService = ServiceFactory.getEncryptionService();
      
      const data = 'test data';
      const hash1 = encryptionService.generateSHA256Hash(data);
      const hash2 = encryptionService.generateSHA256Hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA256 produces 64 character hex string
    });
  });

  describe('Service Dependencies', () => {
    it('should handle service creation without throwing errors', () => {
      expect(() => {
        ServiceFactory.getEmailService();
        ServiceFactory.getStorageService();
        ServiceFactory.getFileSecurityService();
        ServiceFactory.getImageProcessingService();
      }).not.toThrow();
    });
  });
});