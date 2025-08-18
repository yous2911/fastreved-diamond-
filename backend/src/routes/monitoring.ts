
import { FastifyPluginAsync, FastifyReply } from 'fastify';

const monitoringRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    handler: async (_, reply: FastifyReply) => {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          database: 'up',
          redis: 'up',
          cache: 'up'
        }
      };

      return reply.send(healthStatus);
    }
  });

  fastify.get('/metrics', {
    handler: async (_, reply: FastifyReply) => {
      const metrics = fastify.metrics?.collect() || {};
      return reply.send({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    }
  });

  fastify.get('/cache/stats', {
    handler: async (_, reply: FastifyReply) => {
      try {
        const stats = await fastify.cache.keys();
        return reply.send({
          success: true,
          data: { totalKeys: stats.length },
          message: 'Statistiques du cache récupérées'
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: { message: 'Erreur cache', code: 'CACHE_ERROR' }
        });
      }
    }
  });

  fastify.delete('/cache', {
    handler: async (_, reply: FastifyReply) => {
      try {
        await fastify.cache.clear();
        return reply.send({
          success: true,
          message: 'Cache vidé avec succès'
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: { message: 'Erreur lors du vidage du cache', code: 'CACHE_CLEAR_ERROR' }
        });
      }
    }
  });
};

export default monitoringRoutes;
