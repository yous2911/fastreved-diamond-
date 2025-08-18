// src/routes/gdpr.ts - Routes GDPR complètes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { students, gdprConsentRequests, gdprDataProcessingLog, files } from '../db/schema';
import { consentService } from '../services/consent.service.js';
import { encryptionService } from '../services/encryption.service.js';
import { anonymizationService } from '../services/anonymization.service.js';
import { gdprService } from '../services/gdpr.service.js';

export default async function gdprRoutes(fastify: FastifyInstance) {
  
  // 1. CONSENT MANAGEMENT
  
  // Submit parental consent request
  fastify.post('/consent/request', {
    schema: {
      description: 'Submit a GDPR consent request',
      tags: ['GDPR'],
      body: {
        type: 'object',
        required: ['studentId', 'requestType', 'parentEmail'],
        properties: {
          studentId: { type: 'number' },
          requestType: { 
            type: 'string', 
            enum: ['DATA_ACCESS', 'DATA_DELETION', 'DATA_PORTABILITY', 'CONSENT_WITHDRAWAL'] 
          },
          parentEmail: { type: 'string', format: 'email' },
          requestDetails: { type: 'object' },
        },
      },
    },
    handler: async (request: FastifyRequest<{
      Body: {
        studentId: number;
        requestType: 'DATA_ACCESS' | 'DATA_DELETION' | 'DATA_PORTABILITY' | 'CONSENT_WITHDRAWAL';
        parentEmail: string;
        requestDetails?: Record<string, any>;
      }
    }>, reply: FastifyReply) => {
      try {
        const { studentId, requestType, parentEmail, requestDetails } = request.body;

        // Verify student exists
        const student = await fastify.db
          .select()
          .from(students)
          .where(eq(students.id, studentId))
          .limit(1);

        if (student.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Élève non trouvé',
              code: 'STUDENT_NOT_FOUND',
            },
          });
        }

        // Create consent request
        const consentRequest = await consentService.submitConsentRequest({
          studentId,
          requestType,
          parentEmail,
          requestDetails: requestDetails || {},
        });

        // Log the request
        await gdprService.logDataProcessing({
          studentId,
          action: 'CREATE',
          dataType: 'CONSENT_REQUEST',
          description: `Consent request submitted: ${requestType}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
          requestId: request.id,
        });

        return reply.status(201).send({
          success: true,
          data: {
            requestId: consentRequest.id,
            token: consentRequest.requestToken,
            status: consentRequest.status,
            expiresAt: consentRequest.expiresAt,
          },
          message: 'Demande de consentement soumise avec succès',
        });

      } catch (error) {
        fastify.log.error('GDPR consent request error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la soumission de la demande',
            code: 'CONSENT_REQUEST_ERROR',
          },
        });
      }
    },
  });

  // Verify consent request by token
  fastify.get('/consent/verify/:token', {
    schema: {
      description: 'Verify a GDPR consent request by token',
      tags: ['GDPR'],
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
        },
      },
    },
    handler: async (request: FastifyRequest<{
      Params: { token: string }
    }>, reply: FastifyReply) => {
      try {
        const { token } = request.params;

        const consentRequest = await consentService.findConsentByToken(token);

        if (!consentRequest) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Token de consentement non trouvé ou expiré',
              code: 'CONSENT_TOKEN_NOT_FOUND',
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            requestId: consentRequest.id,
            studentId: consentRequest.studentId,
            requestType: consentRequest.requestType,
            status: consentRequest.status,
            createdAt: consentRequest.createdAt,
            expiresAt: consentRequest.expiresAt,
          },
          message: 'Token de consentement vérifié',
        });

      } catch (error) {
        fastify.log.error('GDPR consent verification error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la vérification du consentement',
            code: 'CONSENT_VERIFICATION_ERROR',
          },
        });
      }
    },
  });

  // 2. DATA EXPORT (Right to Data Portability)
  
  fastify.get('/data/export/:studentId', {
    schema: {
      description: 'Export all student data (GDPR Article 20)',
      tags: ['GDPR'],
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          token: { type: 'string' },
        },
      },
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { format?: 'json' | 'csv'; token?: string };
    }>, reply: FastifyReply) => {
      try {
        const studentId = parseInt(request.params.studentId);
        const { format = 'json', token } = request.query;

        // Verify consent if token provided
        if (token) {
          const consent = await consentService.findConsentByToken(token);
          if (!consent || consent.studentId !== studentId || consent.requestType !== 'DATA_ACCESS') {
            return reply.status(403).send({
              success: false,
              error: {
                message: 'Token de consentement invalide',
                code: 'INVALID_CONSENT_TOKEN',
              },
            });
          }
        }

        // Export all student data
        const exportData = await gdprService.exportStudentData(studentId);

        // Log the export
        await gdprService.logDataProcessing({
          studentId,
          action: 'EXPORT',
          dataType: 'ALL_DATA',
          description: `Data export requested in ${format} format`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
          requestId: request.id,
        });

        if (format === 'csv') {
          reply.type('text/csv');
          reply.header('Content-Disposition', `attachment; filename=student_${studentId}_data.csv`);
          return gdprService.convertToCSV(exportData);
        }

        reply.type('application/json');
        reply.header('Content-Disposition', `attachment; filename=student_${studentId}_data.json`);
        
        return reply.send({
          success: true,
          data: exportData,
          exportedAt: new Date().toISOString(),
          message: 'Données exportées avec succès',
        });

      } catch (error) {
        fastify.log.error('GDPR data export error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de l\'export des données',
            code: 'DATA_EXPORT_ERROR',
          },
        });
      }
    },
  });

  // 3. DATA DELETION (Right to be Forgotten)
  
  fastify.delete('/data/delete/:studentId', {
    schema: {
      description: 'Delete student data (GDPR Article 17)',
      tags: ['GDPR'],
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
          deleteMode: { 
            type: 'string', 
            enum: ['SOFT_DELETE', 'ANONYMIZE', 'HARD_DELETE'],
            default: 'ANONYMIZE' 
          },
        },
      },
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Body: { token: string; deleteMode?: 'SOFT_DELETE' | 'ANONYMIZE' | 'HARD_DELETE' };
    }>, reply: FastifyReply) => {
      try {
        const studentId = parseInt(request.params.studentId);
        const { token, deleteMode = 'ANONYMIZE' } = request.body;

        // Verify consent token
        const consent = await consentService.findConsentByToken(token);
        if (!consent || consent.studentId !== studentId || consent.requestType !== 'DATA_DELETION') {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Token de consentement invalide pour la suppression',
              code: 'INVALID_DELETION_TOKEN',
            },
          });
        }

        let result;
        switch (deleteMode) {
          case 'ANONYMIZE':
            result = await anonymizationService.anonymizeStudentData(studentId);
            break;
          case 'SOFT_DELETE':
            result = await gdprService.softDeleteStudentData(studentId);
            break;
          case 'HARD_DELETE':
            result = await gdprService.hardDeleteStudentData(studentId);
            break;
        }

        // Log the deletion
        await gdprService.logDataProcessing({
          studentId,
          action: 'DELETE',
          dataType: 'ALL_DATA',
          description: `Data deletion completed with mode: ${deleteMode}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
          requestId: request.id,
        });

        // Update consent request status
        await consentService.updateConsentStatus(consent.id, 'COMPLETED');

        return reply.send({
          success: true,
          data: {
            deletionMode: deleteMode,
            deletedAt: new Date().toISOString(),
            affectedRecords: result.affectedRecords,
          },
          message: 'Suppression des données complétée',
        });

      } catch (error) {
        fastify.log.error('GDPR data deletion error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la suppression des données',
            code: 'DATA_DELETION_ERROR',
          },
        });
      }
    },
  });

  // 4. DATA PROCESSING LOG
  
  fastify.get('/audit/log/:studentId', {
    schema: {
      description: 'Get GDPR audit log for a student',
      tags: ['GDPR'],
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
          action: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { limit?: number; offset?: number; action?: string };
    }>, reply: FastifyReply) => {
      try {
        const studentId = parseInt(request.params.studentId);
        const { limit = 50, offset = 0, action } = request.query;

        let whereCondition = eq(gdprDataProcessingLog.studentId, studentId);
        
        if (action) {
          whereCondition = and(
            eq(gdprDataProcessingLog.studentId, studentId),
            eq(gdprDataProcessingLog.action, action as any)
          );
        }

        const logs = await fastify.db
          .select()
          .from(gdprDataProcessingLog)
          .where(whereCondition)
          .orderBy(desc(gdprDataProcessingLog.createdAt))
          .limit(limit)
          .offset(offset);

        return reply.send({
          success: true,
          data: {
            logs,
            pagination: {
              limit,
              offset,
              total: logs.length,
            },
          },
          message: 'Journal d\'audit récupéré',
        });

      } catch (error) {
        fastify.log.error('GDPR audit log error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération du journal d\'audit',
            code: 'AUDIT_LOG_ERROR',
          },
        });
      }
    },
  });

  // 5. HEALTH CHECK
  
  fastify.get('/health', {
    schema: {
      description: 'GDPR service health check',
      tags: ['GDPR'],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Test database connectivity
        const testQuery = await fastify.db
          .select({ count: gdprConsentRequests.id })
          .from(gdprConsentRequests)
          .limit(1);

        return reply.send({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            services: {
              consent: 'operational',
              encryption: 'operational',
              anonymization: 'operational',
              audit: 'operational',
            },
          },
          message: 'Service GDPR opérationnel',
        });

      } catch (error) {
        fastify.log.error('GDPR health check error:', error);
        return reply.status(503).send({
          success: false,
          error: {
            message: 'Service GDPR indisponible',
            code: 'GDPR_SERVICE_UNAVAILABLE',
          },
        });
      }
    },
  });
}