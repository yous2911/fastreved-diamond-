import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InputSanitizationService } from '../../middleware/input-sanitization.middleware';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('InputSanitizationService', () => {
  let service: InputSanitizationService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    service = new InputSanitizationService();
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      routeOptions: { url: '/api/test' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      body: {},
      query: {},
      params: {}
    };
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('XSS Protection', () => {
    it('should sanitize script tags', async () => {
      mockRequest.body = {
        message: '<script>alert("xss")</script>Hello World'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.message).not.toContain('<script>');
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('HTML/Script content sanitized')
      );
    });

    it('should remove javascript: URLs', async () => {
      mockRequest.body = {
        link: 'javascript:alert("xss")'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.link).not.toContain('javascript:');
    });

    it('should sanitize event handlers', async () => {
      mockRequest.body = {
        html: '<div onclick="alert(1)">Click me</div>'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.html).not.toContain('onclick');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should detect and sanitize SQL injection attempts', async () => {
      mockRequest.body = {
        search: "'; DROP TABLE users; --"
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.search).not.toContain('DROP TABLE');
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('SQL injection patterns removed')
      );
    });

    it('should sanitize UNION-based injection', async () => {
      mockRequest.body = {
        id: '1 UNION SELECT password FROM users'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.id).not.toContain('UNION');
    });

    it('should sanitize OR-based injection', async () => {
      mockRequest.body = {
        filter: "1' OR 1=1 --"
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.filter).not.toMatch(/OR\s+1=1/i);
    });
  });

  describe('NoSQL Injection Protection', () => {
    it('should detect and sanitize NoSQL injection attempts', async () => {
      mockRequest.body = {
        query: '{"$where": "this.password == \'secret\'"}'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.query).not.toContain('$where');
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('NoSQL injection patterns removed')
      );
    });

    it('should sanitize MongoDB operators', async () => {
      mockRequest.body = {
        filter: '{"$ne": null}'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.filter).not.toContain('$ne');
    });
  });

  describe('Command Injection Protection', () => {
    it('should detect and sanitize command injection attempts', async () => {
      mockRequest.body = {
        filename: 'test.txt; rm -rf /'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.filename).not.toContain('rm -rf');
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('command injection patterns removed')
      );
    });

    it('should sanitize pipe operators', async () => {
      mockRequest.body = {
        input: 'data | cat /etc/passwd'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.input).not.toContain('|');
    });
  });

  describe('Path Traversal Protection', () => {
    it('should detect and sanitize path traversal attempts', async () => {
      mockRequest.body = {
        path: '../../../etc/passwd'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.path).not.toContain('../');
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('Path traversal patterns removed')
      );
    });

    it('should sanitize encoded path traversal', async () => {
      mockRequest.body = {
        file: '%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.file).not.toContain('%2e%2e');
    });
  });

  describe('Context-Specific Validation', () => {
    it('should validate email format', async () => {
      mockRequest.body = {
        email: 'invalid-email'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('Invalid email format')
      );
    });

    it('should validate and normalize valid email', async () => {
      mockRequest.body = {
        email: '  Test.Email+Tag@Example.COM  '
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.email).toBe('test.email+tag@example.com');
    });

    it('should validate URL format', async () => {
      mockRequest.body = {
        website: 'not-a-url'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('Invalid URL format')
      );
    });

    it('should clean phone numbers', async () => {
      mockRequest.body = {
        phone: '+1 (555) 123-4567 ext. 890'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.phone).toBe('+1 (555) 123-4567 890');
    });

    it('should clean names to allow only letters, spaces, and hyphens', async () => {
      mockRequest.body = {
        name: 'John123 Doe-Smith$%'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.name).toBe('John Doe-Smith');
    });
  });

  describe('Length Validation', () => {
    it('should truncate long strings', async () => {
      const longString = 'a'.repeat(2000);
      mockRequest.body = {
        message: longString
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.message.length).toBeLessThanOrEqual(1000);
      expect(sanitizedReq.sanitizationWarnings).toContain(
        expect.stringContaining('Truncated to 1000 characters')
      );
    });

    it('should apply different length limits for different contexts', async () => {
      mockRequest.body = {
        email: 'a'.repeat(300) + '@example.com',
        text: 'a'.repeat(15000)
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.email.length).toBeLessThanOrEqual(254);
      expect(sanitizedReq.sanitizedBody.text.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Route Skipping', () => {
    it('should skip sanitization for GET requests', async () => {
      mockRequest.method = 'GET';
      mockRequest.body = {
        malicious: '<script>alert("xss")</script>'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody).toBeUndefined();
    });

    it('should skip sanitization for upload routes', async () => {
      mockRequest.url = '/api/upload/file';
      mockRequest.routeOptions = { url: '/api/upload/file' };
      mockRequest.body = {
        malicious: '<script>alert("xss")</script>'
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      mockRequest.body = {
        circular: {}
      };
      // Create circular reference
      (mockRequest.body as any).circular.self = mockRequest.body.circular;

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Should not throw an error
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should return error for extremely malicious content', async () => {
      // Mock a sanitization error
      const originalSanitizeObject = (service as any).sanitizeObject;
      (service as any).sanitizeObject = jest.fn().mockRejectedValue(new Error('Sanitization failed'));

      mockRequest.body = { test: 'value' };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid input data',
          message: 'Request contains potentially harmful content'
        })
      );

      // Restore original method
      (service as any).sanitizeObject = originalSanitizeObject;
    });
  });

  describe('Nested Object Sanitization', () => {
    it('should sanitize nested objects', async () => {
      mockRequest.body = {
        user: {
          profile: {
            bio: '<script>alert("xss")</script>Safe content'
          }
        }
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.user.profile.bio).not.toContain('<script>');
      expect(sanitizedReq.sanitizedBody.user.profile.bio).toContain('Safe content');
    });

    it('should sanitize arrays', async () => {
      mockRequest.body = {
        tags: ['safe', '<script>alert("xss")</script>', 'another safe']
      };

      await service.sanitizationMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sanitizedReq = mockRequest as any;
      expect(sanitizedReq.sanitizedBody.tags[0]).toBe('safe');
      expect(sanitizedReq.sanitizedBody.tags[1]).not.toContain('<script>');
      expect(sanitizedReq.sanitizedBody.tags[2]).toBe('another safe');
    });
  });

  describe('Static Helper Methods', () => {
    it('should return sanitized data from request', () => {
      const request = {
        body: { original: 'data' },
        sanitizedBody: { sanitized: 'data' },
        query: { original: 'query' },
        sanitizedQuery: { sanitized: 'query' }
      } as any;

      const result = InputSanitizationService.getSanitizedData(request);

      expect(result.body).toEqual({ sanitized: 'data' });
      expect(result.query).toEqual({ sanitized: 'query' });
    });

    it('should detect warnings correctly', () => {
      const requestWithWarnings = {
        sanitizationWarnings: ['warning1', 'warning2']
      } as any;

      const requestWithoutWarnings = {} as any;

      expect(InputSanitizationService.hasWarnings(requestWithWarnings)).toBe(true);
      expect(InputSanitizationService.hasWarnings(requestWithoutWarnings)).toBe(false);
    });

    it('should return warnings correctly', () => {
      const request = {
        sanitizationWarnings: ['warning1', 'warning2']
      } as any;

      const warnings = InputSanitizationService.getWarnings(request);
      expect(warnings).toEqual(['warning1', 'warning2']);
    });
  });
});