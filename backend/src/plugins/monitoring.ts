// src/plugins/monitoring.ts
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../config/config';

// FIXED: Monitoring service interface
interface MonitoringService {
  getMetrics: () => any;
  resetMetrics: () => void;
}

const monitoringPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Performance metrics
  const metrics = {
    requests: { total: 0, errors: 0 },
    responseTime: { sum: 0, count: 0 },
    startTime: Date.now(),
  };

  // Request tracking
  fastify.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
    metrics.requests.total++;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    if (request.startTime) {
      const responseTime = Date.now() - request.startTime;
      metrics.responseTime.sum += responseTime;
      metrics.responseTime.count++;
    }
    
    if (reply.statusCode >= 400) {
      metrics.requests.errors++;
    }
  });

  // FIXED: Monitoring service implementation
  const monitoring: MonitoringService = {
    getMetrics: () => ({
      ...metrics,
      avgResponseTime: metrics.responseTime.count > 0 
        ? Math.round(metrics.responseTime.sum / metrics.responseTime.count) 
        : 0,
      uptime: Date.now() - metrics.startTime,
      memory: process.memoryUsage(),
    }),
    resetMetrics: () => {
      metrics.requests = { total: 0, errors: 0 };
      metrics.responseTime = { sum: 0, count: 0 };
    },
  };

  // FIXED: Decorate with proper typing
  fastify.decorate('monitoring', monitoring);

  fastify.log.info('✅ Monitoring plugin registered successfully');
};

export default fp(monitoringPlugin, { name: 'monitoring' });
