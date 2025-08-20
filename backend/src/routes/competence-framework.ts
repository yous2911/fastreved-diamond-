import { FastifyInstance } from 'fastify';
import { CompetenceFrameworkService } from '../services/CompetenceFrameworkService';

export default async function competenceFrameworkRoutes(fastify: FastifyInstance) {
  // Get all competences for a specific level
  fastify.get('/competences/:niveau', {
    schema: {
      params: {
        type: 'object',
        properties: {
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2'] }
        },
        required: ['niveau']
      }
    }
  }, async (request, reply) => {
    const { niveau } = request.params as { niveau: 'CP' | 'CE1' | 'CE2' };
    
    try {
      const competences = CompetenceFrameworkService.getCompetencesByLevel(niveau);
      return { success: true, data: competences };
    } catch (error) {
      fastify.log.error('Error fetching competences:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch competences' 
      });
    }
  });

  // Get competences by domain
  fastify.get('/competences/:niveau/domain/:domaine', {
    schema: {
      params: {
        type: 'object',
        properties: {
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2'] },
          domaine: { type: 'string' }
        },
        required: ['niveau', 'domaine']
      },
      querystring: {
        type: 'object',
        properties: {
          sousDomaine: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { niveau, domaine } = request.params as { niveau: 'CP' | 'CE1' | 'CE2', domaine: string };
    const { sousDomaine } = request.query as { sousDomaine?: string };
    
    try {
      const competences = CompetenceFrameworkService.getCompetencesByDomain(niveau, domaine, sousDomaine);
      return { success: true, data: competences };
    } catch (error) {
      fastify.log.error('Error fetching competences by domain:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch competences by domain' 
      });
    }
  });

  // Get a specific competence by code
  fastify.get('/competences/code/:code', {
    schema: {
      params: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        },
        required: ['code']
      }
    }
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    
    try {
      const competence = CompetenceFrameworkService.getCompetenceByCode(code);
      if (!competence) {
        return reply.status(404).send({ 
          success: false, 
          error: 'Competence not found' 
        });
      }
      return { success: true, data: competence };
    } catch (error) {
      fastify.log.error('Error fetching competence:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch competence' 
      });
    }
  });

  // Get prerequisites for a competence
  fastify.get('/competences/:code/prerequisites', {
    schema: {
      params: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        },
        required: ['code']
      }
    }
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    
    try {
      const prerequisites = await CompetenceFrameworkService.getPrerequisites(code);
      return { success: true, data: prerequisites };
    } catch (error) {
      fastify.log.error('Error fetching prerequisites:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch prerequisites' 
      });
    }
  });

  // Check if a student is blocked on a competence
  fastify.get('/students/:studentId/blocked/:competenceCode', {
    schema: {
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'number' },
          competenceCode: { type: 'string' }
        },
        required: ['studentId', 'competenceCode']
      }
    }
  }, async (request, reply) => {
    const { studentId, competenceCode } = request.params as { studentId: number, competenceCode: string };
    
    try {
      const blocked = await CompetenceFrameworkService.isBlocked(studentId, competenceCode);
      return { success: true, data: blocked };
    } catch (error) {
      fastify.log.error('Error checking blocked status:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to check blocked status' 
      });
    }
  });

  // Get recommendations for a student
  fastify.get('/students/:studentId/recommendations/:niveau', {
    schema: {
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'number' },
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2'] }
        },
        required: ['studentId', 'niveau']
      }
    }
  }, async (request, reply) => {
    const { studentId, niveau } = request.params as { studentId: number, niveau: 'CP' | 'CE1' | 'CE2' };
    
    try {
      const recommendations = await CompetenceFrameworkService.getRecommendations(studentId, niveau);
      return { success: true, data: recommendations };
    } catch (error) {
      fastify.log.error('Error fetching recommendations:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch recommendations' 
      });
    }
  });

  // Get complete learning path for a student
  fastify.get('/students/:studentId/learning-path/:niveau', {
    schema: {
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'number' },
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2'] }
        },
        required: ['studentId', 'niveau']
      }
    }
  }, async (request, reply) => {
    const { studentId, niveau } = request.params as { studentId: number, niveau: 'CP' | 'CE1' | 'CE2' };
    
    try {
      const learningPath = await CompetenceFrameworkService.getLearningPath(studentId, niveau);
      return { success: true, data: learningPath };
    } catch (error) {
      fastify.log.error('Error fetching learning path:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch learning path' 
      });
    }
  });

  // Get competences with major qualitative leaps
  fastify.get('/competences/:niveau/leaps', {
    schema: {
      params: {
        type: 'object',
        properties: {
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2'] }
        },
        required: ['niveau']
      }
    }
  }, async (request, reply) => {
    const { niveau } = request.params as { niveau: 'CP' | 'CE1' | 'CE2' };
    
    try {
      const leaps = CompetenceFrameworkService.getCompetencesWithLeaps(niveau);
      return { success: true, data: leaps };
    } catch (error) {
      fastify.log.error('Error fetching competences with leaps:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch competences with leaps' 
      });
    }
  });

  // Get competence statistics
  fastify.get('/competences/:niveau/stats', {
    schema: {
      params: {
        type: 'object',
        properties: {
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2'] }
        },
        required: ['niveau']
      }
    }
  }, async (request, reply) => {
    const { niveau } = request.params as { niveau: 'CP' | 'CE1' | 'CE2' };
    
    try {
      const competences = CompetenceFrameworkService.getCompetencesByLevel(niveau);
      
      const stats = {
        total: competences.length,
        byDomain: {} as Record<string, number>,
        bySubDomain: {} as Record<string, number>,
        withPrerequisites: competences.filter(c => c.prerequis.length > 0).length,
        withLeaps: CompetenceFrameworkService.getCompetencesWithLeaps(niveau).length,
      };

      // Count by domain
      competences.forEach(c => {
        stats.byDomain[c.domaine] = (stats.byDomain[c.domaine] || 0) + 1;
        stats.bySubDomain[c.sousDomaine] = (stats.bySubDomain[c.sousDomaine] || 0) + 1;
      });

      return { success: true, data: stats };
    } catch (error) {
      fastify.log.error('Error fetching competence stats:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to fetch competence stats' 
      });
    }
  });
}
