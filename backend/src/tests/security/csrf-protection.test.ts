import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CSRFProtectionService } from '../../services/csrf-protection.service';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('CSRFProtectionService', () => {
  let service: CSRFProtectionService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    service = new CSRFProtectionService();
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      routeOptions: { url: '/api/test' },
      ip: '127.0.0.1',
      headers: {},
      body: {},
      cookies: {}
    };
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setCookie: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Token Generation', () => {
    it('should generate valid CSRF token', () => {
      const token = service.generateToken();

      expect(token.token).toBeDefined();
      expect(token.secret).toBeDefined();
      expect(token.createdAt).toBeInstanceOf(Date);
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.expiresAt.getTime()).toBeGreaterThan(token.createdAt.getTime());
    });

    it('should generate token with user context', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const token = service.generateToken(userId, sessionId);

      expect(token.userId).toBe(userId);
      expect(token.sessionId).toBe(sessionId);
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      expect(token1.token).not.toBe(token2.token);
      expect(token1.secret).not.toBe(token2.secret);
    });

    it('should generate tokens with correct format', () => {
      const token = service.generateToken();

      // Token should be in format: salt.hashedToken
      expect(token.token).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
    });
  });

  describe('Token Validation', () => {
    it('should validate correct token', () => {
      const token = service.generateToken();
      const isValid = service.validateToken(token.token);

      expect(isValid).toBe(true);
    });

    it('should reject invalid token', () => {
      const isValid = service.validateToken('invalid-token');

      expect(isValid).toBe(false);
    });

    it('should reject empty token', () => {
      const isValid = service.validateToken('');

      expect(isValid).toBe(false);
    });

    it('should reject expired token', () => {
      // Create service with very short expiry
      const shortLivedService = new CSRFProtectionService({
        maxAge: 1 // 1ms
      });

      const token = shortLivedService.generateToken();
      
      // Wait for token to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const isValid = shortLivedService.validateToken(token.token);
          expect(isValid).toBe(false);
          shortLivedService.shutdown();
          resolve();
        }, 10);
      });
    });

    it('should validate token with user context', () => {
      const userId = 'user123';
      const sessionId = 'session456';
      const token = service.generateToken(userId, sessionId);

      const isValid = service.validateToken(token.token, userId, sessionId);
      expect(isValid).toBe(true);
    });

    it('should reject token with wrong user context', () => {
      const token = service.generateToken('user123', 'session456');
      const isValid = service.validateToken(token.token, 'user999', 'session456');

      expect(isValid).toBe(false);
    });

    it('should reject token with wrong session context', () => {
      const token = service.generateToken('user123', 'session456');
      const isValid = service.validateToken(token.token, 'user123', 'session999');

      expect(isValid).toBe(false);
    });

    it('should reject malformed token', () => {
      const isValid = service.validateToken('malformed.token.with.too.many.parts');

      expect(isValid).toBe(false);
    });

    it('should reject token with invalid format', () => {
      const isValid = service.validateToken('no-dot-separator');

      expect(isValid).toBe(false);
    });
  });

  describe('Middleware Protection', () => {
    let middleware: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    beforeEach(() => {
      middleware = service.createMiddleware();
    });

    it('should allow GET requests without token', async () => {
      mockRequest.method = 'GET';

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without token', async () => {
      mockRequest.method = 'HEAD';

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without token', async () => {
      mockRequest.method = 'OPTIONS';

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject POST requests without token', async () => {
      mockRequest.method = 'POST';

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF token missing'
        })
      );
    });

    it('should reject PUT requests without token', async () => {
      mockRequest.method = 'PUT';

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('should reject DELETE requests without token', async () => {
      mockRequest.method = 'DELETE';

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('should accept POST requests with valid token in header', async () => {
      const token = service.generateToken();
      mockRequest.method = 'POST';
      mockRequest.headers = { 'x-csrf-token': token.token };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should accept POST requests with valid token in body', async () => {
      const token = service.generateToken();
      mockRequest.method = 'POST';
      mockRequest.body = { _csrf: token.token };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should accept POST requests with valid token in cookies', async () => {
      const token = service.generateToken();
      mockRequest.method = 'POST';
      mockRequest.cookies = { _csrf: token.token };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject POST requests with invalid token', async () => {
      mockRequest.method = 'POST';
      mockRequest.headers = { 'x-csrf-token': 'invalid-token' };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF token invalid'
        })
      );
    });

    it('should skip protection for health routes', async () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/health';
      mockRequest.routeOptions = { url: '/api/health' };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should skip protection for metrics routes', async () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/metrics';
      mockRequest.routeOptions = { url: '/api/metrics' };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Token Endpoint', () => {
    it('should generate and return token', async () => {
      const result = await service.getTokenEndpoint(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        '_csrf',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // false in test environment
          sameSite: 'strict'
        })
      );

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String),
          expiresAt: expect.any(String)
        })
      );
    });

    it('should include user context in token', async () => {
      (mockRequest as any).user = { id: 'user123' };
      (mockRequest as any).session = { id: 'session456' };

      await service.getTokenEndpoint(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String)
        })
      );
    });
  });

  describe('Token Management', () => {
    it('should refresh valid token', async () => {
      const originalToken = service.generateToken('user123', 'session456');
      const newToken = await service.refreshToken(
        originalToken.token,
        'user123',
        'session456'
      );

      expect(newToken).not.toBeNull();
      expect(newToken!.token).not.toBe(originalToken.token);
      expect(newToken!.userId).toBe('user123');
      expect(newToken!.sessionId).toBe('session456');

      // Original token should be invalidated
      expect(service.validateToken(originalToken.token)).toBe(false);
    });

    it('should not refresh invalid token', async () => {
      const newToken = await service.refreshToken('invalid-token');

      expect(newToken).toBeNull();
    });

    it('should revoke token', () => {
      const token = service.generateToken();
      const revoked = service.revokeToken(token.token);

      expect(revoked).toBe(true);
      expect(service.validateToken(token.token)).toBe(false);
    });

    it('should return false when revoking non-existent token', () => {
      const revoked = service.revokeToken('non-existent-token');

      expect(revoked).toBe(false);
    });

    it('should revoke all tokens for user', () => {
      const token1 = service.generateToken('user123');
      const token2 = service.generateToken('user123');
      const token3 = service.generateToken('user456');

      const revokedCount = service.revokeUserTokens('user123');

      expect(revokedCount).toBe(2);
      expect(service.validateToken(token1.token)).toBe(false);
      expect(service.validateToken(token2.token)).toBe(false);
      expect(service.validateToken(token3.token)).toBe(true); // Different user
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom cookie name', () => {
      const customService = new CSRFProtectionService({
        cookieName: 'custom-csrf'
      });

      const middleware = customService.createMiddleware();
      mockRequest.method = 'POST';
      mockRequest.cookies = { 'custom-csrf': 'invalid-token' };

      // Should attempt to validate the token from custom cookie
      return middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
        .then(() => {
          expect(mockReply.status).toHaveBeenCalledWith(403);
          customService.shutdown();
        });
    });

    it('should respect custom header name', () => {
      const customService = new CSRFProtectionService({
        headerName: 'x-custom-csrf'
      });

      const middleware = customService.createMiddleware();
      mockRequest.method = 'POST';
      mockRequest.headers = { 'x-custom-csrf': 'invalid-token' };

      return middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
        .then(() => {
          expect(mockReply.status).toHaveBeenCalledWith(403);
          customService.shutdown();
        });
    });

    it('should respect custom skip routes', () => {
      const customService = new CSRFProtectionService({
        skipRoutes: ['/api/custom/skip']
      });

      const middleware = customService.createMiddleware();
      mockRequest.method = 'POST';
      mockRequest.url = '/api/custom/skip/endpoint';
      mockRequest.routeOptions = { url: '/api/custom/skip/endpoint' };

      return middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
        .then(() => {
          expect(mockReply.status).not.toHaveBeenCalled();
          customService.shutdown();
        });
    });

    it('should respect custom ignore methods', () => {
      const customService = new CSRFProtectionService({
        ignoreMethods: ['POST'] // Ignore POST requests
      });

      const middleware = customService.createMiddleware();
      mockRequest.method = 'POST';

      return middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
        .then(() => {
          expect(mockReply.status).not.toHaveBeenCalled();
          customService.shutdown();
        });
    });
  });

  describe('Statistics', () => {
    it('should return token statistics', () => {
      service.generateToken();
      service.generateToken();
      service.generateToken();

      const stats = service.getStats();

      expect(stats.activeTokens).toBe(3);
      expect(stats.totalGenerated).toBe(3);
      expect(stats.expiredTokens).toBe(0);
    });

    it('should count expired tokens correctly', () => {
      const shortLivedService = new CSRFProtectionService({
        maxAge: 1 // 1ms
      });

      shortLivedService.generateToken();
      shortLivedService.generateToken();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stats = shortLivedService.getStats();
          expect(stats.expiredTokens).toBe(2);
          expect(stats.activeTokens).toBe(0);
          shortLivedService.shutdown();
          resolve();
        }, 10);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock a method to throw an error
      const originalValidateToken = service.validateToken;
      service.validateToken = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      const middleware = service.createMiddleware();
      const token = 'any-token';
      mockRequest.method = 'POST';
      mockRequest.headers = { 'x-csrf-token': token };

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF protection error'
        })
      );

      // Restore original method
      service.validateToken = originalValidateToken;
    });

    it('should handle token endpoint errors gracefully', async () => {
      // Mock generateToken to throw error
      const originalGenerateToken = service.generateToken;
      service.generateToken = jest.fn().mockImplementation(() => {
        throw new Error('Generation error');
      });

      await service.getTokenEndpoint(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to generate CSRF token'
        })
      );

      // Restore original method
      service.generateToken = originalGenerateToken;
    });
  });
});