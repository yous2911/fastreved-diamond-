import crypto from 'crypto';
import { z } from 'zod';
import { dbConfig } from '../config/config';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';
import { AuditTrailService } from './audit-trail.service';

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

  constructor() {
    this.emailService = new EmailService();
    this.auditService = new AuditTrailService();
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
    // This would integrate with your student creation service
    // For now, returning a placeholder
    const studentId = crypto.randomUUID();
    
    // TODO: Implement student account creation
    // await StudentService.createAccount({
    //   name: consent.childName,
    //   age: consent.childAge,
    //   parentEmail: consent.parentEmail,
    //   consentId: consent.id
    // });

    return studentId;
  }

  private async handleConsentRevocation(consent: ParentalConsent): Promise<void> {
    // TODO: Implement data anonymization when consent is revoked
    logger.info(`Handling consent revocation for student`, { 
      consentId: consent.id,
      childName: consent.childName 
    });
  }

  // Database methods (placeholder - implement with your DB layer)
  private async saveConsent(consent: ParentalConsent): Promise<void> {
    // TODO: Implement database save
  }

  private async updateConsent(id: string, updates: Partial<ParentalConsent>): Promise<void> {
    // TODO: Implement database update
  }

  private async findConsentById(id: string): Promise<ParentalConsent | null> {
    // TODO: Implement database query
    return null;
  }

  private async findPendingConsentByEmail(email: string): Promise<ParentalConsent | null> {
    // TODO: Implement database query
    return null;
  }

  private async findConsentByFirstToken(token: string): Promise<ParentalConsent | null> {
    // TODO: Implement database query
    return null;
  }

  private async findConsentBySecondToken(token: string): Promise<ParentalConsent | null> {
    // TODO: Implement database query
    return null;
  }

  private async findConsentByStudentId(studentId: string): Promise<ParentalConsent | null> {
    // TODO: Implement database query
    return null;
  }
}