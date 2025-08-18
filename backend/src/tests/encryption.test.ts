import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionService } from '../services/encryption.service';

// Mock the audit service
vi.mock('../services/audit-trail.service', () => ({
  AuditTrailService: vi.fn().mockImplementation(() => ({
    logAction: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Use default constructor for tests 
    encryptionService = new EncryptionService();
  });

  describe('Data Encryption/Decryption', () => {
    it('should encrypt and decrypt student data correctly', async () => {
      const testData = {
        studentName: 'John Doe',
        email: 'john@example.com',
        age: 12,
        scores: [85, 92, 78]
      };

      const encrypted = await encryptionService.encryptStudentData(testData);
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('keyId');
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      const decrypted = await encryptionService.decryptStudentData(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should encrypt different data differently', async () => {
      const data1 = { message: 'Hello' };
      const data2 = { message: 'World' };

      const encrypted1 = await encryptionService.encryptStudentData(data1);
      const encrypted2 = await encryptionService.encryptStudentData(data2);

      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle different usage types', async () => {
      const testData = { sensitive: 'information' };

      const studentData = await encryptionService.encryptStudentData(testData, 'student_data');
      const auditData = await encryptionService.encryptStudentData(testData, 'audit_logs');

      expect(studentData.keyId).not.toBe(auditData.keyId);
    });

    it('should fail to decrypt with tampered data', async () => {
      const testData = { message: 'Secret' };
      const encrypted = await encryptionService.encryptStudentData(testData);

      // Tamper with encrypted data
      encrypted.encryptedData = encrypted.encryptedData.replace('a', 'b');

      await expect(
        encryptionService.decryptStudentData(encrypted)
      ).rejects.toThrow();
    });
  });

  describe('Sensitive Field Encryption', () => {
    it('should encrypt and decrypt sensitive fields', async () => {
      const record = {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        publicInfo: 'This is not sensitive'
      };

      const sensitiveFields = ['name', 'email'];
      
      const encrypted = await encryptionService.encryptSensitiveFields(record, sensitiveFields);
      expect(encrypted).not.toHaveProperty('name');
      expect(encrypted).not.toHaveProperty('email');
      expect(encrypted).toHaveProperty('name_encrypted');
      expect(encrypted).toHaveProperty('email_encrypted');
      expect(encrypted.publicInfo).toBe(record.publicInfo);

      const decrypted = await encryptionService.decryptSensitiveFields(encrypted, sensitiveFields);
      expect(decrypted.name).toBe(record.name);
      expect(decrypted.email).toBe(record.email);
      expect(decrypted).not.toHaveProperty('name_encrypted');
      expect(decrypted).not.toHaveProperty('email_encrypted');
    });
  });

  describe('Hash Generation', () => {
    it('should generate consistent SHA-256 hashes', () => {
      const data = 'test data';
      const hash1 = encryptionService.generateSHA256Hash(data);
      const hash2 = encryptionService.generateSHA256Hash(data);
      const hash3 = encryptionService.generateSHA256Hash('different data');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different hash types', () => {
      const data = 'test data';
      
      const sha256 = encryptionService.generateSHA256Hash(data);
      const sha512 = encryptionService.generateSHA512Hash(data);
      const md5 = encryptionService.generateMD5Hash(data);

      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
      expect(md5).toHaveLength(32);
      expect(sha256).not.toBe(sha512);
      expect(sha256).not.toBe(md5);
    });

    it('should generate and verify password hashes', async () => {
      const password = 'test-password-123';
      
      const hash = await encryptionService.generatePasswordHash(password);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format

      const isValid = await encryptionService.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await encryptionService.verifyPassword('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });

    it('should generate HMAC signatures', () => {
      const data = 'important data';
      const secret = 'secret-key';

      const hmac1 = encryptionService.generateHMAC(data, secret);
      const hmac2 = encryptionService.generateHMAC(data, secret);
      const hmac3 = encryptionService.generateHMAC(data, 'different-secret');

      expect(hmac1).toBe(hmac2);
      expect(hmac1).not.toBe(hmac3);
      expect(hmac1).toHaveLength(64); // HMAC-SHA256 hex length
    });
  });

  describe('Random Generation', () => {
    it('should generate secure random tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();
      const shortToken = encryptionService.generateSecureToken(16);

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes * 2 hex chars
      expect(shortToken).toHaveLength(32); // 16 bytes * 2 hex chars
    });

    it('should generate valid UUIDs', () => {
      const uuid1 = encryptionService.generateUUID();
      const uuid2 = encryptionService.generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate secure random integers', () => {
      const randomInt = encryptionService.generateSecureRandomInt(1, 100);
      expect(randomInt).toBeGreaterThanOrEqual(1);
      expect(randomInt).toBeLessThanOrEqual(100);
      expect(Number.isInteger(randomInt)).toBe(true);
    });

    it('should generate numeric OTP codes', () => {
      const otp6 = encryptionService.generateOTP();
      const otp4 = encryptionService.generateOTP(4);

      expect(otp6).toMatch(/^\d{6}$/);
      expect(otp4).toMatch(/^\d{4}$/);
    });
  });

  describe('Data Integrity', () => {
    it('should generate and verify integrity checksums', () => {
      const testData = { id: 123, name: 'Test', values: [1, 2, 3] };
      
      const checksum = encryptionService.generateIntegrityChecksum(testData);
      expect(checksum).toHaveLength(64); // SHA-256 hex

      const isValid = encryptionService.verifyIntegrityChecksum(testData, checksum);
      expect(isValid).toBe(true);

      // Modify data and verify checksum fails
      const modifiedData = { ...testData, name: 'Modified' };
      const isInvalid = encryptionService.verifyIntegrityChecksum(modifiedData, checksum);
      expect(isInvalid).toBe(false);
    });

    it('should generate and verify digital signatures', () => {
      const data = 'Important document content';
      
      const signature = encryptionService.generateDigitalSignature(data);
      expect(signature).toHaveLength(64);

      const isValid = encryptionService.verifyDigitalSignature(data, signature);
      expect(isValid).toBe(true);

      const isInvalid = encryptionService.verifyDigitalSignature('Modified content', signature);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Key Derivation', () => {
    it('should derive keys from passwords', () => {
      const password = 'user-password-123';
      const salt = encryptionService.generateSalt();

      const derived1 = encryptionService.deriveEncryptionKey(password, salt);
      const derived2 = encryptionService.deriveEncryptionKey(password, salt);
      const derived3 = encryptionService.deriveEncryptionKey(password);

      expect(derived1.key).toEqual(derived2.key);
      expect(derived1.salt).toEqual(salt);
      expect(derived3.key).not.toEqual(derived1.key); // Different salt
    });

    it('should use PBKDF2 for key derivation', () => {
      const password = 'test-password';
      const salt = Buffer.from('salt');
      
      const key = encryptionService.deriveKeyPBKDF2(password, salt, 1000, 32);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });
  });

  describe('Utility Methods', () => {
    it('should perform secure string comparison', () => {
      const string1 = 'secret-value';
      const string2 = 'secret-value';
      const string3 = 'different-value';

      expect(encryptionService.secureCompare(string1, string2)).toBe(true);
      expect(encryptionService.secureCompare(string1, string3)).toBe(false);
      expect(encryptionService.secureCompare(string1, 'secret-valu')).toBe(false);
    });

    it('should provide encryption statistics', () => {
      const stats = encryptionService.getEncryptionStats();
      
      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('activeKeys');
      expect(stats).toHaveProperty('deprecatedKeys');
      expect(stats).toHaveProperty('revokedKeys');
      expect(stats).toHaveProperty('keysByUsage');
      expect(stats).toHaveProperty('oldestKey');
      expect(stats).toHaveProperty('newestKey');
      
      expect(typeof stats.totalKeys).toBe('number');
      expect(typeof stats.keysByUsage).toBe('object');
    });
  });

  describe('Key Management', () => {
    it('should list encryption keys without exposing actual keys', () => {
      const keys = encryptionService.listKeys();
      
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
      
      for (const key of keys) {
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('algorithm');
        expect(key).toHaveProperty('version');
        expect(key).toHaveProperty('createdAt');
        expect(key).toHaveProperty('status');
        expect(key).toHaveProperty('usage');
        expect(key).not.toHaveProperty('key'); // Actual key should not be exposed
      }
    });

    it('should get key information by ID', () => {
      const keys = encryptionService.listKeys();
      const firstKey = keys[0];
      
      const keyInfo = encryptionService.getKeyInfo(firstKey.id);
      expect(keyInfo).toBeTruthy();
      expect(keyInfo?.id).toBe(firstKey.id);
      expect(keyInfo).not.toHaveProperty('key');
    });

    it('should return null for non-existent key', () => {
      const keyInfo = encryptionService.getKeyInfo('non-existent-key-id');
      expect(keyInfo).toBeNull();
    });
  });

  describe('Service Testing', () => {
    it('should run comprehensive service test', async () => {
      const testResults = await encryptionService.testEncryptionService();
      
      expect(testResults.encryption).toBe(true);
      expect(testResults.hashing).toBe(true);
      expect(testResults.keyGeneration).toBe(true);
      expect(testResults.integrity).toBe(true);
      
      expect(testResults.performance.encryptionTime).toBeGreaterThan(0);
      expect(testResults.performance.decryptionTime).toBeGreaterThan(0);
      expect(testResults.performance.hashingTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Test with invalid data type that cannot be serialized
      const circularRef: any = {};
      circularRef.self = circularRef;

      await expect(
        encryptionService.encryptStudentData(circularRef)
      ).rejects.toThrow();
    });

    it('should handle decryption with invalid key ID', async () => {
      const validData = { message: 'test' };
      const encrypted = await encryptionService.encryptStudentData(validData);
      
      // Modify key ID to invalid one
      encrypted.keyId = 'invalid-key-id';

      await expect(
        encryptionService.decryptStudentData(encrypted)
      ).rejects.toThrow();
    });
  });
});