import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedRateLimitingService, RateLimitOptions } from '../../services/enhanced-rate-limiting.service';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('EnhancedRateLimitingService', () => {
  let service: EnhancedRateLimitingService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    const options: RateLimitOptions = {
      global: { windowMs: 60000, max: 100 },
      perUser: { windowMs: 60000, max: 50 },
      perIP: { windowMs: 60000, max: 30 },
      enableBehavioralAnalysis: true,
      enablePenalties: true
    };
    
    service = new EnhancedRateLimitingService(options);
    
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      routeOptions: { url: '/api/test' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' }
    };
    
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const middleware = service.createMiddleware();

      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.status).not.toHaveBeenCalled();
      }
    });

    it('should block requests exceeding IP limit', async () => {
      const restrictiveService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 2 } // Very low limit
      });

      const middleware = restrictiveService.createMiddleware();

      // First 2 requests should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Third request should be blocked
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests'
        })
      );

      restrictiveService.shutdown();
    });

    it('should block requests exceeding global limit', async () => {
      const restrictiveService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 1 }, // Very low global limit
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 30 }
      });

      const middleware = restrictiveService.createMiddleware();

      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Second request should be blocked (global limit)
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).toHaveBeenCalledWith(429);

      restrictiveService.shutdown();
    });
  });

  describe('User-specific Rate Limiting', () => {
    it('should apply user-specific limits', async () => {
      const restrictiveService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 1 }, // Very low user limit
        perIP: { windowMs: 60000, max: 30 }
      });

      const middleware = restrictiveService.createMiddleware();
      (mockRequest as any).user = { id: 'user123', role: 'user' };

      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Second request should be blocked (user limit)
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).toHaveBeenCalledWith(429);

      restrictiveService.shutdown();
    });

    it('should apply premium user limits', async () => {
      const restrictiveService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { 
          windowMs: 60000, 
          max: 1,
          premium: { max: 5 } // Higher limit for premium
        },
        perIP: { windowMs: 60000, max: 30 }
      });

      const middleware = restrictiveService.createMiddleware();
      (mockRequest as any).user = { id: 'user123', role: 'premium' };

      // Should allow more requests for premium user
      for (let i = 0; i < 3; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.status).not.toHaveBeenCalled();
      }

      restrictiveService.shutdown();
    });

    it('should skip rate limiting for admin users', async () => {
      const restrictiveService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 1 },
        perUser: { windowMs: 60000, max: 1 },
        perIP: { windowMs: 60000, max: 1 },
        exemptUserRoles: ['admin']
      });

      const middleware = restrictiveService.createMiddleware();
      (mockRequest as any).user = { id: 'admin123', role: 'admin' };

      // Should allow many requests for admin
      for (let i = 0; i < 10; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.status).not.toHaveBeenCalled();
      }

      restrictiveService.shutdown();
    });
  });

  describe('Geographic Rate Limiting', () => {
    it('should apply geographic limits', async () => {
      const geoService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 30 },
        geoLimits: {
          'CN': { windowMs: 60000, max: 1, reason: 'High risk country' }
        }
      });

      const middleware = geoService.createMiddleware();
      
      // Mock geoip to return China
      const originalLookup = require('geoip-lite').lookup;
      require('geoip-lite').lookup = jest.fn().mockReturnValue({ country: 'CN' });

      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Second request should be blocked
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).toHaveBeenCalledWith(429);

      // Restore original function
      require('geoip-lite').lookup = originalLookup;
      geoService.shutdown();
    });
  });

  describe('Custom Rules', () => {
    it('should apply custom rules', async () => {
      const customService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 30 },
        customRules: [{
          id: 'auth-limit',
          name: 'Authentication endpoint limit',
          condition: (request) => request.url.includes('/auth/'),
          limit: { windowMs: 60000, max: 1 },
          action: 'block',
          priority: 1,
          enabled: true
        }]
      });

      const middleware = customService.createMiddleware();
      mockRequest.url = '/auth/login';
      mockRequest.routeOptions = { url: '/auth/login' };

      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Second request should be blocked by custom rule
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).toHaveBeenCalledWith(429);

      customService.shutdown();
    });

    it('should handle custom rule actions', async () => {
      const customService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 30 },
        customRules: [{
          id: 'delay-rule',
          name: 'Delay suspicious requests',
          condition: (request) => request.url.includes('/suspicious/'),
          limit: { windowMs: 60000, max: 1 },
          action: 'delay',
          priority: 1,
          enabled: true
        }]
      });

      const middleware = customService.createMiddleware();
      mockRequest.url = '/suspicious/endpoint';

      const startTime = Date.now();
      
      // First request should pass
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Second request should be delayed
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThan(900); // Should be delayed by ~1000ms
      expect(mockReply.status).toHaveBeenCalledWith(429);

      customService.shutdown();
    });
  });

  describe('Behavioral Analysis', () => {
    it('should detect suspicious behavior', async () => {
      const behavioralService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 5 }, // Low limit to trigger violations
        enableBehavioralAnalysis: true,
        suspiciousThreshold: 20, // Low threshold for testing
        enablePenalties: true
      });

      const middleware = behavioralService.createMiddleware();

      // Generate enough rate limit violations to trigger penalties
      for (let i = 0; i < 10; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      }

      // Should have applied penalties by now
      const stats = behavioralService.getStats();
      expect(stats.suspiciousIPs).toBeGreaterThan(0);

      behavioralService.shutdown();
    });

    it('should detect bot-like behavior', async () => {
      const behavioralService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 30 },
        enableBehavioralAnalysis: true
      });

      const middleware = behavioralService.createMiddleware();
      
      // Request with suspicious user agent
      mockRequest.headers = { 'user-agent': 'bot' };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should increase suspicious score
      const stats = behavioralService.getStats();
      expect(stats.suspiciousIPs).toBeGreaterThan(0);

      behavioralService.shutdown();
    });
  });

  describe('Penalty System', () => {
    it('should apply penalties for repeated violations', async () => {
      const penaltyService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 1 }, // Very low to trigger violations
        enablePenalties: true,
        suspiciousThreshold: 10, // Low threshold
        penaltyMultiplier: 2,
        maxPenaltyTime: 60000
      });

      const middleware = penaltyService.createMiddleware();

      // Generate violations to trigger penalty
      for (let i = 0; i < 15; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      }

      // Subsequent requests should be blocked by penalty
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IP temporarily blocked due to suspicious activity'
        })
      );

      penaltyService.shutdown();
    });

    it('should allow manual IP blocking', () => {
      const ip = '192.168.1.100';
      service.blockIP(ip, 30000); // Block for 30 seconds

      const middleware = service.createMiddleware();
      mockRequest.ip = ip;

      return middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
        .then(() => {
          expect(mockReply.status).toHaveBeenCalledWith(429);
        });
    });

    it('should allow manual IP unblocking', async () => {
      const ip = '192.168.1.100';
      service.blockIP(ip, 30000);
      service.unblockIP(ip);

      const middleware = service.createMiddleware();
      mockRequest.ip = ip;

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Allowlist and Skip Options', () => {
    it('should skip rate limiting for allowlisted IPs', async () => {
      const allowlistService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 1 },
        perUser: { windowMs: 60000, max: 1 },
        perIP: { windowMs: 60000, max: 1 },
        allowlist: ['127.0.0.1']
      });

      const middleware = allowlistService.createMiddleware();

      // Should allow many requests from allowlisted IP
      for (let i = 0; i < 10; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.status).not.toHaveBeenCalled();
      }

      allowlistService.shutdown();
    });

    it('should skip rate limiting for exempt routes', async () => {
      const exemptService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 1 },
        perUser: { windowMs: 60000, max: 1 },
        perIP: { windowMs: 60000, max: 1 },
        exemptRoutes: ['/api/health']
      });

      const middleware = exemptService.createMiddleware();
      mockRequest.url = '/api/health/check';
      mockRequest.routeOptions = { url: '/api/health/check' };

      // Should allow many requests to exempt route
      for (let i = 0; i < 10; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.status).not.toHaveBeenCalled();
      }

      exemptService.shutdown();
    });
  });

  describe('Headers and Response', () => {
    it('should add rate limit headers to response', async () => {
      const headerService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 30 },
        headers: true
      });

      const middleware = headerService.createMiddleware();

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));

      headerService.shutdown();
    });

    it('should add retry-after header when rate limited', async () => {
      const restrictiveService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 1 },
        retryAfterHeader: true
      });

      const middleware = restrictiveService.createMiddleware();

      // First request passes
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      // Second request is rate limited
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('Retry-After', expect.any(Number));

      restrictiveService.shutdown();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide rate limiting statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('activeEntries');
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('activePenalties');
      expect(stats).toHaveProperty('suspiciousIPs');
      expect(stats).toHaveProperty('topSuspiciousIPs');
      expect(typeof stats.activeEntries).toBe('number');
      expect(Array.isArray(stats.topSuspiciousIPs)).toBe(true);
    });

    it('should track suspicious IPs', async () => {
      const trackingService = new EnhancedRateLimitingService({
        global: { windowMs: 60000, max: 100 },
        perUser: { windowMs: 60000, max: 50 },
        perIP: { windowMs: 60000, max: 2 },
        enableBehavioralAnalysis: true
      });

      const middleware = trackingService.createMiddleware();

      // Generate rate limit violations
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      }

      const stats = trackingService.getStats();
      expect(stats.suspiciousIPs).toBeGreaterThan(0);
      expect(stats.topSuspiciousIPs.length).toBeGreaterThan(0);
      expect(stats.topSuspiciousIPs[0]).toHaveProperty('ip');
      expect(stats.topSuspiciousIPs[0]).toHaveProperty('score');

      trackingService.shutdown();
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock an internal method to throw an error
      const originalCheckGlobalLimit = (service as any).checkGlobalLimit;
      (service as any).checkGlobalLimit = jest.fn().mockRejectedValue(new Error('Test error'));

      const middleware = service.createMiddleware();

      // Should not throw and should not block the request
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(mockReply.status).not.toHaveBeenCalled();

      // Restore original method
      (service as any).checkGlobalLimit = originalCheckGlobalLimit;
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should perform cleanup operations', () => {
      // Add some entries and penalties
      const middleware = service.createMiddleware();
      
      // Simulate some rate limiting activity
      return middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
        .then(() => {
          // Manually trigger cleanup
          (service as any).cleanup();
          
          // Should not throw errors
          expect(true).toBe(true);
        });
    });

    it('should shutdown cleanly', () => {
      service.shutdown();
      
      // Should clear all internal state
      const stats = service.getStats();
      expect(stats.activeEntries).toBe(0);
      expect(stats.suspiciousIPs).toBe(0);
    });
  });
});