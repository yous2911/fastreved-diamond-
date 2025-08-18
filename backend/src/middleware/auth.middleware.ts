/**
 * Secure Authentication Middleware
 * Handles JWT token validation from HTTP-only cookies
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      studentId: number;
      email: string;
      type: string;
    };
  }
}

/**
 * Authentication middleware that validates JWT tokens from cookies
 */
export async function authenticateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Get token from HTTP-only cookie
    const token = request.cookies.auth_token;

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'Token d\'authentification manquant',
          code: 'MISSING_AUTH_TOKEN',
        },
      });
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    if (decoded.type !== 'access') {
      return reply.status(401).send({
        success: false,
        error: {
          message: 'Type de token invalide',
          code: 'INVALID_TOKEN_TYPE',
        },
      });
    }

    // Add user to request
    request.user = {
      studentId: decoded.studentId,
      email: decoded.email,
      type: decoded.type,
    };

  } catch (error) {
    // Check if we can refresh the token
    const refreshToken = request.cookies.refresh_token;
    
    if (refreshToken) {
      try {
        const newAccessToken = AuthService.refreshAccessToken(refreshToken);
        
        if (newAccessToken) {
          // Set new access token
          reply.setCookie('auth_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60,
            path: '/'
          });

          // Verify new token
          const newDecoded = AuthService.verifyToken(newAccessToken);
          request.user = {
            studentId: newDecoded.studentId,
            email: newDecoded.email,
            type: newDecoded.type,
          };

          return; // Continue with request
        }
      } catch (refreshError) {
        // Refresh failed, fall through to error
      }
    }

    return reply.status(401).send({
      success: false,
      error: {
        message: 'Token d\'authentification invalide ou expiré',
        code: 'INVALID_AUTH_TOKEN',
      },
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = request.cookies.auth_token;

    if (token) {
      const decoded = AuthService.verifyToken(token);
      
      if (decoded.type === 'access') {
        request.user = {
          studentId: decoded.studentId,
          email: decoded.email,
          type: decoded.type,
        };
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    request.user = undefined;
  }
}

/**
 * Admin authentication middleware
 */
export async function authenticateAdminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // First check regular authentication
  await authenticateMiddleware(request, reply);

  // Then check admin privileges
  const user = request.user;
  if (!user) {
    return; // Already handled by authenticateMiddleware
  }

  // Check if user has admin privileges (implement based on your needs)
  // For now, simple check - in production, check database role
  const adminEmails = ['admin@revedkids.com', 'teacher@revedkids.com'];
  
  if (!adminEmails.includes(user.email)) {
    return reply.status(403).send({
      success: false,
      error: {
        message: 'Accès administrateur requis',
        code: 'ADMIN_REQUIRED',
      },
    });
  }
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export async function authRateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const key = `auth_attempts:${request.ip}`;
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  // In production, use Redis for distributed rate limiting
  // For now, use in-memory store
  const attempts = global.authAttempts = global.authAttempts || new Map();
  
  const now = Date.now();
  const userAttempts = attempts.get(key) || { count: 0, resetTime: now + windowMs };

  // Reset if window expired
  if (now > userAttempts.resetTime) {
    userAttempts.count = 0;
    userAttempts.resetTime = now + windowMs;
  }

  // Check if limit exceeded
  if (userAttempts.count >= maxAttempts) {
    const remainingTime = Math.ceil((userAttempts.resetTime - now) / 1000);
    
    return reply.status(429).send({
      success: false,
      error: {
        message: `Trop de tentatives de connexion. Réessayez dans ${remainingTime} secondes.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: remainingTime,
      },
    });
  }

  // Increment attempts
  userAttempts.count++;
  attempts.set(key, userAttempts);
}

declare global {
  var authAttempts: Map<string, { count: number; resetTime: number }> | undefined;
}