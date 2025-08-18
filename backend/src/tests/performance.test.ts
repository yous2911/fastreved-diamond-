import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build } from '../app-test';
import { FastifyInstance } from 'fastify';

describe('Performance Tests', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should handle high concurrent requests', async () => {
    const concurrentRequests = 50;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        app.inject({
          method: 'GET',
          url: '/api/health',
        })
      );
    }

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // All requests should succeed
    responses.forEach((response: any) => {
      expect(response.statusCode).toBe(200);
    });

    // Should complete within reasonable time (5 seconds for 50 requests)
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000);

    // console.log removed for production
  });

  it('should maintain performance under load', async () => {
    const iterations = 100;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      const responseTime = Date.now() - start;
      responseTimes.push(responseTime);

      expect(response.statusCode).toBe(200);
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    // Average response time should be under 50ms
    expect(averageResponseTime).toBeLessThan(50);

    // No single request should take more than 200ms
    expect(maxResponseTime).toBeLessThan(200);

    console.log(`✅ Average response time: ${averageResponseTime.toFixed(2)}ms`);
    // console.log removed for production
  });

  it('should handle memory efficiently', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Make many requests to test memory usage
    for (let i = 0; i < 200; i++) {
      await app.inject({
        method: 'GET',
        url: '/api/health',
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 20MB)
    expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);

    console.log(`✅ Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });
});
