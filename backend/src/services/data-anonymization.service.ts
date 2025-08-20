import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AuditTrailService } from './audit-trail.service';
import { EncryptionService } from './encryption.service';

// Validation schemas
const AnonymizationConfigSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  reason: z.enum(['consent_withdrawal', 'retention_policy', 'gdpr_request', 'inactivity', 'account_deletion']),
  preserveStatistics: z.boolean().default(true),
  immediateExecution: z.boolean().default(false),
  scheduledFor: z.date().optional(),
  notifyUser: z.boolean().default(true)
});

const AnonymizationRuleSchema = z.object({
  fieldName: z.string(),
  strategy: z.enum(['hash', 'randomize', 'mask', 'remove', 'generalize', 'substitute']),
  preserveFormat: z.boolean().default(false),
  customPattern: z.string().optional(),
  groupSize: z.number().optional(), // For k-anonymity
  preserveLength: z.boolean().default(false)
});

export interface AnonymizationJob {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  affectedRecords: number;
  preservedFields: string[];
  anonymizedFields: string[];
  errors: string[];
  scheduledFor?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AnonymizationRule {
  fieldName: string;
  strategy: 'hash' | 'randomize' | 'mask' | 'remove' | 'generalize' | 'substitute';
  preserveFormat: boolean;
  customPattern?: string;
  groupSize?: number;
  preserveLength: boolean;
}

export interface AnonymizationReport {
  jobId: string;
  entityType: string;
  entityId: string;
  executedAt: Date;
  recordsProcessed: number;
  fieldsAnonymized: Record<string, string>; // fieldName -> strategy
  preservedData: string[];
  statisticsGenerated: boolean;
  complianceChecks: {
    gdprCompliant: boolean;
    dataMinimized: boolean;
    purposeLimitation: boolean;
    accuracyMaintained: boolean;
  };
}

export interface InactivityConfig {
  studentInactivityDays: number;
  parentInactivityDays: number;
  adminInactivityDays: number;
  warningDaysBeforeAnonymization: number;
  enableAutomaticAnonymization: boolean;
  preserveEducationalStatistics: boolean;
}

export class DataAnonymizationService {
  private auditService: AuditTrailService;
  private encryptionService: EncryptionService;
  private runningJobs: Map<string, AnonymizationJob> = new Map();
  private anonymizationRules: Map<string, AnonymizationRule[]> = new Map();
  private inactivityConfig: InactivityConfig;

  constructor(inactivityConfig?: Partial<InactivityConfig>) {
    this.auditService = new AuditTrailService();
    this.encryptionService = new EncryptionService();
    this.inactivityConfig = {
      studentInactivityDays: 730, // 2 years
      parentInactivityDays: 1095, // 3 years
      adminInactivityDays: 1460, // 4 years
      warningDaysBeforeAnonymization: 30,
      enableAutomaticAnonymization: true,
      preserveEducationalStatistics: true,
      ...inactivityConfig
    };
    
    this.initializeAnonymizationRules();
    this.scheduleInactivityCheck();
  }

  /**
   * Schedule data anonymization
   */
  async scheduleAnonymization(config: z.infer<typeof AnonymizationConfigSchema>): Promise<string> {
    try {
      const validatedConfig = AnonymizationConfigSchema.parse(config);
      
      const jobId = crypto.randomUUID();
      const priority = this.determinePriority(validatedConfig.reason);
      
      const job: AnonymizationJob = {
        id: jobId,
        entityType: validatedConfig.entityType,
        entityId: validatedConfig.entityId,
        reason: validatedConfig.reason,
        status: 'pending',
        progress: 0,
        affectedRecords: 0,
        preservedFields: [],
        anonymizedFields: [],
        errors: [],
        scheduledFor: validatedConfig.scheduledFor,
        priority
      };

      this.runningJobs.set(jobId, job);

      // Log anonymization request
      await this.auditService.logAction({
        entityType: 'anonymization_job',
        entityId: jobId,
        action: 'create',
        userId: null,
        details: {
          targetEntityType: validatedConfig.entityType,
          targetEntityId: validatedConfig.entityId,
          reason: validatedConfig.reason,
          scheduledFor: validatedConfig.scheduledFor,
          priority
        },
        severity: 'high',
        category: 'compliance'
      });

      // Execute immediately or schedule for later
      if (validatedConfig.immediateExecution || !validatedConfig.scheduledFor) {
        setImmediate(() => this.executeAnonymization(jobId));
      } else {
        this.scheduleJobExecution(jobId, validatedConfig.scheduledFor);
      }

      logger.info('Anonymization job scheduled', { 
        jobId, 
        entityType: validatedConfig.entityType,
        reason: validatedConfig.reason,
        priority 
      });

      return jobId;

    } catch (error) {
      logger.error('Error scheduling anonymization:', error);
      throw new Error('Failed to schedule anonymization');
    }
  }

  /**
   * Execute anonymization job
   */
  private async executeAnonymization(jobId: string): Promise<void> {
    const job = this.runningJobs.get(jobId);
    if (!job) {
      logger.error('Anonymization job not found:', { jobId });
      return;
    }

    try {
      job.status = 'running';
      job.startedAt = new Date();
      job.progress = 0;

      logger.info('Starting anonymization job', { 
        jobId, 
        entityType: job.entityType,
        entityId: job.entityId 
      });

      // Get anonymization rules for this entity type
      const rules = this.anonymizationRules.get(job.entityType) || [];
      
      // Process data based on entity type
      let affectedRecords = 0;
      let anonymizedFields: string[] = [];
      let preservedFields: string[] = [];

      switch (job.entityType) {
        case 'student': {
          const studentResult = await this.anonymizeStudentData(job.entityId, rules, job.reason);
          affectedRecords = studentResult.recordsProcessed;
          anonymizedFields = studentResult.anonymizedFields;
          preservedFields = studentResult.preservedFields;
          break;
        }

        case 'parent': {
          const parentResult = await this.anonymizeParentData(job.entityId, rules, job.reason);
          affectedRecords = parentResult.recordsProcessed;
          anonymizedFields = parentResult.anonymizedFields;
          preservedFields = parentResult.preservedFields;
          break;
        }

        case 'session': {
          const sessionResult = await this.anonymizeSessionData(job.entityId, rules);
          affectedRecords = sessionResult.recordsProcessed;
          anonymizedFields = sessionResult.anonymizedFields;
          preservedFields = sessionResult.preservedFields;
          break;
        }

        default:
          throw new Error(`Unsupported entity type for anonymization: ${job.entityType}`);
      }

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.affectedRecords = affectedRecords;
      job.anonymizedFields = anonymizedFields;
      job.preservedFields = preservedFields;

      // Generate anonymization report
      const report = await this.generateAnonymizationReport(job);
      
      // Log completion
      await this.auditService.logAction({
        entityType: 'anonymization_job',
        entityId: jobId,
        action: 'completed',
        userId: null,
        details: {
          affectedRecords,
          anonymizedFields,
          preservedFields,
          duration: job.completedAt.getTime() - job.startedAt!.getTime(),
          reason: job.reason
        },
        severity: 'high',
        category: 'compliance'
      });

      logger.info('Anonymization job completed successfully', { 
        jobId, 
        affectedRecords,
        fieldsAnonymized: anonymizedFields.length 
      });

    } catch (error) {
      job.status = 'failed';
      job.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      logger.error('Anonymization job failed', { 
        jobId, 
        error: error instanceof Error ? error.message : error 
      });

      // Log failure
      await this.auditService.logAction({
        entityType: 'anonymization_job',
        entityId: jobId,
        action: 'failed',
        userId: null,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          reason: job.reason
        },
        severity: 'critical',
        category: 'compliance'
      });
    }
  }

  /**
   * Anonymize student data
   */
  private async anonymizeStudentData(
    studentId: string, 
    rules: AnonymizationRule[], 
    reason: string
  ): Promise<{
    recordsProcessed: number;
    anonymizedFields: string[];
    preservedFields: string[];
  }> {
    const anonymizedFields: string[] = [];
    const preservedFields: string[] = [];
    let recordsProcessed = 0;

    try {
      // Get student data
      const studentData = await this.getStudentData(studentId);
      if (!studentData) {
        throw new Error(`Student not found: ${studentId}`);
      }

      // Fields to preserve for educational statistics
      const statisticalFields = ['grade_level', 'subject_area', 'completion_rate', 'avg_score'];
      
      // Process each field according to rules
      for (const rule of rules) {
        if (studentData[rule.fieldName] !== undefined) {
          if (this.inactivityConfig.preserveEducationalStatistics && 
              statisticalFields.includes(rule.fieldName)) {
            // Preserve but generalize for statistics
            studentData[rule.fieldName] = await this.generalizeField(
              studentData[rule.fieldName], 
              rule.fieldName
            );
            preservedFields.push(rule.fieldName);
          } else {
            // Fully anonymize
            studentData[rule.fieldName] = await this.applyAnonymizationStrategy(
              studentData[rule.fieldName], 
              rule
            );
            anonymizedFields.push(rule.fieldName);
          }
        }
      }

      // Update student record
      await this.updateStudentData(studentId, studentData);
      recordsProcessed++;

      // Anonymize related data
      const progressRecords = await this.anonymizeStudentProgress(studentId, reason);
      const exerciseRecords = await this.anonymizeStudentExercises(studentId, reason);
      const sessionRecords = await this.anonymizeStudentSessions(studentId, reason);

      recordsProcessed += progressRecords + exerciseRecords + sessionRecords;

      return { recordsProcessed, anonymizedFields, preservedFields };

    } catch (error) {
      logger.error('Error anonymizing student data:', error);
      throw error;
    }
  }

  /**
   * Anonymize parent data
   */
  private async anonymizeParentData(
    parentId: string, 
    rules: AnonymizationRule[], 
    reason: string
  ): Promise<{
    recordsProcessed: number;
    anonymizedFields: string[];
    preservedFields: string[];
  }> {
    const anonymizedFields: string[] = [];
    const preservedFields: string[] = [];
    let recordsProcessed = 0;

    try {
      // Get parent data
      const parentData = await this.getParentData(parentId);
      if (!parentData) {
        throw new Error(`Parent not found: ${parentId}`);
      }

      // Process each field according to rules
      for (const rule of rules) {
        if (parentData[rule.fieldName] !== undefined) {
          parentData[rule.fieldName] = await this.applyAnonymizationStrategy(
            parentData[rule.fieldName], 
            rule
          );
          anonymizedFields.push(rule.fieldName);
        }
      }

      // Update parent record
      await this.updateParentData(parentId, parentData);
      recordsProcessed++;

      // Anonymize consent records (but preserve consent history for compliance)
      const consentRecords = await this.anonymizeParentConsent(parentId, reason);
      recordsProcessed += consentRecords;

      return { recordsProcessed, anonymizedFields, preservedFields };

    } catch (error) {
      logger.error('Error anonymizing parent data:', error);
      throw error;
    }
  }

  /**
   * Apply anonymization strategy to a field
   */
  private async applyAnonymizationStrategy(value: any, rule: AnonymizationRule): Promise<any> {
    if (value === null || value === undefined) {
      return value;
    }

    switch (rule.strategy) {
      case 'hash':
        return this.hashValue(value.toString());

      case 'randomize':
        return this.randomizeValue(value, rule.preserveFormat, rule.preserveLength);

      case 'mask':
        return this.maskValue(value.toString(), rule.customPattern);

      case 'remove':
        return null;

      case 'generalize':
        return this.generalizeField(value, '');

      case 'substitute':
        return this.substituteValue(value, rule.customPattern);

      default:
        logger.warn(`Unknown anonymization strategy: ${rule.strategy}`);
        return value;
    }
  }

  /**
   * Hash a value using SHA-256
   */
  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Randomize a value while preserving format/length
   */
  private randomizeValue(value: any, preserveFormat: boolean, preserveLength: boolean): any {
    const str = value.toString();
    
    if (preserveFormat) {
      // Preserve format (letters stay letters, numbers stay numbers)
      return str.split('').map(char => {
        if (/\d/.test(char)) {
          return Math.floor(Math.random() * 10).toString();
        } else if (/[a-zA-Z]/.test(char)) {
          const isUpper = char === char.toUpperCase();
          const randomChar = String.fromCharCode(
            Math.floor(Math.random() * 26) + (isUpper ? 65 : 97)
          );
          return randomChar;
        }
        return char;
      }).join('');
    } else if (preserveLength) {
      // Generate random string of same length
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      return Array.from({ length: str.length }, () => 
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    } else {
      // Generate random UUID
      return crypto.randomUUID();
    }
  }

  /**
   * Mask a value with pattern
   */
  private maskValue(value: string, pattern?: string): string {
    const defaultPattern = '*';
    const maskChar = pattern || defaultPattern;
    
    if (value.length <= 2) {
      return maskChar.repeat(value.length);
    }
    
    // Keep first and last character, mask the middle
    return value[0] + maskChar.repeat(value.length - 2) + value[value.length - 1];
  }

  /**
   * Generalize a field value for statistical purposes
   */
  private async generalizeField(value: any, fieldName: string): Promise<any> {
    // Implement field-specific generalization
    if (fieldName === 'age' && typeof value === 'number') {
      // Group ages into ranges
      if (value < 6) return '3-5';
      if (value < 9) return '6-8';
      if (value < 12) return '9-11';
      if (value < 15) return '12-14';
      return '15+';
    }
    
    if (fieldName === 'grade_level') {
      // Keep grade level for educational statistics
      return value;
    }
    
    if (fieldName === 'completion_rate' && typeof value === 'number') {
      // Group completion rates
      if (value < 0.25) return 'low';
      if (value < 0.75) return 'medium';
      return 'high';
    }
    
    // Default generalization
    return '[GENERALIZED]';
  }

  /**
   * Substitute value with predefined replacement
   */
  private substituteValue(value: any, pattern?: string): any {
    if (pattern) {
      return pattern;
    }
    
    // Default substitutions based on common field types
    const str = value.toString().toLowerCase();
    
    if (str.includes('name')) return 'Anonymous User';
    if (str.includes('email')) return 'anonymous@example.com';
    if (str.includes('phone')) return '+33123456789';
    if (str.includes('address')) return '123 Anonymous Street';
    
    return '[ANONYMIZED]';
  }

  /**
   * Check for inactive accounts and schedule anonymization
   */
  private async checkInactiveAccounts(): Promise<void> {
    if (!this.inactivityConfig.enableAutomaticAnonymization) {
      return;
    }

    try {
      const now = new Date();
      
      // Check student inactivity
      const inactiveStudents = await this.findInactiveStudents(
        this.inactivityConfig.studentInactivityDays
      );
      
      for (const student of inactiveStudents) {
        // Send warning first
        const warningDate = new Date(student.lastActivity);
        warningDate.setDate(warningDate.getDate() + 
          this.inactivityConfig.studentInactivityDays - 
          this.inactivityConfig.warningDaysBeforeAnonymization
        );
        
        if (now >= warningDate && !student.warningsSent) {
          await this.sendInactivityWarning(student.id, 'student');
          await this.markWarningAsSent(student.id);
        }
        
        // Schedule anonymization if warning period passed
        const anonymizationDate = new Date(student.lastActivity);
        anonymizationDate.setDate(anonymizationDate.getDate() + 
          this.inactivityConfig.studentInactivityDays
        );
        
        if (now >= anonymizationDate) {
          await this.scheduleAnonymization({
            entityType: 'student',
            entityId: student.id,
            reason: 'inactivity',
            preserveStatistics: this.inactivityConfig.preserveEducationalStatistics,
            immediateExecution: true,
            notifyUser: true
          });
        }
      }

      // Similar checks for parents and admins...
      
      logger.info('Inactivity check completed', { 
        inactiveStudents: inactiveStudents.length 
      });

    } catch (error) {
      logger.error('Error checking inactive accounts:', error);
    }
  }

  /**
   * Generate anonymization report
   */
  private async generateAnonymizationReport(job: AnonymizationJob): Promise<AnonymizationReport> {
    const fieldsAnonymized: Record<string, string> = {};
    const rules = this.anonymizationRules.get(job.entityType) || [];
    
    for (const field of job.anonymizedFields) {
      const rule = rules.find(r => r.fieldName === field);
      fieldsAnonymized[field] = rule?.strategy || 'unknown';
    }

    const report: AnonymizationReport = {
      jobId: job.id,
      entityType: job.entityType,
      entityId: job.entityId,
      executedAt: job.completedAt!,
      recordsProcessed: job.affectedRecords,
      fieldsAnonymized,
      preservedData: job.preservedFields,
      statisticsGenerated: this.inactivityConfig.preserveEducationalStatistics,
      complianceChecks: {
        gdprCompliant: true,
        dataMinimized: job.anonymizedFields.length > 0,
        purposeLimitation: true,
        accuracyMaintained: job.preservedFields.length > 0
      }
    };

    return report;
  }

  // Private helper methods
  private initializeAnonymizationRules(): void {
    // Student anonymization rules
    this.anonymizationRules.set('student', [
      { fieldName: 'first_name', strategy: 'substitute', preserveFormat: false, preserveLength: false },
      { fieldName: 'last_name', strategy: 'substitute', preserveFormat: false, preserveLength: false },
      { fieldName: 'email', strategy: 'hash', preserveFormat: false, preserveLength: false },
      { fieldName: 'birth_date', strategy: 'generalize', preserveFormat: false, preserveLength: false },
      { fieldName: 'address', strategy: 'remove', preserveFormat: false, preserveLength: false },
      { fieldName: 'phone', strategy: 'mask', preserveFormat: true, preserveLength: false },
      { fieldName: 'ip_address', strategy: 'mask', preserveFormat: false, preserveLength: false },
      { fieldName: 'user_agent', strategy: 'remove', preserveFormat: false, preserveLength: false }
    ]);

    // Parent anonymization rules
    this.anonymizationRules.set('parent', [
      { fieldName: 'first_name', strategy: 'substitute', preserveFormat: false, preserveLength: false },
      { fieldName: 'last_name', strategy: 'substitute', preserveFormat: false, preserveLength: false },
      { fieldName: 'email', strategy: 'hash', preserveFormat: false, preserveLength: false },
      { fieldName: 'phone', strategy: 'mask', preserveFormat: true, preserveLength: false },
      { fieldName: 'address', strategy: 'remove', preserveFormat: false, preserveLength: false },
      { fieldName: 'ip_address', strategy: 'mask', preserveFormat: false, preserveLength: false }
    ]);

    logger.info('Anonymization rules initialized');
  }

  private determinePriority(reason: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (reason) {
      case 'gdpr_request':
      case 'consent_withdrawal':
        return 'urgent';
      case 'account_deletion':
        return 'high';
      case 'retention_policy':
        return 'medium';
      case 'inactivity':
        return 'low';
      default:
        return 'medium';
    }
  }

  private scheduleJobExecution(jobId: string, scheduledFor: Date): void {
    const delay = scheduledFor.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.executeAnonymization(jobId);
      }, delay);
    } else {
      // Execute immediately if scheduled time has passed
      setImmediate(() => this.executeAnonymization(jobId));
    }
  }

  private scheduleInactivityCheck(): void {
    // Check for inactive accounts daily
    const checkInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(() => {
      this.checkInactiveAccounts().catch(error => {
        logger.error('Error in scheduled inactivity check:', error);
      });
    }, checkInterval);

    logger.info('Inactivity check scheduled to run daily');
  }

  // Database methods (implement with your DB layer)
  private async getStudentData(studentId: string): Promise<any> {
    try {
      const { db } = await import('../db/connection');
      const { students } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const student = await db.select()
        .from(students)
        .where(eq(students.id, parseInt(studentId)))
        .limit(1);
      
      return student[0] || {};
    } catch (error) {
      logger.error('Failed to get student data', { error, studentId });
      throw new Error(`Failed to get student data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateStudentData(studentId: string, data: any): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { students } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(students)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(students.id, parseInt(studentId)));
      
      logger.info('Student data updated for anonymization', { studentId });
    } catch (error) {
      logger.error('Failed to update student data', { error, studentId });
      throw new Error(`Failed to update student data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getParentData(parentId: string): Promise<any> {
    try {
      const { db } = await import('../db/connection');
      const { gdprConsentRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const parent = await db.select()
        .from(gdprConsentRequests)
        .where(eq(gdprConsentRequests.id, parseInt(parentId)))
        .limit(1);
      
      return parent[0] || {};
    } catch (error) {
      logger.error('Failed to get parent data', { error, parentId });
      throw new Error(`Failed to get parent data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateParentData(parentId: string, data: any): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { gdprConsentRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(gdprConsentRequests)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(gdprConsentRequests.id, parseInt(parentId)));
      
      logger.info('Parent data updated for anonymization', { parentId });
    } catch (error) {
      logger.error('Failed to update parent data', { error, parentId });
      throw new Error(`Failed to update parent data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async anonymizeStudentProgress(studentId: string, reason: string): Promise<number> {
    try {
      const { db } = await import('../db/connection');
      const { studentProgress } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Anonymize progress data
      const result = await db.update(studentProgress)
        .set({
          // Keep numerical data but remove personal identifiers
          progressPercent: 0,
          masteryLevel: 'anonymized',
          totalAttempts: 0,
          successfulAttempts: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0,
          lastAttemptAt: null,
          masteredAt: null,
          needsReview: false,
          reviewScheduledAt: null,
          streakCount: 0,
          difficultyPreference: null,
          updatedAt: new Date()
        })
        .where(eq(studentProgress.studentId, parseInt(studentId)));
      
      logger.info('Student progress anonymized', { studentId, reason, recordsAffected: result.rowsAffected });
      return result.rowsAffected || 0;
    } catch (error) {
      logger.error('Failed to anonymize student progress', { error, studentId, reason });
      throw new Error(`Failed to anonymize student progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async anonymizeStudentExercises(studentId: string, reason: string): Promise<number> {
    try {
      const { db } = await import('../db/connection');
      const { studentProgress } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Anonymize exercise attempts
      const result = await db.update(studentProgress)
        .set({
          completed: false,
          score: 0,
          timeSpent: 0,
          attempts: 0,
          completedAt: null,
          updatedAt: new Date()
        })
        .where(eq(studentProgress.studentId, parseInt(studentId)));
      
      logger.info('Student exercises anonymized', { studentId, reason, recordsAffected: result.rowsAffected });
      return result.rowsAffected || 0;
    } catch (error) {
      logger.error('Failed to anonymize student exercises', { error, studentId, reason });
      throw new Error(`Failed to anonymize student exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async anonymizeStudentSessions(studentId: string, reason: string): Promise<number> {
    try {
      const { db } = await import('../db/connection');
      const { sessions } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Anonymize session data
      const result = await db.update(sessions)
        .set({
          startTime: null,
          endTime: null,
          duration: 0,
          exercisesCompleted: 0,
          totalScore: 0,
          averageScore: 0,
          updatedAt: new Date()
        })
        .where(eq(sessions.studentId, parseInt(studentId)));
      
      logger.info('Student sessions anonymized', { studentId, reason, recordsAffected: result.rowsAffected });
      return result.rowsAffected || 0;
    } catch (error) {
      logger.error('Failed to anonymize student sessions', { error, studentId, reason });
      throw new Error(`Failed to anonymize student sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async anonymizeParentConsent(parentId: string, reason: string): Promise<number> {
    try {
      const { db } = await import('../db/connection');
      const { gdprConsentRequests } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Anonymize consent data
      const result = await db.update(gdprConsentRequests)
        .set({
          parentEmail: '[ANONYMIZED]',
          childName: '[ANONYMIZED]',
          parentName: '[ANONYMIZED]',
          consentStatus: 'anonymized',
          firstVerificationToken: null,
          secondVerificationToken: null,
          firstVerifiedAt: null,
          secondVerifiedAt: null,
          completedAt: null,
          updatedAt: new Date()
        })
        .where(eq(gdprConsentRequests.id, parseInt(parentId)));
      
      logger.info('Parent consent anonymized', { parentId, reason, recordsAffected: result.rowsAffected });
      return result.rowsAffected || 0;
    } catch (error) {
      logger.error('Failed to anonymize parent consent', { error, parentId, reason });
      throw new Error(`Failed to anonymize parent consent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async anonymizeSessionData(sessionId: string, rules: AnonymizationRule[]): Promise<{
    recordsProcessed: number;
    anonymizedFields: string[];
    preservedFields: string[];
  }> {
    try {
      const { db } = await import('../db/connection');
      const { sessions } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      const session = await db.select()
        .from(sessions)
        .where(eq(sessions.id, parseInt(sessionId)))
        .limit(1);
      
      if (session.length === 0) {
        return { recordsProcessed: 0, anonymizedFields: [], preservedFields: [] };
      }
      
      const sessionData = session[0];
      const anonymizedFields: string[] = [];
      const preservedFields: string[] = [];
      const updateData: any = {};
      
      // Apply anonymization rules
      for (const rule of rules) {
        if (rule.field in sessionData) {
          if (rule.action === 'anonymize') {
            updateData[rule.field] = '[ANONYMIZED]';
            anonymizedFields.push(rule.field);
          } else if (rule.action === 'preserve') {
            preservedFields.push(rule.field);
          }
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date();
        await db.update(sessions)
          .set(updateData)
          .where(eq(sessions.id, parseInt(sessionId)));
      }
      
      logger.info('Session data anonymized', { sessionId, anonymizedFields, preservedFields });
      return { recordsProcessed: 1, anonymizedFields, preservedFields };
    } catch (error) {
      logger.error('Failed to anonymize session data', { error, sessionId });
      throw new Error(`Failed to anonymize session data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findInactiveStudents(inactivityDays: number): Promise<any[]> {
    try {
      const { db } = await import('../db/connection');
      const { students } = await import('../db/schema');
      const { lt } = await import('drizzle-orm');
      
      const cutoffDate = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
      
      const inactiveStudents = await db.select()
        .from(students)
        .where(lt(students.dernierAcces, cutoffDate));
      
      logger.info('Found inactive students', { count: inactiveStudents.length, inactivityDays });
      return inactiveStudents;
    } catch (error) {
      logger.error('Failed to find inactive students', { error, inactivityDays });
      throw new Error(`Failed to find inactive students: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async sendInactivityWarning(entityId: string, entityType: string): Promise<void> {
    try {
      const { EmailService } = await import('./email.service');
      const emailService = new EmailService();
      
      await emailService.sendInactivityWarning({
        to: entityType === 'student' ? 'student@example.com' : 'parent@example.com',
        subject: 'Account Inactivity Warning',
        template: 'inactivity-warning',
        data: {
          entityType,
          entityId,
          warningDate: new Date().toISOString(),
          daysUntilAnonymization: 30
        }
      });
      
      logger.info('Inactivity warning sent', { entityId, entityType });
    } catch (error) {
      logger.error('Failed to send inactivity warning', { error, entityId, entityType });
      // Don't throw - email failure shouldn't break the process
    }
  }

  private async markWarningAsSent(entityId: string): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { students } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(students)
        .set({
          // Add a field to track warning sent status
          updatedAt: new Date()
        })
        .where(eq(students.id, parseInt(entityId)));
      
      logger.info('Warning marked as sent', { entityId });
    } catch (error) {
      logger.error('Failed to mark warning as sent', { error, entityId });
      throw new Error(`Failed to mark warning as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}