/**
 * Secure Authentication Service with bcrypt
 * Implements password hashing, validation, and account security
 */

import bcrypt from 'bcrypt';
import { db } from '../db/connection';
import { students } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface LoginCredentials {
  email?: string;
  prenom?: string;
  nom?: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  student?: any;
  token?: string;
  refreshToken?: string;
  error?: string;
  lockoutInfo?: {
    isLocked: boolean;
    remainingTime?: number;
    attemptsRemaining?: number;
  };
}

interface RegisterData {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  dateNaissance: string;
  niveauActuel: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly JWT_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * Hash password using bcrypt with secure salt rounds
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure JWT tokens
   */
  static generateTokens(studentId: number, email: string) {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret + '_refresh';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = {
      studentId,
      email,
      type: 'access'
    };

    const refreshPayload = {
      studentId,
      email,
      type: 'refresh',
      tokenId: crypto.randomUUID()
    };

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: this.JWT_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: 'reved-kids',
      audience: 'reved-kids-app'
    });

    const refreshToken = jwt.sign(refreshPayload, refreshSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: 'reved-kids',
      audience: 'reved-kids-app'
    });

    return { accessToken, refreshToken };
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(studentId: number): Promise<boolean> {
    const student = await db.select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (student.length === 0) return false;

    const lockedUntil = student[0].lockedUntil;
    if (!lockedUntil) return false;

    return new Date() < new Date(lockedUntil);
  }

  /**
   * Lock account after failed attempts
   */
  static async lockAccount(studentId: number): Promise<void> {
    const lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
    
    await db.update(students)
      .set({
        lockedUntil: lockUntil,
        failedLoginAttempts: this.MAX_LOGIN_ATTEMPTS
      })
      .where(eq(students.id, studentId));
  }

  /**
   * Increment failed login attempts
   */
  static async incrementFailedAttempts(studentId: number): Promise<number> {
    const student = await db.select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (student.length === 0) return 0;

    const newAttempts = (student[0].failedLoginAttempts || 0) + 1;

    await db.update(students)
      .set({ failedLoginAttempts: newAttempts })
      .where(eq(students.id, studentId));

    // Lock account if max attempts reached
    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      await this.lockAccount(studentId);
    }

    return newAttempts;
  }

  /**
   * Reset failed login attempts on successful login
   */
  static async resetFailedAttempts(studentId: number): Promise<void> {
    await db.update(students)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(students.id, studentId));
  }

  /**
   * Register new student with secure password
   */
  static async registerStudent(data: RegisterData): Promise<AuthResult> {
    try {
      // Check if email already exists
      const existingStudent = await db.select()
        .from(students)
        .where(eq(students.email, data.email))
        .limit(1);

      if (existingStudent.length > 0) {
        return {
          success: false,
          error: 'Un compte avec cette adresse email existe déjà'
        };
      }

      // Validate password strength
      if (data.password.length < 6) {
        return {
          success: false,
          error: 'Le mot de passe doit contenir au moins 6 caractères'
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create student
      const newStudent = await db.insert(students).values({
        prenom: data.prenom,
        nom: data.nom,
        email: data.email,
        passwordHash,
        dateNaissance: new Date(data.dateNaissance),
        niveauActuel: data.niveauActuel,
        niveauScolaire: data.niveauActuel, // Add required field
        totalPoints: 0,
        serieJours: 0,
        mascotteType: 'dragon'
      });

      const studentId = newStudent[0].insertId as number;

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(studentId, data.email);

      return {
        success: true,
        student: {
          id: studentId,
          prenom: data.prenom,
          nom: data.nom,
          email: data.email,
          niveauActuel: data.niveauActuel
        },
        token: accessToken,
        refreshToken
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Erreur lors de la création du compte'
      };
    }
  }

  /**
   * Authenticate student with secure password verification
   */
  static async authenticateStudent(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      let student;

      // Find student by email or name combination
      if (credentials.email) {
        const result = await db.select()
          .from(students)
          .where(eq(students.email, credentials.email))
          .limit(1);
        student = result[0];
      } else if (credentials.prenom && credentials.nom) {
        // Legacy support for name-based login
        const result = await db.select()
          .from(students)
          .where(
            and(
              eq(students.prenom, credentials.prenom),
              eq(students.nom, credentials.nom)
            )
          )
          .limit(1);
        student = result[0];
      }

      if (!student) {
        return {
          success: false,
          error: 'Identifiants incorrects'
        };
      }

      // Check if account is locked
      const isLocked = await this.isAccountLocked(student.id);
      if (isLocked) {
        return {
          success: false,
          error: 'Compte temporairement verrouillé. Veuillez réessayer plus tard.',
          lockoutInfo: {
            isLocked: true,
            remainingTime: student.lockedUntil ? 
              Math.max(0, new Date(student.lockedUntil).getTime() - Date.now()) : 0
          }
        };
      }

      // Verify password
      if (!student.passwordHash) {
        // Legacy user without password - require password setup
        return {
          success: false,
          error: 'Veuillez configurer un mot de passe pour ce compte'
        };
      }

      const isPasswordValid = await this.verifyPassword(credentials.password, student.passwordHash);

      if (!isPasswordValid) {
        // Increment failed attempts
        const attempts = await this.incrementFailedAttempts(student.id);
        const remainingAttempts = this.MAX_LOGIN_ATTEMPTS - attempts;

        return {
          success: false,
          error: 'Mot de passe incorrect',
          lockoutInfo: {
            isLocked: false,
            attemptsRemaining: Math.max(0, remainingAttempts)
          }
        };
      }

      // Successful login - reset failed attempts
      await this.resetFailedAttempts(student.id);

      // Update last access
      await db.update(students)
        .set({
          dernierAcces: new Date(),
          estConnecte: true
        })
        .where(eq(students.id, student.id));

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(student.id, student.email || '');

      return {
        success: true,
        student: {
          id: student.id,
          prenom: student.prenom,
          nom: student.nom,
          email: student.email,
          niveauActuel: student.niveauActuel,
          totalPoints: student.totalPoints,
          serieJours: student.serieJours,
          mascotteType: student.mascotteType
        },
        token: accessToken,
        refreshToken
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Erreur d\'authentification'
      };
    }
  }

  /**
   * Logout student
   */
  static async logoutStudent(studentId: number): Promise<void> {
    await db.update(students)
      .set({ estConnecte: false })
      .where(eq(students.id, studentId));
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    const student = await db.select()
      .from(students)
      .where(eq(students.email, email))
      .limit(1);

    if (student.length === 0) {
      return null;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.update(students)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      })
      .where(eq(students.id, student[0].id));

    return resetToken;
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const student = await db.select()
      .from(students)
      .where(
        and(
          eq(students.passwordResetToken, token),
          lt(students.passwordResetExpires, new Date())
        )
      )
      .limit(1);

    if (student.length === 0) {
      return false;
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db.update(students)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(students.id, student[0].id));

    return true;
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    return jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'reved-kids',
      audience: 'reved-kids-app'
    });
  }

  /**
   * Refresh access token
   */
  static refreshAccessToken(refreshToken: string): string | null {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
      const payload = jwt.verify(refreshToken, refreshSecret, {
        algorithms: ['HS256'],
        issuer: 'reved-kids',
        audience: 'reved-kids-app'
      }) as any;

      if (payload.type !== 'refresh') {
        return null;
      }

      const newPayload = {
        studentId: payload.studentId,
        email: payload.email,
        type: 'access'
      };

      return jwt.sign(newPayload, process.env.JWT_SECRET!, {
        expiresIn: this.JWT_EXPIRES_IN,
        algorithm: 'HS256',
        issuer: 'reved-kids',
        audience: 'reved-kids-app'
      });

    } catch (error) {
      return null;
    }
  }
}