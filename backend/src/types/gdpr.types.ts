// GDPR Types integrated with existing system

export interface ParentalConsentRecord {
  id: string;
  parentEmail: string;
  parentName: string;
  childName: string;
  childAge: number;
  consentTypes: ConsentType[];
  status: ConsentStatus;
  firstConsentToken: string;
  secondConsentToken?: string;
  firstConsentDate?: Date;
  secondConsentDate?: Date;
  verificationDate?: Date;
  expiryDate: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsentType = 
  | 'data_processing'
  | 'educational_content'
  | 'progress_tracking'
  | 'communication'
  | 'analytics'
  | 'marketing';

export type ConsentStatus = 
  | 'pending'
  | 'verified'
  | 'expired'
  | 'revoked';

export interface GDPRRequestRecord {
  id: string;
  requestType: GDPRRequestType;
  requesterType: RequesterType;
  requesterEmail: string;
  requesterName: string;
  studentId?: number;
  studentName?: string;
  parentEmail?: string;
  requestDetails: string;
  urgentRequest: boolean;
  status: RequestStatus;
  priority: Priority;
  submittedAt: Date;
  dueDate: Date;
  verificationToken?: string;
  verifiedAt?: Date;
  assignedTo?: string;
  processedAt?: Date;
  completedAt?: Date;
  ipAddress: string;
  userAgent: string;
  verificationMethod: VerificationMethod;
  legalBasis?: string;
  responseDetails?: string;
  actionsTaken: string[];
  exportedData?: any;
}

export type GDPRRequestType = 
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restriction'
  | 'portability'
  | 'objection'
  | 'withdraw_consent';

export type RequesterType = 
  | 'parent'
  | 'student'
  | 'legal_guardian'
  | 'data_protection_officer';

export type RequestStatus = 
  | 'pending'
  | 'under_review'
  | 'verification_required'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'expired';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type VerificationMethod = 
  | 'email'
  | 'identity_document'
  | 'parental_verification';

export interface AuditLogRecord {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  userId?: string;
  parentId?: string;
  studentId?: number;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: Severity;
  category?: AuditCategory;
  sessionId?: string;
  correlationId?: string;
  checksum: string;
  encrypted: boolean;
}

export type EntityType =
  | 'student'
  | 'parent'
  | 'exercise'
  | 'progress'
  | 'parental_consent'
  | 'gdpr_request'
  | 'data_export'
  | 'encryption'
  | 'key_rotation'
  | 'key_revocation'
  | 'user_session'
  | 'admin_action';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'anonymize'
  | 'consent_given'
  | 'consent_revoked'
  | 'login'
  | 'logout'
  | 'access_denied'
  | 'encrypt'
  | 'decrypt'
  | 'key_generated'
  | 'key_rotated'
  | 'emergency_revoked'
  | 'data_retention_applied'
  | 'first_consent'
  | 'second_consent'
  | 'verified'
  | 'completed';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type AuditCategory =
  | 'data_access'
  | 'data_modification'
  | 'consent_management'
  | 'security'
  | 'compliance'
  | 'system'
  | 'user_behavior';

export interface EncryptionKeyRecord {
  id: string;
  keyData: string; // Encrypted key
  algorithm: string;
  version: number;
  usage: KeyUsage;
  status: KeyStatus;
  createdAt: Date;
  expiresAt: Date;
}

export type KeyUsage = 
  | 'student_data'
  | 'sensitive_fields'
  | 'audit_logs'
  | 'exports';

export type KeyStatus = 
  | 'active'
  | 'rotation_pending'
  | 'deprecated'
  | 'revoked';

export interface RetentionPolicyRecord {
  id: string;
  policyName: string;
  entityType: string;
  retentionPeriodDays: number;
  triggerCondition: TriggerCondition;
  action: RetentionAction;
  priority: Priority;
  active: boolean;
  legalBasis?: string;
  exceptions: string[];
  notificationDays: number;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  recordsProcessed: number;
}

export type TriggerCondition = 
  | 'time_based'
  | 'event_based'
  | 'consent_withdrawal'
  | 'account_deletion';

export type RetentionAction = 
  | 'delete'
  | 'anonymize'
  | 'archive'
  | 'notify_only';

export interface ConsentPreferencesRecord {
  id: string;
  userId?: string;
  studentId?: number;
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  version: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// API Request/Response types
export interface SubmitConsentRequest {
  parentEmail: string;
  parentName: string;
  childName: string;
  childAge: number;
  consentTypes: ConsentType[];
  ipAddress: string;
  userAgent: string;
}

export interface SubmitConsentResponse {
  consentId: string;
  message: string;
}

export interface SubmitGDPRRequest {
  requestType: GDPRRequestType;
  requesterType: RequesterType;
  requesterEmail: string;
  requesterName: string;
  studentId?: number;
  studentName?: string;
  parentEmail?: string;
  requestDetails: string;
  urgentRequest: boolean;
  verificationMethod: VerificationMethod;
  legalBasis?: string;
  ipAddress: string;
  userAgent: string;
}

export interface SubmitGDPRResponse {
  requestId: string;
  verificationRequired: boolean;
  estimatedCompletionDate: Date;
}

export interface ConsentPreferencesRequest {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface AuditLogRequest {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  userId?: string;
  parentId?: string;
  studentId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: Severity;
  category?: AuditCategory;
}

// Database integration types with existing schema
export interface StudentWithGDPR {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: string;
  niveauActuel: string;
  totalPoints: number;
  serieJours: number;
  mascotteType: string;
  dernierAcces?: string;
  estConnecte: boolean;
  createdAt: string;
  updatedAt: string;
  // GDPR related
  consentRecord?: ParentalConsentRecord;
  gdprRequests?: GDPRRequestRecord[];
  auditLogs?: AuditLogRecord[];
  retentionStatus?: {
    nextRetentionDate?: Date;
    applicablePolicies: string[];
  };
}