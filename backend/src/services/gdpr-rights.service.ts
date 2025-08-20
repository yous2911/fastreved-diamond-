import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AuditTrailService } from './audit-trail.service';
import { EncryptionService } from './encryption.service';
import { EmailService } from './email.service';

// Validation schemas
const GDPRRequestSchema = z.object({
  requestType: z.enum([
    'access',           // Article 15 - Right of access
    'rectification',    // Article 16 - Right to rectification
    'erasure',          // Article 17 - Right to erasure (right to be forgotten)
    'restriction',      // Article 18 - Right to restriction of processing
    'portability',      // Article 20 - Right to data portability
    'objection',        // Article 21 - Right to object
    'withdraw_consent'  // Article 7 - Right to withdraw consent
  ]),
  requesterType: z.enum(['parent', 'student', 'legal_guardian', 'data_protection_officer']),
  requesterEmail: z.string().email(),
  requesterName: z.string().min(2).max(100),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  requestDetails: z.string().min(10).max(2000),
  urgentRequest: z.boolean().default(false),
  attachments: z.array(z.string()).optional(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  verificationMethod: z.enum(['email', 'identity_document', 'parental_verification']),
  legalBasis: z.string().optional()
});

const GDPRResponseSchema = z.object({
  requestId: z.string().uuid(),
  responseType: z.enum(['approved', 'rejected', 'partially_approved', 'requires_clarification']),
  responseDetails: z.string().min(10),
  actionsTaken: z.array(z.string()),
  timelineExtension: z.number().min(0).max(60).optional(), // Additional days
  rejectionReason: z.string().optional(),
  attachments: z.array(z.string()).optional()
});

export interface GDPRRequest {
  id: string;
  requestType: string;
  requesterType: string;
  requesterEmail: string;
  requesterName: string;
  studentId?: string;
  studentName?: string;
  parentEmail?: string;
  requestDetails: string;
  urgentRequest: boolean;
  status: 'pending' | 'under_review' | 'verification_required' | 'approved' | 'rejected' | 'completed' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedAt: Date;
  dueDate: Date;
  verificationToken?: string;
  verifiedAt?: Date;
  assignedTo?: string;
  processedAt?: Date;
  completedAt?: Date;
  attachments: string[];
  ipAddress: string;
  userAgent: string;
  verificationMethod: string;
  legalBasis?: string;
  responseDetails?: string;
  actionsTaken: string[];
  exportedData?: any;
}

export interface DataSubjectRights {
  access: boolean;
  rectification: boolean;
  erasure: boolean;
  restriction: boolean;
  portability: boolean;
  objection: boolean;
  withdrawConsent: boolean;
  lastUpdated: Date;
}

export interface StudentDataPortfolio {
  studentId: string;
  personalData: {
    basicInfo: any;
    educationalRecords: any;
    progressData: any;
    parentalData: any;
  };
  processingActivities: Array<{
    purpose: string;
    legalBasis: string;
    dataCategories: string[];
    retentionPeriod: string;
    thirdParties: string[];
  }>;
  consentHistory: any[];
  dataTransfers: any[];
  retentionSchedule: any;
  rightsExercised: Array<{
    right: string;
    date: Date;
    status: string;
  }>;
}

export class GDPRRightsService {
  private auditService: AuditTrailService;
  private encryptionService: EncryptionService;
  private emailService: EmailService;
  private pendingVerifications: Map<string, { requestId: string; expiresAt: Date }> = new Map();

  constructor() {
    this.auditService = new AuditTrailService();
    this.encryptionService = new EncryptionService();
    this.emailService = new EmailService();
    this.initializeGDPRSystem();
  }

  /**
   * Submit a new GDPR request
   */
  async submitGDPRRequest(requestData: z.infer<typeof GDPRRequestSchema>): Promise<{
    requestId: string;
    verificationRequired: boolean;
    estimatedCompletionDate: Date;
  }> {
    try {
      const validatedData = GDPRRequestSchema.parse(requestData);
      
      // Generate unique request ID
      const requestId = crypto.randomUUID();
      
      // Calculate due date (30 days from submission, or 1 month)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (validatedData.urgentRequest ? 15 : 30));
      
      // Determine priority
      const priority = this.determinePriority(validatedData.requestType, validatedData.urgentRequest);
      
      // Create GDPR request
      const gdprRequest: GDPRRequest = {
        id: requestId,
        requestType: validatedData.requestType,
        requesterType: validatedData.requesterType,
        requesterEmail: validatedData.requesterEmail,
        requesterName: validatedData.requesterName,
        studentId: validatedData.studentId,
        studentName: validatedData.studentName,
        parentEmail: validatedData.parentEmail,
        requestDetails: validatedData.requestDetails,
        urgentRequest: validatedData.urgentRequest,
        status: 'pending',
        priority,
        submittedAt: new Date(),
        dueDate,
        attachments: validatedData.attachments || [],
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        verificationMethod: validatedData.verificationMethod,
        legalBasis: validatedData.legalBasis,
        actionsTaken: []
      };

      // Store request
      await this.storeGDPRRequest(gdprRequest);

      // Log audit trail
      await this.auditService.logAction({
        entityType: 'gdpr_request',
        entityId: requestId,
        action: 'create',
        userId: null,
        studentId: validatedData.studentId,
        details: {
          requestType: validatedData.requestType,
          requesterType: validatedData.requesterType,
          requesterEmail: validatedData.requesterEmail,
          urgentRequest: validatedData.urgentRequest,
          priority
        },
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        severity: 'medium',
        category: 'compliance'
      });

      // Send verification email if required
      let verificationRequired = false;
      if (this.requiresVerification(validatedData)) {
        await this.sendVerificationEmail(gdprRequest);
        verificationRequired = true;
      } else {
        // Automatically approve if no verification needed
        await this.updateRequestStatus(requestId, 'under_review');
        await this.assignToDataProtectionOfficer(requestId);
      }

      // Send confirmation email
      await this.sendRequestConfirmationEmail(gdprRequest);

      logger.info('GDPR request submitted', { 
        requestId, 
        requestType: validatedData.requestType,
        priority,
        verificationRequired 
      });

      return {
        requestId,
        verificationRequired,
        estimatedCompletionDate: dueDate
      };

    } catch (error) {
      logger.error('Error submitting GDPR request:', error);
      throw new Error('Failed to submit GDPR request');
    }
  }

  /**
   * Verify GDPR request identity
   */
  async verifyGDPRRequest(verificationToken: string): Promise<{
    requestId: string;
    verified: boolean;
    nextSteps: string;
  }> {
    try {
      const verification = this.pendingVerifications.get(verificationToken);
      if (!verification) {
        throw new Error('Invalid or expired verification token');
      }

      if (new Date() > verification.expiresAt) {
        this.pendingVerifications.delete(verificationToken);
        throw new Error('Verification token has expired');
      }

      const requestId = verification.requestId;
      
      // Update request status
      await this.updateRequestStatus(requestId, 'under_review');
      await this.updateRequestField(requestId, 'verifiedAt', new Date());
      
      // Remove verification token
      this.pendingVerifications.delete(verificationToken);
      
      // Assign to DPO
      await this.assignToDataProtectionOfficer(requestId);

      // Log verification
      await this.auditService.logAction({
        entityType: 'gdpr_request',
        entityId: requestId,
        action: 'verified',
        userId: null,
        details: {
          verificationToken,
          verifiedAt: new Date()
        },
        severity: 'medium',
        category: 'compliance'
      });

      logger.info('GDPR request verified', { requestId });

      return {
        requestId,
        verified: true,
        nextSteps: 'Your request has been verified and assigned to our Data Protection Officer for review.'
      };

    } catch (error) {
      logger.error('Error verifying GDPR request:', error);
      throw error;
    }
  }

  /**
   * Process data access request (Article 15)
   */
  async processDataAccessRequest(requestId: string): Promise<StudentDataPortfolio> {
    try {
      const request = await this.getGDPRRequest(requestId);
      if (!request) {
        throw new Error('GDPR request not found');
      }

      if (request.requestType !== 'access') {
        throw new Error('Invalid request type for data access');
      }

      if (!request.studentId) {
        throw new Error('Student ID required for data access request');
      }

      // Compile student data portfolio
      const portfolio = await this.compileStudentDataPortfolio(request.studentId);

      // Encrypt sensitive data for export
      const encryptedPortfolio = await this.encryptionService.encryptStudentData(
        portfolio
      );

      // Update request with exported data
      await this.updateRequestField(requestId, 'exportedData', encryptedPortfolio);
      await this.updateRequestStatus(requestId, 'completed');

      // Log data access
      await this.auditService.logAction({
        entityType: 'gdpr_request',
        entityId: requestId,
        action: 'completed',
        userId: null,
        studentId: request.studentId,
        details: {
          requestType: 'access',
          dataExported: true,
          portfolioSections: Object.keys(portfolio.personalData)
        },
        severity: 'high',
        category: 'data_access'
      });

      logger.info('Data access request processed', { 
        requestId, 
        studentId: request.studentId 
      });

      return portfolio;

    } catch (error) {
      logger.error('Error processing data access request:', error);
      throw new Error('Failed to process data access request');
    }
  }

  /**
   * Process data erasure request (Article 17)
   */
  async processDataErasureRequest(requestId: string, reason: string): Promise<{
    deletedData: string[];
    retainedData: string[];
    reason: string;
  }> {
    try {
      const request = await this.getGDPRRequest(requestId);
      if (!request) {
        throw new Error('GDPR request not found');
      }

      if (request.requestType !== 'erasure') {
        throw new Error('Invalid request type for data erasure');
      }

      if (!request.studentId) {
        throw new Error('Student ID required for data erasure request');
      }

      // Analyze what data can be deleted vs retained
      const erasureAnalysis = await this.analyzeDataErasure(request.studentId);
      
      // Perform data deletion
      const deletedData: string[] = [];
      const retainedData: string[] = [];

      for (const dataCategory of erasureAnalysis.deletableData) {
        await this.deleteStudentDataCategory(request.studentId, dataCategory);
        deletedData.push(dataCategory);
      }

      for (const dataCategory of erasureAnalysis.retainedData) {
        retainedData.push(`${dataCategory}: ${erasureAnalysis.retentionReasons[dataCategory]}`);
      }

      // Anonymize audit logs
      await this.auditService.anonymizeStudentAuditLogs(request.studentId, reason);

      // Update request
      await this.updateRequestStatus(requestId, 'completed');
      await this.updateRequestField(requestId, 'actionsTaken', [
        `Deleted data categories: ${deletedData.join(', ')}`,
        `Retained data categories: ${retainedData.length > 0 ? retainedData.join(', ') : 'None'}`,
        'Anonymized audit logs'
      ]);

      // Log erasure action
      await this.auditService.logAction({
        entityType: 'gdpr_request',
        entityId: requestId,
        action: 'completed',
        userId: null,
        studentId: request.studentId,
        details: {
          requestType: 'erasure',
          deletedData,
          retainedData: erasureAnalysis.retainedData,
          reason
        },
        severity: 'high',
        category: 'compliance'
      });

      // Send completion notification
      await this.sendErasureCompletionEmail(request, deletedData, retainedData);

      logger.info('Data erasure request processed', { 
        requestId, 
        studentId: request.studentId,
        deletedCount: deletedData.length,
        retainedCount: retainedData.length
      });

      return {
        deletedData,
        retainedData,
        reason
      };

    } catch (error) {
      logger.error('Error processing data erasure request:', error);
      throw new Error('Failed to process data erasure request');
    }
  }

  /**
   * Process data portability request (Article 20)
   */
  async processDataPortabilityRequest(requestId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<{
    exportFile: string;
    format: string;
    downloadUrl: string;
  }> {
    try {
      const request = await this.getGDPRRequest(requestId);
      if (!request) {
        throw new Error('GDPR request not found');
      }

      if (request.requestType !== 'portability') {
        throw new Error('Invalid request type for data portability');
      }

      if (!request.studentId) {
        throw new Error('Student ID required for data portability request');
      }

      // Extract portable data only (data provided by user, not derived)
      const portableData = await this.extractPortableData(request.studentId);

      // Export in requested format
      const exportFile = await this.exportDataInFormat(portableData, format, request.studentId);
      
      // Generate secure download URL
      const downloadUrl = await this.generateSecureDownloadUrl(exportFile, request.requesterEmail);

      // Update request
      await this.updateRequestStatus(requestId, 'completed');
      await this.updateRequestField(requestId, 'actionsTaken', [
        `Data exported in ${format.toUpperCase()} format`,
        `Secure download link generated`
      ]);

      // Log portability action
      await this.auditService.logAction({
        entityType: 'gdpr_request',
        entityId: requestId,
        action: 'completed',
        userId: null,
        studentId: request.studentId,
        details: {
          requestType: 'portability',
          format,
          exportFile,
          dataCategories: Object.keys(portableData)
        },
        severity: 'medium',
        category: 'data_access'
      });

      // Send download notification
      await this.sendPortabilityCompletionEmail(request, downloadUrl);

      logger.info('Data portability request processed', { 
        requestId, 
        studentId: request.studentId,
        format
      });

      return {
        exportFile,
        format,
        downloadUrl
      };

    } catch (error) {
      logger.error('Error processing data portability request:', error);
      throw new Error('Failed to process data portability request');
    }
  }

  /**
   * Get GDPR request status
   */
  async getGDPRRequestStatus(requestId: string): Promise<{
    status: string;
    priority: string;
    submittedAt: Date;
    dueDate: Date;
    processedAt?: Date;
    actionsTaken: string[];
    timeRemaining: string;
  }> {
    try {
      const request = await this.getGDPRRequest(requestId);
      if (!request) {
        throw new Error('GDPR request not found');
      }

      const now = new Date();
      const timeRemainingMs = request.dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24));
      
      const timeRemaining = daysRemaining > 0 
        ? `${daysRemaining} days remaining`
        : 'Overdue';

      return {
        status: request.status,
        priority: request.priority,
        submittedAt: request.submittedAt,
        dueDate: request.dueDate,
        processedAt: request.processedAt,
        actionsTaken: request.actionsTaken,
        timeRemaining
      };

    } catch (error) {
      logger.error('Error getting GDPR request status:', error);
      throw new Error('Failed to get request status');
    }
  }

  /**
   * List GDPR requests (for admin/DPO)
   */
  async listGDPRRequests(filters: {
    status?: string;
    requestType?: string;
    priority?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    requests: Array<Omit<GDPRRequest, 'attachments' | 'exportedData'>>;
    total: number;
    overdue: number;
  }> {
    try {
      const { requests, total } = await this.queryGDPRRequests(filters);
      
      // Count overdue requests
      const now = new Date();
      const overdue = requests.filter(r => r.dueDate < now && r.status !== 'completed').length;

      // Remove sensitive data from response
      const sanitizedRequests = requests.map(request => {
        const { attachments, exportedData, ...sanitized } = request;
        return sanitized;
      });

      return {
        requests: sanitizedRequests,
        total,
        overdue
      };

    } catch (error) {
      logger.error('Error listing GDPR requests:', error);
      throw new Error('Failed to list GDPR requests');
    }
  }

  // Private helper methods
  private determinePriority(requestType: string, urgent: boolean): 'low' | 'medium' | 'high' | 'urgent' {
    if (urgent) return 'urgent';
    
    const highPriorityTypes = ['erasure', 'restriction'];
    const mediumPriorityTypes = ['access', 'portability'];
    
    if (highPriorityTypes.includes(requestType)) return 'high';
    if (mediumPriorityTypes.includes(requestType)) return 'medium';
    return 'low';
  }

  private requiresVerification(requestData: z.infer<typeof GDPRRequestSchema>): boolean {
    // Verification required for sensitive requests or when not initiated by parent
    const sensitiveRequests = ['erasure', 'restriction'];
    return sensitiveRequests.includes(requestData.requestType) || 
           requestData.requesterType !== 'parent';
  }

  private async sendVerificationEmail(request: GDPRRequest): Promise<void> {
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    this.pendingVerifications.set(verificationToken, {
      requestId: request.id,
      expiresAt
    });

    const verificationUrl = `${process.env.FRONTEND_URL}/gdpr/verify/${verificationToken}`;
    
    await this.emailService.sendEmail({
      to: request.requesterEmail,
      subject: 'Vérification de votre demande RGPD - RevEd Kids',
      template: 'gdpr-verification',
      variables: {
        requesterName: request.requesterName,
        requestType: this.translateRequestType(request.requestType),
        requestId: request.id,
        verificationUrl,
        expiryTime: '24 heures'
      }
    });
  }

  private async sendRequestConfirmationEmail(request: GDPRRequest): Promise<void> {
    await this.emailService.sendEmail({
      to: request.requesterEmail,
      subject: 'Confirmation de votre demande RGPD - RevEd Kids',
      template: 'gdpr-confirmation',
      variables: {
        requesterName: request.requesterName,
        requestType: this.translateRequestType(request.requestType),
        requestId: request.id,
        dueDate: request.dueDate.toLocaleDateString('fr-FR'),
        priority: request.priority
      }
    });
  }

  private translateRequestType(type: string): string {
    const translations: Record<string, string> = {
      'access': 'Accès aux données personnelles',
      'rectification': 'Rectification des données',
      'erasure': 'Effacement des données',
      'restriction': 'Limitation du traitement',
      'portability': 'Portabilité des données',
      'objection': 'Opposition au traitement',
      'withdraw_consent': 'Retrait du consentement'
    };
    return translations[type] || type;
  }

  private async initializeGDPRSystem(): Promise<void> {
    // Initialize GDPR system components
    logger.info('GDPR rights management system initialized');
  }

  // Database and external service methods (implement with your services)
  private async storeGDPRRequest(request: GDPRRequest): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { gdprRequests } = await import('../db/schema');
      
      await db.insert(gdprRequests).values({
        requesterName: request.requesterName,
        requesterEmail: request.requesterEmail,
        requestType: request.requestType,
        studentId: request.studentId ? parseInt(request.studentId) : null,
        status: request.status,
        priority: request.priority,
        dueDate: request.dueDate,
        assignedTo: request.assignedTo,
        notes: request.notes,
        metadata: JSON.stringify(request.metadata),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info('GDPR request stored in database', { 
        requestType: request.requestType, 
        requesterEmail: request.requesterEmail 
      });
    } catch (error) {
      logger.error('Failed to store GDPR request', { error, request });
      throw new Error(`Failed to store GDPR request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getGDPRRequest(requestId: string): Promise<GDPRRequest | null> {
    try {
      const { db } = await import('../db/connection');
      const { gdprRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const request = await db.select()
        .from(gdprRequests)
        .where(eq(gdprRequests.id, parseInt(requestId)))
        .limit(1);
      
      if (request.length === 0) {
        return null;
      }
      
      const gdprRequest = request[0];
      return {
        id: gdprRequest.id.toString(),
        requesterName: gdprRequest.requesterName,
        requesterEmail: gdprRequest.requesterEmail,
        requestType: gdprRequest.requestType,
        studentId: gdprRequest.studentId?.toString(),
        status: gdprRequest.status,
        priority: gdprRequest.priority,
        dueDate: gdprRequest.dueDate,
        assignedTo: gdprRequest.assignedTo,
        notes: gdprRequest.notes,
        metadata: gdprRequest.metadata ? JSON.parse(gdprRequest.metadata) : {},
        createdAt: gdprRequest.createdAt,
        updatedAt: gdprRequest.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get GDPR request', { error, requestId });
      throw new Error(`Failed to get GDPR request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateRequestStatus(requestId: string, status: GDPRRequest['status']): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { gdprRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(gdprRequests)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(gdprRequests.id, parseInt(requestId)));
      
      logger.info('GDPR request status updated', { requestId, status });
    } catch (error) {
      logger.error('Failed to update request status', { error, requestId, status });
      throw new Error(`Failed to update request status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateRequestField(requestId: string, field: string, value: any): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { gdprRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const updateData: any = {
        updatedAt: new Date()
      };
      
      updateData[field] = value;
      
      await db.update(gdprRequests)
        .set(updateData)
        .where(eq(gdprRequests.id, parseInt(requestId)));
      
      logger.info('GDPR request field updated', { requestId, field, value });
    } catch (error) {
      logger.error('Failed to update request field', { error, requestId, field, value });
      throw new Error(`Failed to update request field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async queryGDPRRequests(filters: any): Promise<{ requests: GDPRRequest[]; total: number }> {
    try {
      const { db } = await import('../db/connection');
      const { gdprRequests } = await import('../db/schema');
      const { eq, and, gte, lte, like, inArray, desc, sql } = await import('drizzle-orm');
      
      // Build where conditions
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(gdprRequests.status, filters.status));
      }
      if (filters.requestType) {
        conditions.push(eq(gdprRequests.requestType, filters.requestType));
      }
      if (filters.studentId) {
        conditions.push(eq(gdprRequests.studentId, parseInt(filters.studentId)));
      }
      if (filters.requesterEmail) {
        conditions.push(like(gdprRequests.requesterEmail, `%${filters.requesterEmail}%`));
      }
      if (filters.startDate) {
        conditions.push(gte(gdprRequests.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(gdprRequests.createdAt, filters.endDate));
      }
      if (filters.priority && filters.priority.length > 0) {
        conditions.push(inArray(gdprRequests.priority, filters.priority));
      }
      
      // Get total count
      const totalResult = await db.select({ count: sql`count(*)` })
        .from(gdprRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get requests with pagination
      const requests = await db.select()
        .from(gdprRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(gdprRequests.createdAt))
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
      
      // Transform to GDPRRequest format
      const gdprRequestsList: GDPRRequest[] = requests.map(req => ({
        id: req.id.toString(),
        requesterName: req.requesterName,
        requesterEmail: req.requesterEmail,
        requestType: req.requestType,
        studentId: req.studentId?.toString(),
        status: req.status,
        priority: req.priority,
        dueDate: req.dueDate,
        assignedTo: req.assignedTo,
        notes: req.notes,
        metadata: req.metadata ? JSON.parse(req.metadata) : {},
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      }));
      
      return { requests: gdprRequestsList, total };
    } catch (error) {
      logger.error('Failed to query GDPR requests', { error, filters });
      throw new Error(`Failed to query GDPR requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async assignToDataProtectionOfficer(requestId: string): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { gdprRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const dpoEmail = process.env.DPO_EMAIL || 'dpo@fastrevedkids.com';
      
      await db.update(gdprRequests)
        .set({
          assignedTo: dpoEmail,
          updatedAt: new Date()
        })
        .where(eq(gdprRequests.id, parseInt(requestId)));
      
      logger.info('GDPR request assigned to DPO', { requestId, dpoEmail });
    } catch (error) {
      logger.error('Failed to assign request to DPO', { error, requestId });
      throw new Error(`Failed to assign request to DPO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async compileStudentDataPortfolio(studentId: string): Promise<StudentDataPortfolio> {
    try {
      const { db } = await import('../db/connection');
      const { students, studentProgress, sessions } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Get student data
      const student = await db.select()
        .from(students)
        .where(eq(students.id, parseInt(studentId)))
        .limit(1);
      
      if (student.length === 0) {
        throw new Error('Student not found');
      }
      
      // Get progress data
      const progress = await db.select()
        .from(studentProgress)
        .where(eq(studentProgress.studentId, parseInt(studentId)));
      
      // Get session data
      const sessionData = await db.select()
        .from(sessions)
        .where(eq(sessions.studentId, parseInt(studentId)));
      
      const portfolio: StudentDataPortfolio = {
        student: student[0],
        progress: progress,
        sessions: sessionData,
        metadata: {
          totalProgressRecords: progress.length,
          totalSessions: sessionData.length,
          lastActivity: student[0].dernierAcces,
          accountCreated: student[0].createdAt
        }
      };
      
      logger.info('Student data portfolio compiled', { studentId, recordCount: progress.length + sessionData.length });
      return portfolio;
    } catch (error) {
      logger.error('Failed to compile student data portfolio', { error, studentId });
      throw new Error(`Failed to compile student data portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeDataErasure(studentId: string): Promise<{
    deletableData: string[];
    retainedData: string[];
    retentionReasons: Record<string, string>;
  }> {
    try {
      const deletableData: string[] = [];
      const retainedData: string[] = [];
      const retentionReasons: Record<string, string> = {};
      
      // Analyze what can be deleted vs retained
      const dataCategories = [
        'personal_info',
        'progress_data',
        'session_data',
        'consent_records',
        'audit_logs'
      ];
      
      for (const category of dataCategories) {
        switch (category) {
          case 'personal_info':
            deletableData.push(category);
            break;
          case 'progress_data':
            // Progress data might be retained for educational research
            retainedData.push(category);
            retentionReasons[category] = 'Educational research and improvement purposes';
            break;
          case 'session_data':
            deletableData.push(category);
            break;
          case 'consent_records':
            // Consent records must be retained for legal compliance
            retainedData.push(category);
            retentionReasons[category] = 'Legal compliance - consent history must be maintained';
            break;
          case 'audit_logs':
            // Audit logs must be retained for security and compliance
            retainedData.push(category);
            retentionReasons[category] = 'Security and compliance requirements';
            break;
        }
      }
      
      logger.info('Data erasure analysis completed', { studentId, deletableCount: deletableData.length, retainedCount: retainedData.length });
      return { deletableData, retainedData, retentionReasons };
    } catch (error) {
      logger.error('Failed to analyze data erasure', { error, studentId });
      throw new Error(`Failed to analyze data erasure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deleteStudentDataCategory(studentId: string, category: string): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { students, studentProgress, sessions } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      switch (category) {
        case 'personal_info':
          await db.update(students)
            .set({
              prenom: '[DELETED]',
              nom: '[DELETED]',
              email: '[DELETED]',
              passwordHash: null,
              dateNaissance: null,
              niveauActuel: '[DELETED]',
              mascotteType: 'default',
              mascotteColor: '#ff6b35',
              updatedAt: new Date()
            })
            .where(eq(students.id, parseInt(studentId)));
          break;
          
        case 'progress_data':
          await db.delete(studentProgress)
            .where(eq(studentProgress.studentId, parseInt(studentId)));
          break;
          
        case 'session_data':
          await db.delete(sessions)
            .where(eq(sessions.studentId, parseInt(studentId)));
          break;
          
        default:
          logger.warn('Unknown data category for deletion', { category });
      }
      
      logger.info('Student data category deleted', { studentId, category });
    } catch (error) {
      logger.error('Failed to delete student data category', { error, studentId, category });
      throw new Error(`Failed to delete student data category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractPortableData(studentId: string): Promise<any> {
    try {
      const portfolio = await this.compileStudentDataPortfolio(studentId);
      
      // Format data for portability (JSON format)
      const portableData = {
        student: {
          id: portfolio.student.id,
          prenom: portfolio.student.prenom,
          nom: portfolio.student.nom,
          email: portfolio.student.email,
          dateNaissance: portfolio.student.dateNaissance,
          niveauActuel: portfolio.student.niveauActuel,
          totalPoints: portfolio.student.totalPoints,
          serieJours: portfolio.student.serieJours,
          createdAt: portfolio.student.createdAt
        },
        progress: portfolio.progress.map(p => ({
          exerciseId: p.exerciseId,
          competenceCode: p.competenceCode,
          progressPercent: p.progressPercent,
          masteryLevel: p.masteryLevel,
          totalAttempts: p.totalAttempts,
          successfulAttempts: p.successfulAttempts,
          averageScore: p.averageScore,
          bestScore: p.bestScore,
          totalTimeSpent: p.totalTimeSpent,
          lastAttemptAt: p.lastAttemptAt,
          masteredAt: p.masteredAt
        })),
        sessions: portfolio.sessions.map(s => ({
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          exercisesCompleted: s.exercisesCompleted,
          totalScore: s.totalScore,
          averageScore: s.averageScore
        })),
        metadata: portfolio.metadata
      };
      
      logger.info('Portable data extracted', { studentId, dataSize: JSON.stringify(portableData).length });
      return portableData;
    } catch (error) {
      logger.error('Failed to extract portable data', { error, studentId });
      throw new Error(`Failed to extract portable data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async exportDataInFormat(data: any, format: string, studentId: string): Promise<string> {
    try {
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      
      // Create exports directory if it doesn't exist
      const exportsDir = join(process.cwd(), 'exports');
      await mkdir(exportsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gdpr-export-${studentId}-${timestamp}.${format}`;
      const filepath = join(exportsDir, filename);
      
      let content: string;
      
      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          break;
          
        case 'csv':
          // Convert to CSV format (simplified)
          const headers = ['Type', 'Data'];
          const rows = Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]);
          content = [headers, ...rows].map(row => row.join(',')).join('\n');
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      await writeFile(filepath, content, 'utf8');
      
      logger.info('Data exported in format', { format, filepath, studentId });
      return filepath;
    } catch (error) {
      logger.error('Failed to export data in format', { error, format, studentId });
      throw new Error(`Failed to export data in format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateSecureDownloadUrl(filePath: string, email: string): Promise<string> {
    try {
      const { randomBytes } = await import('crypto');
      const { db } = await import('../db/connection');
      const { secureDownloads } = await import('../db/schema');
      
      // Generate secure token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store download record
      await db.insert(secureDownloads).values({
        token,
        filePath,
        email,
        expiresAt,
        isUsed: false,
        createdAt: new Date()
      });
      
      // Generate secure URL
      const baseUrl = process.env.BASE_URL || 'https://fastrevedkids.com';
      const downloadUrl = `${baseUrl}/api/gdpr/download/${token}`;
      
      logger.info('Secure download URL generated', { email, expiresAt });
      return downloadUrl;
    } catch (error) {
      logger.error('Failed to generate secure download URL', { error, filePath, email });
      throw new Error(`Failed to generate secure download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async sendErasureCompletionEmail(request: GDPRRequest, deleted: string[], retained: string[]): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: request.requesterEmail,
        subject: 'Confirmation de suppression des données - RevEd Kids',
        template: 'gdpr-erasure-completion',
        variables: {
          requesterName: request.requesterName,
          requestId: request.id,
          deletedCategories: deleted.join(', '),
          retainedCategories: retained.join(', '),
          completionDate: new Date().toLocaleDateString('fr-FR')
        }
      });
      
      logger.info('Erasure completion email sent', { requestId: request.id, requesterEmail: request.requesterEmail });
    } catch (error) {
      logger.error('Failed to send erasure completion email', { error, request });
      // Don't throw - email failure shouldn't break the process
    }
  }

  private async sendPortabilityCompletionEmail(request: GDPRRequest, downloadUrl: string): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: request.requesterEmail,
        subject: 'Vos données personnelles sont prêtes - RevEd Kids',
        template: 'gdpr-portability-completion',
        variables: {
          requesterName: request.requesterName,
          requestId: request.id,
          downloadUrl,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
        }
      });
      
      logger.info('Portability completion email sent', { requestId: request.id, requesterEmail: request.requesterEmail });
    } catch (error) {
      logger.error('Failed to send portability completion email', { error, request });
      // Don't throw - email failure shouldn't break the process
    }
  }
}