import { FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export interface SecurityIncident {
  id: string;
  timestamp: Date;
  type: SecurityIncidentType;
  severity: SecuritySeverity;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
    country?: string;
  };
  target: {
    route: string;
    method: string;
    endpoint?: string;
  };
  details: {
    description: string;
    payload?: any;
    headers?: Record<string, string>;
    response?: {
      status: number;
      blocked: boolean;
    };
  };
  metadata: {
    requestId?: string;
    ruleId?: string;
    component: SecurityComponent;
    automated: boolean;
  };
}

export enum SecurityIncidentType {
  // Input validation
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION = 'SQL_INJECTION',
  NOSQL_INJECTION = 'NOSQL_INJECTION',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  
  // Authentication & Authorization
  FAILED_LOGIN = 'FAILED_LOGIN',
  BRUTE_FORCE = 'BRUTE_FORCE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  
  // Rate limiting & DoS
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DDoS_ATTEMPT = 'DDOS_ATTEMPT',
  SUSPICIOUS_BEHAVIOR = 'SUSPICIOUS_BEHAVIOR',
  
  // CSRF & Session
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
  SESSION_FIXATION = 'SESSION_FIXATION',
  
  // File upload
  MALICIOUS_FILE = 'MALICIOUS_FILE',
  FILE_SIZE_VIOLATION = 'FILE_SIZE_VIOLATION',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // Data protection
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  GDPR_VIOLATION = 'GDPR_VIOLATION',
  PII_EXPOSURE = 'PII_EXPOSURE',
  
  // Network & Infrastructure
  IP_BLOCKED = 'IP_BLOCKED',
  GEO_BLOCKED = 'GEO_BLOCKED',
  VPN_DETECTED = 'VPN_DETECTED',
  BOT_DETECTED = 'BOT_DETECTED',
  
  // Configuration & Policy
  SECURITY_POLICY_VIOLATION = 'SECURITY_POLICY_VIOLATION',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Generic
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  UNKNOWN_THREAT = 'UNKNOWN_THREAT'
}

export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum SecurityComponent {
  INPUT_SANITIZATION = 'INPUT_SANITIZATION',
  CSRF_PROTECTION = 'CSRF_PROTECTION',
  RATE_LIMITING = 'RATE_LIMITING',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  FILE_UPLOAD = 'FILE_UPLOAD',
  CORS = 'CORS',
  SECURITY_HEADERS = 'SECURITY_HEADERS',
  GDPR = 'GDPR',
  FIREWALL = 'FIREWALL',
  MONITORING = 'MONITORING'
}

export interface SecurityMetrics {
  totalIncidents: number;
  incidentsByType: Record<SecurityIncidentType, number>;
  incidentsBySeverity: Record<SecuritySeverity, number>;
  incidentsByComponent: Record<SecurityComponent, number>;
  topAttackerIPs: Array<{ ip: string; count: number; country?: string }>;
  topTargetRoutes: Array<{ route: string; count: number }>;
  timelineData: Array<{ timestamp: Date; count: number; severity: SecuritySeverity }>;
  blockingEffectiveness: {
    totalRequests: number;
    blockedRequests: number;
    blockingRate: number;
  };
}

export interface SecurityAuditOptions {
  logToFile?: boolean;
  logDirectory?: string;
  maxLogFiles?: number;
  maxFileSize?: number;
  enableRealTimeAlerts?: boolean;
  alertThresholds?: {
    [key in SecurityIncidentType]?: {
      count: number;
      timeWindow: number; // milliseconds
    };
  };
  retentionDays?: number;
  enableMetrics?: boolean;
  metricsInterval?: number;
}

export class SecurityAuditService {
  private options: SecurityAuditOptions;
  private incidents: Map<string, SecurityIncident> = new Map();
  private recentIncidents: SecurityIncident[] = [];
  private alertCounters: Map<string, { count: number; firstSeen: Date }> = new Map();
  private metricsInterval?: NodeJS.Timeout;

  constructor(options: SecurityAuditOptions = {}) {
    this.options = {
      logToFile: true,
      logDirectory: './logs/security',
      maxLogFiles: 30,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      enableRealTimeAlerts: true,
      alertThresholds: {
        [SecurityIncidentType.XSS_ATTEMPT]: { count: 5, timeWindow: 5 * 60 * 1000 },
        [SecurityIncidentType.SQL_INJECTION]: { count: 3, timeWindow: 5 * 60 * 1000 },
        [SecurityIncidentType.BRUTE_FORCE]: { count: 10, timeWindow: 10 * 60 * 1000 },
        [SecurityIncidentType.RATE_LIMIT_EXCEEDED]: { count: 20, timeWindow: 15 * 60 * 1000 },
        [SecurityIncidentType.FAILED_LOGIN]: { count: 15, timeWindow: 15 * 60 * 1000 }
      },
      retentionDays: 90,
      enableMetrics: true,
      metricsInterval: 60 * 1000, // 1 minute
      ...options
    };

    this.initializeLogging();
    this.startMetricsCollection();
  }

  /**
   * Log a security incident
   */
  async logIncident(
    type: SecurityIncidentType,
    severity: SecuritySeverity,
    component: SecurityComponent,
    request: FastifyRequest,
    details: {
      description: string;
      payload?: any;
      ruleId?: string;
      blocked?: boolean;
      metadata?: any;
    }
  ): Promise<string> {
    const incidentId = this.generateIncidentId();
    
    const incident: SecurityIncident = {
      id: incidentId,
      timestamp: new Date(),
      type,
      severity,
      source: {
        ip: request.ip,
        userAgent: request.headers['user-agent'] as string,
        userId: (request as any).user?.id,
        sessionId: (request as any).session?.id || request.headers['x-session-id'] as string,
        country: this.getCountryFromIP(request.ip)
      },
      target: {
        route: request.routeOptions?.url || request.url,
        method: request.method,
        endpoint: `${request.method} ${request.url}`
      },
      details: {
        description: details.description,
        payload: details.payload,
        headers: this.sanitizeHeaders(request.headers),
        response: {
          status: 0, // Will be updated later if needed
          blocked: details.blocked || false
        }
      },
      metadata: {
        requestId: (request as any).id,
        ruleId: details.ruleId,
        component,
        automated: true
      }
    };

    // Store incident
    this.incidents.set(incidentId, incident);
    this.recentIncidents.push(incident);

    // Maintain recent incidents list size
    if (this.recentIncidents.length > 10000) {
      this.recentIncidents = this.recentIncidents.slice(-5000);
    }

    // Log to application logger
    logger.warn('Security incident detected', {
      incidentId,
      type,
      severity,
      component,
      ip: incident.source.ip,
      route: incident.target.route,
      description: details.description
    });

    // Log to file if enabled
    if (this.options.logToFile) {
      await this.logToFile(incident);
    }

    // Check for real-time alerts
    if (this.options.enableRealTimeAlerts) {
      await this.checkAlertThresholds(type, incident);
    }

    return incidentId;
  }

  /**
   * Log a manual security incident
   */
  async logManualIncident(
    type: SecurityIncidentType,
    severity: SecuritySeverity,
    component: SecurityComponent,
    description: string,
    metadata: any = {}
  ): Promise<string> {
    const incidentId = this.generateIncidentId();
    
    const incident: SecurityIncident = {
      id: incidentId,
      timestamp: new Date(),
      type,
      severity,
      source: {
        ip: 'manual',
        userAgent: metadata.userAgent,
        userId: metadata.userId,
        sessionId: metadata.sessionId
      },
      target: {
        route: metadata.route || 'manual',
        method: metadata.method || 'MANUAL',
        endpoint: metadata.endpoint
      },
      details: {
        description,
        payload: metadata.payload,
        response: {
          status: 0,
          blocked: false
        }
      },
      metadata: {
        component,
        automated: false,
        ...metadata
      }
    };

    this.incidents.set(incidentId, incident);
    this.recentIncidents.push(incident);

    if (this.options.logToFile) {
      await this.logToFile(incident);
    }

    logger.info('Manual security incident logged', {
      incidentId,
      type,
      severity,
      component,
      description
    });

    return incidentId;
  }

  /**
   * Get security metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
    let incidents = Array.from(this.incidents.values());

    // Filter by time range if provided
    if (timeRange) {
      incidents = incidents.filter(incident => 
        incident.timestamp >= timeRange.start && incident.timestamp <= timeRange.end
      );
    }

    // Calculate metrics
    const totalIncidents = incidents.length;
    
    const incidentsByType: Record<SecurityIncidentType, number> = {} as any;
    const incidentsBySeverity: Record<SecuritySeverity, number> = {} as any;
    const incidentsByComponent: Record<SecurityComponent, number> = {} as any;
    
    // Initialize counters
    Object.values(SecurityIncidentType).forEach(type => incidentsByType[type] = 0);
    Object.values(SecuritySeverity).forEach(severity => incidentsBySeverity[severity] = 0);
    Object.values(SecurityComponent).forEach(component => incidentsByComponent[component] = 0);

    const ipCounts: Record<string, number> = {};
    const routeCounts: Record<string, number> = {};
    let blockedCount = 0;

    incidents.forEach(incident => {
      incidentsByType[incident.type]++;
      incidentsBySeverity[incident.severity]++;
      incidentsByComponent[incident.metadata.component]++;

      // Count IPs
      if (incident.source.ip !== 'manual') {
        ipCounts[incident.source.ip] = (ipCounts[incident.source.ip] || 0) + 1;
      }

      // Count routes
      routeCounts[incident.target.route] = (routeCounts[incident.target.route] || 0) + 1;

      // Count blocked requests
      if (incident.details.response?.blocked) {
        blockedCount++;
      }
    });

    // Top attacker IPs
    const topAttackerIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count, country: this.getCountryFromIP(ip) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top target routes
    const topTargetRoutes = Object.entries(routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Timeline data (last 24 hours in hourly buckets)
    const timelineData = this.generateTimelineData(incidents);

    return {
      totalIncidents,
      incidentsByType,
      incidentsBySeverity,
      incidentsByComponent,
      topAttackerIPs,
      topTargetRoutes,
      timelineData,
      blockingEffectiveness: {
        totalRequests: totalIncidents,
        blockedRequests: blockedCount,
        blockingRate: totalIncidents > 0 ? (blockedCount / totalIncidents) * 100 : 0
      }
    };
  }

  /**
   * Get incidents by criteria
   */
  getIncidents(criteria: {
    type?: SecurityIncidentType;
    severity?: SecuritySeverity;
    component?: SecurityComponent;
    ip?: string;
    userId?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
    offset?: number;
  } = {}): SecurityIncident[] {
    let incidents = Array.from(this.incidents.values());

    // Apply filters
    if (criteria.type) {
      incidents = incidents.filter(i => i.type === criteria.type);
    }
    if (criteria.severity) {
      incidents = incidents.filter(i => i.severity === criteria.severity);
    }
    if (criteria.component) {
      incidents = incidents.filter(i => i.metadata.component === criteria.component);
    }
    if (criteria.ip) {
      incidents = incidents.filter(i => i.source.ip === criteria.ip);
    }
    if (criteria.userId) {
      incidents = incidents.filter(i => i.source.userId === criteria.userId);
    }
    if (criteria.timeRange) {
      incidents = incidents.filter(i => 
        i.timestamp >= criteria.timeRange!.start && i.timestamp <= criteria.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    incidents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 100;
    return incidents.slice(offset, offset + limit);
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): SecurityIncident | null {
    return this.incidents.get(id) || null;
  }

  /**
   * Check if IP is suspicious based on recent incidents
   */
  isIPSuspicious(ip: string, timeWindow: number = 60 * 60 * 1000): boolean {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentIncidents = this.recentIncidents.filter(incident => 
      incident.source.ip === ip && incident.timestamp >= cutoff
    );

    return recentIncidents.length >= 10 || 
           recentIncidents.some(incident => 
             incident.severity === SecuritySeverity.CRITICAL ||
             incident.type === SecurityIncidentType.BRUTE_FORCE
           );
  }

  /**
   * Generate security report
   */
  generateReport(timeRange: { start: Date; end: Date }): {
    summary: SecurityMetrics;
    topThreats: SecurityIncident[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics(timeRange);
    const incidents = this.getIncidents({ timeRange, limit: 1000 });

    // Get top threats (critical incidents)
    const topThreats = incidents
      .filter(i => i.severity === SecuritySeverity.CRITICAL)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, incidents);

    return {
      summary: metrics,
      topThreats,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private generateIncidentId(): string {
    return `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCountryFromIP(ip: string): string | undefined {
    // Placeholder - would use GeoIP service in real implementation
    return 'Unknown';
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      'user-agent', 'accept', 'accept-language', 'accept-encoding',
      'referer', 'origin', 'x-forwarded-for', 'x-real-ip'
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (allowedHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
        sanitized[key] = value.substring(0, 1000); // Limit length
      }
    }

    return sanitized;
  }

  private async initializeLogging(): Promise<void> {
    if (this.options.logToFile && this.options.logDirectory) {
      try {
        await fs.mkdir(this.options.logDirectory, { recursive: true });
      } catch (error) {
        logger.error('Failed to create security log directory:', error);
      }
    }
  }

  private async logToFile(incident: SecurityIncident): Promise<void> {
    if (!this.options.logDirectory) return;

    try {
      const logFile = path.join(
        this.options.logDirectory,
        `security-${incident.timestamp.toISOString().split('T')[0]}.json`
      );

      const logEntry = JSON.stringify(incident) + '\n';
      await fs.appendFile(logFile, logEntry, 'utf8');
    } catch (error) {
      logger.error('Failed to write security log:', error);
    }
  }

  private async checkAlertThresholds(
    type: SecurityIncidentType,
    incident: SecurityIncident
  ): Promise<void> {
    const threshold = this.options.alertThresholds?.[type];
    if (!threshold) return;

    const key = `${type}:${incident.source.ip}`;
    const now = new Date();
    const existing = this.alertCounters.get(key);

    if (existing) {
      const timeElapsed = now.getTime() - existing.firstSeen.getTime();
      if (timeElapsed <= threshold.timeWindow) {
        existing.count++;
        if (existing.count >= threshold.count) {
          await this.triggerAlert(type, incident, existing.count);
          this.alertCounters.delete(key); // Reset counter after alert
        }
      } else {
        // Reset counter if window expired
        this.alertCounters.set(key, { count: 1, firstSeen: now });
      }
    } else {
      this.alertCounters.set(key, { count: 1, firstSeen: now });
    }
  }

  private async triggerAlert(
    type: SecurityIncidentType,
    incident: SecurityIncident,
    count: number
  ): Promise<void> {
    logger.error('Security alert triggered', {
      type,
      incidentCount: count,
      ip: incident.source.ip,
      severity: incident.severity,
      component: incident.metadata.component
    });

    // Here you would integrate with alerting systems (email, Slack, PagerDuty, etc.)
  }

  private generateTimelineData(incidents: SecurityIncident[]): Array<{
    timestamp: Date;
    count: number;
    severity: SecuritySeverity;
  }> {
    const buckets: Record<string, Record<SecuritySeverity, number>> = {};
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Initialize hourly buckets
    for (let i = 0; i < 24; i++) {
      const bucketTime = new Date(oneDayAgo.getTime() + i * 60 * 60 * 1000);
      const key = bucketTime.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      buckets[key] = {
        [SecuritySeverity.LOW]: 0,
        [SecuritySeverity.MEDIUM]: 0,
        [SecuritySeverity.HIGH]: 0,
        [SecuritySeverity.CRITICAL]: 0
      };
    }

    // Fill buckets with incident data
    incidents
      .filter(incident => incident.timestamp >= oneDayAgo)
      .forEach(incident => {
        const key = incident.timestamp.toISOString().substring(0, 13);
        if (buckets[key]) {
          buckets[key][incident.severity]++;
        }
      });

    // Convert to timeline format
    return Object.entries(buckets).map(([timeKey, severityCounts]) => {
      const totalCount = Object.values(severityCounts).reduce((sum, count) => sum + count, 0);
      const highestSeverity = Object.entries(severityCounts)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => {
          const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return severityOrder[b as SecuritySeverity] - severityOrder[a as SecuritySeverity];
        })[0]?.[0] as SecuritySeverity || SecuritySeverity.LOW;

      return {
        timestamp: new Date(timeKey + ':00:00.000Z'),
        count: totalCount,
        severity: highestSeverity
      };
    });
  }

  private generateRecommendations(
    metrics: SecurityMetrics,
    incidents: SecurityIncident[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for high XSS attempts
    if (metrics.incidentsByType[SecurityIncidentType.XSS_ATTEMPT] > 10) {
      recommendations.push('Consider strengthening input sanitization and XSS protection');
    }

    // Check for SQL injection attempts
    if (metrics.incidentsByType[SecurityIncidentType.SQL_INJECTION] > 5) {
      recommendations.push('Review database query sanitization and consider using parameterized queries');
    }

    // Check for rate limiting effectiveness
    if (metrics.blockingEffectiveness.blockingRate < 50) {
      recommendations.push('Review rate limiting rules - low blocking effectiveness detected');
    }

    // Check for top attacker IPs
    if (metrics.topAttackerIPs.length > 0 && metrics.topAttackerIPs[0].count > 20) {
      recommendations.push(`Consider blocking IP ${metrics.topAttackerIPs[0].ip} - high incident count`);
    }

    // Check for authentication issues
    const authIssues = metrics.incidentsByType[SecurityIncidentType.FAILED_LOGIN] +
                      metrics.incidentsByType[SecurityIncidentType.BRUTE_FORCE];
    if (authIssues > 50) {
      recommendations.push('Implement stronger authentication measures and account lockout policies');
    }

    return recommendations;
  }

  private startMetricsCollection(): void {
    if (!this.options.enableMetrics) return;

    this.metricsInterval = setInterval(() => {
      const metrics = this.getMetrics();
      logger.info('Security metrics snapshot', {
        totalIncidents: metrics.totalIncidents,
        recentIncidents: this.recentIncidents.length,
        criticalIncidents: metrics.incidentsBySeverity[SecuritySeverity.CRITICAL],
        blockingRate: metrics.blockingEffectiveness.blockingRate
      });
    }, this.options.metricsInterval);
  }

  /**
   * Cleanup old incidents and logs
   */
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - this.options.retentionDays! * 24 * 60 * 60 * 1000);
    
    // Remove old incidents from memory
    let removedCount = 0;
    for (const [id, incident] of this.incidents.entries()) {
      if (incident.timestamp < cutoff) {
        this.incidents.delete(id);
        removedCount++;
      }
    }

    // Clean up recent incidents array
    this.recentIncidents = this.recentIncidents.filter(
      incident => incident.timestamp >= cutoff
    );

    if (removedCount > 0) {
      logger.info('Security audit cleanup completed', {
        removedIncidents: removedCount,
        remainingIncidents: this.incidents.size
      });
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.incidents.clear();
    this.recentIncidents = [];
    this.alertCounters.clear();
    
    logger.info('Security audit service shutdown');
  }
}