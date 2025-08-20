import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';
import { AuditTrailService } from './audit-trail.service';
import { DataAnonymizationService } from './data-anonymization.service';
import { db } from '../db/connection';
import { gdprConsentRequests, students } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Validation schemas
const ParentalConsentSchema = z.object({
  parentEmail: z.string().email(),
  parentName: z.string().min(2).max(100),
  childName: z.string().min(2).max(100),
  childAge: z.number().min(3).max(18),
  consentTypes: z.array(z.enum([
    'data_processing',
    'educational_content',
    'progress_tracking',
    'communication',
    'analytics',
    'marketing'
  ])),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  timestamp: z.date().default(() => new Date())
});

const ConsentVerificationSchema = z.object({
  token: z.string().uuid(),
  ipAddress: z.string().ip(),
  userAgent: z.string()
});

export interface ParentalConsent {
  id: string;
  parentEmail: string;
  parentName: string;
  childName: string;
  childAge: number;
  consentTypes: string[];
  status: 'pending' | 'verified' | 'expired' | 'revoked';
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

export interface ConsentHistory {
  id: string;
  consentId: string;
  action: 'created' | 'first_consent' | 'second_consent' | 'verified' | 'revoked' | 'expired';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: any;
}

export class ParentalConsentService {
  private emailService: EmailService;
  private auditService: AuditTrailService;
  private anonymizationService: DataAnonymizationService;

  constructor() {
    this.emailService = new EmailService();
    this.auditService = new AuditTrailService();
    this.anonymizationService = new DataAnonymizationService();
  }

  /**
   * Initiate parental consent process with double opt-in
   */
  async initiateConsent(consentData: z.infer<typeof ParentalConsentSchema>): Promise<{
    consentId: string;
    message: string;
  }> {
    try {
      // Validate input
      const validatedData = ParentalConsentSchema.parse(consentData);
      
      // Check for existing pending consent
      const existingConsent = await this.findPendingConsentByEmail(validatedData.parentEmail);
      if (existingConsent) {
        throw new Error('Un processus de consentement est déjà en cours pour cette adresse email');
      }

      // Generate unique consent ID and tokens
      const consentId = crypto.randomUUID();
      const firstConsentToken = crypto.randomUUID();
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create consent record
      const consent: ParentalConsent = {
        id: consentId,
        parentEmail: validatedData.parentEmail,
        parentName: validatedData.parentName,
        childName: validatedData.childName,
        childAge: validatedData.childAge,
        consentTypes: validatedData.consentTypes,
        status: 'pending',
        firstConsentToken,
        expiryDate,
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.saveConsent(consent);

      // Log audit trail
      await this.auditService.logAction({
        entityType: 'parental_consent',
        entityId: consentId,
        action: 'created',
        userId: null,
        details: {
          parentEmail: validatedData.parentEmail,
          childName: validatedData.childName,
          consentTypes: validatedData.consentTypes
        },
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent
      });

      // Send first consent email
      await this.sendFirstConsentEmail(consent);

      logger.info(`Parental consent initiated`, { 
        consentId, 
        parentEmail: validatedData.parentEmail 
      });

      return {
        consentId,
        message: 'Un email de confirmation a été envoyé à l\'adresse parentale.'
      };

    } catch (error) {
      logger.error('Error initiating parental consent:', error);
      throw error;
    }
  }

  /**
   * Process first consent click
   */
  async processFirstConsent(token: string, verificationData: z.infer<typeof ConsentVerificationSchema>): Promise<{
    message: string;
    requiresSecondConsent: boolean;
  }> {
    try {
      const validatedData = ConsentVerificationSchema.parse(verificationData);
      
      // Find consent by first token
      const consent = await this.findConsentByFirstToken(token);
      if (!consent) {
        throw new Error('Token de consentement invalide ou expiré');
      }

      if (consent.status !== 'pending') {
        throw new Error('Ce consentement a déjà été traité');
      }

      if (new Date() > consent.expiryDate) {
        throw new Error('Le délai de consentement a expiré');
      }

      // Generate second consent token
      const secondConsentToken = crypto.randomUUID();
      
      // Update consent with first consent confirmation
      await this.updateConsent(consent.id, {
        firstConsentDate: new Date(),
        secondConsentToken,
        updatedAt: new Date()
      });

      // Log audit trail
      await this.auditService.logAction({
        entityType: 'parental_consent',
        entityId: consent.id,
        action: 'first_consent',
        userId: null,
        details: {
          parentEmail: consent.parentEmail,
          firstConsentDate: new Date()
        },
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent
      });

      // Send second consent email
      await this.sendSecondConsentEmail({
        ...consent,
        secondConsentToken
      });

      logger.info(`First parental consent processed`, { 
        consentId: consent.id,
        parentEmail: consent.parentEmail 
      });

      return {
        message: 'Première confirmation reçue. Un second email de confirmation vous a été envoyé.',
        requiresSecondConsent: true
      };

    } catch (error) {
      logger.error('Error processing first consent:', error);
      throw error;
    }
  }

  /**
   * Process second consent click (final verification)
   */
  async processSecondConsent(token: string, verificationData: z.infer<typeof ConsentVerificationSchema>): Promise<{
    consentId: string;
    message: string;
    studentId: string;
  }> {
    try {
      const validatedData = ConsentVerificationSchema.parse(verificationData);
      
      // Find consent by second token
      const consent = await this.findConsentBySecondToken(token);
      if (!consent) {
        throw new Error('Token de consentement invalide ou expiré');
      }

      if (consent.status !== 'pending') {
        throw new Error('Ce consentement a déjà été traité');
      }

      if (new Date() > consent.expiryDate) {
        throw new Error('Le délai de consentement a expiré');
      }

      if (!consent.firstConsentDate) {
        throw new Error('La première confirmation n\'a pas été effectuée');
      }

      // Update consent as verified
      const verificationDate = new Date();
      await this.updateConsent(consent.id, {
        status: 'verified',
        secondConsentDate: verificationDate,
        verificationDate,
        updatedAt: verificationDate
      });

      // Create student account
      const studentId = await this.createStudentAccount(consent);

      // Log audit trail
      await this.auditService.logAction({
        entityType: 'parental_consent',
        entityId: consent.id,
        action: 'verified',
        userId: null,
        details: {
          parentEmail: consent.parentEmail,
          childName: consent.childName,
          studentId,
          verificationDate
        },
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent
      });

      // Send confirmation email
      await this.sendConsentConfirmationEmail(consent, studentId);

      logger.info(`Parental consent fully verified`, { 
        consentId: consent.id,
        parentEmail: consent.parentEmail,
        studentId
      });

      return {
        consentId: consent.id,
        studentId,
        message: 'Consentement parental vérifié avec succès. Le compte élève a été créé.'
      };

    } catch (error) {
      logger.error('Error processing second consent:', error);
      throw error;
    }
  }

  /**
   * Revoke parental consent
   */
  async revokeConsent(consentId: string, parentEmail: string, reason?: string): Promise<void> {
    try {
      const consent = await this.findConsentById(consentId);
      if (!consent) {
        throw new Error('Consentement introuvable');
      }

      if (consent.parentEmail !== parentEmail) {
        throw new Error('Email parental non autorisé pour ce consentement');
      }

      if (consent.status === 'revoked') {
        throw new Error('Ce consentement a déjà été révoqué');
      }

      // Update consent status
      await this.updateConsent(consentId, {
        status: 'revoked',
        updatedAt: new Date()
      });

      // Log audit trail
      await this.auditService.logAction({
        entityType: 'parental_consent',
        entityId: consentId,
        action: 'revoked',
        userId: null,
        details: {
          parentEmail,
          reason: reason || 'Révocation par le parent',
          revokedAt: new Date()
        },
        ipAddress: '',
        userAgent: ''
      });

      // If consent was verified, anonymize student data
      if (consent.status === 'verified') {
        await this.handleConsentRevocation(consent);
      }

      logger.info(`Parental consent revoked`, { 
        consentId,
        parentEmail,
        reason 
      });

    } catch (error) {
      logger.error('Error revoking consent:', error);
      throw error;
    }
  }

  /**
   * Get consent status and details
   */
  async getConsentStatus(consentId: string): Promise<{
    status: string;
    parentEmail: string;
    childName: string;
    consentTypes: string[];
    createdAt: Date;
    verificationDate?: Date;
    expiryDate: Date;
  }> {
    try {
      const consent = await this.findConsentById(consentId);
      if (!consent) {
        throw new Error('Consentement introuvable');
      }

      return {
        status: consent.status,
        parentEmail: consent.parentEmail,
        childName: consent.childName,
        consentTypes: consent.consentTypes,
        createdAt: consent.createdAt,
        verificationDate: consent.verificationDate,
        expiryDate: consent.expiryDate
      };

    } catch (error) {
      logger.error('Error getting consent status:', error);
      throw error;
    }
  }

  /**
   * Check if consent is valid for specific data processing
   */
  async isConsentValidForProcessing(studentId: string, processingType: string): Promise<boolean> {
    try {
      const consent = await this.findConsentByStudentId(studentId);
      if (!consent) {
        return false;
      }

      return consent.status === 'verified' && 
             consent.consentTypes.includes(processingType) &&
             new Date() <= consent.expiryDate;

    } catch (error) {
      logger.error('Error checking consent validity:', error);
      return false;
    }
  }

  // Private helper methods
  private async sendFirstConsentEmail(consent: ParentalConsent): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/consent/verify/${consent.firstConsentToken}`;
    
    await this.emailService.sendEmail({
      to: consent.parentEmail,
      subject: 'Confirmation de consentement parental - RevEd Kids (1/2)',
      template: 'parental-consent-first',
      variables: {
        parentName: consent.parentName,
        childName: consent.childName,
        verificationUrl,
        expiryDate: consent.expiryDate.toLocaleDateString('fr-FR'),
        consentTypes: this.formatConsentTypes(consent.consentTypes)
      }
    });
  }

  private async sendSecondConsentEmail(consent: ParentalConsent & { secondConsentToken: string }): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/consent/verify/${consent.secondConsentToken}`;
    
    await this.emailService.sendEmail({
      to: consent.parentEmail,
      subject: 'Confirmation finale de consentement parental - RevEd Kids (2/2)',
      template: 'parental-consent-second',
      variables: {
        parentName: consent.parentName,
        childName: consent.childName,
        verificationUrl,
        expiryDate: consent.expiryDate.toLocaleDateString('fr-FR')
      }
    });
  }

  private async sendConsentConfirmationEmail(consent: ParentalConsent, studentId: string): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    
    await this.emailService.sendEmail({
      to: consent.parentEmail,
      subject: 'Compte élève créé avec succès - RevEd Kids',
      template: 'student-account-created',
      variables: {
        parentName: consent.parentName,
        childName: consent.childName,
        studentId,
        loginUrl,
        supportEmail: process.env.SUPPORT_EMAIL
      }
    });
  }

  private formatConsentTypes(types: string[]): string {
    const typeLabels: Record<string, string> = {
      data_processing: 'Traitement des données personnelles',
      educational_content: 'Accès au contenu éducatif',
      progress_tracking: 'Suivi des progrès scolaires',
      communication: 'Communications relatives au service',
      analytics: 'Analyses statistiques anonymisées',
      marketing: 'Communications marketing (optionnel)'
    };

    return types.map(type => `• ${typeLabels[type] || type}`).join('\n');
  }

  private async createStudentAccount(consent: ParentalConsent): Promise<string> {
    try {
      const result = await db.transaction(async (tx) => {
        // Calculate date of birth from age
        const dateNaissance = new Date();
        dateNaissance.setFullYear(dateNaissance.getFullYear() - consent.childAge);

        // Create student account
        const [student] = await tx.insert(students).values({
          prenom: consent.childName.split(' ')[0] || consent.childName,
          nom: consent.childName.split(' ').slice(1).join(' ') || 'Élève',
          email: null, // Child doesn't have email initially
          passwordHash: null, // Password will be set during first login
          dateNaissance,
          niveauActuel: this.calculateGradeLevelFromAge(consent.childAge),
          totalPoints: 0,
          serieJours: 0,
          mascotteType: 'dragon',
          dernierAcces: null,
          estConnecte: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          passwordResetToken: null,
          passwordResetExpires: null,
          niveauScolaire: this.calculateGradeLevelFromAge(consent.childAge),
          mascotteColor: '#ff6b35'
        });

        return student.insertId.toString();
      });

      logger.info('Student account created from parental consent', {
        studentId: result,
        consentId: consent.id,
        childName: consent.childName
      });

      return result;

    } catch (error) {
      logger.error('Error creating student account:', error);
      throw new Error('Échec de la création du compte élève');
    }
  }

  private async handleConsentRevocation(consent: ParentalConsent): Promise<void> {
    try {
      // Find the student account associated with this consent
      const studentRecord = await this.findStudentByConsentId(consent.id);
      
      if (studentRecord) {
        // Schedule anonymization of all student data
        await this.anonymizationService.scheduleAnonymization({
          entityType: 'student',
          entityId: studentRecord.id.toString(),
          reason: 'parental_consent_revoked',
          preserveStatistics: false, // Complete anonymization
          immediateExecution: true,
          notifyUser: false // Don't notify as consent was revoked
        });

        logger.info('Student data anonymization scheduled after consent revocation', {
          consentId: consent.id,
          studentId: studentRecord.id,
          childName: consent.childName
        });
      }

      // Log the revocation handling
      await this.auditService.logAction({
        entityType: 'parental_consent',
        entityId: consent.id,
        action: 'data_anonymized',
        userId: null,
        details: {
          reason: 'consent_revoked',
          childName: consent.childName,
          parentEmail: consent.parentEmail,
          studentId: studentRecord?.id
        },
        severity: 'high',
        category: 'compliance'
      });

    } catch (error) {
      logger.error('Error handling consent revocation:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateGradeLevelFromAge(age: number): string {
    if (age <= 6) return 'CP';
    if (age <= 7) return 'CE1';
    if (age <= 8) return 'CE2';
    if (age <= 9) return 'CM1';
    if (age <= 10) return 'CM2';
    if (age <= 11) return '6ème';
    if (age <= 12) return '5ème';
    if (age <= 13) return '4ème';
    if (age <= 14) return '3ème';
    if (age <= 15) return '2nde';
    if (age <= 16) return '1ère';
    return 'Terminale';
  }

  private async findStudentByConsentId(consentId: string): Promise<{ id: number } | null> {
    try {
      // This would require adding a consentId field to students table
      // For now, we'll implement a workaround by searching through audit logs
      // In a production system, you'd add a consentId foreign key to students table
      
      // Query audit logs to find student creation linked to this consent
      const auditResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        entityId: consentId,
        action: 'verified',
        includeDetails: true,
        limit: 1
      });

      if (auditResult.entries.length > 0) {
        const entry = auditResult.entries[0];
        if (entry.details?.studentId) {
          const studentId = parseInt(entry.details.studentId);
          return { id: studentId };
        }
      }

      return null;

    } catch (error) {
      logger.error('Error finding student by consent ID:', error);
      return null;
    }
  }

  // Database methods implementation
  private async saveConsent(consent: ParentalConsent): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(gdprConsentRequests).values({
          studentId: null, // Will be set when student account is created
          consentType: consent.consentTypes.join(','),
          status: consent.status,
          requestToken: consent.firstConsentToken,
          requestType: 'parental_consent',
          expiresAt: consent.expiryDate
        });

        // Store additional consent data in audit log for complete tracking
        await this.auditService.logAction({
          entityType: 'parental_consent',
          entityId: consent.id,
          action: 'stored',
          userId: null,
          details: {
            parentName: consent.parentName,
            parentEmail: consent.parentEmail,
            childName: consent.childName,
            childAge: consent.childAge,
            consentTypes: consent.consentTypes,
            firstConsentToken: consent.firstConsentToken,
            expiryDate: consent.expiryDate
          },
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          severity: 'medium',
          category: 'compliance'
        });
      });

      logger.debug('Consent saved to database', { consentId: consent.id });

    } catch (error) {
      logger.error('Error saving consent to database:', error);
      throw new Error('Échec de l\'enregistrement du consentement');
    }
  }

  private async updateConsent(id: string, updates: Partial<ParentalConsent>): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Update in gdpr_consent_requests table
        const dbUpdates: any = {};
        
        if (updates.status) {
          dbUpdates.status = updates.status;
        }
        if (updates.verificationDate) {
          dbUpdates.processedAt = updates.verificationDate;
        }
        if (updates.secondConsentToken) {
          dbUpdates.requestToken = updates.secondConsentToken;
        }

        const existingConsent = await this.findConsentById(id);
        if (existingConsent) {
          await tx
            .update(gdprConsentRequests)
            .set(dbUpdates)
            .where(eq(gdprConsentRequests.requestToken, existingConsent.firstConsentToken));
        }

        // Log the update in audit trail
        await this.auditService.logAction({
          entityType: 'parental_consent',
          entityId: id,
          action: 'updated',
          userId: null,
          details: {
            updates,
            updatedAt: new Date()
          },
          severity: 'low',
          category: 'compliance'
        });
      });

      logger.debug('Consent updated in database', { consentId: id, updates });

    } catch (error) {
      logger.error('Error updating consent in database:', error);
      throw new Error('Échec de la mise à jour du consentement');
    }
  }

  private async findConsentById(id: string): Promise<ParentalConsent | null> {
    try {
      // Query audit logs to reconstruct consent data
      const auditResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        entityId: id,
        action: 'stored',
        includeDetails: true,
        limit: 1
      });

      if (auditResult.entries.length === 0) {
        return null;
      }

      const storedEntry = auditResult.entries[0];
      const details = storedEntry.details;

      // Get latest status from most recent audit entry
      const statusResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        entityId: id,
        includeDetails: true,
        limit: 10
      });

      let currentStatus = 'pending';
      let verificationDate: Date | undefined;
      let firstConsentDate: Date | undefined;
      let secondConsentDate: Date | undefined;
      let secondConsentToken: string | undefined;

      for (const entry of statusResult.entries) {
        if (entry.action === 'verified') {
          currentStatus = 'verified';
          verificationDate = entry.details?.verificationDate ? new Date(entry.details.verificationDate) : entry.timestamp;
        } else if (entry.action === 'revoked') {
          currentStatus = 'revoked';
        } else if (entry.action === 'first_consent') {
          firstConsentDate = entry.details?.firstConsentDate ? new Date(entry.details.firstConsentDate) : entry.timestamp;
        } else if (entry.action === 'second_consent') {
          secondConsentDate = entry.details?.secondConsentDate ? new Date(entry.details.secondConsentDate) : entry.timestamp;
        }

        if (entry.details?.secondConsentToken) {
          secondConsentToken = entry.details.secondConsentToken;
        }
      }

      // Check expiry
      const expiryDate = new Date(details.expiryDate);
      if (new Date() > expiryDate && currentStatus === 'pending') {
        currentStatus = 'expired';
      }

      const consent: ParentalConsent = {
        id,
        parentEmail: details.parentEmail,
        parentName: details.parentName,
        childName: details.childName,
        childAge: details.childAge,
        consentTypes: details.consentTypes,
        status: currentStatus as ParentalConsent['status'],
        firstConsentToken: details.firstConsentToken,
        secondConsentToken,
        firstConsentDate,
        secondConsentDate,
        verificationDate,
        expiryDate,
        ipAddress: storedEntry.ipAddress || '',
        userAgent: storedEntry.userAgent || '',
        createdAt: storedEntry.timestamp,
        updatedAt: statusResult.entries[0]?.timestamp || storedEntry.timestamp
      };

      return consent;

    } catch (error) {
      logger.error('Error finding consent by ID:', error);
      return null;
    }
  }

  private async findPendingConsentByEmail(email: string): Promise<ParentalConsent | null> {
    try {
      // Query audit logs for pending consents by this email
      const auditResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        action: 'stored',
        includeDetails: true,
        limit: 20
      });

      // Filter by parent email and pending status
      for (const entry of auditResult.entries) {
        if (entry.details?.parentEmail === email) {
          const consent = await this.findConsentById(entry.entityId);
          if (consent && consent.status === 'pending') {
            return consent;
          }
        }
      }

      return null;

    } catch (error) {
      logger.error('Error finding pending consent by email:', error);
      return null;
    }
  }

  private async findConsentByFirstToken(token: string): Promise<ParentalConsent | null> {
    try {
      // Query audit logs for consent with this first token
      const auditResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        action: 'stored',
        includeDetails: true,
        limit: 50
      });

      for (const entry of auditResult.entries) {
        if (entry.details?.firstConsentToken === token) {
          return await this.findConsentById(entry.entityId);
        }
      }

      return null;

    } catch (error) {
      logger.error('Error finding consent by first token:', error);
      return null;
    }
  }

  private async findConsentBySecondToken(token: string): Promise<ParentalConsent | null> {
    try {
      // Query audit logs for consent with this second token
      const auditResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        includeDetails: true,
        limit: 100
      });

      for (const entry of auditResult.entries) {
        if (entry.details?.secondConsentToken === token) {
          return await this.findConsentById(entry.entityId);
        }
      }

      return null;

    } catch (error) {
      logger.error('Error finding consent by second token:', error);
      return null;
    }
  }

  private async findConsentByStudentId(studentId: string): Promise<ParentalConsent | null> {
    try {
      // Query audit logs for verified consent with this student ID
      const auditResult = await this.auditService.queryAuditLogs({
        entityType: 'parental_consent',
        action: 'verified',
        includeDetails: true,
        limit: 50
      });

      for (const entry of auditResult.entries) {
        if (entry.details?.studentId === studentId) {
          return await this.findConsentById(entry.entityId);
        }
      }

      return null;

    } catch (error) {
      logger.error('Error finding consent by student ID:', error);
      return null;
    }
  }
}