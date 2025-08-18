import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export interface CSRFToken {
  token: string;
  secret: string;
  createdAt: Date;
  expiresAt: Date;
  userId?: string;
  sessionId?: string;
}

export interface CSRFOptions {
  secretLength: number;
  tokenLength: number;
  maxAge: number; // in milliseconds
  cookieName: string;
  headerName: string;
  saltLength: number;
  ignoreMethods: string[];
  skipRoutes: string[];
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
}

export class CSRFProtectionService {
  private options: CSRFOptions;
  private activeTokens: Map<string, CSRFToken> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: Partial<CSRFOptions> = {}) {
    this.options = {
      secretLength: 32,
      tokenLength: 32,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      cookieName: '_csrf',
      headerName: 'x-csrf-token',
      saltLength: 8,
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      skipRoutes: ['/api/health', '/api/metrics', '/api/upload/health'],
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      ...options
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(userId?: string, sessionId?: string): CSRFToken {
    const secret = crypto.randomBytes(this.options.secretLength).toString('hex');
    const salt = crypto.randomBytes(this.options.saltLength).toString('hex');
    const token = this.createTokenFromSecret(secret, salt);
    
    const csrfToken: CSRFToken = {
      token: `${salt}.${token}`,
      secret,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.options.maxAge),
      userId,
      sessionId
    };

    // Store token for validation
    this.activeTokens.set(csrfToken.token, csrfToken);

    logger.debug('CSRF token generated', {
      tokenId: csrfToken.token.substring(0, 8) + '...',
      userId,
      sessionId,
      expiresAt: csrfToken.expiresAt
    });

    return csrfToken;
  }

  /**
   * Validate CSRF token
   */
  validateToken(token: string, userId?: string, sessionId?: string): boolean {
    try {
      if (!token) {
        logger.warn('CSRF validation failed: No token provided');
        return false;
      }

      const storedToken = this.activeTokens.get(token);
      if (!storedToken) {
        logger.warn('CSRF validation failed: Token not found', {
          tokenId: token.substring(0, 8) + '...'
        });
        return false;
      }

      // Check expiration
      if (new Date() > storedToken.expiresAt) {
        logger.warn('CSRF validation failed: Token expired', {
          tokenId: token.substring(0, 8) + '...',
          expiresAt: storedToken.expiresAt
        });
        this.activeTokens.delete(token);
        return false;
      }

      // Validate token format and integrity
      const [salt, tokenPart] = token.split('.');
      if (!salt || !tokenPart) {
        logger.warn('CSRF validation failed: Invalid token format');
        return false;
      }

      const expectedToken = this.createTokenFromSecret(storedToken.secret, salt);
      if (!crypto.timingSafeEqual(Buffer.from(tokenPart), Buffer.from(expectedToken))) {
        logger.warn('CSRF validation failed: Token integrity check failed');
        return false;
      }

      // Validate user context if provided
      if (userId && storedToken.userId && storedToken.userId !== userId) {
        logger.warn('CSRF validation failed: User ID mismatch', {
          tokenUserId: storedToken.userId,
          requestUserId: userId
        });
        return false;
      }

      // Validate session context if provided
      if (sessionId && storedToken.sessionId && storedToken.sessionId !== sessionId) {
        logger.warn('CSRF validation failed: Session ID mismatch', {
          tokenSessionId: storedToken.sessionId,
          requestSessionId: sessionId
        });
        return false;
      }

      logger.debug('CSRF token validated successfully', {
        tokenId: token.substring(0, 8) + '...',
        userId,
        sessionId
      });

      return true;

    } catch (error) {
      logger.error('CSRF validation error:', error);
      return false;
    }
  }

  /**
   * Create CSRF protection middleware
   */
  createMiddleware(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Skip CSRF protection for certain methods
        if (this.options.ignoreMethods.includes(request.method)) {
          return;
        }

        // Skip CSRF protection for certain routes
        const route = request.routeOptions?.url || request.url;
        if (this.options.skipRoutes.some(skipRoute => route.includes(skipRoute))) {
          return;
        }

        // Get user and session context
        const userId = (request as any).user?.id;
        const sessionId = (request as any).session?.id || request.headers['x-session-id'] as string;

        // For state-changing requests, validate CSRF token
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
          const token = this.extractTokenFromRequest(request);
          
          if (!token) {
            logger.warn('CSRF protection triggered: No token in request', {
              method: request.method,
              url: route,
              userAgent: request.headers['user-agent'],
              ip: request.ip,
              userId
            });
            
            return reply.status(403).send({
              error: 'CSRF token missing',
              message: 'CSRF protection requires a valid token for this request'
            });
          }

          if (!this.validateToken(token, userId, sessionId)) {
            logger.warn('CSRF protection triggered: Invalid token', {
              method: request.method,
              url: route,
              userAgent: request.headers['user-agent'],
              ip: request.ip,
              userId,
              tokenId: token.substring(0, 8) + '...'
            });

            return reply.status(403).send({
              error: 'CSRF token invalid',
              message: 'CSRF protection rejected this request due to invalid token'
            });
          }

          // Optional: Remove token after successful validation for one-time use
          // this.activeTokens.delete(token);
        }

      } catch (error) {
        logger.error('CSRF middleware error:', error);
        return reply.status(500).send({
          error: 'CSRF protection error',
          message: 'Internal error in CSRF protection system'
        });
      }
      return; // Explicit return for all code paths
    };
  }

  /**
   * Endpoint to get CSRF token
   */
  async getTokenEndpoint(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = (request as any).user?.id;
      const sessionId = (request as any).session?.id || request.headers['x-session-id'] as string;
      
      const csrfToken = this.generateToken(userId, sessionId);

      // Set token in cookie
      reply.header('Set-Cookie', `${this.options.cookieName}=${csrfToken.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${this.options.cookieOptions.maxAge}`);

      return reply.send({
        success: true,
        token: csrfToken.token,
        expiresAt: csrfToken.expiresAt.toISOString()
      });

    } catch (error) {
      logger.error('Error generating CSRF token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate CSRF token'
      });
    }
  }

  /**
   * Refresh CSRF token
   */
  async refreshToken(oldToken: string, userId?: string, sessionId?: string): Promise<CSRFToken | null> {
    try {
      // Validate old token first
      if (!this.validateToken(oldToken, userId, sessionId)) {
        return null;
      }

      // Remove old token
      this.activeTokens.delete(oldToken);

      // Generate new token
      return this.generateToken(userId, sessionId);

    } catch (error) {
      logger.error('Error refreshing CSRF token:', error);
      return null;
    }
  }

  /**
   * Revoke token (logout, session invalidation)
   */
  revokeToken(token: string): boolean {
    const deleted = this.activeTokens.delete(token);
    if (deleted) {
      logger.debug('CSRF token revoked', {
        tokenId: token.substring(0, 8) + '...'
      });
    }
    return deleted;
  }

  /**
   * Revoke all tokens for a user
   */
  revokeUserTokens(userId: string): number {
    let revokedCount = 0;
    
    for (const [token, tokenData] of this.activeTokens.entries()) {
      if (tokenData.userId === userId) {
        this.activeTokens.delete(token);
        revokedCount++;
      }
    }

    if (revokedCount > 0) {
      logger.info('CSRF tokens revoked for user', {
        userId,
        revokedCount
      });
    }

    return revokedCount;
  }

  /**
   * Extract token from request headers, body, or cookies
   */
  private extractTokenFromRequest(request: FastifyRequest): string | null {
    // Check header
    const headerToken = request.headers[this.options.headerName] as string;
    if (headerToken) {
      return headerToken;
    }

    // Check body
    const body = request.body as any;
    if (body && body._csrf) {
      return body._csrf;
    }

    // Check cookies
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          acc[name] = value;
        }
        return acc;
      }, {} as Record<string, string>);
      
      if (cookies[this.options.cookieName]) {
        return cookies[this.options.cookieName];
      }
    }

    // Check query parameters (less secure, but sometimes needed)
    const query = request.query as any;
    if (query && query._csrf) {
      return query._csrf;
    }

    return null;
  }

  /**
   * Create token from secret and salt
   */
  private createTokenFromSecret(secret: string, salt: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(salt);
    return hmac.digest('hex');
  }

  /**
   * Cleanup expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, tokenData] of this.activeTokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.activeTokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('CSRF tokens cleaned up', {
        cleanedCount,
        activeCount: this.activeTokens.size
      });
    }
  }

  /**
   * Get token statistics
   */
  getStats(): {
    activeTokens: number;
    expiredTokens: number;
    totalGenerated: number;
  } {
    const now = new Date();
    let expiredCount = 0;

    for (const tokenData of this.activeTokens.values()) {
      if (now > tokenData.expiresAt) {
        expiredCount++;
      }
    }

    return {
      activeTokens: this.activeTokens.size - expiredCount,
      expiredTokens: expiredCount,
      totalGenerated: this.activeTokens.size
    };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.activeTokens.clear();
    logger.info('CSRF protection service shutdown');
  }
}