import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { 
  students, 
  parentalConsent, 
  gdprRequests, 
  auditLogs, 
  encryptionKeys, 
  retentionPolicies, 
  consentPreferences 
} from '../db/schema';
import { eq, and, or, desc, asc, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

describe('GDPR Database Operations', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:');
    db = drizzle(sqlite);
    
    // Create tables
    await createTables();
  });

  afterAll(async () => {
    sqlite.close();
  });

  beforeEach(async () => {
    // Clean all tables before each test
    await cleanTables();
  });

  async function createTables() {
    // Create students table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prenom TEXT NOT NULL,
        nom TEXT NOT NULL,
        date_naissance TEXT NOT NULL,
        niveau_actuel TEXT NOT NULL,
        total_points INTEGER DEFAULT 0,
        serie_jours INTEGER DEFAULT 0,
        mascotte_type TEXT DEFAULT 'dragon',
        dernier_acces TEXT,
        est_connecte INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create parental consent table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS parental_consent (
        id TEXT PRIMARY KEY,
        parent_email TEXT NOT NULL,
        parent_name TEXT NOT NULL,
        child_name TEXT NOT NULL,
        child_age INTEGER NOT NULL,
        consent_types TEXT NOT NULL,
        status TEXT NOT NULL,
        first_consent_token TEXT NOT NULL,
        second_consent_token TEXT,
        first_consent_date TEXT,
        second_consent_date TEXT,
        verification_date TEXT,
        expiry_date TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create GDPR requests table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS gdpr_requests (
        id TEXT PRIMARY KEY,
        request_type TEXT NOT NULL,
        requester_type TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        requester_name TEXT NOT NULL,
        student_id INTEGER REFERENCES students(id),
        student_name TEXT,
        parent_email TEXT,
        request_details TEXT NOT NULL,
        urgent_request INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        due_date TEXT NOT NULL,
        verification_token TEXT,
        verified_at TEXT,
        assigned_to TEXT,
        processed_at TEXT,
        completed_at TEXT,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        verification_method TEXT NOT NULL,
        legal_basis TEXT,
        response_details TEXT,
        actions_taken TEXT,
        exported_data TEXT
      )
    `);

    // Create audit logs table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        parent_id TEXT,
        student_id INTEGER REFERENCES students(id),
        details TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT,
        session_id TEXT,
        correlation_id TEXT,
        checksum TEXT NOT NULL,
        encrypted INTEGER DEFAULT 0
      )
    `);

    // Create encryption keys table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id TEXT PRIMARY KEY,
        key_data TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        version INTEGER NOT NULL,
        usage TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `);

    // Create retention policies table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS retention_policies (
        id TEXT PRIMARY KEY,
        policy_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        retention_period_days INTEGER NOT NULL,
        trigger_condition TEXT NOT NULL,
        action TEXT NOT NULL,
        priority TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        legal_basis TEXT,
        exceptions TEXT,
        notification_days INTEGER DEFAULT 30,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_executed TEXT,
        records_processed INTEGER DEFAULT 0
      )
    `);

    // Create consent preferences table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS consent_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        student_id INTEGER REFERENCES students(id),
        essential INTEGER DEFAULT 1,
        functional INTEGER DEFAULT 0,
        analytics INTEGER DEFAULT 0,
        marketing INTEGER DEFAULT 0,
        personalization INTEGER DEFAULT 0,
        version TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT
      )
    `);
  }

  async function cleanTables() {
    const tables = [
      'consent_preferences',
      'retention_policies', 
      'encryption_keys',
      'audit_logs',
      'gdpr_requests',
      'parental_consent',
      'students'
    ];
    
    for (const table of tables) {
      sqlite.exec(`DELETE FROM ${table}`);
    }
  }

  describe('Students Table Operations', () => {
    it('should insert and retrieve student records', async () => {
      const now = new Date().toISOString();
      const studentData = {
        prenom: 'Alice',
        nom: 'Dupont',
        dateNaissance: '2015-01-01',
        niveauActuel: 'CP',
        totalPoints: 150,
        serieJours: 5,
        mascotteType: 'dragon',
        estConnecte: false,
        createdAt: now,
        updatedAt: now
      };

      const [insertedStudent] = await db.insert(students).values(studentData).returning();
      expect(insertedStudent.id).toBeTypeOf('number');
      expect(insertedStudent.prenom).toBe('Alice');

      const retrievedStudent = await db.select().from(students).where(eq(students.id, insertedStudent.id));
      expect(retrievedStudent).toHaveLength(1);
      expect(retrievedStudent[0].prenom).toBe('Alice');
      expect(retrievedStudent[0].totalPoints).toBe(150);
    });

    it('should update student records', async () => {
      const now = new Date().toISOString();
      const [student] = await db.insert(students).values({
        prenom: 'Bob',
        nom: 'Martin',
        dateNaissance: '2014-06-15',
        niveauActuel: 'CE1',
        createdAt: now,
        updatedAt: now
      }).returning();

      await db.update(students)
        .set({ 
          totalPoints: 200, 
          serieJours: 10,
          updatedAt: new Date().toISOString()
        })
        .where(eq(students.id, student.id));

      const [updatedStudent] = await db.select().from(students).where(eq(students.id, student.id));
      expect(updatedStudent.totalPoints).toBe(200);
      expect(updatedStudent.serieJours).toBe(10);
    });

    it('should delete student records', async () => {
      const now = new Date().toISOString();
      const [student] = await db.insert(students).values({
        prenom: 'Charlie',
        nom: 'Brown',
        dateNaissance: '2016-03-20',
        niveauActuel: 'CP',
        createdAt: now,
        updatedAt: now
      }).returning();

      await db.delete(students).where(eq(students.id, student.id));

      const deletedStudent = await db.select().from(students).where(eq(students.id, student.id));
      expect(deletedStudent).toHaveLength(0);
    });
  });

  describe('Parental Consent Operations', () => {
    it('should create parental consent record', async () => {
      const now = new Date().toISOString();
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const consentData = {
        id: uuidv4(),
        parentEmail: 'parent@example.com',
        parentName: 'John Parent',
        childName: 'Alice Child',
        childAge: 8,
        consentTypes: JSON.stringify(['data_processing', 'educational_tracking']),
        status: 'pending',
        firstConsentToken: uuidv4(),
        expiryDate,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: now,
        updatedAt: now
      };

      const [inserted] = await db.insert(parentalConsent).values(consentData).returning();
      expect(inserted.id).toBe(consentData.id);
      expect(inserted.parentEmail).toBe('parent@example.com');
      expect(inserted.status).toBe('pending');
    });

    it('should update consent status through verification flow', async () => {
      const now = new Date().toISOString();
      const [consent] = await db.insert(parentalConsent).values({
        id: uuidv4(),
        parentEmail: 'parent@example.com',
        parentName: 'John Parent',
        childName: 'Alice Child',
        childAge: 8,
        consentTypes: JSON.stringify(['data_processing']),
        status: 'pending',
        firstConsentToken: uuidv4(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: now,
        updatedAt: now
      }).returning();

      // First consent verification
      const firstConsentDate = new Date().toISOString();
      await db.update(parentalConsent)
        .set({
          firstConsentDate,
          secondConsentToken: uuidv4(),
          status: 'first_verified',
          updatedAt: new Date().toISOString()
        })
        .where(eq(parentalConsent.id, consent.id));

      // Second consent verification
      const secondConsentDate = new Date().toISOString();
      await db.update(parentalConsent)
        .set({
          secondConsentDate,
          verificationDate: secondConsentDate,
          status: 'verified',
          updatedAt: new Date().toISOString()
        })
        .where(eq(parentalConsent.id, consent.id));

      const [verifiedConsent] = await db.select().from(parentalConsent).where(eq(parentalConsent.id, consent.id));
      expect(verifiedConsent.status).toBe('verified');
      expect(verifiedConsent.firstConsentDate).toBeTruthy();
      expect(verifiedConsent.secondConsentDate).toBeTruthy();
    });

    it('should find consent records by email', async () => {
      const now = new Date().toISOString();
      const email = 'multi@example.com';
      
      // Create multiple consent records for same email
      const consents = [
        {
          id: uuidv4(),
          parentEmail: email,
          parentName: 'Parent One',
          childName: 'Child One',
          childAge: 7,
          consentTypes: JSON.stringify(['data_processing']),
          status: 'verified',
          firstConsentToken: uuidv4(),
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          parentEmail: email,
          parentName: 'Parent One',
          childName: 'Child Two',
          childAge: 9,
          consentTypes: JSON.stringify(['data_processing', 'analytics']),
          status: 'pending',
          firstConsentToken: uuidv4(),
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: now,
          updatedAt: now
        }
      ];

      await db.insert(parentalConsent).values(consents);

      const foundConsents = await db.select()
        .from(parentalConsent)
        .where(eq(parentalConsent.parentEmail, email));

      expect(foundConsents).toHaveLength(2);
      expect(foundConsents.map(c => c.childName)).toContain('Child One');
      expect(foundConsents.map(c => c.childName)).toContain('Child Two');
    });

    it('should handle consent expiry', async () => {
      const now = new Date().toISOString();
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      
      const [expiredConsent] = await db.insert(parentalConsent).values({
        id: uuidv4(),
        parentEmail: 'expired@example.com',
        parentName: 'Expired Parent',
        childName: 'Expired Child',
        childAge: 8,
        consentTypes: JSON.stringify(['data_processing']),
        status: 'pending',
        firstConsentToken: uuidv4(),
        expiryDate: expiredDate,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: now,
        updatedAt: now
      }).returning();

      // Find expired consents
      const expiredConsents = await db.select()
        .from(parentalConsent)
        .where(sql`${parentalConsent.expiryDate} < ${new Date().toISOString()}`);

      expect(expiredConsents).toHaveLength(1);
      expect(expiredConsents[0].id).toBe(expiredConsent.id);
    });
  });

  describe('GDPR Requests Operations', () => {
    let studentId: number;

    beforeEach(async () => {
      const now = new Date().toISOString();
      const [student] = await db.insert(students).values({
        prenom: 'Test',
        nom: 'Student',
        dateNaissance: '2015-01-01',
        niveauActuel: 'CP',
        createdAt: now,
        updatedAt: now
      }).returning();
      studentId = student.id;
    });

    it('should create GDPR access request', async () => {
      const now = new Date().toISOString();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const requestData = {
        id: uuidv4(),
        requestType: 'access',
        requesterType: 'parent',
        requesterEmail: 'parent@example.com',
        requesterName: 'John Parent',
        studentId,
        studentName: 'Test Student',
        parentEmail: 'parent@example.com',
        requestDetails: 'I would like to access all data about my child.',
        urgentRequest: false,
        status: 'pending',
        priority: 'medium',
        submittedAt: now,
        dueDate,
        verificationToken: uuidv4(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        verificationMethod: 'email'
      };

      const [inserted] = await db.insert(gdprRequests).values(requestData).returning();
      expect(inserted.id).toBe(requestData.id);
      expect(inserted.requestType).toBe('access');
      expect(inserted.studentId).toBe(studentId);
    });

    it('should update request status workflow', async () => {
      const now = new Date().toISOString();
      const [request] = await db.insert(gdprRequests).values({
        id: uuidv4(),
        requestType: 'rectification',
        requesterType: 'parent',
        requesterEmail: 'parent@example.com',
        requesterName: 'John Parent',
        requestDetails: 'Please correct my child\'s birth date.',
        urgentRequest: false,
        status: 'pending',
        priority: 'medium',
        submittedAt: now,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        verificationMethod: 'email'
      }).returning();

      // Verify request
      const verifiedAt = new Date().toISOString();
      await db.update(gdprRequests)
        .set({
          status: 'verified',
          verifiedAt
        })
        .where(eq(gdprRequests.id, request.id));

      // Assign to processor
      await db.update(gdprRequests)
        .set({
          status: 'under_review',
          assignedTo: 'processor@company.com'
        })
        .where(eq(gdprRequests.id, request.id));

      // Process request
      const processedAt = new Date().toISOString();
      await db.update(gdprRequests)
        .set({
          status: 'processed',
          processedAt,
          responseDetails: 'Birth date has been corrected.',
          actionsTaken: JSON.stringify(['updated_birth_date'])
        })
        .where(eq(gdprRequests.id, request.id));

      // Complete request
      const completedAt = new Date().toISOString();
      await db.update(gdprRequests)
        .set({
          status: 'completed',
          completedAt
        })
        .where(eq(gdprRequests.id, request.id));

      const [finalRequest] = await db.select().from(gdprRequests).where(eq(gdprRequests.id, request.id));
      expect(finalRequest.status).toBe('completed');
      expect(finalRequest.verifiedAt).toBeTruthy();
      expect(finalRequest.processedAt).toBeTruthy();
      expect(finalRequest.completedAt).toBeTruthy();
    });

    it('should handle urgent requests with higher priority', async () => {
      const now = new Date().toISOString();
      const urgentDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const [urgentRequest] = await db.insert(gdprRequests).values({
        id: uuidv4(),
        requestType: 'erasure',
        requesterType: 'parent',
        requesterEmail: 'urgent@example.com',
        requesterName: 'Urgent Parent',
        requestDetails: 'URGENT: Please delete all data immediately.',
        urgentRequest: true,
        status: 'pending',
        priority: 'urgent',
        submittedAt: now,
        dueDate: urgentDueDate,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        verificationMethod: 'identity_document'
      }).returning();

      expect(urgentRequest.urgentRequest).toBe(true);
      expect(urgentRequest.priority).toBe('urgent');
      
      // Verify due date is within 3 days
      const dueTime = new Date(urgentRequest.dueDate).getTime();
      const nowTime = new Date().getTime();
      const daysDiff = (dueTime - nowTime) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeLessThanOrEqual(3);
    });

    it('should query requests by various criteria', async () => {
      const now = new Date().toISOString();
      
      // Create multiple requests
      const requests = [
        {
          id: uuidv4(),
          requestType: 'access',
          requesterType: 'parent',
          requesterEmail: 'parent1@example.com',
          requesterName: 'Parent One',
          requestDetails: 'Access request 1',
          urgentRequest: false,
          status: 'pending',
          priority: 'medium',
          submittedAt: now,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          verificationMethod: 'email'
        },
        {
          id: uuidv4(),
          requestType: 'erasure',
          requesterType: 'parent',
          requesterEmail: 'parent2@example.com',
          requesterName: 'Parent Two',
          requestDetails: 'Erasure request 1',
          urgentRequest: true,
          status: 'completed',
          priority: 'urgent',
          submittedAt: now,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          verificationMethod: 'email'
        }
      ];

      await db.insert(gdprRequests).values(requests);

      // Query by status
      const pendingRequests = await db.select()
        .from(gdprRequests)
        .where(eq(gdprRequests.status, 'pending'));
      expect(pendingRequests).toHaveLength(1);

      // Query by request type
      const accessRequests = await db.select()
        .from(gdprRequests)
        .where(eq(gdprRequests.requestType, 'access'));
      expect(accessRequests).toHaveLength(1);

      // Query urgent requests
      const urgentRequests = await db.select()
        .from(gdprRequests)
        .where(eq(gdprRequests.urgentRequest, true));
      expect(urgentRequests).toHaveLength(1);

      // Query by priority
      const highPriorityRequests = await db.select()
        .from(gdprRequests)
        .where(or(
          eq(gdprRequests.priority, 'high'),
          eq(gdprRequests.priority, 'urgent')
        ));
      expect(highPriorityRequests).toHaveLength(1);
    });
  });

  describe('Audit Logs Operations', () => {
    it('should create audit log entries', async () => {
      const now = new Date().toISOString();
      const auditData = {
        id: uuidv4(),
        entityType: 'student',
        entityId: '123',
        action: 'create',
        userId: 'user123',
        details: JSON.stringify({ field: 'value', change: 'created new student' }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: now,
        severity: 'medium',
        category: 'data_modification',
        sessionId: 'session123',
        correlationId: 'corr123',
        checksum: 'checksum123',
        encrypted: false
      };

      const [inserted] = await db.insert(auditLogs).values(auditData).returning();
      expect(inserted.id).toBe(auditData.id);
      expect(inserted.action).toBe('create');
      expect(inserted.severity).toBe('medium');
    });

    it('should query audit logs by entity', async () => {
      const now = new Date().toISOString();
      const entityId = '123';
      
      const logs = [
        {
          id: uuidv4(),
          entityType: 'student',
          entityId,
          action: 'create',
          details: JSON.stringify({ action: 'created' }),
          timestamp: now,
          severity: 'low',
          checksum: 'check1'
        },
        {
          id: uuidv4(),
          entityType: 'student',
          entityId,
          action: 'update',
          details: JSON.stringify({ action: 'updated points' }),
          timestamp: new Date(Date.now() + 1000).toISOString(),
          severity: 'medium',
          checksum: 'check2'
        },
        {
          id: uuidv4(),
          entityType: 'student',
          entityId: '456', // Different entity
          action: 'create',
          details: JSON.stringify({ action: 'created different student' }),
          timestamp: now,
          severity: 'low',
          checksum: 'check3'
        }
      ];

      await db.insert(auditLogs).values(logs);

      const entityLogs = await db.select()
        .from(auditLogs)
        .where(and(
          eq(auditLogs.entityType, 'student'),
          eq(auditLogs.entityId, entityId)
        ))
        .orderBy(asc(auditLogs.timestamp));

      expect(entityLogs).toHaveLength(2);
      expect(entityLogs[0].action).toBe('create');
      expect(entityLogs[1].action).toBe('update');
    });

    it('should query audit logs by severity and time range', async () => {
      const baseTime = Date.now();
      
      const logs = [
        {
          id: uuidv4(),
          entityType: 'gdpr_request',
          entityId: 'req1',
          action: 'submit',
          details: JSON.stringify({ type: 'access' }),
          timestamp: new Date(baseTime - 2000).toISOString(),
          severity: 'high',
          checksum: 'check1'
        },
        {
          id: uuidv4(),
          entityType: 'gdpr_request',
          entityId: 'req2',
          action: 'process',
          details: JSON.stringify({ type: 'erasure' }),
          timestamp: new Date(baseTime).toISOString(),
          severity: 'critical',
          checksum: 'check2'
        },
        {
          id: uuidv4(),
          entityType: 'student',
          entityId: 'std1',
          action: 'view',
          details: JSON.stringify({ action: 'viewed profile' }),
          timestamp: new Date(baseTime + 1000).toISOString(),
          severity: 'low',
          checksum: 'check3'
        }
      ];

      await db.insert(auditLogs).values(logs);

      // Query high severity logs
      const highSeverityLogs = await db.select()
        .from(auditLogs)
        .where(or(
          eq(auditLogs.severity, 'high'),
          eq(auditLogs.severity, 'critical')
        ));

      expect(highSeverityLogs).toHaveLength(2);

      // Query by time range
      const recentLogs = await db.select()
        .from(auditLogs)
        .where(sql`${auditLogs.timestamp} >= ${new Date(baseTime - 1000).toISOString()}`);

      expect(recentLogs).toHaveLength(2);
    });
  });

  describe('Encryption Keys Operations', () => {
    it('should manage encryption key lifecycle', async () => {
      const now = new Date().toISOString();
      const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const keyData = {
        id: uuidv4(),
        keyData: 'encrypted-key-data-base64',
        algorithm: 'aes-256-gcm',
        version: 1,
        usage: 'student_data',
        status: 'active',
        createdAt: now,
        expiresAt: expiryDate
      };

      const [inserted] = await db.insert(encryptionKeys).values(keyData).returning();
      expect(inserted.usage).toBe('student_data');
      expect(inserted.status).toBe('active');

      // Deprecate old key and create new one
      await db.update(encryptionKeys)
        .set({ status: 'deprecated' })
        .where(eq(encryptionKeys.id, inserted.id));

      const newKeyData = {
        id: uuidv4(),
        keyData: 'new-encrypted-key-data-base64',
        algorithm: 'aes-256-gcm',
        version: 2,
        usage: 'student_data',
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      };

      await db.insert(encryptionKeys).values(newKeyData);

      // Query active keys by usage
      const activeStudentKeys = await db.select()
        .from(encryptionKeys)
        .where(and(
          eq(encryptionKeys.usage, 'student_data'),
          eq(encryptionKeys.status, 'active')
        ));

      expect(activeStudentKeys).toHaveLength(1);
      expect(activeStudentKeys[0].version).toBe(2);
    });

    it('should find expired keys for cleanup', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const [expiredKey] = await db.insert(encryptionKeys).values({
        id: uuidv4(),
        keyData: 'expired-key-data',
        algorithm: 'aes-256-gcm',
        version: 1,
        usage: 'audit_logs',
        status: 'deprecated',
        createdAt: expiredDate,
        expiresAt: expiredDate
      }).returning();

      const expiredKeys = await db.select()
        .from(encryptionKeys)
        .where(sql`${encryptionKeys.expiresAt} < ${new Date().toISOString()}`);

      expect(expiredKeys).toHaveLength(1);
      expect(expiredKeys[0].id).toBe(expiredKey.id);
    });
  });

  describe('Retention Policies Operations', () => {
    it('should create and manage retention policies', async () => {
      const now = new Date().toISOString();
      
      const policyData = {
        id: uuidv4(),
        policyName: 'Student Data Retention',
        entityType: 'student',
        retentionPeriodDays: 1095, // 3 years
        triggerCondition: 'last_access_date',
        action: 'anonymize',
        priority: 'high',
        active: true,
        legalBasis: 'GDPR Article 17',
        exceptions: JSON.stringify(['ongoing_legal_case', 'research_consent']),
        notificationDays: 30,
        createdAt: now,
        updatedAt: now,
        recordsProcessed: 0
      };

      const [inserted] = await db.insert(retentionPolicies).values(policyData).returning();
      expect(inserted.policyName).toBe('Student Data Retention');
      expect(inserted.retentionPeriodDays).toBe(1095);
      expect(inserted.active).toBe(true);
    });

    it('should update policy execution statistics', async () => {
      const now = new Date().toISOString();
      
      const [policy] = await db.insert(retentionPolicies).values({
        id: uuidv4(),
        policyName: 'Audit Log Cleanup',
        entityType: 'audit_log',
        retentionPeriodDays: 2190, // 6 years
        triggerCondition: 'creation_date',
        action: 'delete',
        priority: 'medium',
        active: true,
        createdAt: now,
        updatedAt: now,
        recordsProcessed: 0
      }).returning();

      // Simulate policy execution
      const executionTime = new Date().toISOString();
      await db.update(retentionPolicies)
        .set({
          lastExecuted: executionTime,
          recordsProcessed: 150,
          updatedAt: executionTime
        })
        .where(eq(retentionPolicies.id, policy.id));

      const [updatedPolicy] = await db.select()
        .from(retentionPolicies)
        .where(eq(retentionPolicies.id, policy.id));

      expect(updatedPolicy.recordsProcessed).toBe(150);
      expect(updatedPolicy.lastExecuted).toBeTruthy();
    });

    it('should query active policies by entity type', async () => {
      const now = new Date().toISOString();
      
      const policies = [
        {
          id: uuidv4(),
          policyName: 'Student Data Policy',
          entityType: 'student',
          retentionPeriodDays: 1095,
          triggerCondition: 'last_access',
          action: 'anonymize',
          priority: 'high',
          active: true,
          createdAt: now,
          updatedAt: now,
          recordsProcessed: 0
        },
        {
          id: uuidv4(),
          policyName: 'Consent Records Policy',
          entityType: 'consent',
          retentionPeriodDays: 730,
          triggerCondition: 'expiry_date',
          action: 'archive',
          priority: 'medium',
          active: true,
          createdAt: now,
          updatedAt: now,
          recordsProcessed: 0
        },
        {
          id: uuidv4(),
          policyName: 'Disabled Policy',
          entityType: 'student',
          retentionPeriodDays: 365,
          triggerCondition: 'creation_date',
          action: 'delete',
          priority: 'low',
          active: false, // Inactive
          createdAt: now,
          updatedAt: now,
          recordsProcessed: 0
        }
      ];

      await db.insert(retentionPolicies).values(policies);

      const activeStudentPolicies = await db.select()
        .from(retentionPolicies)
        .where(and(
          eq(retentionPolicies.entityType, 'student'),
          eq(retentionPolicies.active, true)
        ));

      expect(activeStudentPolicies).toHaveLength(1);
      expect(activeStudentPolicies[0].policyName).toBe('Student Data Policy');
    });
  });

  describe('Consent Preferences Operations', () => {
    let studentId: number;

    beforeEach(async () => {
      const now = new Date().toISOString();
      const [student] = await db.insert(students).values({
        prenom: 'Consent',
        nom: 'Student',
        dateNaissance: '2015-01-01',
        niveauActuel: 'CP',
        createdAt: now,
        updatedAt: now
      }).returning();
      studentId = student.id;
    });

    it('should create and update consent preferences', async () => {
      const now = new Date().toISOString();
      
      const preferencesData = {
        id: uuidv4(),
        userId: 'user123',
        studentId,
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
        personalization: true,
        version: '1.0',
        timestamp: now,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const [inserted] = await db.insert(consentPreferences).values(preferencesData).returning();
      expect(inserted.essential).toBe(true);
      expect(inserted.analytics).toBe(false);
      expect(inserted.studentId).toBe(studentId);

      // Update preferences
      const newPreferencesData = {
        id: uuidv4(),
        userId: 'user123',
        studentId,
        essential: true,
        functional: true,
        analytics: true, // Changed to true
        marketing: false,
        personalization: false, // Changed to false
        version: '1.1',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await db.insert(consentPreferences).values(newPreferencesData);

      // Get latest preferences for student
      const latestPreferences = await db.select()
        .from(consentPreferences)
        .where(eq(consentPreferences.studentId, studentId))
        .orderBy(desc(consentPreferences.timestamp))
        .limit(1);

      expect(latestPreferences).toHaveLength(1);
      expect(latestPreferences[0].analytics).toBe(true);
      expect(latestPreferences[0].personalization).toBe(false);
      expect(latestPreferences[0].version).toBe('1.1');
    });

    it('should query consent preferences history', async () => {
      const baseTime = Date.now();
      
      const preferences = [
        {
          id: uuidv4(),
          studentId,
          essential: true,
          functional: false,
          analytics: false,
          marketing: false,
          personalization: false,
          version: '1.0',
          timestamp: new Date(baseTime - 2000).toISOString()
        },
        {
          id: uuidv4(),
          studentId,
          essential: true,
          functional: true,
          analytics: false,
          marketing: false,
          personalization: false,
          version: '1.1',
          timestamp: new Date(baseTime - 1000).toISOString()
        },
        {
          id: uuidv4(),
          studentId,
          essential: true,
          functional: true,
          analytics: true,
          marketing: false,
          personalization: true,
          version: '1.2',
          timestamp: new Date(baseTime).toISOString()
        }
      ];

      await db.insert(consentPreferences).values(preferences);

      const history = await db.select()
        .from(consentPreferences)
        .where(eq(consentPreferences.studentId, studentId))
        .orderBy(desc(consentPreferences.timestamp));

      expect(history).toHaveLength(3);
      expect(history[0].version).toBe('1.2'); // Latest first
      expect(history[1].version).toBe('1.1');
      expect(history[2].version).toBe('1.0'); // Oldest last
    });
  });

  describe('Complex Queries and Relationships', () => {
    let studentId: number;

    beforeEach(async () => {
      const now = new Date().toISOString();
      const [student] = await db.insert(students).values({
        prenom: 'Integration',
        nom: 'Test',
        dateNaissance: '2015-01-01',
        niveauActuel: 'CP',
        createdAt: now,
        updatedAt: now
      }).returning();
      studentId = student.id;
    });

    it('should query GDPR requests with student information', async () => {
      const now = new Date().toISOString();
      
      // Create GDPR request linked to student
      await db.insert(gdprRequests).values({
        id: uuidv4(),
        requestType: 'access',
        requesterType: 'parent',
        requesterEmail: 'parent@example.com',
        requesterName: 'Parent Name',
        studentId,
        studentName: 'Integration Test',
        requestDetails: 'Access all data for my child',
        urgentRequest: false,
        status: 'pending',
        priority: 'medium',
        submittedAt: now,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        verificationMethod: 'email'
      });

      // Query requests with student data (simulated JOIN)
      const requestsWithStudents = await db.select({
        requestId: gdprRequests.id,
        requestType: gdprRequests.requestType,
        status: gdprRequests.status,
        studentName: students.prenom,
        studentLastName: students.nom,
        studentLevel: students.niveauActuel
      })
      .from(gdprRequests)
      .leftJoin(students, eq(gdprRequests.studentId, students.id))
      .where(eq(gdprRequests.studentId, studentId));

      expect(requestsWithStudents).toHaveLength(1);
      expect(requestsWithStudents[0].studentName).toBe('Integration');
      expect(requestsWithStudents[0].requestType).toBe('access');
    });

    it('should aggregate statistics across GDPR tables', async () => {
      const now = new Date().toISOString();
      
      // Create test data
      await db.insert(parentalConsent).values([
        {
          id: uuidv4(),
          parentEmail: 'parent1@example.com',
          parentName: 'Parent One',
          childName: 'Child One',
          childAge: 8,
          consentTypes: JSON.stringify(['data_processing']),
          status: 'verified',
          firstConsentToken: uuidv4(),
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          parentEmail: 'parent2@example.com',
          parentName: 'Parent Two',
          childName: 'Child Two',
          childAge: 9,
          consentTypes: JSON.stringify(['data_processing']),
          status: 'pending',
          firstConsentToken: uuidv4(),
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          createdAt: now,
          updatedAt: now
        }
      ]);

      await db.insert(gdprRequests).values([
        {
          id: uuidv4(),
          requestType: 'access',
          requesterType: 'parent',
          requesterEmail: 'parent1@example.com',
          requesterName: 'Parent One',
          requestDetails: 'Access request',
          urgentRequest: false,
          status: 'completed',
          priority: 'medium',
          submittedAt: now,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          verificationMethod: 'email'
        },
        {
          id: uuidv4(),
          requestType: 'erasure',
          requesterType: 'parent',
          requesterEmail: 'parent2@example.com',
          requesterName: 'Parent Two',
          requestDetails: 'Erasure request',
          urgentRequest: true,
          status: 'pending',
          priority: 'urgent',
          submittedAt: now,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          verificationMethod: 'email'
        }
      ]);

      // Count consent records by status
      const consentStats = await db.select({
        status: parentalConsent.status,
        count: count()
      })
      .from(parentalConsent)
      .groupBy(parentalConsent.status);

      expect(consentStats).toHaveLength(2);
      const verifiedCount = consentStats.find(s => s.status === 'verified')?.count;
      const pendingCount = consentStats.find(s => s.status === 'pending')?.count;
      expect(verifiedCount).toBe(1);
      expect(pendingCount).toBe(1);

      // Count requests by type
      const requestStats = await db.select({
        requestType: gdprRequests.requestType,
        count: count()
      })
      .from(gdprRequests)
      .groupBy(gdprRequests.requestType);

      expect(requestStats).toHaveLength(2);
      const accessCount = requestStats.find(r => r.requestType === 'access')?.count;
      const erasureCount = requestStats.find(r => r.requestType === 'erasure')?.count;
      expect(accessCount).toBe(1);
      expect(erasureCount).toBe(1);
    });
  });
});