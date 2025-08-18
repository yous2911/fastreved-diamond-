// src/tests/monitoring.test.ts - UPDATED MONITORING TESTS
import { describe, it, expect } from 'vitest';
import { app } from './setup';

describe('Monitoring Routes', () => {
  describe('GET /api/monitoring/health', () => {
    it('should return detailed health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/monitoring/health'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.database).toBe('up');
      expect(data.data.redis).toBe('up');
      expect(data.data.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return performance metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/monitoring/metrics'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(typeof data.data.requests).toBe('number');
      expect(typeof data.data.responses).toBe('number');
    });
  });

  describe('GET /api/monitoring/cache', () => {
    it('should return cache statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/monitoring/cache'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.hitRate).toBeDefined();
      expect(data.data.size).toBeDefined();
    });
  });

  describe('DELETE /api/monitoring/cache', () => {
    it('should clear cache', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/monitoring/cache'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.message).toContain('succès');
    });
  });
}); 