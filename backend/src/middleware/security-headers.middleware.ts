import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export interface SecurityHeadersOptions {
  // Content Security Policy
  csp?: {
    enabled: boolean;
    directives?: {
      [key: string]: string[];
    };
    reportUri?: string;
    reportOnly?: boolean;
    useNonce?: boolean;
  };
  
  // HTTP Strict Transport Security
  hsts?: {
    enabled: boolean;
    maxAge?: number;
    includeSubdomains?: boolean;
    preload?: boolean;
  };
  
  // X-Frame-Options
  frameOptions?: {
    enabled: boolean;
    policy: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
    allowFrom?: string;
  };
  
  // X-Content-Type-Options
  noSniff?: boolean;
  
  // X-XSS-Protection
  xssProtection?: {
    enabled: boolean;
    mode?: 'block' | 'sanitize';
  };
  
  // Referrer Policy
  referrerPolicy?: {
    enabled: boolean;
    policy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 
            'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 
            'strict-origin-when-cross-origin' | 'unsafe-url';
  };
  
  // Permissions Policy (Feature Policy)
  permissionsPolicy?: {
    enabled: boolean;
    features?: {
      [feature: string]: string[];
    };
  };
  
  // Cross-Origin policies
  crossOrigin?: {
    embedderPolicy?: 'unsafe-none' | 'require-corp';
    openerPolicy?: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin';
    resourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
  };
  
  // Custom headers
  customHeaders?: {
    [name: string]: string;
  };
  
  // Route-specific overrides
  routeOverrides?: {
    [route: string]: Partial<SecurityHeadersOptions>;
  };
}

export class SecurityHeadersService {
  private options: SecurityHeadersOptions;
  private nonceStore: Map<string, string> = new Map();

  constructor(options: SecurityHeadersOptions = {}) {
    this.options = {
      csp: {
        enabled: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'strict-dynamic'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", "data:", "https:"],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'media-src': ["'self'"],
          'object-src': ["'none'"],
          'child-src': ["'none'"],
          'frame-src': ["'none'"],
          'worker-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': [],
          'block-all-mixed-content': []
        },
        useNonce: true,
        reportOnly: process.env.NODE_ENV === 'development'
      },
      hsts: {
        enabled: process.env.NODE_ENV === 'production',
        maxAge: 31536000, // 1 year
        includeSubdomains: true,
        preload: true
      },
      frameOptions: {
        enabled: true,
        policy: 'DENY'
      },
      noSniff: true,
      xssProtection: {
        enabled: true,
        mode: 'block'
      },
      referrerPolicy: {
        enabled: true,
        policy: 'strict-origin-when-cross-origin'
      },
      permissionsPolicy: {
        enabled: true,
        features: {
          camera: ["'none'"],
          microphone: ["'none'"],
          geolocation: ["'none'"],
          payment: ["'none'"],
          usb: ["'none'"],
          magnetometer: ["'none'"],
          accelerometer: ["'none'"],
          gyroscope: ["'none'"],
          autoplay: ["'self'"],
          "encrypted-media": ["'self'"],
          "picture-in-picture": ["'none'"],
          "display-capture": ["'none'"]
        }
      },
      crossOrigin: {
        embedderPolicy: "require-corp",
        openerPolicy: "same-origin",
        resourcePolicy: "same-origin"
      },
      ...options
    };

    // Start nonce cleanup
    if (this.options.csp?.useNonce) {
      setInterval(() => this.cleanupNonces(), 60 * 60 * 1000); // Every hour
    }
  }

  /**
   * Create security headers middleware
   */
  createMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const route = request.routeOptions?.url || request.url;
        const effectiveOptions = this.getEffectiveOptions(route);

        // Apply security headers
        this.applyContentSecurityPolicy(request, reply, effectiveOptions);
        this.applyHSTSHeader(reply, effectiveOptions);
        this.applyFrameOptionsHeader(reply, effectiveOptions);
        this.applyContentTypeOptionsHeader(reply, effectiveOptions);
        this.applyXSSProtectionHeader(reply, effectiveOptions);
        this.applyReferrerPolicyHeader(reply, effectiveOptions);
        this.applyPermissionsPolicyHeader(reply, effectiveOptions);
        this.applyCrossOriginHeaders(reply, effectiveOptions);
        this.applyCustomHeaders(reply, effectiveOptions);

        // Add security info to request for other middleware
        (request as any).securityHeaders = {
          nonce: this.getNonceForRequest(request),
          appliedHeaders: this.getAppliedHeaders(effectiveOptions)
        };

      } catch (error) {
        logger.error('Security headers middleware error:', error);
        // Don't block request on security header errors
      }
    };
  }

  /**
   * Apply Content Security Policy header
   */
  private applyContentSecurityPolicy(
    request: FastifyRequest,
    reply: FastifyReply,
    options: SecurityHeadersOptions
  ) {
    if (!options.csp?.enabled) return;

    const directives = options.csp.directives || {};
    let cspString = '';

    // Generate nonce if needed
    const nonce = options.csp.useNonce ? this.generateNonce(request) : null;

    for (const [directive, values] of Object.entries(directives)) {
      if (values.length === 0) {
        cspString += `${directive}; `;
      } else {
        let directiveValues = [...values];
        
        // Add nonce to script-src and style-src if enabled
        if (nonce && (directive === 'script-src' || directive === 'style-src')) {
          directiveValues.push(`'nonce-${nonce}'`);
        }
        
        cspString += `${directive} ${directiveValues.join(' ')}; `;
      }
    }

    // Add report URI if specified
    if (options.csp.reportUri) {
      cspString += `report-uri ${options.csp.reportUri}; `;
    }

    // Set header
    const headerName = options.csp.reportOnly 
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    
    reply.header(headerName, cspString.trim());
  }

  /**
   * Apply HTTP Strict Transport Security header
   */
  private applyHSTSHeader(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.hsts?.enabled) return;

    let hstsValue = `max-age=${options.hsts.maxAge || 31536000}`;
    
    if (options.hsts.includeSubdomains) {
      hstsValue += '; includeSubDomains';
    }
    
    if (options.hsts.preload) {
      hstsValue += '; preload';
    }

    reply.header('Strict-Transport-Security', hstsValue);
  }

  /**
   * Apply X-Frame-Options header
   */
  private applyFrameOptionsHeader(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.frameOptions?.enabled) return;

    let frameOptionsValue = options.frameOptions.policy;
    
    if (options.frameOptions.policy === 'ALLOW-FROM' && options.frameOptions.allowFrom) {
      frameOptionsValue += ` ${options.frameOptions.allowFrom}`;
    }

    reply.header('X-Frame-Options', frameOptionsValue);
  }

  /**
   * Apply X-Content-Type-Options header
   */
  private applyContentTypeOptionsHeader(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (options.noSniff) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }
  }

  /**
   * Apply X-XSS-Protection header
   */
  private applyXSSProtectionHeader(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.xssProtection?.enabled) return;

    const mode = options.xssProtection.mode === 'sanitize' ? '1' : '1; mode=block';
    reply.header('X-XSS-Protection', mode);
  }

  /**
   * Apply Referrer-Policy header
   */
  private applyReferrerPolicyHeader(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.referrerPolicy?.enabled) return;

    reply.header('Referrer-Policy', options.referrerPolicy.policy);
  }

  /**
   * Apply Permissions-Policy header
   */
  private applyPermissionsPolicyHeader(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.permissionsPolicy?.enabled || !options.permissionsPolicy.features) return;

    const policies = [];
    for (const [feature, allowlist] of Object.entries(options.permissionsPolicy.features)) {
      if (allowlist.length === 0) {
        policies.push(`${feature}=()`);
      } else {
        policies.push(`${feature}=(${allowlist.join(' ')})`);
      }
    }

    if (policies.length > 0) {
      reply.header('Permissions-Policy', policies.join(', '));
    }
  }

  /**
   * Apply Cross-Origin headers
   */
  private applyCrossOriginHeaders(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.crossOrigin) return;

    if (options.crossOrigin.embedderPolicy) {
      reply.header('Cross-Origin-Embedder-Policy', options.crossOrigin.embedderPolicy);
    }

    if (options.crossOrigin.openerPolicy) {
      reply.header('Cross-Origin-Opener-Policy', options.crossOrigin.openerPolicy);
    }

    if (options.crossOrigin.resourcePolicy) {
      reply.header('Cross-Origin-Resource-Policy', options.crossOrigin.resourcePolicy);
    }
  }

  /**
   * Apply custom headers
   */
  private applyCustomHeaders(reply: FastifyReply, options: SecurityHeadersOptions) {
    if (!options.customHeaders) return;

    for (const [name, value] of Object.entries(options.customHeaders)) {
      reply.header(name, value);
    }
  }

  /**
   * Generate CSP nonce
   */
  private generateNonce(request: FastifyRequest): string {
    const requestId = (request as any).id || request.ip + Date.now();
    const nonce = Buffer.from(`${requestId}-${Date.now()}-${Math.random()}`).toString('base64');
    
    this.nonceStore.set(requestId, nonce);
    return nonce;
  }

  /**
   * Get nonce for current request
   */
  private getNonceForRequest(request: FastifyRequest): string | null {
    if (!this.options.csp?.useNonce) return null;
    
    const requestId = (request as any).id || request.ip + Date.now();
    return this.nonceStore.get(requestId) || null;
  }

  /**
   * Get effective options for route (with overrides)
   */
  private getEffectiveOptions(route: string): SecurityHeadersOptions {
    let effectiveOptions = { ...this.options };

    // Apply route-specific overrides
    if (this.options.routeOverrides) {
      for (const [routePattern, overrides] of Object.entries(this.options.routeOverrides)) {
        if (route.includes(routePattern)) {
          effectiveOptions = this.mergeOptions(effectiveOptions, overrides);
        }
      }
    }

    return effectiveOptions;
  }

  /**
   * Merge security options
   */
  private mergeOptions(
    base: SecurityHeadersOptions,
    override: Partial<SecurityHeadersOptions>
  ): SecurityHeadersOptions {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key as keyof SecurityHeadersOptions] = {
          ...(merged[key as keyof SecurityHeadersOptions] as any),
          ...value
        };
      } else {
        (merged as any)[key] = value;
      }
    }

    return merged;
  }

  /**
   * Get list of applied headers
   */
  private getAppliedHeaders(options: SecurityHeadersOptions): string[] {
    const headers = [];

    if (options.csp?.enabled) {
      headers.push(options.csp.reportOnly ? 
        'Content-Security-Policy-Report-Only' : 
        'Content-Security-Policy'
      );
    }
    if (options.hsts?.enabled) headers.push('Strict-Transport-Security');
    if (options.frameOptions?.enabled) headers.push('X-Frame-Options');
    if (options.noSniff) headers.push('X-Content-Type-Options');
    if (options.xssProtection?.enabled) headers.push('X-XSS-Protection');
    if (options.referrerPolicy?.enabled) headers.push('Referrer-Policy');
    if (options.permissionsPolicy?.enabled) headers.push('Permissions-Policy');
    if (options.crossOrigin?.embedderPolicy) headers.push('Cross-Origin-Embedder-Policy');
    if (options.crossOrigin?.openerPolicy) headers.push('Cross-Origin-Opener-Policy');
    if (options.crossOrigin?.resourcePolicy) headers.push('Cross-Origin-Resource-Policy');
    if (options.customHeaders) headers.push(...Object.keys(options.customHeaders));

    return headers;
  }

  /**
   * Cleanup old nonces
   */
  private cleanupNonces() {
    // In a real implementation, you'd want to track nonce timestamps
    // and clean up old ones. For now, just clear all periodically.
    const size = this.nonceStore.size;
    this.nonceStore.clear();
    
    if (size > 0) {
      logger.debug('Security headers nonce cleanup', { clearedNonces: size });
    }
  }

  /**
   * Get security headers configuration for debugging
   */
  getConfiguration(): SecurityHeadersOptions {
    return { ...this.options };
  }

  /**
   * Update CSP directives dynamically
   */
  updateCSPDirective(directive: string, values: string[]) {
    if (this.options.csp?.directives) {
      this.options.csp.directives[directive] = values;
      logger.info('CSP directive updated', { directive, values });
    }
  }

  /**
   * Add allowed source to CSP directive
   */
  addCSPSource(directive: string, source: string) {
    if (this.options.csp?.directives?.[directive]) {
      if (!this.options.csp.directives[directive].includes(source)) {
        this.options.csp.directives[directive].push(source);
        logger.info('CSP source added', { directive, source });
      }
    }
  }

  /**
   * Remove source from CSP directive
   */
  removeCSPSource(directive: string, source: string) {
    if (this.options.csp?.directives?.[directive]) {
      const index = this.options.csp.directives[directive].indexOf(source);
      if (index > -1) {
        this.options.csp.directives[directive].splice(index, 1);
        logger.info('CSP source removed', { directive, source });
      }
    }
  }

  /**
   * Create route-specific security configuration
   */
  static createRouteConfig(routePattern: string, config: Partial<SecurityHeadersOptions>) {
    return {
      [routePattern]: config
    };
  }

  /**
   * Create development-friendly configuration
   */
  static createDevelopmentConfig(): SecurityHeadersOptions {
    return {
      csp: {
        enabled: true,
        directives: {
          'default-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
          'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", "localhost:*"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", "data:", "https:", "http:"],
          'connect-src': ["'self'", "ws:", "wss:", "localhost:*"],
          'font-src': ["'self'", "data:"],
          'media-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-src': ["'self'"]
        },
        reportOnly: true
      },
      hsts: {
        enabled: false
      },
      frameOptions: {
        enabled: true,
        policy: 'SAMEORIGIN'
      }
    };
  }

  /**
   * Create production-ready configuration
   */
  static createProductionConfig(): SecurityHeadersOptions {
    return {
      csp: {
        enabled: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'strict-dynamic'"],
          'style-src': ["'self'"],
          'img-src': ["'self'", "data:", "https:"],
          'connect-src': ["'self'"],
          'font-src': ["'self'"],
          'media-src': ["'self'"],
          'object-src': ["'none'"],
          'child-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': []
        },
        useNonce: true,
        reportOnly: false
      },
      hsts: {
        enabled: true,
        maxAge: 31536000,
        includeSubdomains: true,
        preload: true
      },
      frameOptions: {
        enabled: true,
        policy: 'DENY'
      }
    };
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    this.nonceStore.clear();
    logger.info('Security headers service shutdown');
  }
}