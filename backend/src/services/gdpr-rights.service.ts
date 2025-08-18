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
    // TODO: Implement database storage
  }

  private async getGDPRRequest(requestId: string): Promise<GDPRRequest | null> {
    // TODO: Implement database query
    return null;
  }

  private async updateRequestStatus(requestId: string, status: GDPRRequest['status']): Promise<void> {
    // TODO: Implement database update
  }

  private async updateRequestField(requestId: string, field: string, value: any): Promise<void> {
    // TODO: Implement database update
  }

  private async queryGDPRRequests(filters: any): Promise<{ requests: GDPRRequest[]; total: number }> {
    // TODO: Implement database query
    return { requests: [], total: 0 };
  }

  private async assignToDataProtectionOfficer(requestId: string): Promise<void> {
    // TODO: Implement assignment logic
  }

  private async compileStudentDataPortfolio(studentId: string): Promise<StudentDataPortfolio> {
    // TODO: Implement data compilation
    return {} as StudentDataPortfolio;
  }

  private async analyzeDataErasure(studentId: string): Promise<{
    deletableData: string[];
    retainedData: string[];
    retentionReasons: Record<string, string>;
  }> {
    // TODO: Implement erasure analysis
    return { deletableData: [], retainedData: [], retentionReasons: {} };
  }

  private async deleteStudentDataCategory(studentId: string, category: string): Promise<void> {
    // TODO: Implement data deletion
  }

  private async extractPortableData(studentId: string): Promise<any> {
    // TODO: Implement portable data extraction
    return {};
  }

  private async exportDataInFormat(data: any, format: string, studentId: string): Promise<string> {
    // TODO: Implement data export
    return '';
  }

  private async generateSecureDownloadUrl(filePath: string, email: string): Promise<string> {
    // TODO: Implement secure URL generation
    return '';
  }

  private async sendErasureCompletionEmail(request: GDPRRequest, deleted: string[], retained: string[]): Promise<void> {
    // TODO: Implement email sending
  }

  private async sendPortabilityCompletionEmail(request: GDPRRequest, downloadUrl: string): Promise<void> {
    // TODO: Implement email sending
  }
}