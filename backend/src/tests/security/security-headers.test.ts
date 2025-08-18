import { describe, it, expect, beforeEach, afterEach, jest } from '@Jest/globals';
import { SecurityHeadersService, SecurityHeadersOptions } from '../../middleware/security-headers.middleware';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('SecurityHeadersService', () => {
  let service: SecurityHeadersService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    service = new SecurityHeadersService();
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      routeOptions: { url: '/api/test' },
      ip: '127.0.0.1'
    };
    mockReply = {
      header: jest.fn().mockReturnThis(),
      setCookie: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Content Security Policy', () => {
    it('should set CSP header with default directives', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy-Report-Only',
        expect.stringContaining("default-src 'self'")
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy-Report-Only',
        expect.stringContaining("script-src 'self'")
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy-Report-Only',
        expect.stringContaining("object-src 'none'")
      );
    });

    it('should include nonce in CSP when enabled', async () => {
      const serviceWithNonce = new SecurityHeadersService({
        csp: {
          enabled: true,
          useNonce: true,
          reportOnly: false,
          directives: {
            'script-src': ["'self'"]
          }
        }
      });

      const middleware = serviceWithNonce.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringMatching(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+/)
      );

      serviceWithNonce.shutdown();
    });

    it('should set enforcing CSP in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const productionService = new SecurityHeadersService();
      const middleware = productionService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String)
      );

      process.env.NODE_ENV = originalEnv;
      productionService.shutdown();
    });

    it('should disable CSP when configured', async () => {
      const noCspService = new SecurityHeadersService({
        csp: { enabled: false }
      });

      const middleware = noCspService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith(
        expect.stringMatching(/Content-Security-Policy/),
        expect.any(String)
      );

      noCspService.shutdown();
    });

    it('should allow custom CSP directives', async () => {
      const customCspService = new SecurityHeadersService({
        csp: {
          enabled: true,
          reportOnly: false,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", "data:", "https:"],
            'connect-src': ["'self'", "wss://websocket.example.com"]
          }
        }
      });

      const middleware = customCspService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("script-src 'self' 'unsafe-inline' https://trusted-cdn.com")
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("connect-src 'self' wss://websocket.example.com")
      );

      customCspService.shutdown();
    });
  });

  describe('HTTP Strict Transport Security', () => {
    it('should set HSTS header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const productionService = new SecurityHeadersService();
      const middleware = productionService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      process.env.NODE_ENV = originalEnv;
      productionService.shutdown();
    });

    it('should not set HSTS header in development', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
    });

    it('should allow custom HSTS configuration', async () => {
      const customHstsService = new SecurityHeadersService({
        hsts: {
          enabled: true,
          maxAge: 86400, // 1 day
          includeSubdomains: false,
          preload: false
        }
      });

      const middleware = customHstsService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=86400'
      );

      customHstsService.shutdown();
    });
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to DENY by default', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should allow SAMEORIGIN policy', async () => {
      const sameOriginService = new SecurityHeadersService({
        frameOptions: {
          enabled: true,
          policy: 'SAMEORIGIN'
        }
      });

      const middleware = sameOriginService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');

      sameOriginService.shutdown();
    });

    it('should allow ALLOW-FROM with specific origin', async () => {
      const allowFromService = new SecurityHeadersService({
        frameOptions: {
          enabled: true,
          policy: 'ALLOW-FROM',
          allowFrom: 'https://trusted-partner.com'
        }
      });

      const middleware = allowFromService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Frame-Options',
        'ALLOW-FROM https://trusted-partner.com'
      );

      allowFromService.shutdown();
    });

    it('should disable X-Frame-Options when configured', async () => {
      const noFrameService = new SecurityHeadersService({
        frameOptions: { enabled: false }
      });

      const middleware = noFrameService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith('X-Frame-Options', expect.any(String));

      noFrameService.shutdown();
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff by default', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should not set header when disabled', async () => {
      const noSniffDisabled = new SecurityHeadersService({
        noSniff: false
      });

      const middleware = noSniffDisabled.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith('X-Content-Type-Options', expect.any(String));

      noSniffDisabled.shutdown();
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection with block mode by default', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should allow sanitize mode', async () => {
      const sanitizeService = new SecurityHeadersService({
        xssProtection: {
          enabled: true,
          mode: 'sanitize'
        }
      });

      const middleware = sanitizeService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-XSS-Protection', '1');

      sanitizeService.shutdown();
    });

    it('should disable X-XSS-Protection when configured', async () => {
      const noXssService = new SecurityHeadersService({
        xssProtection: { enabled: false }
      });

      const middleware = noXssService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith('X-XSS-Protection', expect.any(String));

      noXssService.shutdown();
    });
  });

  describe('Referrer-Policy', () => {
    it('should set Referrer-Policy to strict-origin-when-cross-origin by default', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    it('should allow custom referrer policy', async () => {
      const customReferrerService = new SecurityHeadersService({
        referrerPolicy: {
          enabled: true,
          policy: 'no-referrer'
        }
      });

      const middleware = customReferrerService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');

      customReferrerService.shutdown();
    });
  });

  describe('Permissions Policy', () => {
    it('should set Permissions-Policy with default features', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('camera=()')
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('microphone=()')
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );
    });

    it('should allow custom permissions policy', async () => {
      const customPermissionsService = new SecurityHeadersService({
        permissionsPolicy: {
          enabled: true,
          features: {
            camera: ["'self'"],
            microphone: ["'none'"],
            geolocation: ["'self'", "https://maps.google.com"]
          }
        }
      });

      const middleware = customPermissionsService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining("camera=('self')")
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining("geolocation=('self' https://maps.google.com)")
      );

      customPermissionsService.shutdown();
    });

    it('should disable Permissions-Policy when configured', async () => {
      const noPermissionsService = new SecurityHeadersService({
        permissionsPolicy: { enabled: false }
      });

      const middleware = noPermissionsService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith('Permissions-Policy', expect.any(String));

      noPermissionsService.shutdown();
    });
  });

  describe('Cross-Origin Headers', () => {
    it('should set Cross-Origin headers by default', async () => {
      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-origin');
    });

    it('should allow custom cross-origin policies', async () => {
      const customCrossOriginService = new SecurityHeadersService({
        crossOrigin: {
          embedderPolicy: 'unsafe-none',
          openerPolicy: 'same-origin-allow-popups',
          resourcePolicy: 'cross-origin'
        }
      });

      const middleware = customCrossOriginService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'unsafe-none');
      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
      expect(mockReply.header).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');

      customCrossOriginService.shutdown();
    });
  });

  describe('Custom Headers', () => {
    it('should set custom headers', async () => {
      const customHeadersService = new SecurityHeadersService({
        customHeaders: {
          'X-Custom-Security': 'enabled',
          'X-API-Version': '1.0',
          'X-Rate-Limit-Policy': 'strict'
        }
      });

      const middleware = customHeadersService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Custom-Security', 'enabled');
      expect(mockReply.header).toHaveBeenCalledWith('X-API-Version', '1.0');
      expect(mockReply.header).toHaveBeenCalledWith('X-Rate-Limit-Policy', 'strict');

      customHeadersService.shutdown();
    });
  });

  describe('Route-Specific Overrides', () => {
    it('should apply route-specific configurations', async () => {
      const routeOverrideService = new SecurityHeadersService({
        frameOptions: {
          enabled: true,
          policy: 'DENY'
        },
        routeOverrides: {
          '/api/embed': {
            frameOptions: {
              enabled: true,
              policy: 'SAMEORIGIN'
            }
          }
        }
      });

      const middleware = routeOverrideService.createMiddleware();

      // Test default route
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');

      // Reset mock
      (mockReply.header as jest.Mock).mockClear();

      // Test override route
      mockRequest.url = '/api/embed/widget';
      mockRequest.routeOptions = { url: '/api/embed/widget' };
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');

      routeOverrideService.shutdown();
    });

    it('should apply multiple route overrides', async () => {
      const multiOverrideService = new SecurityHeadersService({
        noSniff: true,
        routeOverrides: {
          '/api/public': {
            noSniff: false,
            customHeaders: {
              'X-Public-API': 'true'
            }
          },
          '/api/admin': {
            customHeaders: {
              'X-Admin-Only': 'true'
            }
          }
        }
      });

      const middleware = multiOverrideService.createMiddleware();

      // Test public API route
      mockRequest.url = '/api/public/data';
      mockRequest.routeOptions = { url: '/api/public/data' };
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).not.toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockReply.header).toHaveBeenCalledWith('X-Public-API', 'true');

      // Reset mock
      (mockReply.header as jest.Mock).mockClear();

      // Test admin route
      mockRequest.url = '/api/admin/users';
      mockRequest.routeOptions = { url: '/api/admin/users' };
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockReply.header).toHaveBeenCalledWith('X-Admin-Only', 'true');

      multiOverrideService.shutdown();
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = service.getConfiguration();

      expect(config).toHaveProperty('csp');
      expect(config).toHaveProperty('hsts');
      expect(config).toHaveProperty('frameOptions');
      expect(config).toHaveProperty('noSniff');
      expect(config.csp.enabled).toBe(true);
    });

    it('should update CSP directive dynamically', () => {
      service.updateCSPDirective('script-src', ["'self'", "'unsafe-inline'"]);

      const config = service.getConfiguration();
      expect(config.csp?.directives?.['script-src']).toContain("'unsafe-inline'");
    });

    it('should add CSP source', () => {
      service.addCSPSource('script-src', 'https://trusted-cdn.com');

      const config = service.getConfiguration();
      expect(config.csp?.directives?.['script-src']).toContain('https://trusted-cdn.com');
    });

    it('should remove CSP source', () => {
      // First add a source
      service.addCSPSource('script-src', 'https://untrusted-cdn.com');
      
      // Then remove it
      service.removeCSPSource('script-src', 'https://untrusted-cdn.com');

      const config = service.getConfiguration();
      expect(config.csp?.directives?.['script-src']).not.toContain('https://untrusted-cdn.com');
    });
  });

  describe('Static Configuration Helpers', () => {
    it('should create development-friendly configuration', () => {
      const devConfig = SecurityHeadersService.createDevelopmentConfig();

      expect(devConfig.csp?.reportOnly).toBe(true);
      expect(devConfig.hsts?.enabled).toBe(false);
      expect(devConfig.frameOptions?.policy).toBe('SAMEORIGIN');
      expect(devConfig.csp?.directives?.['script-src']).toContain("'unsafe-eval'");
    });

    it('should create production-ready configuration', () => {
      const prodConfig = SecurityHeadersService.createProductionConfig();

      expect(prodConfig.csp?.reportOnly).toBe(false);
      expect(prodConfig.hsts?.enabled).toBe(true);
      expect(prodConfig.frameOptions?.policy).toBe('DENY');
      expect(prodConfig.csp?.directives?.['script-src']).toContain("'strict-dynamic'");
    });

    it('should create route-specific configuration', () => {
      const routeConfig = SecurityHeadersService.createRouteConfig('/api/embed', {
        frameOptions: {
          enabled: true,
          policy: 'SAMEORIGIN'
        }
      });

      expect(routeConfig).toHaveProperty('/api/embed');
      expect(routeConfig['/api/embed'].frameOptions?.policy).toBe('SAMEORIGIN');
    });
  });

  describe('Nonce Management', () => {
    it('should generate unique nonces for requests', async () => {
      const nonceService = new SecurityHeadersService({
        csp: {
          enabled: true,
          useNonce: true,
          reportOnly: false
        }
      });

      const middleware = nonceService.createMiddleware();
      
      // First request
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      const firstCall = (mockReply.header as jest.Mock).mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );
      const firstNonce = firstCall[1].match(/'nonce-([^']+)'/)?.[1];

      // Reset mock
      (mockReply.header as jest.Mock).mockClear();

      // Second request
      mockRequest.ip = '192.168.1.2'; // Different IP to ensure different nonce
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      const secondCall = (mockReply.header as jest.Mock).mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );
      const secondNonce = secondCall[1].match(/'nonce-([^']+)'/)?.[1];

      expect(firstNonce).toBeDefined();
      expect(secondNonce).toBeDefined();
      expect(firstNonce).not.toBe(secondNonce);

      nonceService.shutdown();
    });

    it('should add security info to request', async () => {
      const nonceService = new SecurityHeadersService({
        csp: {
          enabled: true,
          useNonce: true
        }
      });

      const middleware = nonceService.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect((mockRequest as any).securityHeaders).toBeDefined();
      expect((mockRequest as any).securityHeaders.nonce).toBeDefined();
      expect((mockRequest as any).securityHeaders.appliedHeaders).toBeInstanceOf(Array);

      nonceService.shutdown();
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock a method to throw an error
      const originalApplyCSP = (service as any).applyContentSecurityPolicy;
      (service as any).applyContentSecurityPolicy = jest.fn().mockImplementation(() => {
        throw new Error('CSP application error');
      });

      const middleware = service.createMiddleware();
      
      // Should not throw an error
      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).resolves.not.toThrow();

      // Restore original method
      (service as any).applyContentSecurityPolicy = originalApplyCSP;
    });

    it('should continue setting other headers when one fails', async () => {
      // Mock one header method to fail
      const originalApplyHSTS = (service as any).applyHSTSHeader;
      (service as any).applyHSTSHeader = jest.fn().mockImplementation(() => {
        throw new Error('HSTS error');
      });

      const middleware = service.createMiddleware();
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Other headers should still be set
      expect(mockReply.header).toHaveBeenCalledWith('X-Frame-Options', expect.any(String));
      expect(mockReply.header).toHaveBeenCalledWith('X-Content-Type-Options', expect.any(String));

      // Restore original method
      (service as any).applyHSTSHeader = originalApplyHSTS;
    });
  });

  describe('Memory Management', () => {
    it('should clean up nonces on shutdown', () => {
      const nonceService = new SecurityHeadersService({
        csp: { enabled: true, useNonce: true }
      });

      // Generate some nonces
      const middleware = nonceService.createMiddleware();
      middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Shutdown should clear nonces
      nonceService.shutdown();

      // After shutdown, nonce store should be empty
      const nonceStore = (nonceService as any).nonceStore;
      expect(nonceStore.size).toBe(0);
    });
  });
});