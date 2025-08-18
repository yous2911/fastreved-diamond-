import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';

interface CorsOptions {
  development: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
  };
  production: {
    origin: string[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
    preflightContinue: boolean;
    optionsSuccessStatus: number;
  };
}

/**
 * Enhanced CORS configuration with production security
 */
export class CorsConfigurationService {
  private allowedOrigins: Set<string>;
  private dynamicOriginValidation: boolean;

  constructor() {
    this.allowedOrigins = new Set();
    this.dynamicOriginValidation = process.env.NODE_ENV === 'production';
    this.initializeAllowedOrigins();
  }

  private initializeAllowedOrigins() {
    const corsOrigin = process.env.CORS_ORIGIN || '';
    const origins = corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean);
    
    // Add default development origins if in development
    if (process.env.NODE_ENV === 'development') {
      origins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://localhost:5173', // Vite default
        'http://localhost:4173'  // Vite preview
      );
    }

    origins.forEach(origin => this.allowedOrigins.add(origin));
    
    logger.info('CORS origins initialized', { 
      count: this.allowedOrigins.size,
      origins: Array.from(this.allowedOrigins)
    });
  }

  /**
   * Dynamic origin validation for production
   */
  private validateOrigin = (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check against allowed origins
    if (this.allowedOrigins.has(origin)) {
      logger.debug('CORS origin allowed', { origin });
      return callback(null, true);
    }

    // Additional validation for production
    if (process.env.NODE_ENV === 'production') {
      // Check for subdomain patterns if configured
      const isSubdomainAllowed = this.isSubdomainAllowed(origin);
      if (isSubdomainAllowed) {
        logger.info('CORS subdomain allowed', { origin });
        return callback(null, true);
      }

      // Log security incident
      logger.warn('CORS origin blocked', { 
        origin,
        allowedOrigins: Array.from(this.allowedOrigins)
      });
      
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    }

    // In development, be more permissive but log warnings
    logger.warn('CORS origin not in allowlist (development mode)', { origin });
    return callback(null, true);
  };

  /**
   * Check if origin matches allowed subdomain patterns
   */
  private isSubdomainAllowed(origin: string): boolean {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      // Check for wildcard subdomain patterns in allowed origins
      for (const allowedOrigin of this.allowedOrigins) {
        try {
          const allowedUrl = new URL(allowedOrigin);
          const allowedHostname = allowedUrl.hostname;

          // Check for wildcard patterns like *.example.com
          if (allowedHostname.startsWith('*.')) {
            const domain = allowedHostname.substring(2);
            if (hostname.endsWith(`.${domain}`) || hostname === domain) {
              return true;
            }
          }
        } catch {
          // Invalid URL in allowed origins, skip
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get CORS configuration based on environment
   */
  getCorsConfig() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    const baseConfig = {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token',
        'X-Session-ID',
        'X-Request-ID',
        'X-Client',
        'Cache-Control',
        'Pragma'
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After'
      ]
    };

    if (isDevelopment) {
      return {
        ...baseConfig,
        origin: Array.from(this.allowedOrigins),
        optionsSuccessStatus: 200,
        preflightContinue: false
      };
    }

    if (isProduction) {
      return {
        ...baseConfig,
        origin: this.dynamicOriginValidation ? this.validateOrigin : Array.from(this.allowedOrigins),
        maxAge: 86400, // 24 hours for preflight cache
        preflightContinue: false,
        optionsSuccessStatus: 204, // No Content for preflight
        strictPreflight: true
      };
    }

    // Test environment
    return {
      ...baseConfig,
      origin: true, // Allow all origins in test
      optionsSuccessStatus: 200
    };
  }

  /**
   * Add allowed origin dynamically
   */
  addAllowedOrigin(origin: string) {
    this.allowedOrigins.add(origin);
    logger.info('CORS origin added', { origin });
  }

  /**
   * Remove allowed origin
   */
  removeAllowedOrigin(origin: string) {
    const removed = this.allowedOrigins.delete(origin);
    if (removed) {
      logger.info('CORS origin removed', { origin });
    }
    return removed;
  }

  /**
   * Get current allowed origins
   */
  getAllowedOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }
}

/**
 * CORS middleware with additional security features
 */
export const createCorsMiddleware = () => {
  const corsService = new CorsConfigurationService();
  
  return async (request: FastifyRequest, reply: any) => {
    const origin = request.headers.origin;
    
    // Log CORS requests for monitoring
    if (origin) {
      logger.debug('CORS request', {
        origin,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });
    }

    // Additional security checks for production
    if (process.env.NODE_ENV === 'production') {
      // Check for suspicious request patterns
      if (request.headers.origin && request.headers.referer) {
        try {
          const originUrl = new URL(request.headers.origin);
          const refererUrl = new URL(request.headers.referer);
          
          // Origin and referer should match for same-origin requests
          if (originUrl.hostname !== refererUrl.hostname) {
            logger.warn('Origin/Referer mismatch detected', {
              origin: request.headers.origin,
              referer: request.headers.referer,
              ip: request.ip
            });
          }
        } catch {
          // Invalid URLs, let CORS handle it
        }
      }

      // Rate limit preflight requests more aggressively
      if (request.method === 'OPTIONS') {
        const preflightKey = `preflight:${request.ip}:${origin}`;
        // This would integrate with rate limiting service
      }
    }
  };
};

/**
 * Enhanced CORS plugin with security features
 */
const corsPlugin = async (fastify: any) => {
  const corsService = new CorsConfigurationService();
  const corsConfig = corsService.getCorsConfig();

  // Register CORS with enhanced configuration
  await fastify.register(cors, corsConfig);

  // Add CORS configuration endpoint for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    fastify.get('/api/debug/cors-config', async (request: any, reply: any) => {
      return {
        allowedOrigins: corsService.getAllowedOrigins(),
        environment: process.env.NODE_ENV,
        corsConfig: {
          ...corsConfig,
          // Don't expose the validation function
          origin: Array.isArray(corsConfig.origin) ? corsConfig.origin : '[Function]'
        }
      };
    });
  }

  // Add CORS management endpoints for admin (production)
  if (process.env.NODE_ENV === 'production') {
    fastify.post('/api/admin/cors/origins', {
      preHandler: [fastify.authenticate, fastify.authorizeAdmin]
    }, async (request: any, reply: any) => {
      const { origin } = request.body;
      corsService.addAllowedOrigin(origin);
      return { success: true, message: 'Origin added to CORS allowlist' };
    });

    fastify.delete('/api/admin/cors/origins', {
      preHandler: [fastify.authenticate, fastify.authorizeAdmin]
    }, async (request: any, reply: any) => {
      const { origin } = request.body;
      const removed = corsService.removeAllowedOrigin(origin);
      return { 
        success: removed, 
        message: removed ? 'Origin removed from CORS allowlist' : 'Origin not found in allowlist'
      };
    });

    fastify.get('/api/admin/cors/origins', {
      preHandler: [fastify.authenticate, fastify.authorizeAdmin]
    }, async (request: any, reply: any) => {
      return {
        origins: corsService.getAllowedOrigins(),
        count: corsService.getAllowedOrigins().length
      };
    });
  }

  // Decorate fastify with CORS service for access in other plugins
  fastify.decorate('corsService', corsService);

  fastify.log.info('✅ Enhanced CORS plugin registered', {
    environment: process.env.NODE_ENV,
    originsCount: corsService.getAllowedOrigins().length,
    dynamicValidation: process.env.NODE_ENV === 'production'
  });
};

export default fp(corsPlugin, { 
  name: 'enhanced-cors',
  dependencies: [] 
});
