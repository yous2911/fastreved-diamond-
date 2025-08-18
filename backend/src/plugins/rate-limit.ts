// src/plugins/rate-limit.ts - Enhanced with DDoS protection
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { rateLimitConfig, authRateLimitConfig, globalRateLimitConfig, ddosConfig, config } from '../config/config';
import { EnhancedRateLimitingService } from '../services/enhanced-rate-limiting.service';

const rateLimitPlugin = async (fastify: any) => {
  // Initialize enhanced rate limiting service for DDoS protection
  const enhancedRateLimit = new EnhancedRateLimitingService({
    global: {
      windowMs: globalRateLimitConfig.timeWindow,
      max: globalRateLimitConfig.max,
      headers: true,
      message: 'Global rate limit exceeded'
    },
    perUser: {
      windowMs: rateLimitConfig.timeWindow,
      max: rateLimitConfig.max,
      burst: Math.floor(rateLimitConfig.max * 0.2), // 20% burst capacity
      premium: {
        max: Math.floor(rateLimitConfig.max * 1.5), // 50% more for premium users
        burst: Math.floor(rateLimitConfig.max * 0.3)
      }
    },
    perIP: {
      windowMs: rateLimitConfig.timeWindow,
      max: rateLimitConfig.max,
      headers: true
    },
    // Geographic rate limits for high-risk countries (example)
    geoLimits: config.NODE_ENV === 'production' ? {
      'CN': { windowMs: 15 * 60 * 1000, max: 50, reason: 'Geographic restriction' },
      'RU': { windowMs: 15 * 60 * 1000, max: 50, reason: 'Geographic restriction' }
    } : undefined,
    allowlist: ['127.0.0.1', '::1'], // Local IPs
    exemptUserRoles: ['admin', 'system'],
    exemptRoutes: ['/api/health', '/api/metrics', '/docs'],
    enableBehavioralAnalysis: true,
    suspiciousThreshold: 100,
    enablePenalties: true,
    penaltyMultiplier: 2,
    maxPenaltyTime: 24 * 60 * 60 * 1000, // 24 hours max penalty
    customRules: [
      {
        id: 'auth-strict',
        name: 'Strict Auth Limits',
        condition: (req) => req.url.startsWith('/api/auth/'),
        limit: {
          windowMs: authRateLimitConfig.timeWindow,
          max: authRateLimitConfig.max,
          headers: true,
          message: 'Too many authentication attempts'
        },
        action: 'block',
        priority: 100,
        enabled: true
      },
      {
        id: 'ddos-protection',
        name: 'DDoS Protection',
        condition: (req) => true, // Apply to all requests
        limit: {
          windowMs: ddosConfig.timeWindow,
          max: ddosConfig.maxRequests,
          headers: false,
          message: 'Request rate too high - possible DDoS attack'
        },
        action: 'block',
        priority: 1000,
        enabled: true
      },
      {
        id: 'api-burst',
        name: 'API Burst Protection',
        condition: (req) => req.url.startsWith('/api/') && !req.url.includes('/health'),
        limit: {
          windowMs: 1000, // 1 second window
          max: 10, // Max 10 requests per second
          headers: true,
          message: 'API burst limit exceeded'
        },
        action: 'delay',
        priority: 50,
        enabled: true
      }
    ]
  });

  // Register enhanced rate limiting middleware globally
  fastify.addHook('preHandler', enhancedRateLimit.createMiddleware());

  // Register traditional rate limiting for compatibility
  await fastify.register(rateLimit, {
    ...rateLimitConfig,
    redis: fastify.redis || undefined,
    skip: (request: any) => {
      // Skip for health checks and metrics
      if (request.url === '/api/health' || request.url === '/api/metrics' || request.url === '/docs') {
        return true;
      }
      
      // Skip for allowlisted IPs
      const clientIP = request.ip || request.headers['x-forwarded-for'] || request.headers['x-real-ip'];
      return rateLimitConfig.allowList?.includes(clientIP) || false;
    },
    errorResponseBuilder: (request: any, context: any) => {
      const isAuthRoute = request.url.startsWith('/api/auth/');
      
      fastify.log.warn('Rate limit exceeded', {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
        limit: context.limit,
        remaining: context.remaining,
        ttl: context.ttl
      });
      
      return {
        success: false,
        error: {
          message: isAuthRoute 
            ? 'Too many authentication attempts' 
            : 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(context.ttl / 1000),
          details: config.NODE_ENV === 'development' ? {
            limit: context.limit,
            remaining: context.remaining,
            resetTime: new Date(Date.now() + context.ttl)
          } : undefined
        },
      };
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    },
  });

  // Add rate limiting stats endpoint for monitoring
  fastify.get('/api/internal/rate-limit/stats', {
    schema: {
      tags: ['Internal'],
      summary: 'Get rate limiting statistics',
      security: [{ adminAuth: [] }]
    }
  }, async (request: any, reply: any) => {
    const stats = enhancedRateLimit.getStats();
    return {
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        configuration: {
          globalLimit: globalRateLimitConfig.max,
          ipLimit: rateLimitConfig.max,
          authLimit: authRateLimitConfig.max,
          ddosProtection: {
            maxRequests: ddosConfig.maxRequests,
            timeWindow: ddosConfig.timeWindow,
            banDuration: ddosConfig.banDuration
          }
        }
      }
    };
  });

  // Add IP management endpoints for administrators
  fastify.post('/api/internal/rate-limit/block-ip', {
    schema: {
      tags: ['Internal'],
      summary: 'Block IP address',
      security: [{ adminAuth: [] }],
      body: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' },
          duration: { type: 'number', default: 24 * 60 * 60 * 1000 } // 24 hours
        }
      }
    }
  }, async (request: any, reply: any) => {
    const { ip, duration } = request.body;
    enhancedRateLimit.blockIP(ip, duration);
    
    fastify.log.info('IP manually blocked', { 
      ip, 
      duration: duration / 1000, 
      admin: request.user?.id 
    });
    
    return { success: true, message: `IP ${ip} blocked for ${duration / 1000} seconds` };
  });

  fastify.post('/api/internal/rate-limit/unblock-ip', {
    schema: {
      tags: ['Internal'],
      summary: 'Unblock IP address',
      security: [{ adminAuth: [] }],
      body: {
        type: 'object',
        required: ['ip'],
        properties: {
          ip: { type: 'string' }
        }
      }
    }
  }, async (request: any, reply: any) => {
    const { ip } = request.body;
    enhancedRateLimit.unblockIP(ip);
    
    fastify.log.info('IP manually unblocked', { 
      ip, 
      admin: request.user?.id 
    });
    
    return { success: true, message: `IP ${ip} unblocked` };
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    enhancedRateLimit.shutdown();
  });

  // Store reference for access in other parts of the application
  fastify.decorate('enhancedRateLimit', enhancedRateLimit);

  fastify.log.info('✅ Enhanced rate limit plugin registered with DDoS protection');
};

export default fp(rateLimitPlugin, { name: 'rateLimit' });
