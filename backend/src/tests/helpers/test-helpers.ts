// Test helpers for consistent mocking and setup
import { vi } from 'vitest';

export class TestHelpers {
  /**
   * Create standardized service mocks
   */
  static createServiceMocks() {
    return {
      auditService: {
        logAction: vi.fn().mockResolvedValue('audit-log-id'),
        queryLogs: vi.fn().mockResolvedValue([]),
        archiveLogs: vi.fn().mockResolvedValue(undefined)
      },
      
      emailService: {
        sendEmail: vi.fn().mockResolvedValue(undefined),
        sendParentalConsentEmail: vi.fn().mockResolvedValue(undefined),
        sendGDPRVerificationEmail: vi.fn().mockResolvedValue(undefined),
        sendDataExportEmail: vi.fn().mockResolvedValue(undefined),
        verifyConnection: vi.fn().mockResolvedValue(true)
      },
      
      encryptionService: {
        encryptSensitiveData: vi.fn().mockReturnValue({
          encrypted: 'encrypted-data',
          iv: 'iv-value',
          tag: 'tag-value'
        }),
        decryptSensitiveData: vi.fn().mockReturnValue('decrypted-data'),
        encryptStudentData: vi.fn().mockResolvedValue({
          encryptedData: 'encrypted-data',
          iv: 'iv-value',
          authTag: 'auth-tag',
          keyId: 'key-id',
          algorithm: 'aes-256-gcm',
          version: 1
        }),
        decryptStudentData: vi.fn().mockResolvedValue({}),
        generateSecureToken: vi.fn().mockReturnValue('secure-token-123'),
        generateSHA256Hash: vi.fn().mockReturnValue('hash-value'),
        hashPersonalData: vi.fn().mockReturnValue('hashed-data'),
        generateAnonymousId: vi.fn().mockReturnValue('anon-id'),
        cleanupExpiredKeys: vi.fn().mockResolvedValue(undefined)
      },
      
      storageService: {
        uploadFile: vi.fn().mockResolvedValue({
          id: 'file-id',
          url: 'http://example.com/file.jpg',
          path: '/uploads/file.jpg'
        }),
        deleteFile: vi.fn().mockResolvedValue(undefined),
        getFileMetadata: vi.fn().mockResolvedValue({}),
        createVariant: vi.fn().mockResolvedValue({})
      },
      
      fileSecurityService: {
        scanFile: vi.fn().mockResolvedValue({
          isClean: true,
          threats: [],
          scanEngine: 'test-scanner'
        }),
        quarantineFile: vi.fn().mockResolvedValue(undefined),
        validateFileType: vi.fn().mockReturnValue(true),
        checkFileSize: vi.fn().mockReturnValue(true)
      },
      
      imageProcessingService: {
        processImage: vi.fn().mockResolvedValue({
          processed: true,
          variants: []
        }),
        createThumbnail: vi.fn().mockResolvedValue({
          path: '/thumbnails/thumb.jpg',
          size: { width: 150, height: 150 }
        }),
        optimizeImage: vi.fn().mockResolvedValue({
          path: '/optimized/image.jpg',
          sizeDiff: 50
        })
      }
    };
  }

  /**
   * Create mock database connection
   */
  static createMockDatabase() {
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: 1 }])
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1 }])
        })
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      }),
      run: vi.fn().mockResolvedValue(undefined)
    };
  }

  /**
   * Create standardized test data
   */
  static createTestData() {
    return {
      student: {
        id: 1,
        prenom: 'Alice',
        nom: 'Dupont',
        dateNaissance: '2015-03-15',
        niveauActuel: 'CP',
        totalPoints: 150,
        serieJours: 5,
        mascotteType: 'dragon',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      
      exercise: {
        id: 1,
        titre: 'Addition simple',
        description: 'Apprendre à additionner',
        type: 'CALCUL',
        difficulte: 'FACILE',
        xp: 10,
        configuration: JSON.stringify({ question: '2+3=?', answer: '5' }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      
      consentRequest: {
        parentEmail: 'parent@example.com',
        parentName: 'John Parent',
        childName: 'Alice Child',
        childAge: 8,
        consentTypes: ['data_processing', 'educational_tracking'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      },
      
      file: {
        id: 'file-123',
        originalName: 'test-image.jpg',
        filename: 'processed-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/test-image.jpg',
        url: 'http://example.com/uploads/test-image.jpg',
        uploadedBy: 'user-123',
        category: 'image',
        status: 'ready',
        checksum: 'abc123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Reset all mocks
   */
  static resetMocks() {
    vi.clearAllMocks();
  }
}