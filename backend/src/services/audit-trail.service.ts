import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { EncryptionService } from './encryption.service';

// Validation schemas
const AuditActionSchema = z.object({
  entityType: z.enum([
    'student',
    'parent',
    'exercise',
    'progress',
    'parental_consent',
    'gdpr_request',
    'data_export',
    'encryption',
    'key_rotation',
    'key_revocation',
    'user_session',
    'admin_action',
    'anonymization_job',
    'retention_policy',
    'retention_execution',
    'retention_schedule',
    'retention_report'
  ]),
  entityId: z.string(),
  action: z.enum([
    'create',
    'read',
    'update',
    'delete',
    'export',
    'anonymize',
    'consent_given',
    'consent_revoked',
    'login',
    'logout',
    'access_denied',
    'encrypt',
    'decrypt',
    'key_generated',
    'key_rotated',
    'emergency_revoked',
    'data_retention_applied',
    'first_consent',
    'second_consent',
    'verified',
    'completed',
    'failed',
    'created',
    'revoked'
  ]),
  userId: z.string().nullable(),
  parentId: z.string().optional(),
  studentId: z.string().optional(),
  details: z.record(z.any()),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.enum([
    'data_access',
    'data_modification',
    'consent_management',
    'security',
    'compliance',
    'system',
    'user_behavior'
  ]).optional()
});

const AuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  studentId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  severity: z.array(z.string()).optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
  includeDetails: z.boolean().default(false)
});

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  parentId?: string;
  studentId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  sessionId?: string;
  correlationId?: string;
  checksum: string;
  encrypted: boolean;
}

export interface AuditReport {
  id: string;
  title: string;
  description: string;
  generatedBy: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  filters: Record<string, any>;
  totalEntries: number;
  categories: Record<string, number>;
  topActions: Array<{ action: string; count: number }>;
  securityAlerts: number;
  complianceIssues: string[];
  exportFormat: 'json' | 'csv' | 'pdf';
  filePath?: string;
}

export interface SecurityAlert {
  id: string;
  type: 'suspicious_access' | 'multiple_failed_logins' | 'unusual_data_access' | 'consent_anomaly';
  severity: 'medium' | 'high' | 'critical';
  entityType: string;
  entityId: string;
  description: string;
  detectedAt: Date;
  auditEntries: string[];
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class AuditTrailService {
  private encryptionService: EncryptionService;
  private sessionCorrelations: Map<string, string> = new Map();

  constructor() {
    this.encryptionService = new EncryptionService();
    this.initializeAuditSystem();
  }

  /**
   * Log an audit action
   */
  async logAction(actionData: z.infer<typeof AuditActionSchema>): Promise<string> {
    try {
      const validatedData = AuditActionSchema.parse(actionData);
      
      // Generate unique audit ID
      const auditId = crypto.randomUUID();
      
      // Generate correlation ID for session tracking
      const correlationId = this.getOrCreateCorrelationId(validatedData.userId);
      
      // Determine if details should be encrypted
      const shouldEncrypt = this.shouldEncryptDetails(validatedData.action, validatedData.entityType);
      let encryptedDetails = validatedData.details;
      let encrypted = false;

      if (shouldEncrypt) {
        encryptedDetails = await this.encryptionService.encryptStudentData(
          validatedData.details
        );
        encrypted = true;
      }

      // Create audit entry
      const auditEntry: AuditLogEntry = {
        id: auditId,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        action: validatedData.action,
        userId: validatedData.userId,
        parentId: validatedData.parentId,
        studentId: validatedData.studentId,
        details: encryptedDetails,
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        timestamp: validatedData.timestamp,
        severity: validatedData.severity,
        category: validatedData.category || this.categorizeAction(validatedData.action),
        correlationId,
        checksum: '', // Will be calculated
        encrypted
      };

      // Calculate integrity checksum
      auditEntry.checksum = this.calculateChecksum(auditEntry);

      // Store audit entry
      await this.storeAuditEntry(auditEntry);

      // Check for security anomalies
      await this.detectSecurityAnomalies(auditEntry);

      // Log to system logger for immediate monitoring
      this.logToSystemLogger(auditEntry);

      logger.debug('Audit action logged', { 
        auditId, 
        action: validatedData.action,
        entityType: validatedData.entityType 
      });

      return auditId;

    } catch (error) {
      logger.error('Error logging audit action:', error);
      // Don't throw - audit failures shouldn't break main functionality
      return '';
    }
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(queryParams: z.infer<typeof AuditQuerySchema>): Promise<{
    entries: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const validatedQuery = AuditQuerySchema.parse(queryParams);
      
      // Build query filters
      const filters = this.buildQueryFilters(validatedQuery);
      
      // Execute query
      const { entries, total } = await this.executeAuditQuery(filters, validatedQuery);
      
      // Decrypt details if requested and user has permission
      if (validatedQuery.includeDetails) {
        for (const entry of entries) {
          if (entry.encrypted) {
            try {
              entry.details = await this.encryptionService.decryptStudentData(entry.details as any);
              entry.encrypted = false;
            } catch (error) {
              logger.warn(`Failed to decrypt audit details for entry ${entry.id}:`, error);
            }
          }
        }
      }

      const hasMore = validatedQuery.offset + entries.length < total;

      return { entries, total, hasMore };

    } catch (error) {
      logger.error('Error querying audit logs:', error);
      throw new Error('Failed to query audit logs');
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    entityType?: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<AuditReport> {
    try {
      const reportId = crypto.randomUUID();
      
      // Query audit entries for the period
      const entries = await this.getAuditEntriesForPeriod(startDate, endDate, entityType);
      
      // Analyze entries
      const analysis = this.analyzeAuditEntries(entries);
      
      // Generate report
      const report: AuditReport = {
        id: reportId,
        title: `Compliance Report ${entityType ? `- ${entityType}` : ''}`,
        description: `Audit trail report for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
        generatedBy: 'system', // TODO: Get from context
        generatedAt: new Date(),
        period: { startDate, endDate },
        filters: { entityType },
        totalEntries: entries.length,
        categories: analysis.categories,
        topActions: analysis.topActions,
        securityAlerts: analysis.securityAlerts,
        complianceIssues: analysis.complianceIssues,
        exportFormat: format
      };

      // Export report in requested format
      if (format !== 'json') {
        report.filePath = await this.exportReport(report, entries, format);
      }

      // Log report generation
      await this.logAction({
        entityType: 'admin_action',
        entityId: reportId,
        action: 'create',
        userId: null, // TODO: Get from context
        details: {
          reportType: 'compliance',
          period: { startDate, endDate },
          totalEntries: entries.length,
          format
        },
        severity: 'low',
        category: 'compliance'
      });

      logger.info('Compliance report generated', { 
        reportId, 
        period: { startDate, endDate },
        totalEntries: entries.length 
      });

      return report;

    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Get audit trail for specific student (GDPR compliance)
   */
  async getStudentAuditTrail(studentId: string): Promise<AuditLogEntry[]> {
    try {
      const entries = await this.queryAuditLogs({
        studentId,
        includeDetails: true,
        limit: 1000
      });

      // Log access to student audit trail
      await this.logAction({
        entityType: 'student',
        entityId: studentId,
        action: 'read',
        userId: null, // TODO: Get from context
        details: {
          action: 'audit_trail_access',
          entriesReturned: entries.entries.length
        },
        severity: 'medium',
        category: 'data_access'
      });

      return entries.entries;

    } catch (error) {
      logger.error('Error getting student audit trail:', error);
      throw new Error('Failed to retrieve student audit trail');
    }
  }

  /**
   * Anonymize audit logs for a student
   */
  async anonymizeStudentAuditLogs(studentId: string, reason: string): Promise<number> {
    try {
      const entries = await this.queryAuditLogs({
        studentId,
        limit: 1000
      });

      let anonymizedCount = 0;

      for (const entry of entries.entries) {
        // Anonymize the entry
        const anonymizedEntry = await this.anonymizeAuditEntry(entry);
        await this.updateAuditEntry(anonymizedEntry);
        anonymizedCount++;
      }

      // Log anonymization action
      await this.logAction({
        entityType: 'student',
        entityId: studentId,
        action: 'anonymize',
        userId: null, // TODO: Get from context
        details: {
          action: 'audit_anonymization',
          entriesAnonymized: anonymizedCount,
          reason
        },
        severity: 'high',
        category: 'compliance'
      });

      logger.info('Student audit logs anonymized', { 
        studentId, 
        anonymizedCount, 
        reason 
      });

      return anonymizedCount;

    } catch (error) {
      logger.error('Error anonymizing student audit logs:', error);
      throw new Error('Failed to anonymize audit logs');
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyAuditIntegrity(auditId: string): Promise<{
    valid: boolean;
    originalChecksum: string;
    calculatedChecksum: string;
    tampering?: boolean;
  }> {
    try {
      const entry = await this.getAuditEntry(auditId);
      if (!entry) {
        throw new Error(`Audit entry not found: ${auditId}`);
      }

      const originalChecksum = entry.checksum;
      const calculatedChecksum = this.calculateChecksum({
        ...entry
      } as any);

      const valid = originalChecksum === calculatedChecksum;
      
      if (!valid) {
        logger.warn('Audit integrity check failed', { 
          auditId, 
          originalChecksum, 
          calculatedChecksum 
        });
      }

      return {
        valid,
        originalChecksum,
        calculatedChecksum,
        tampering: !valid
      };

    } catch (error) {
      logger.error('Error verifying audit integrity:', error);
      throw new Error('Failed to verify audit integrity');
    }
  }

  /**
   * Detect and alert on security anomalies
   */
  private async detectSecurityAnomalies(entry: AuditLogEntry): Promise<void> {
    try {
      const alerts: SecurityAlert[] = [];

      // Check for suspicious access patterns
      if (entry.action === 'read' && entry.entityType === 'student') {
        const recentAccesses = await this.getRecentStudentAccesses(entry.entityId, 24); // Last 24 hours
        if (recentAccesses.length > 10) {
          alerts.push({
            id: crypto.randomUUID(),
            type: 'suspicious_access',
            severity: 'medium',
            entityType: entry.entityType,
            entityId: entry.entityId,
            description: `Unusual number of accesses to student data (${recentAccesses.length} in 24h)`,
            detectedAt: new Date(),
            auditEntries: recentAccesses.map(a => a.id),
            resolved: false
          });
        }
      }

      // Check for failed login attempts
      if (entry.action === 'access_denied' && entry.entityType === 'user_session') {
        const failedLogins = await this.getFailedLoginAttempts(entry.ipAddress || '', 1); // Last hour
        if (failedLogins.length > 5) {
          alerts.push({
            id: crypto.randomUUID(),
            type: 'multiple_failed_logins',
            severity: 'high',
            entityType: 'user_session',
            entityId: entry.ipAddress || 'unknown',
            description: `Multiple failed login attempts from IP ${entry.ipAddress} (${failedLogins.length} attempts)`,
            detectedAt: new Date(),
            auditEntries: failedLogins.map(a => a.id),
            resolved: false
          });
        }
      }

      // Store and notify about alerts
      for (const alert of alerts) {
        await this.storeSecurityAlert(alert);
        await this.notifySecurityTeam(alert);
      }

    } catch (error) {
      logger.error('Error detecting security anomalies:', error);
    }
  }

  // Private helper methods
  private shouldEncryptDetails(action: string, entityType: string): boolean {
    // Encrypt details for sensitive actions or entities
    const sensitiveActions = ['create', 'update', 'export', 'read'];
    const sensitiveEntities = ['student', 'parent', 'parental_consent'];
    
    return sensitiveActions.includes(action) && sensitiveEntities.includes(entityType);
  }

  private categorizeAction(action: string): string {
    const categories: Record<string, string> = {
      'create': 'data_modification',
      'update': 'data_modification', 
      'delete': 'data_modification',
      'read': 'data_access',
      'export': 'data_access',
      'consent_given': 'consent_management',
      'consent_revoked': 'consent_management',
      'login': 'user_behavior',
      'logout': 'user_behavior',
      'access_denied': 'security',
      'encrypt': 'security',
      'decrypt': 'security',
      'key_generated': 'security',
      'anonymize': 'compliance'
    };
    
    return categories[action] || 'system';
  }

  private calculateChecksum(entry: Omit<AuditLogEntry, 'checksum'>): string {
    const dataString = JSON.stringify({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      timestamp: entry.timestamp.toISOString(),
      details: entry.details
    });
    
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private getOrCreateCorrelationId(userId: string | null): string {
    if (!userId) return crypto.randomUUID();
    
    let correlationId = this.sessionCorrelations.get(userId);
    if (!correlationId) {
      correlationId = crypto.randomUUID();
      this.sessionCorrelations.set(userId, correlationId);
    }
    
    return correlationId;
  }

  private logToSystemLogger(entry: AuditLogEntry): void {
    const logLevel = entry.severity === 'critical' ? 'error' : 
                    entry.severity === 'high' ? 'warn' : 'info';
    
    logger[logLevel](`AUDIT: ${entry.action} on ${entry.entityType}`, {
      auditId: entry.id,
      entityId: entry.entityId,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      timestamp: entry.timestamp
    });
  }

  private buildQueryFilters(query: z.infer<typeof AuditQuerySchema>): Record<string, any> {
    const filters: Record<string, any> = {};
    
    if (query.entityType) filters.entityType = query.entityType;
    if (query.entityId) filters.entityId = query.entityId;
    if (query.action) filters.action = query.action;
    if (query.userId) filters.userId = query.userId;
    if (query.studentId) filters.studentId = query.studentId;
    if (query.category) filters.category = query.category;
    if (query.severity) filters.severity = { $in: query.severity };
    if (query.startDate || query.endDate) {
      filters.timestamp = {};
      if (query.startDate) filters.timestamp.$gte = query.startDate;
      if (query.endDate) filters.timestamp.$lte = query.endDate;
    }
    
    return filters;
  }

  private analyzeAuditEntries(entries: AuditLogEntry[]): {
    categories: Record<string, number>;
    topActions: Array<{ action: string; count: number }>;
    securityAlerts: number;
    complianceIssues: string[];
  } {
    const categories: Record<string, number> = {};
    const actions: Record<string, number> = {};
    let securityAlerts = 0;
    const complianceIssues: string[] = [];

    for (const entry of entries) {
      // Count categories
      if (entry.category) {
        categories[entry.category] = (categories[entry.category] || 0) + 1;
      }

      // Count actions
      actions[entry.action] = (actions[entry.action] || 0) + 1;

      // Count security alerts
      if (entry.severity === 'high' || entry.severity === 'critical') {
        securityAlerts++;
      }

      // Check for compliance issues
      if (entry.action === 'access_denied') {
        complianceIssues.push(`Unauthorized access attempt on ${entry.entityType} ${entry.entityId}`);
      }
    }

    // Sort top actions
    const topActions = Object.entries(actions)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { categories, topActions, securityAlerts, complianceIssues };
  }

  private async anonymizeAuditEntry(entry: AuditLogEntry): Promise<AuditLogEntry> {
    // Replace sensitive information with anonymized values
    const anonymized = { ...entry };
    
    if (anonymized.details) {
      // Anonymize personal information in details
      anonymized.details = this.anonymizeDetails(anonymized.details);
    }
    
    // Remove IP address and user agent for anonymization
    delete anonymized.ipAddress;
    delete anonymized.userAgent;
    
    // Recalculate checksum
    anonymized.checksum = this.calculateChecksum(anonymized);
    
    return anonymized;
  }

  private anonymizeDetails(details: any): any {
    if (typeof details !== 'object' || details === null) {
      return details;
    }

    const anonymized = { ...details };
    const sensitiveFields = ['name', 'email', 'parentEmail', 'childName', 'parentName'];
    
    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = '[ANONYMIZED]';
      }
    }
    
    return anonymized;
  }

  private async initializeAuditSystem(): Promise<void> {
    // Initialize audit database tables, indexes, etc.
    logger.info('Audit trail system initialized');
  }

  // Database methods (implement with your DB layer)
  private async storeAuditEntry(entry: AuditLogEntry): Promise<void> {
    // TODO: Implement database storage
  }

  private async executeAuditQuery(filters: Record<string, any>, query: z.infer<typeof AuditQuerySchema>): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    // TODO: Implement database query
    return { entries: [], total: 0 };
  }

  private async getAuditEntry(auditId: string): Promise<AuditLogEntry | null> {
    // TODO: Implement database query
    return null;
  }

  private async updateAuditEntry(entry: AuditLogEntry): Promise<void> {
    // TODO: Implement database update
  }

  private async getAuditEntriesForPeriod(startDate: Date, endDate: Date, entityType?: string): Promise<AuditLogEntry[]> {
    // TODO: Implement database query
    return [];
  }

  private async getRecentStudentAccesses(studentId: string, hours: number): Promise<AuditLogEntry[]> {
    // TODO: Implement database query
    return [];
  }

  private async getFailedLoginAttempts(ipAddress: string, hours: number): Promise<AuditLogEntry[]> {
    // TODO: Implement database query
    return [];
  }

  private async storeSecurityAlert(alert: SecurityAlert): Promise<void> {
    // TODO: Implement security alert storage
  }

  private async notifySecurityTeam(alert: SecurityAlert): Promise<void> {
    // TODO: Implement security team notification
  }

  private async exportReport(report: AuditReport, entries: AuditLogEntry[], format: string): Promise<string> {
    // TODO: Implement report export
    return '';
  }
}