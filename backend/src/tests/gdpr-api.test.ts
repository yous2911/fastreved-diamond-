import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../app-test';
import type { FastifyInstance } from 'fastify';
import { 
  SubmitConsentRequest, 
  SubmitGDPRRequest, 
  ConsentPreferencesRequest 
} from '../types/gdpr.types';

describe('GDPR API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Parental Consent Endpoints', () => {
    describe('POST /api/gdpr/consent/submit', () => {
      it('should submit parental consent successfully', async () => {
        const consentData: SubmitConsentRequest = {
          parentEmail: 'parent@example.com',
          parentName: 'John Parent',
          childName: 'Alice Child',
          childAge: 8,
          consentTypes: ['data_processing', 'educational_tracking', 'progress_sharing'],
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (test browser)'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/submit',
          payload: consentData
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('consentId');
        expect(body.data).toHaveProperty('message');
        expect(body.data.consentId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          parentEmail: 'parent@example.com',
          // Missing required fields
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/submit',
          payload: incompleteData
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate email format', async () => {
        const invalidEmailData = {
          parentEmail: 'invalid-email-format',
          parentName: 'John Parent',
          childName: 'Alice Child',
          childAge: 8,
          consentTypes: ['data_processing'],
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/submit',
          payload: invalidEmailData
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate child age bounds', async () => {
        const invalidAgeData = {
          parentEmail: 'parent@example.com',
          parentName: 'John Parent',
          childName: 'Alice Child',
          childAge: 25, // Invalid age
          consentTypes: ['data_processing'],
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/submit',
          payload: invalidAgeData
        });

        expect(response.statusCode).toBe(400);
      });

      it('should handle empty consent types array', async () => {
        const emptyConsentData = {
          parentEmail: 'parent@example.com',
          parentName: 'John Parent',
          childName: 'Alice Child',
          childAge: 8,
          consentTypes: [], // Empty array
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/submit',
          payload: emptyConsentData
        });

        expect(response.statusCode).toBe(200); // Should still work with empty array
      });
    });

    describe('GET /api/gdpr/consent/verify/:token', () => {
      it('should verify consent token successfully', async () => {
        const token = 'valid-consent-token-123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/consent/verify/${token}`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('message');
        expect(body.data.message).toContain('Première confirmation réussie');
      });

      it('should handle invalid token format', async () => {
        const invalidToken = 'invalid-token';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/consent/verify/${invalidToken}`
        });

        expect(response.statusCode).toBe(200); // Still returns success in mock
      });

      it('should handle missing token parameter', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/gdpr/consent/verify/' // Missing token
        });

        expect(response.statusCode).toBe(404);
      });
    });
  });

  describe('GDPR Request Endpoints', () => {
    describe('POST /api/gdpr/request/submit', () => {
      it('should submit GDPR access request successfully', async () => {
        const gdprRequest: SubmitGDPRRequest = {
          requestType: 'access',
          requesterType: 'parent',
          requesterEmail: 'parent@example.com',
          requesterName: 'John Parent',
          studentId: 123,
          studentName: 'Alice Child',
          parentEmail: 'parent@example.com',
          requestDetails: 'I would like to access all data collected about my child for educational purposes.',
          urgentRequest: false,
          verificationMethod: 'email',
          legalBasis: 'Parental rights under GDPR Article 15',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (test browser)'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/request/submit',
          payload: gdprRequest
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('requestId');
        expect(body.data).toHaveProperty('verificationRequired');
        expect(body.data).toHaveProperty('estimatedCompletionDate');
        expect(body.data.verificationRequired).toBe(true);
      });

      it('should handle urgent GDPR requests with shorter deadline', async () => {
        const urgentRequest: SubmitGDPRRequest = {
          requestType: 'erasure',
          requesterType: 'parent',
          requesterEmail: 'parent@example.com',
          requesterName: 'John Parent',
          requestDetails: 'Urgent: Please delete all data immediately due to privacy concerns.',
          urgentRequest: true,
          verificationMethod: 'email',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/request/submit',
          payload: urgentRequest
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        
        // Urgent requests should have earlier completion date
        const completionDate = new Date(body.data.estimatedCompletionDate);
        const now = new Date();
        const daysDiff = Math.ceil((completionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBeLessThanOrEqual(3); // Urgent requests: 3 days max
      });

      it('should validate GDPR request types', async () => {
        const invalidRequest = {
          requestType: 'invalid_type',
          requesterType: 'parent',
          requesterEmail: 'parent@example.com',
          requesterName: 'John Parent',
          requestDetails: 'Test request',
          verificationMethod: 'email',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/request/submit',
          payload: invalidRequest
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate requester types', async () => {
        const invalidRequester = {
          requestType: 'access',
          requesterType: 'invalid_requester',
          requesterEmail: 'parent@example.com',
          requesterName: 'John Parent',
          requestDetails: 'Test request',
          verificationMethod: 'email',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/request/submit',
          payload: invalidRequester
        });

        expect(response.statusCode).toBe(400);
      });

      it('should require minimum request details length', async () => {
        const shortRequest = {
          requestType: 'access',
          requesterType: 'parent',
          requesterEmail: 'parent@example.com',
          requesterName: 'John Parent',
          requestDetails: 'Short', // Less than 10 characters
          verificationMethod: 'email',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/request/submit',
          payload: shortRequest
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /api/gdpr/request/:requestId/verify/:token', () => {
      it('should verify GDPR request successfully', async () => {
        const requestId = 'test-request-id-123';
        const token = 'verification-token-456';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/request/${requestId}/verify/${token}`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.message).toContain('Identité vérifiée');
      });

      it('should handle missing parameters', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/gdpr/request//verify/' // Missing requestId and token
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('GET /api/gdpr/request/:requestId/status', () => {
      it('should get GDPR request status successfully', async () => {
        const requestId = 'test-request-id-123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/request/${requestId}/status`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('requestId');
        expect(body.data).toHaveProperty('status');
        expect(body.data).toHaveProperty('priority');
        expect(body.data).toHaveProperty('submittedAt');
        expect(body.data).toHaveProperty('dueDate');
        expect(body.data).toHaveProperty('estimatedCompletion');
        expect(body.data.requestId).toBe(requestId);
      });

      it('should handle non-existent request ID', async () => {
        const nonExistentId = 'non-existent-request-id';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/request/${nonExistentId}/status`
        });

        expect(response.statusCode).toBe(200); // Mock returns success
      });
    });
  });

  describe('Consent Preferences Endpoints', () => {
    describe('POST /api/gdpr/consent/preferences', () => {
      it('should update consent preferences successfully', async () => {
        const preferences: ConsentPreferencesRequest = {
          essential: true,
          functional: true,
          analytics: false,
          marketing: false,
          personalization: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (test browser)'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/preferences',
          payload: preferences
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('preferencesId');
        expect(body.data).toHaveProperty('message');
        expect(body.data.preferencesId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should validate required boolean fields', async () => {
        const invalidPreferences = {
          essential: 'true', // Should be boolean, not string
          functional: true,
          analytics: false,
          marketing: false,
          personalization: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/preferences',
          payload: invalidPreferences
        });

        expect(response.statusCode).toBe(400);
      });

      it('should require all preference fields', async () => {
        const incompletePreferences = {
          essential: true,
          functional: true,
          // Missing other required fields
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/gdpr/consent/preferences',
          payload: incompletePreferences
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Data Export Endpoints', () => {
    describe('GET /api/gdpr/export/:studentId', () => {
      it('should export student data in JSON format', async () => {
        const studentId = '123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/export/${studentId}?format=json&includeProgress=true`
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.headers['content-disposition']).toContain('attachment');
        
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('student');
        expect(body).toHaveProperty('progress');
        expect(body).toHaveProperty('exportedAt');
        expect(body.student.id).toBe(studentId);
      });

      it('should export student data in CSV format', async () => {
        const studentId = '123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/export/${studentId}?format=csv`
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.body).toContain('id,prenom,nom,niveau,points');
      });

      it('should export student data in XML format', async () => {
        const studentId = '123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/export/${studentId}?format=xml`
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/xml');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.body).toContain('<?xml version="1.0"?>');
        expect(response.body).toContain('<student>');
      });

      it('should handle export options correctly', async () => {
        const studentId = '123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/export/${studentId}?includeProgress=false&includeAuditLogs=true`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toEqual([]); // Should be empty when includeProgress=false
      });

      it('should use default values for missing query parameters', async () => {
        const studentId = '123';

        const response = await app.inject({
          method: 'GET',
          url: `/api/gdpr/export/${studentId}` // No query parameters
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.format).toBe('json'); // Default format
        expect(Array.isArray(body.progress)).toBe(true); // Default includeProgress=true
      });
    });
  });

  describe('GDPR Health Check', () => {
    describe('GET /api/gdpr/health', () => {
      it('should return GDPR service health status', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/gdpr/health'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('gdprEnabled');
        expect(body.data).toHaveProperty('parentalConsentRequired');
        expect(body.data).toHaveProperty('dataRetentionDays');
        expect(body.data).toHaveProperty('auditLogRetentionDays');
        expect(body.data).toHaveProperty('encryptionEnabled');
        expect(body.data).toHaveProperty('totalConsentRecords');
        expect(body.data).toHaveProperty('totalGdprRequests');
        expect(body.data).toHaveProperty('pendingRequests');
        expect(body.data).toHaveProperty('timestamp');
        expect(body.message).toContain('Service RGPD opérationnel');
      });

      it('should include current configuration values', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/gdpr/health'
        });

        const body = JSON.parse(response.body);
        expect(typeof body.data.gdprEnabled).toBe('boolean');
        expect(typeof body.data.parentalConsentRequired).toBe('boolean');
        expect(typeof body.data.dataRetentionDays).toBe('number');
        expect(typeof body.data.auditLogRetentionDays).toBe('number');
        expect(typeof body.data.encryptionEnabled).toBe('boolean');
        expect(typeof body.data.totalConsentRecords).toBe('number');
        expect(typeof body.data.totalGdprRequests).toBe('number');
        expect(typeof body.data.pendingRequests).toBe('number');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/gdpr/consent/submit',
        payload: 'invalid json string',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing content-type header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/gdpr/consent/submit',
        payload: { test: 'data' }
        // No content-type header
      });

      expect(response.statusCode).toBe(415); // Unsupported Media Type
    });

    it('should handle very large request payloads', async () => {
      const largePayload = {
        parentEmail: 'parent@example.com',
        parentName: 'John Parent',
        childName: 'Alice Child',
        childAge: 8,
        consentTypes: ['data_processing'],
        requestDetails: 'x'.repeat(100000), // Very large string
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/gdpr/consent/submit',
        payload: largePayload
      });

      // Should either succeed or fail gracefully with appropriate status
      expect([200, 413, 400]).toContain(response.statusCode);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/gdpr/health'
      });

      expect(response.headers).toHaveProperty('x-request-id');
      // Add checks for other security headers as configured in your app
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests', async () => {
      const promises = Array.from({ length: 5 }, () => 
        app.inject({
          method: 'GET',
          url: '/api/gdpr/health'
        })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed unless rate limiting is very strict
      responses.forEach(response => {
        expect([200, 429]).toContain(response.statusCode);
      });
    });
  });
});