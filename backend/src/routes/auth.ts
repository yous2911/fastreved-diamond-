
// Fix authentication routes to use consistent response format
// Update src/routes/auth.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authSchemas } from '../schemas/auth.schema';
import { AuthService } from '../services/auth.service';
import { createRateLimitMiddleware } from '../services/rate-limit.service';

// Type definitions for request bodies
interface LoginRequestBody {
  email?: string;
  prenom?: string;
  nom?: string;
  password: string;
}

interface RegisterRequestBody {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  dateNaissance: string;
  niveauActuel: string;
}

interface RefreshTokenBody {
  refreshToken: string;
}

interface PasswordResetBody {
  email: string;
}

interface PasswordResetConfirmBody {
  token: string;
  newPassword: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Secure login endpoint with bcrypt authentication
  fastify.post('/login', {
    schema: authSchemas.login,
    preHandler: [createRateLimitMiddleware('auth:login')],
    handler: async (
      request: FastifyRequest<{ Body: LoginRequestBody }>, 
      reply: FastifyReply
    ) => {
      const credentials = request.body;

      try {
        const authResult = await AuthService.authenticateStudent(credentials);

        if (!authResult.success) {
          const statusCode = authResult.lockoutInfo?.isLocked ? 429 : 401;
          
          return reply.status(statusCode).send({
            success: false,
            error: {
              message: authResult.error,
              code: authResult.lockoutInfo?.isLocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
              lockoutInfo: authResult.lockoutInfo
            },
          });
        }

        // Set secure HTTP-only cookies
        reply.setCookie('auth_token', authResult.token!, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60, // 15 minutes
          path: '/'
        });

        reply.setCookie('refresh_token', authResult.refreshToken!, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/api/auth'
        });

        return reply.send({
          success: true,
          data: {
            student: authResult.student,
            // Don't send tokens in response body for security
            expiresIn: 15 * 60 * 1000 // 15 minutes in milliseconds
          },
        });

      } catch (error) {
        fastify.log.error('Login error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });

  // Register new student
  fastify.post('/register', {
    preHandler: [createRateLimitMiddleware('auth:register')],
    handler: async (
      request: FastifyRequest<{ Body: RegisterRequestBody }>, 
      reply: FastifyReply
    ) => {
      const registerData = request.body;

      try {
        const authResult = await AuthService.registerStudent(registerData);

        if (!authResult.success) {
          return reply.status(400).send({
            success: false,
            error: {
              message: authResult.error,
              code: 'REGISTRATION_FAILED',
            },
          });
        }

        // Set secure cookies
        reply.setCookie('auth_token', authResult.token!, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60,
          path: '/'
        });

        reply.setCookie('refresh_token', authResult.refreshToken!, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60,
          path: '/api/auth'
        });

        return reply.status(201).send({
          success: true,
          data: {
            student: authResult.student,
            message: 'Compte créé avec succès'
          },
        });

      } catch (error) {
        fastify.log.error('Registration error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la création du compte',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });

  // Refresh access token
  fastify.post('/refresh', {
    handler: async (
      request: FastifyRequest<{ Body: RefreshTokenBody }>,
      reply: FastifyReply
    ) => {
      const refreshToken = request.cookies.refresh_token || request.body.refreshToken;

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Token de rafraîchissement manquant',
            code: 'MISSING_REFRESH_TOKEN',
          },
        });
      }

      try {
        const newAccessToken = AuthService.refreshAccessToken(refreshToken);

        if (!newAccessToken) {
          return reply.status(401).send({
            success: false,
            error: {
              message: 'Token de rafraîchissement invalide',
              code: 'INVALID_REFRESH_TOKEN',
            },
          });
        }

        // Set new access token cookie
        reply.setCookie('auth_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60,
          path: '/'
        });

        return reply.send({
          success: true,
          data: {
            message: 'Token rafraîchi avec succès',
            expiresIn: 15 * 60 * 1000
          },
        });

      } catch (error) {
        fastify.log.error('Token refresh error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors du rafraîchissement du token',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });

  // Password reset request
  fastify.post('/password-reset', {
    preHandler: [createRateLimitMiddleware('auth:password-reset')],
    handler: async (
      request: FastifyRequest<{ Body: PasswordResetBody }>,
      reply: FastifyReply
    ) => {
      const { email } = request.body;

      try {
        const resetToken = await AuthService.generatePasswordResetToken(email);
        
        // Always return success to prevent email enumeration
        return reply.send({
          success: true,
          data: {
            message: 'Si cette adresse email existe, un lien de réinitialisation a été envoyé.'
          },
        });

        // In production, send email with reset token
        // await emailService.sendPasswordReset(email, resetToken);

      } catch (error) {
        fastify.log.error('Password reset error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la demande de réinitialisation',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });

  // Password reset confirmation
  fastify.post('/password-reset/confirm', {
    handler: async (
      request: FastifyRequest<{ Body: PasswordResetConfirmBody }>,
      reply: FastifyReply
    ) => {
      const { token, newPassword } = request.body;

      try {
        const success = await AuthService.resetPassword(token, newPassword);

        if (!success) {
          return reply.status(400).send({
            success: false,
            error: {
              message: 'Token de réinitialisation invalide ou expiré',
              code: 'INVALID_RESET_TOKEN',
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            message: 'Mot de passe réinitialisé avec succès'
          },
        });

      } catch (error) {
        fastify.log.error('Password reset confirm error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la réinitialisation du mot de passe',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });

  // Logout endpoint
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    handler: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      try {
        const studentId = (request.user as any).studentId;
        
        // Update database
        await AuthService.logoutStudent(studentId);

        // Clear cookies
        reply.clearCookie('auth_token', { path: '/' });
        reply.clearCookie('refresh_token', { path: '/api/auth' });

        return reply.send({
          success: true,
          data: {
            message: 'Déconnexion réussie'
          },
        });

      } catch (error) {
        fastify.log.error('Logout error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la déconnexion',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });

  // Get current user info
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    handler: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      try {
        const user = request.user as any;
        
        return reply.send({
          success: true,
          data: {
            student: {
              id: user.studentId,
              email: user.email
              // Add other safe user data
            }
          },
        });

      } catch (error) {
        fastify.log.error('Get user error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des données utilisateur',
            code: 'INTERNAL_ERROR',
          },
        });
      }
    }
  });
}
