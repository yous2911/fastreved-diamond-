// src/plugins/auth.ts - Enhanced with secure cookie handling and JWT refresh
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { 
  authenticateMiddleware, 
  optionalAuthMiddleware, 
  authenticateAdminMiddleware,
  authRateLimitMiddleware 
} from '../middleware/auth.middleware';
import { jwtConfig, cookieConfig, config } from '../config/config';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const authPlugin = async (fastify: any) => {
  // Register cookie support with secure configuration
  await fastify.register(cookie, {
    secret: cookieConfig.secret,
    parseOptions: {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      maxAge: cookieConfig.maxAge,
      path: '/',
      domain: config.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    }
  });

  // Register JWT with refresh token support
  await fastify.register(jwt, {
    secret: jwtConfig.secret,
    sign: {
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      expiresIn: jwtConfig.expiresIn
    },
    verify: {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    },
    cookie: {
      cookieName: 'access-token',
      signed: true
    }
  });

  // Register separate JWT instance for refresh tokens
  await fastify.register(jwt, {
    secret: jwtConfig.refreshSecret,
    namespace: 'refreshJwt',
    sign: {
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      expiresIn: jwtConfig.refreshExpiresIn
    },
    verify: {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    },
    cookie: {
      cookieName: 'refresh-token',
      signed: true
    }
  });

  // Register authentication middleware decorators
  fastify.decorate('authenticate', authenticateMiddleware);
  fastify.decorate('optionalAuth', optionalAuthMiddleware);  
  fastify.decorate('authenticateAdmin', authenticateAdminMiddleware);
  fastify.decorate('authRateLimit', authRateLimitMiddleware);

  // Add secure cookie helpers
  fastify.decorate('setAuthCookies', (reply: any, accessToken: string, refreshToken: string) => {
    // Set access token cookie (shorter expiry)
    reply.setCookie('access-token', accessToken, {
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
      signed: true
    });

    // Set refresh token cookie (longer expiry)
    reply.setCookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      maxAge: cookieConfig.maxAge, // 7 days
      path: '/api/auth/refresh',
      signed: true
    });
  });

  fastify.decorate('clearAuthCookies', (reply: any) => {
    reply.clearCookie('access-token', { path: '/' });
    reply.clearCookie('refresh-token', { path: '/api/auth/refresh' });
  });

  // Add token refresh endpoint
  fastify.post('/api/auth/refresh', {
    schema: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: any, reply: any) => {
    try {
      // Get refresh token from cookie or header
      let refreshToken = request.cookies['refresh-token'];
      
      if (!refreshToken && request.headers.authorization) {
        const authHeader = request.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          refreshToken = authHeader.substring(7);
        }
      }

      if (!refreshToken) {
        logger.warn('Refresh attempt without token', { 
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });
        return reply.status(401).send({
          success: false,
          error: 'Refresh token required'
        });
      }

      // Verify and decode refresh token
      let decoded: any;
      try {
        decoded = await fastify.refreshJwt.verify(refreshToken);
      } catch (error) {
        logger.warn('Invalid refresh token', { 
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          error: error.message
        });
        
        // Clear invalid cookies
        fastify.clearAuthCookies(reply);
        
        return reply.status(401).send({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      if (decoded.type !== 'refresh') {
        logger.warn('Wrong token type for refresh', { 
          ip: request.ip,
          tokenType: decoded.type
        });
        return reply.status(401).send({
          success: false,
          error: 'Invalid token type'
        });
      }

      // Generate new access token
      const newAccessToken = await fastify.jwt.sign({
        studentId: decoded.studentId,
        email: decoded.email,
        type: 'access'
      });

      // Optionally rotate refresh token for better security
      let newRefreshToken = refreshToken;
      if (config.NODE_ENV === 'production') {
        newRefreshToken = await fastify.refreshJwt.sign({
          studentId: decoded.studentId,
          email: decoded.email,
          type: 'refresh',
          tokenId: require('crypto').randomUUID()
        });
      }

      // Set new cookies
      fastify.setAuthCookies(reply, newAccessToken, newRefreshToken);

      logger.info('Token refreshed successfully', { 
        studentId: decoded.studentId,
        ip: request.ip
      });

      return reply.send({
        success: true,
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Add authentication hooks for protected routes
  fastify.addHook('preHandler', async (request: any, reply: any) => {
    // Skip auth for public routes
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register', 
      '/api/auth/refresh',
      '/api/auth/password-reset',
      '/api/auth/password-reset/confirm',
      '/api/health',
      '/api/metrics',
      '/docs'
    ];

    // Skip auth for static files and Swagger UI
    if (request.url.startsWith('/static/') || 
        request.url.startsWith('/assets/') ||
        request.url.startsWith('/documentation') ||
        publicRoutes.some(route => request.url.startsWith(route))) {
      return;
    }

    // Apply rate limiting to auth routes
    if (request.url.startsWith('/api/auth/')) {
      await authRateLimitMiddleware(request, reply);
    }

    // Auto-refresh expired access tokens
    if (request.url.startsWith('/api/')) {
      const accessToken = request.cookies['access-token'];
      const refreshToken = request.cookies['refresh-token'];

      if (!accessToken && refreshToken) {
        // Try to refresh token automatically
        try {
          const decoded = await fastify.refreshJwt.verify(refreshToken);
          if (decoded.type === 'refresh') {
            const newAccessToken = await fastify.jwt.sign({
              studentId: decoded.studentId,
              email: decoded.email,
              type: 'access'
            });

            // Set new access token cookie
            reply.setCookie('access-token', newAccessToken, {
              httpOnly: true,
              secure: cookieConfig.secure,
              sameSite: cookieConfig.sameSite,
              maxAge: 15 * 60 * 1000,
              path: '/',
              signed: true
            });

            // Add user to request context
            request.user = {
              studentId: decoded.studentId,
              email: decoded.email
            };

            logger.debug('Auto-refreshed access token', { 
              studentId: decoded.studentId 
            });
          }
        } catch (error) {
          // Refresh failed, clear cookies
          fastify.clearAuthCookies(reply);
        }
      }
    }
  });

  // Add logout endpoint
  fastify.post('/api/auth/logout', {
    schema: {
      tags: ['Authentication'],
      summary: 'Logout user',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: any, reply: any) => {
    try {
      // Get user from token if available
      if (request.user?.studentId) {
        await AuthService.logoutStudent(request.user.studentId);
        logger.info('User logged out', { 
          studentId: request.user.studentId,
          ip: request.ip 
        });
      }

      // Clear auth cookies
      fastify.clearAuthCookies(reply);

      return reply.send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      fastify.clearAuthCookies(reply);
      return reply.send({
        success: true,
        message: 'Logged out successfully'
      });
    }
  });

  fastify.log.info('✅ Enhanced auth plugin registered with secure cookies and refresh tokens');
};

export default fp(authPlugin, { name: 'auth' });

