import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AuditTrailService } from './audit-trail.service';
import { DataAnonymizationService } from './data-anonymization.service';
import { EmailService } from './email.service';

// Validation schemas
const RetentionPolicySchema = z.object({
  policyName: z.string().min(2).max(100),
  entityType: z.enum(['student', 'parent', 'exercise', 'progress', 'session', 'audit_log', 'consent']),
  retentionPeriodDays: z.number().min(1).max(10950), // Max ~30 years
  triggerCondition: z.enum(['time_based', 'event_based', 'consent_withdrawal', 'account_deletion']),
  action: z.enum(['delete', 'anonymize', 'archive', 'notify_only']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  active: z.boolean().default(true),
  legalBasis: z.string().optional(),
  exceptions: z.array(z.string()).default([]),
  notificationDays: z.number().min(0).max(365).default(30)
});

const RetentionScheduleSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  policyId: z.string(),
  scheduledDate: z.date(),
  action: z.enum(['delete', 'anonymize', 'archive']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  notificationSent: z.boolean().default(false),
  completed: z.boolean().default(false)
});

export interface RetentionPolicy {
  id: string;
  policyName: string;
  entityType: string;
  retentionPeriodDays: number;
  triggerCondition: 'time_based' | 'event_based' | 'consent_withdrawal' | 'account_deletion';
  action: 'delete' | 'anonymize' | 'archive' | 'notify_only';
  priority: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  legalBasis?: string;
  exceptions: string[];
  notificationDays: number;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  recordsProcessed: number;
}

export interface RetentionSchedule {
  id: string;
  entityType: string;
  entityId: string;
  policyId: string;
  scheduledDate: Date;
  action: 'delete' | 'anonymize' | 'archive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  notificationSent: boolean;
  completed: boolean;
  completedAt?: Date;
  errors: string[];
  createdAt: Date;
}

export interface RetentionReport {
  id: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  policiesExecuted: number;
  recordsProcessed: number;
  actionsBreakdown: Record<string, number>;
  entitiesBreakdown: Record<string, number>;
  errors: string[];
  complianceStatus: 'compliant' | 'partial' | 'non_compliant';
  recommendations: string[];
  generatedAt: Date;
}

export interface LegalRetentionRequirements {
  dataCategory: string;
  minimumRetentionDays: number;
  maximumRetentionDays?: number;
  legalBasis: string;
  jurisdiction: string;
  specialConditions: string[];
}

export class DataRetentionService {
  private auditService: AuditTrailService;
  private anonymizationService: DataAnonymizationService;
  private emailService: EmailService;
  private policies: Map<string, RetentionPolicy> = new Map();
  private schedules: Map<string, RetentionSchedule> = new Map();
  private legalRequirements: Map<string, LegalRetentionRequirements> = new Map();

  constructor() {
    this.auditService = new AuditTrailService();
    this.anonymizationService = new DataAnonymizationService();
    this.emailService = new EmailService();
    
    this.initializeDefaultPolicies();
    this.initializeLegalRequirements();
    this.scheduleRetentionTasks();
  }

  /**
   * Create a new retention policy
   */
  async createRetentionPolicy(policyData: z.infer<typeof RetentionPolicySchema>): Promise<string> {
    try {
      const validatedData = RetentionPolicySchema.parse(policyData);
      
      // Validate against legal requirements
      await this.validatePolicyCompliance(validatedData);
      
      const policyId = crypto.randomUUID();
      
      const policy: RetentionPolicy = {
        id: policyId,
        policyName: validatedData.policyName,
        entityType: validatedData.entityType,
        retentionPeriodDays: validatedData.retentionPeriodDays,
        triggerCondition: validatedData.triggerCondition,
        action: validatedData.action,
        priority: validatedData.priority,
        active: validatedData.active,
        legalBasis: validatedData.legalBasis,
        exceptions: validatedData.exceptions,
        notificationDays: validatedData.notificationDays,
        createdAt: new Date(),
        updatedAt: new Date(),
        recordsProcessed: 0
      };

      this.policies.set(policyId, policy);
      await this.savePolicyToDatabase(policy);

      // Log policy creation
      await this.auditService.logAction({
        entityType: 'retention_policy',
        entityId: policyId,
        action: 'create',
        userId: null,
        details: {
          policyName: validatedData.policyName,
          entityType: validatedData.entityType,
          retentionPeriodDays: validatedData.retentionPeriodDays,
          action: validatedData.action
        },
        severity: 'medium',
        category: 'compliance'
      });

      logger.info('Retention policy created', { 
        policyId, 
        policyName: validatedData.policyName,
        entityType: validatedData.entityType 
      });

      return policyId;

    } catch (error) {
      logger.error('Error creating retention policy:', error);
      throw new Error('Failed to create retention policy');
    }
  }

  /**
   * Execute retention policies
   */
  async executeRetentionPolicies(): Promise<{
    policiesExecuted: number;
    recordsProcessed: number;
    errorsEncountered: number;
  }> {
    let policiesExecuted = 0;
    let recordsProcessed = 0;
    let errorsEncountered = 0;

    try {
      const activePolicies = Array.from(this.policies.values()).filter(p => p.active);
      
      logger.info(`Executing ${activePolicies.length} active retention policies`);

      for (const policy of activePolicies) {
        try {
          const policyResult = await this.executeSinglePolicy(policy);
          recordsProcessed += policyResult.recordsProcessed;
          policiesExecuted++;

          // Update policy statistics
          policy.lastExecuted = new Date();
          policy.recordsProcessed += policyResult.recordsProcessed;
          await this.updatePolicyInDatabase(policy);

        } catch (error) {
          errorsEncountered++;
          logger.error(`Error executing policy ${policy.id}:`, error);
          
          // Log policy execution error
          await this.auditService.logAction({
            entityType: 'retention_policy',
            entityId: policy.id,
            action: 'failed',
            userId: null,
            details: {
              policyName: policy.policyName,
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            severity: 'high',
            category: 'compliance'
          });
        }
      }

      // Log overall execution results
      await this.auditService.logAction({
        entityType: 'retention_execution',
        entityId: crypto.randomUUID(),
        action: 'completed',
        userId: null,
        details: {
          policiesExecuted,
          recordsProcessed,
          errorsEncountered,
          executedAt: new Date()
        },
        severity: 'medium',
        category: 'compliance'
      });

      logger.info('Retention policies execution completed', {
        policiesExecuted,
        recordsProcessed,
        errorsEncountered
      });

      return { policiesExecuted, recordsProcessed, errorsEncountered };

    } catch (error) {
      logger.error('Error executing retention policies:', error);
      throw new Error('Failed to execute retention policies');
    }
  }

  /**
   * Execute a single retention policy
   */
  private async executeSinglePolicy(policy: RetentionPolicy): Promise<{
    recordsProcessed: number;
  }> {
    let recordsProcessed = 0;

    try {
      // Find entities that meet retention criteria
      const eligibleEntities = await this.findEligibleEntities(policy);
      
      logger.info(`Found ${eligibleEntities.length} entities eligible for policy ${policy.policyName}`);

      for (const entity of eligibleEntities) {
        try {
          // Check for exceptions
          if (this.hasRetentionException(entity, policy.exceptions)) {
            logger.debug(`Entity ${entity.id} has retention exception, skipping`);
            continue;
          }

          // Send notification if configured
          if (policy.notificationDays > 0 && !entity.notificationSent) {
            await this.sendRetentionNotification(entity, policy);
            await this.markNotificationSent(entity.id);
            continue; // Don't process until notification period expires
          }

          // Execute retention action
          await this.executeRetentionAction(entity, policy);
          recordsProcessed++;

          // Log individual retention action
          await this.auditService.logAction({
            entityType: 'retention_execution' as const,
            entityId: entity.id,
            action: 'data_retention_applied',
            userId: null,
            details: {
              policyId: policy.id,
              policyName: policy.policyName,
              action: policy.action,
              retentionPeriodDays: policy.retentionPeriodDays
            },
            severity: 'medium',
            category: 'compliance'
          });

        } catch (error) {
          logger.error(`Error processing entity ${entity.id}:`, error);
          // Continue with other entities
        }
      }

      return { recordsProcessed };

    } catch (error) {
      logger.error(`Error executing policy ${policy.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute retention action on an entity
   */
  private async executeRetentionAction(entity: any, policy: RetentionPolicy): Promise<void> {
    switch (policy.action) {
      case 'delete':
        await this.deleteEntity(entity, policy);
        break;

      case 'anonymize':
        await this.anonymizationService.scheduleAnonymization({
          entityType: policy.entityType,
          entityId: entity.id,
          reason: 'retention_policy',
          preserveStatistics: true,
          immediateExecution: true,
          notifyUser: false
        });
        break;

      case 'archive':
        await this.archiveEntity(entity, policy);
        break;

      case 'notify_only':
        await this.sendRetentionNotification(entity, policy);
        break;

      default:
        throw new Error(`Unknown retention action: ${policy.action}`);
    }
  }

  /**
   * Schedule retention for specific entity
   */
  async scheduleRetention(scheduleData: z.infer<typeof RetentionScheduleSchema>): Promise<string> {
    try {
      const validatedData = RetentionScheduleSchema.parse(scheduleData);
      
      const scheduleId = crypto.randomUUID();
      
      const schedule: RetentionSchedule = {
        id: scheduleId,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        policyId: validatedData.policyId,
        scheduledDate: validatedData.scheduledDate,
        action: validatedData.action,
        priority: validatedData.priority,
        notificationSent: validatedData.notificationSent,
        completed: validatedData.completed,
        errors: [],
        createdAt: new Date()
      };

      this.schedules.set(scheduleId, schedule);
      await this.saveScheduleToDatabase(schedule);

      // Log scheduling
      await this.auditService.logAction({
        entityType: 'retention_schedule',
        entityId: scheduleId,
        action: 'create',
        userId: null,
        details: {
          targetEntityType: validatedData.entityType,
          targetEntityId: validatedData.entityId,
          scheduledDate: validatedData.scheduledDate,
          action: validatedData.action
        },
        severity: 'low',
        category: 'compliance'
      });

      logger.info('Retention scheduled', { 
        scheduleId, 
        entityType: validatedData.entityType,
        scheduledDate: validatedData.scheduledDate 
      });

      return scheduleId;

    } catch (error) {
      logger.error('Error scheduling retention:', error);
      throw new Error('Failed to schedule retention');
    }
  }

  /**
   * Generate retention compliance report
   */
  async generateRetentionReport(startDate: Date, endDate: Date): Promise<RetentionReport> {
    try {
      const reportId = crypto.randomUUID();
      
      // Collect data for the report period
      const executedPolicies = await this.getExecutedPoliciesInPeriod(startDate, endDate);
      const processedRecords = await this.getProcessedRecordsInPeriod(startDate, endDate);
      
      // Analyze actions breakdown
      const actionsBreakdown: Record<string, number> = {};
      const entitiesBreakdown: Record<string, number> = {};
      
      for (const record of processedRecords) {
        actionsBreakdown[record.action] = (actionsBreakdown[record.action] || 0) + 1;
        entitiesBreakdown[record.entityType] = (entitiesBreakdown[record.entityType] || 0) + 1;
      }

      // Check compliance status
      const complianceStatus = await this.assessComplianceStatus();
      const recommendations = await this.generateComplianceRecommendations();
      
      const report: RetentionReport = {
        id: reportId,
        period: { startDate, endDate },
        policiesExecuted: executedPolicies.length,
        recordsProcessed: processedRecords.length,
        actionsBreakdown,
        entitiesBreakdown,
        errors: [], // Collect from audit logs
        complianceStatus,
        recommendations,
        generatedAt: new Date()
      };

      // Log report generation
      await this.auditService.logAction({
        entityType: 'retention_report',
        entityId: reportId,
        action: 'create',
        userId: null,
        details: {
          period: { startDate, endDate },
          policiesExecuted: executedPolicies.length,
          recordsProcessed: processedRecords.length,
          complianceStatus
        },
        severity: 'low',
        category: 'compliance'
      });

      logger.info('Retention report generated', { 
        reportId, 
        period: { startDate, endDate },
        complianceStatus 
      });

      return report;

    } catch (error) {
      logger.error('Error generating retention report:', error);
      throw new Error('Failed to generate retention report');
    }
  }

  /**
   * Get retention status for entity
   */
  async getRetentionStatus(entityType: string, entityId: string): Promise<{
    applicablePolicies: RetentionPolicy[];
    scheduledActions: RetentionSchedule[];
    retentionDate?: Date;
    daysUntilRetention?: number;
    canExtendRetention: boolean;
  }> {
    try {
      // Find applicable policies
      const applicablePolicies = Array.from(this.policies.values())
        .filter(p => p.entityType === entityType && p.active);

      // Find scheduled actions
      const scheduledActions = Array.from(this.schedules.values())
        .filter(s => s.entityType === entityType && s.entityId === entityId && !s.completed);

      // Calculate retention date
      let retentionDate: Date | undefined;
      let daysUntilRetention: number | undefined;

      if (scheduledActions.length > 0) {
        // Use earliest scheduled action
        retentionDate = scheduledActions.reduce((earliest, schedule) => 
          schedule.scheduledDate < earliest ? schedule.scheduledDate : earliest, 
          scheduledActions[0].scheduledDate
        );
        
        daysUntilRetention = Math.ceil(
          (retentionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
      }

      // Check if retention can be extended (based on legal requirements)
      const canExtendRetention = await this.canExtendRetention(entityType, entityId);

      return {
        applicablePolicies,
        scheduledActions,
        retentionDate,
        daysUntilRetention,
        canExtendRetention
      };

    } catch (error) {
      logger.error('Error getting retention status:', error);
      throw new Error('Failed to get retention status');
    }
  }

  // Private helper methods
  private initializeDefaultPolicies(): void {
    // Default policies for educational platform
    const defaultPolicies = [
      {
        policyName: 'Student Data Retention',
        entityType: 'student',
        retentionPeriodDays: 1095, // 3 years after last activity
        triggerCondition: 'time_based',
        action: 'anonymize',
        priority: 'medium',
        legalBasis: 'GDPR Article 5(1)(e) - Storage limitation',
        exceptions: ['active_student', 'legal_obligation']
      },
      {
        policyName: 'Parent Consent Records',
        entityType: 'consent',
        retentionPeriodDays: 2555, // 7 years for legal compliance
        triggerCondition: 'time_based',
        action: 'archive',
        priority: 'high',
        legalBasis: 'Legal obligation for consent records',
        exceptions: ['ongoing_relationship']
      },
      {
        policyName: 'Session Data Cleanup',
        entityType: 'session',
        retentionPeriodDays: 90, // 3 months
        triggerCondition: 'time_based',
        action: 'delete',
        priority: 'low',
        legalBasis: 'Data minimization principle',
        exceptions: []
      },
      {
        policyName: 'Audit Log Retention',
        entityType: 'audit_log',
        retentionPeriodDays: 2190, // 6 years for compliance
        triggerCondition: 'time_based',
        action: 'archive',
        priority: 'high',
        legalBasis: 'Regulatory compliance requirements',
        exceptions: ['security_incident', 'legal_proceeding']
      }
    ];

    // Create policies
    for (const policyData of defaultPolicies) {
      const policyId = crypto.randomUUID();
      const policy: RetentionPolicy = {
        id: policyId,
        ...policyData,
        active: true,
        notificationDays: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
        recordsProcessed: 0
      } as RetentionPolicy;

      this.policies.set(policyId, policy);
    }

    logger.info(`Initialized ${defaultPolicies.length} default retention policies`);
  }

  private initializeLegalRequirements(): void {
    // French GDPR and educational data requirements
    const requirements: LegalRetentionRequirements[] = [
      {
        dataCategory: 'student_educational_records',
        minimumRetentionDays: 365, // 1 year minimum
        maximumRetentionDays: 1095, // 3 years maximum without consent
        legalBasis: 'GDPR Article 5(1)(e) and French Education Code',
        jurisdiction: 'France',
        specialConditions: ['Parental consent can extend retention', 'Educational interest']
      },
      {
        dataCategory: 'parental_consent',
        minimumRetentionDays: 2555, // 7 years
        legalBasis: 'Proof of consent legal obligation',
        jurisdiction: 'France',
        specialConditions: ['Must retain for audit purposes']
      },
      {
        dataCategory: 'financial_records',
        minimumRetentionDays: 3650, // 10 years
        legalBasis: 'French Commercial Code',
        jurisdiction: 'France',
        specialConditions: ['Tax and accounting obligations']
      }
    ];

    for (const requirement of requirements) {
      this.legalRequirements.set(requirement.dataCategory, requirement);
    }

    logger.info(`Initialized ${requirements.length} legal retention requirements`);
  }

  private scheduleRetentionTasks(): void {
    // Schedule daily retention policy execution
    const dailyInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(() => {
      this.executeRetentionPolicies().catch(error => {
        logger.error('Error in scheduled retention execution:', error);
      });
    }, dailyInterval);

    // Schedule weekly compliance report
    const weeklyInterval = 7 * 24 * 60 * 60 * 1000; // 1 week
    
    setInterval(() => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - weeklyInterval);
      
      this.generateRetentionReport(startDate, endDate).catch(error => {
        logger.error('Error generating scheduled retention report:', error);
      });
    }, weeklyInterval);

    logger.info('Retention tasks scheduled');
  }

  private async validatePolicyCompliance(policyData: z.infer<typeof RetentionPolicySchema>): Promise<void> {
    const requirement = this.legalRequirements.get(policyData.entityType);
    
    if (requirement) {
      if (policyData.retentionPeriodDays < requirement.minimumRetentionDays) {
        throw new Error(
          `Retention period too short. Minimum required: ${requirement.minimumRetentionDays} days`
        );
      }
      
      if (requirement.maximumRetentionDays && 
          policyData.retentionPeriodDays > requirement.maximumRetentionDays) {
        throw new Error(
          `Retention period too long. Maximum allowed: ${requirement.maximumRetentionDays} days`
        );
      }
    }
  }

  // Database and external service methods (implement with your services)
  private async savePolicyToDatabase(policy: RetentionPolicy): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { retentionPolicies } = await import('../db/schema');
      
      await db.insert(retentionPolicies).values({
        entityType: policy.entityType,
        retentionPeriodDays: policy.retentionPeriodDays,
        action: policy.action,
        conditions: JSON.stringify(policy.conditions),
        exceptions: JSON.stringify(policy.exceptions),
        legalBasis: policy.legalBasis,
        description: policy.description,
        isActive: policy.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info('Retention policy saved to database', { entityType: policy.entityType });
    } catch (error) {
      logger.error('Failed to save retention policy', { error, policy });
      throw new Error(`Failed to save retention policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updatePolicyInDatabase(policy: RetentionPolicy): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { retentionPolicies } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(retentionPolicies)
        .set({
          retentionPeriodDays: policy.retentionPeriodDays,
          action: policy.action,
          conditions: JSON.stringify(policy.conditions),
          exceptions: JSON.stringify(policy.exceptions),
          legalBasis: policy.legalBasis,
          description: policy.description,
          isActive: policy.isActive,
          updatedAt: new Date()
        })
        .where(eq(retentionPolicies.id, parseInt(policy.id)));
      
      logger.info('Retention policy updated in database', { policyId: policy.id });
    } catch (error) {
      logger.error('Failed to update retention policy', { error, policy });
      throw new Error(`Failed to update retention policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveScheduleToDatabase(schedule: RetentionSchedule): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { retentionSchedules } = await import('../db/schema');
      
      await db.insert(retentionSchedules).values({
        policyId: parseInt(schedule.policyId),
        scheduledFor: schedule.scheduledFor,
        status: schedule.status,
        priority: schedule.priority,
        metadata: JSON.stringify(schedule.metadata),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info('Retention schedule saved to database', { policyId: schedule.policyId });
    } catch (error) {
      logger.error('Failed to save retention schedule', { error, schedule });
      throw new Error(`Failed to save retention schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findEligibleEntities(policy: RetentionPolicy): Promise<any[]> {
    try {
      const { db } = await import('../db/connection');
      const { students, sessions, studentProgress } = await import('../db/schema');
      const { lt } = await import('drizzle-orm');
      
      const cutoffDate = new Date(Date.now() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
      
      let entities: any[] = [];
      
      switch (policy.entityType) {
        case 'student':
          entities = await db.select()
            .from(students)
            .where(lt(students.dernierAcces, cutoffDate));
          break;
        case 'session':
          entities = await db.select()
            .from(sessions)
            .where(lt(sessions.startTime, cutoffDate));
          break;
        case 'progress':
          entities = await db.select()
            .from(studentProgress)
            .where(lt(studentProgress.lastAttemptAt, cutoffDate));
          break;
        default:
          logger.warn('Unknown entity type for retention policy', { entityType: policy.entityType });
      }
      
      logger.info('Found eligible entities for retention', { 
        entityType: policy.entityType, 
        count: entities.length 
      });
      
      return entities;
    } catch (error) {
      logger.error('Failed to find eligible entities', { error, policy });
      throw new Error(`Failed to find eligible entities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private hasRetentionException(entity: any, exceptions: string[]): boolean {
    try {
      // Check if entity has any exception conditions
      for (const exception of exceptions) {
        if (exception === 'active_subscription' && entity.isActive) {
          return true;
        }
        if (exception === 'recent_activity' && entity.dernierAcces) {
          const daysSinceLastAccess = (Date.now() - new Date(entity.dernierAcces).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastAccess < 30) {
            return true;
          }
        }
        if (exception === 'legal_hold' && entity.legalHold) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking retention exceptions', { error, entity, exceptions });
      return false; // Default to no exception if error occurs
    }
  }

  private async sendRetentionNotification(entity: any, policy: RetentionPolicy): Promise<void> {
    try {
      const { EmailService } = await import('./email.service');
      const emailService = new EmailService();
      
      await emailService.sendRetentionNotification({
        to: entity.email || 'user@example.com',
        subject: 'Data Retention Notice',
        template: 'retention-notification',
        data: {
          entityType: policy.entityType,
          entityId: entity.id,
          retentionPeriod: policy.retentionPeriodDays,
          action: policy.action,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      
      logger.info('Retention notification sent', { entityId: entity.id, entityType: policy.entityType });
    } catch (error) {
      logger.error('Failed to send retention notification', { error, entity, policy });
      // Don't throw - notification failure shouldn't break the process
    }
  }

  private async markNotificationSent(entityId: string): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { students } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(students)
        .set({
          // Add notification sent flag
          updatedAt: new Date()
        })
        .where(eq(students.id, parseInt(entityId)));
      
      logger.info('Notification marked as sent', { entityId });
    } catch (error) {
      logger.error('Failed to mark notification as sent', { error, entityId });
      throw new Error(`Failed to mark notification as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deleteEntity(entity: any, policy: RetentionPolicy): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { students, sessions, studentProgress } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      switch (policy.entityType) {
        case 'student':
          await db.delete(students).where(eq(students.id, entity.id));
          break;
        case 'session':
          await db.delete(sessions).where(eq(sessions.id, entity.id));
          break;
        case 'progress':
          await db.delete(studentProgress).where(eq(studentProgress.id, entity.id));
          break;
        default:
          logger.warn('Unknown entity type for deletion', { entityType: policy.entityType });
      }
      
      logger.info('Entity deleted due to retention policy', { 
        entityId: entity.id, 
        entityType: policy.entityType 
      });
    } catch (error) {
      logger.error('Failed to delete entity', { error, entity, policy });
      throw new Error(`Failed to delete entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async archiveEntity(entity: any, policy: RetentionPolicy): Promise<void> {
    try {
      const { db } = await import('../db/connection');
      const { archivedData } = await import('../db/schema');
      
      await db.insert(archivedData).values({
        originalEntityType: policy.entityType,
        originalEntityId: entity.id.toString(),
        archivedData: JSON.stringify(entity),
        retentionPolicyId: policy.id,
        archivedAt: new Date(),
        expiresAt: new Date(Date.now() + policy.retentionPeriodDays * 24 * 60 * 60 * 1000)
      });
      
      logger.info('Entity archived due to retention policy', { 
        entityId: entity.id, 
        entityType: policy.entityType 
      });
    } catch (error) {
      logger.error('Failed to archive entity', { error, entity, policy });
      throw new Error(`Failed to archive entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getExecutedPoliciesInPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { db } = await import('../db/connection');
      const { retentionExecutions } = await import('../db/schema');
      const { and, gte, lte } = await import('drizzle-orm');
      
      const executions = await db.select()
        .from(retentionExecutions)
        .where(and(
          gte(retentionExecutions.executedAt, startDate),
          lte(retentionExecutions.executedAt, endDate)
        ));
      
      return executions;
    } catch (error) {
      logger.error('Failed to get executed policies', { error, startDate, endDate });
      throw new Error(`Failed to get executed policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getProcessedRecordsInPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const { db } = await import('../db/connection');
      const { retentionRecords } = await import('../db/schema');
      const { and, gte, lte } = await import('drizzle-orm');
      
      const records = await db.select()
        .from(retentionRecords)
        .where(and(
          gte(retentionRecords.processedAt, startDate),
          lte(retentionRecords.processedAt, endDate)
        ));
      
      return records;
    } catch (error) {
      logger.error('Failed to get processed records', { error, startDate, endDate });
      throw new Error(`Failed to get processed records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async assessComplianceStatus(): Promise<'compliant' | 'partial' | 'non_compliant'> {
    try {
      const { db } = await import('../db/connection');
      const { retentionPolicies } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Get all active policies
      const activePolicies = await db.select()
        .from(retentionPolicies)
        .where(eq(retentionPolicies.isActive, true));
      
      if (activePolicies.length === 0) {
        return 'non_compliant';
      }
      
      // Check if all required entity types have policies
      const requiredTypes = ['student', 'session', 'progress'];
      const coveredTypes = activePolicies.map(p => p.entityType);
      const missingTypes = requiredTypes.filter(type => !coveredTypes.includes(type));
      
      if (missingTypes.length === 0) {
        return 'compliant';
      } else if (missingTypes.length < requiredTypes.length) {
        return 'partial';
      } else {
        return 'non_compliant';
      }
    } catch (error) {
      logger.error('Failed to assess compliance status', { error });
      return 'non_compliant'; // Default to non-compliant if error occurs
    }
  }

  private async generateComplianceRecommendations(): Promise<string[]> {
    try {
      const complianceStatus = await this.assessComplianceStatus();
      const recommendations: string[] = [];
      
      if (complianceStatus === 'non_compliant') {
        recommendations.push('Implement retention policies for all entity types');
        recommendations.push('Review legal requirements for data retention');
        recommendations.push('Establish data retention procedures');
      } else if (complianceStatus === 'partial') {
        recommendations.push('Complete retention policy coverage for missing entity types');
        recommendations.push('Review existing policies for effectiveness');
      } else {
        recommendations.push('Continue monitoring retention policy effectiveness');
        recommendations.push('Review policies quarterly for regulatory changes');
        recommendations.push('Ensure all policies have proper legal basis documentation');
      }
      
      return recommendations;
    } catch (error) {
      logger.error('Failed to generate compliance recommendations', { error });
      return ['Review data retention compliance requirements'];
    }
  }

  private async canExtendRetention(entityType: string, entityId: string): Promise<boolean> {
    try {
      const { db } = await import('../db/connection');
      const { students, sessions, studentProgress } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      let entity: any;
      
      switch (entityType) {
        case 'student':
          entity = await db.select().from(students).where(eq(students.id, parseInt(entityId))).limit(1);
          break;
        case 'session':
          entity = await db.select().from(sessions).where(eq(sessions.id, parseInt(entityId))).limit(1);
          break;
        case 'progress':
          entity = await db.select().from(studentProgress).where(eq(studentProgress.id, parseInt(entityId))).limit(1);
          break;
        default:
          return false;
      }
      
      if (entity.length === 0) {
        return false;
      }
      
      // Check if entity has recent activity or legal hold
      const entityData = entity[0];
      if (entityData.legalHold) {
        return true;
      }
      
      if (entityData.dernierAcces) {
        const daysSinceLastAccess = (Date.now() - new Date(entityData.dernierAcces).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastAccess < 30; // Can extend if accessed within 30 days
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to check retention extension eligibility', { error, entityType, entityId });
      return false; // Default to no extension if error occurs
    }
  }
}