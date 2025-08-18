import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testConnection } from '../db/connection';

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbConnected = await testConnection();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        services: {
          database: dbConnected ? 'connected' : 'disconnected',
          redis: (fastify as any).redis ? 'connected' : 'not_configured',
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      if (!dbConnected) {
        return reply.status(503).send({
          ...health,
          status: 'unhealthy',
        });
      }

      return reply.send(health);
    } catch (error) {
      fastify.log.error('Health check failed:', error);
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  // Detailed health check
  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const startTime = Date.now();
      const dbConnected = await testConnection();
      const dbResponseTime = Date.now() - startTime;

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV,
        services: {
          database: {
            status: dbConnected ? 'healthy' : 'unhealthy',
            responseTime: `${dbResponseTime}ms`,
          },
          redis: {
            status: (fastify as any).redis ? 'healthy' : 'not_configured',
          },
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version,
        },
      };

      const overallHealthy = dbConnected;
      
      return reply
        .status(overallHealthy ? 200 : 503)
        .send({
          ...health,
          status: overallHealthy ? 'healthy' : 'unhealthy',
        });
    } catch (error) {
      fastify.log.error('Detailed health check failed:', error);
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
      });
    }
  });

  // Readiness probe
  fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dbConnected = await testConnection();
      
      if (dbConnected) {
        return reply.send({ status: 'ready' });
      } else {
        return reply.status(503).send({ status: 'not_ready', reason: 'database_disconnected' });
      }
    } catch (error) {
      return reply.status(503).send({ status: 'not_ready', reason: 'health_check_failed' });
    }
  });

  // Liveness probe
  fastify.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'alive', timestamp: new Date().toISOString() });
  });
} 