import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuditTrailService } from '../services/audit-trail.service';
import { DataAnonymizationService } from '../services/data-anonymization.service';
import { DataRetentionService } from '../services/data-retention.service';
import { GDPRRightsService } from '../services/gdpr-rights.service';
import { ParentalConsentService } from '../services/parental-consent.service';

// Mock database connection
jest.mock('../db/connection', () => ({
  db: {
    insert: jest.fn().mockReturnValue({ insertId: 1 }),
    select: jest.fn().mockReturnValue({ 
      from: jest.fn().mockReturnValue({ 
        where: jest.fn().mockReturnValue({ 
          limit: jest.fn().mockResolvedValue([]) 
        }) 
      }) 
    }),
    update: jest.fn().mockReturnValue({ 
      set: jest.fn().mockReturnValue({ 
        where: jest.fn().mockResolvedValue({ rowsAffected: 1 }) 
      }) 
    }),
    delete: jest.fn().mockReturnValue({ 
      where: jest.fn().mockResolvedValue({ rowsAffected: 1 }) 
    })
  }
}));

// Mock email service
jest.mock('../services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendSecurityAlert: jest.fn().mockResolvedValue(undefined),
    sendInactivityWarning: jest.fn().mockResolvedValue(undefined),
    sendRetentionNotification: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('GDPR Services Tests', () => {
  let auditTrailService: AuditTrailService;
  let dataAnonymizationService: DataAnonymizationService;
  let dataRetentionService: DataRetentionService;
  let gdprRightsService: GDPRRightsService;
  let parentalConsentService: ParentalConsentService;

  beforeEach(() => {
    auditTrailService = new AuditTrailService();
    dataAnonymizationService = new DataAnonymizationService();
    dataRetentionService = new DataRetentionService();
    gdprRightsService = new GDPRRightsService();
    parentalConsentService = new ParentalConsentService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AuditTrailService', () => {
    it('should log audit entry successfully', async () => {
      const mockEntry = {
        entityType: 'student',
        entityId: '123',
        action: 'login',
        userId: 'user123',
        details: { ip: '192.168.1.1' },
          ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        severity: 'medium' as const,
        category: 'security' as const
      };

      const result = await auditTrailService.logAction(mockEntry);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should query audit entries with filters', async () => {
      const mockQuery = {
        entityType: 'student',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 0
      };

      const result = await auditTrailService.queryAuditLogs(mockQuery);
      expect(result).toBeDefined();
      expect(result.entries).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should generate compliance report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await auditTrailService.generateComplianceReport(startDate, endDate);
      expect(result).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(result.topActions).toBeInstanceOf(Array);
    });

    it('should get student audit trail', async () => {
      const studentId = '123';
      const result = await auditTrailService.getStudentAuditTrail(studentId);
      expect(result).toBeInstanceOf(Array);
    });

    it('should anonymize student audit logs', async () => {
      const studentId = '123';
      const reason = 'consent_revocation';
      const result = await auditTrailService.anonymizeStudentAuditLogs(studentId, reason);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should verify audit integrity', async () => {
      const auditId = 'audit123';
      const result = await auditTrailService.verifyAuditIntegrity(auditId);
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
    });
  });

  describe('DataAnonymizationService', () => {
    it('should create anonymization job', async () => {
      const mockJob = {
        entityType: 'student',
        entityId: '123',
        reason: 'consent_revocation',
        rules: [
          { field: 'name', action: 'anonymize' },
          { field: 'email', action: 'anonymize' }
        ],
        scheduledFor: new Date()
      };

      const result = await dataAnonymizationService.createAnonymizationJob(mockJob);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('scheduled');
    });

    it('should schedule anonymization job', async () => {
      const mockJob = {
            entityType: 'student',
            entityId: '123',
        reason: 'consent_revocation',
        rules: [
          { field: 'name', action: 'anonymize' }
        ],
        scheduledFor: new Date(Date.now() + 1000)
      };

      const result = await dataAnonymizationService.scheduleAnonymization(mockJob);
      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
    });

    it('should get anonymization job status', async () => {
      const jobId = 'job123';
      const result = await dataAnonymizationService.getJobStatus(jobId);
      expect(result).toBeDefined();
      expect(result.jobId).toBe(jobId);
    });

    it('should cancel anonymization job', async () => {
      const jobId = 'job123';
      const result = await dataAnonymizationService.cancelAnonymization(jobId);
      expect(result).toBeDefined();
      expect(result.cancelled).toBe(true);
    });
  });

  describe('DataRetentionService', () => {
    it('should create retention policy', async () => {
      const mockPolicy = {
          entityType: 'student',
        retentionPeriodDays: 365,
        action: 'delete',
        conditions: { inactive: true },
        exceptions: ['legal_hold'],
        legalBasis: 'legitimate_interest',
        description: 'Delete inactive student accounts after 1 year'
      };

      const result = await dataRetentionService.createPolicy(mockPolicy);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.entityType).toBe('student');
    });

    it('should update retention policy', async () => {
      const policyId = 'policy123';
      const updates = {
        retentionPeriodDays: 730,
        description: 'Updated policy'
      };

      const result = await dataRetentionService.updatePolicy(policyId, updates);
      expect(result).toBeDefined();
      expect(result.id).toBe(policyId);
    });

    it('should execute retention policy', async () => {
      const policyId = 'policy123';
      const result = await dataRetentionService.executePolicy(policyId);
      expect(result).toBeDefined();
      expect(result.policyId).toBe(policyId);
      expect(result.entitiesProcessed).toBeGreaterThanOrEqual(0);
      expect(result.entitiesDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should generate retention report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await dataRetentionService.generateRetentionReport(startDate, endDate);
      expect(result).toBeDefined();
      expect(result.policiesExecuted).toBeInstanceOf(Array);
      expect(result.complianceStatus).toBeDefined();
    });
  });

  describe('GDPRRightsService', () => {
    it('should create GDPR request', async () => {
      const mockRequest = {
        requesterName: 'John Doe',
        requesterEmail: 'john@example.com',
        requestType: 'access',
        studentId: '123',
        priority: 'normal' as const
      };

      const result = await gdprRightsService.createRequest(mockRequest);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.dueDate).toBeDefined();
    });

    it('should process data access request', async () => {
      const requestId = 'request123';
      const result = await gdprRightsService.processDataAccessRequest(requestId);
      expect(result).toBeDefined();
      expect(result.requestId).toBe(requestId);
      expect(result.dataPortfolio).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
    });

    it('should process data erasure request', async () => {
      const requestId = 'request123';
      const result = await gdprRightsService.processDataErasureRequest(requestId);
      expect(result).toBeDefined();
      expect(result.requestId).toBe(requestId);
      expect(result.deletedData).toBeInstanceOf(Array);
      expect(result.retainedData).toBeInstanceOf(Array);
    });

    it('should process data portability request', async () => {
      const requestId = 'request123';
      const result = await gdprRightsService.processDataPortabilityRequest(requestId);
      expect(result).toBeDefined();
      expect(result.requestId).toBe(requestId);
      expect(result.portableData).toBeDefined();
      expect(result.downloadUrl).toBeDefined();
    });
  });

  describe('ParentalConsentService', () => {
    it('should create parental consent request', async () => {
      const mockConsent = {
        parentEmail: 'parent@example.com',
        childName: 'Alice Smith',
        parentName: 'John Smith',
        childAge: 8,
        consentTypes: ['data_processing', 'educational_content', 'progress_tracking']
      };

      const result = await parentalConsentService.createConsentRequest(mockConsent);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.firstVerificationToken).toBeDefined();
      expect(result.secondVerificationToken).toBeDefined();
    });

    it('should verify first consent', async () => {
      const token = 'token123';
      const result = await parentalConsentService.verifyFirstConsent(token);
      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
      expect(result.secondTokenSent).toBe(true);
    });

    it('should verify second consent and create student account', async () => {
      const token = 'token456';
      const result = await parentalConsentService.verifySecondConsent(token);
      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
      expect(result.studentAccountCreated).toBe(true);
      expect(result.studentId).toBeDefined();
    });

    it('should revoke consent', async () => {
      const consentId = 'consent123';
      const parentEmail = 'parent@example.com';
      const result = await parentalConsentService.revokeConsent(consentId, parentEmail);
      expect(result).toBeDefined();
      expect(result.revoked).toBe(true);
      expect(result.dataAnonymized).toBe(true);
    });
  });
});