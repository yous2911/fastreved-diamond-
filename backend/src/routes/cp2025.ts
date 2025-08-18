import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CP2025Service } from '../services/cp2025.service';

export default async function cp2025Routes(fastify: FastifyInstance): Promise<void> {
  const service = new CP2025Service();
  
  fastify.get('/exercises', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const exercises = await service.getAllExercises();
      return reply.send({
        success: true,
        data: { exercises },
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { message: 'Failed to fetch exercises' },
      });
    }
  });

  fastify.get('/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await service.getExerciseStatistics();
      return reply.send({
        success: true,
        data: { statistics: stats },
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { message: 'Failed to fetch statistics' },
      });
    }
  });
} 