// src/plugins/security.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config, helmetConfig, rateLimitConfig, corsConfig } from '../config/config';

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  // Enhanced Helmet configuration
  await fastify.register(helmet, {
    ...helmetConfig,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' },
  });

  // Enhanced rate limiting with different rules for different endpoints
  await fastify.register(rateLimit, {
    ...rateLimitConfig,
    keyGenerator: (request) => {
      return `${request.ip}:${request.headers['user-agent'] || 'unknown'}`;
    },
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: context.ttl,
        },
      };
    },
  });

  // Specific rate limiting for auth endpoints
  await fastify.register(async function (fastify) {
    await fastify.register(rateLimit, {
      max: 5, // Only 5 login attempts
      timeWindow: 15 * 60 * 1000, // 15 minutes
      keyGenerator: (request) => `login:${request.ip}`,
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: 'LOGIN_RATE_LIMIT',
          message: 'Too many login attempts. Please try again in 15 minutes.',
        },
      }),
    });

    fastify.addHook('preHandler', async (request, reply) => {
      if (request.url.includes('/auth/login')) {
        // Additional security headers for login
        reply.header('X-Frame-Options', 'DENY');
        reply.header('X-Content-Type-Options', 'nosniff');
      }
    });
  });

  // Request sanitization
  fastify.addHook('preHandler', async (request, reply) => {
    // Sanitize request body to prevent XSS
    if (request.body && typeof request.body === 'object') {
      sanitizeObject(request.body);
    }

    // Validate request size
    const contentLength = request.headers['content-length'];
    if (contentLength && parseInt(contentLength) > config.BODY_LIMIT) {
      reply.code(413).send({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload too large',
        },
      });
      return;
    }

    // Block requests with suspicious patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
    ];

    const requestString = JSON.stringify(request.body || {}) + request.url;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        fastify.log.warn('Suspicious request blocked:', { 
          ip: request.ip, 
          url: request.url,
          userAgent: request.headers['user-agent'] 
        });
        reply.code(400).send({
          success: false,
          error: {
            code: 'SUSPICIOUS_REQUEST',
            message: 'Request blocked for security reasons',
          },
        });
        return;
      }
    }
  });

  // Request logging for security monitoring
  fastify.addHook('onRequest', async (request) => {
    if (config.NODE_ENV === 'production') {
      fastify.log.info('Incoming request', {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }
  });

  fastify.log.info('✅ Security plugin registered successfully');
};

// Helper function to sanitize objects
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potentially dangerous HTML/JS
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/onload=/gi, '')
        .replace(/onerror=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

export default fp(securityPlugin, {
  name: 'security',
});
