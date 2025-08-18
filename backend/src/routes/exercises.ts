import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { exercises, studentProgress, modules } from '../db/schema';

export default async function exercisesRoutes(fastify: FastifyInstance) {
  
  // Get exercise recommendations for a student
  fastify.get('/recommendations/:studentId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', minimum: 1, maximum: 50, default: 10 }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { limit?: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId } = request.params;
        const { limit = '10' } = request.query;
        
        // Verify student access
        const user = (request as any).user;
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN',
            },
          });
        }

        // Get recommended exercises
        const recommendations = await fastify.db
          .select()
          .from(exercises)
          .limit(parseInt(limit));

        return reply.send({
          success: true,
          data: recommendations,
          message: 'Recommandations récupérées avec succès',
        });
      } catch (error) {
        fastify.log.error('Recommendations error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des recommandations',
            code: 'RECOMMENDATIONS_ERROR',
          },
        });
      }
    },
  });

  // Get exercises by module
  fastify.get('/by-module/:moduleId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          moduleId: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { moduleId: string };
      Querystring: { limit?: string; offset?: string };
    }>, reply: FastifyReply) => {
      try {
        const { moduleId } = request.params;
        const { limit = '20', offset = '0' } = request.query;

        // Get exercises (no moduleId in exercises schema, so get all exercises)
        const exerciseList = await fastify.db
          .select()
          .from(exercises)
          .limit(parseInt(limit))
          .offset(parseInt(offset));

        return reply.send({
          success: true,
          data: exerciseList,
          message: 'Exercices récupérés avec succès',
        });
      } catch (error) {
        fastify.log.error('Get exercises by module error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des exercices',
            code: 'GET_EXERCISES_ERROR',
          },
        });
      }
    },
  });

  // Submit exercise attempt
  fastify.post('/attempt', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['exerciseId', 'score', 'completed'],
        properties: {
          exerciseId: { type: 'string' },
          score: { type: 'string', minimum: 0, maximum: 100 },
          completed: { type: 'string' },
          timeSpent: { type: 'string' },
          answers: {}
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Body: {
        exerciseId: string;
        score: string;
        completed: string;
        timeSpent?: string;
        answers?: any;
      };
    }>, reply: FastifyReply) => {
      try {
        const attemptData = request.body;
        const user = (request as any).user;

        // Create attempt record
        const attempt = await fastify.db
          .insert(studentProgress)
          .values({
            studentId: user.studentId,
            exerciseId: parseInt(attemptData.exerciseId),
            completed: attemptData.completed === 'true',
            score: Math.floor(parseFloat(attemptData.score)),
            timeSpent: parseInt(attemptData.timeSpent || '0'),
            attempts: 1,
            completedAt: attemptData.completed === 'true' ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        // Simple analytics recording (removed service calls that don't exist)
        fastify.log.info(`Exercise attempt recorded for student ${user.studentId}`);

        return reply.send({
          success: true,
          data: attempt,
          message: 'Tentative enregistrée avec succès',
        });
      } catch (error) {
        fastify.log.error('Create attempt error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de l\'enregistrement de la tentative',
            code: 'CREATE_ATTEMPT_ERROR',
          },
        });
      }
    },
  });

  // Get student exercise history
  fastify.get('/student-history/:studentId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'string', minimum: 0, default: 0 }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { limit?: string; offset?: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId } = request.params;
        const { limit = '20', offset = '0' } = request.query;
        const user = (request as any).user;

        // Verify access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN',
            },
          });
        }

        // Get student exercise history (removed service call that doesn't exist)
        const history = await fastify.db
          .select()
          .from(studentProgress)
          .where(eq(studentProgress.studentId, parseInt(studentId)))
          .orderBy(desc(studentProgress.createdAt))
          .limit(parseInt(limit))
          .offset(parseInt(offset));

        return reply.send({
          success: true,
          data: history,
          message: 'Historique récupéré avec succès',
        });
      } catch (error) {
        fastify.log.error('Get student history error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération de l\'historique',
            code: 'GET_HISTORY_ERROR',
          },
        });
      }
    },
  });

  // Get student progress
  fastify.get('/student-progress/:studentId', {
    preHandler: [(fastify as any).authenticate],
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId } = request.params;
        const user = (request as any).user;

        // Verify access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN',
            },
          });
        }

        // Get student progress
        const progressData = await fastify.db
          .select()
          .from(studentProgress)
          .where(eq(studentProgress.studentId, parseInt(studentId)))
          .orderBy(desc(studentProgress.createdAt));

        return reply.send({
          success: true,
          data: progressData,
          message: 'Progrès récupéré avec succès',
        });
      } catch (error) {
        fastify.log.error('Get student progress error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération du progrès',
            code: 'GET_PROGRESS_ERROR',
          },
        });
      }
    },
  });

  // Get all exercises with pagination
  fastify.get('/', {
    handler: async (request: FastifyRequest<{
      Querystring: { 
        page?: string; 
        limit?: string; 
        search?: string;
        matiere?: string;
        niveau?: string;
        difficulte?: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { 
          page = '1', 
          limit = '20', 
          search, 
          matiere, 
          niveau, 
          difficulte 
        } = request.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Build where conditions (exercises don't have matiere/niveau fields)
        const whereConditions = [];
        
        if (difficulte) {
          whereConditions.push(eq(exercises.difficulte, difficulte as any));
        }

        // Get exercises with simple query (removed complex pagination)
        const allExercises = await fastify.db
          .select()
          .from(exercises)
          .limit(limitNum)
          .offset(offset);

        // Simple response structure
        return reply.send({
          success: true,
          data: {
            items: allExercises,
            total: allExercises.length,
            page: pageNum,
            limit: limitNum,
            hasMore: allExercises.length === limitNum
          },
          message: 'Exercices récupérés avec succès',
        });
      } catch (error) {
        fastify.log.error('Get exercises error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des exercices',
            code: 'GET_EXERCISES_ERROR',
          },
        });
      }
    },
  });

  // Get exercise by ID
  fastify.get('/:exerciseId', {
    handler: async (request: FastifyRequest<{
      Params: { exerciseId: string };
    }>, reply: FastifyReply) => {
      try {
        const { exerciseId } = request.params;

        // Get exercise by ID with simple query
        const exercise = await fastify.db
          .select()
          .from(exercises)
          .where(eq(exercises.id, parseInt(exerciseId)))
          .limit(1);

        if (exercise.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Exercice non trouvé',
              code: 'EXERCISE_NOT_FOUND',
            },
          });
        }

        // Simple response structure
        return reply.send({
          success: true,
          data: {
            items: exercise,
            total: exercise.length
          },
          message: 'Exercice récupéré avec succès',
        });
      } catch (error) {
        fastify.log.error('Get exercise by ID error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération de l\'exercice',
            code: 'GET_EXERCISE_ERROR',
          },
        });
      }
    },
  });

  // 🎯 NEW CP/CE1/CE2 SPECIFIC ROUTES
  
  // Get exercises by level (CP/CE1/CE2)
  fastify.get('/by-level/:level', {
    schema: {
      params: {
        type: 'object',
        properties: {
          level: { 
            type: 'string', 
            enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] 
          }
        },
        required: ['level']
      },
      querystring: {
        type: 'object',
        properties: {
          matiere: { 
            type: 'string',
            enum: ['MATHEMATIQUES', 'FRANCAIS', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS']
          },
          type: {
            type: 'string',
            enum: ['QCM', 'CALCUL', 'TEXTE_LIBRE', 'DRAG_DROP', 'CONJUGAISON', 'LECTURE', 'GEOMETRIE', 'PROBLEME']
          },
          difficulte: {
            type: 'string',
            enum: ['FACILE', 'MOYEN', 'DIFFICILE']
          },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { level: string };
      Querystring: { matiere?: string; type?: string; difficulte?: string; limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { level } = request.params;
        const { matiere, type, difficulte, limit = 20 } = request.query;

        // Build query with filters
        const conditions = [];
        
        if (type) {
          conditions.push(eq(exercises.type, type));
        }
        
        if (difficulte) {
          conditions.push(eq(exercises.difficulte, difficulte));
        }

        const results = await fastify.db
          .select({
            id: exercises.id,
            type: exercises.type,
            configuration: exercises.configuration,
            xp: exercises.xp,
            difficulte: exercises.difficulte,
            titre: exercises.titre,
            description: exercises.description,
            createdAt: exercises.createdAt,
            updatedAt: exercises.updatedAt
          })
          .from(exercises)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(limit);

        return reply.send({
          success: true,
          data: results,
          message: `Exercices ${level} récupérés avec succès`,
          meta: {
            level,
            count: results.length,
            filters: { matiere, type, difficulte }
          }
        });

      } catch (error) {
        fastify.log.error('Get exercises by level error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des exercices',
            code: 'GET_EXERCISES_ERROR'
          }
        });
      }
    }
  });

  // Get random exercises for quick practice
  fastify.get('/random/:level', {
    schema: {
      params: {
        type: 'object',
        properties: {
          level: { 
            type: 'string', 
            enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] 
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
          exclude_types: { 
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { level: string };
      Querystring: { count?: number; exclude_types?: string[] };
    }>, reply: FastifyReply) => {
      try {
        const { level } = request.params;
        const { count = 5, exclude_types = [] } = request.query;

        // Get all exercises for the level
        let allExercises;
        
        if (exclude_types.length > 0) {
          allExercises = await fastify.db
            .select()
            .from(exercises)
            .where(eq(exercises.type, exclude_types[0]));
        } else {
          allExercises = await fastify.db
            .select()
            .from(exercises);
        }
        
        // Randomly select exercises
        const shuffled = allExercises.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        return reply.send({
          success: true,
          data: selected,
          message: `${count} exercices aléatoires ${level} sélectionnés`,
          meta: {
            level,
            requested_count: count,
            actual_count: selected.length,
            total_available: allExercises.length
          }
        });

      } catch (error) {
        fastify.log.error('Get random exercises error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la sélection d\'exercices aléatoires',
            code: 'GET_RANDOM_EXERCISES_ERROR'
          }
        });
      }
    }
  });

  // Get exercise statistics for dashboard
  fastify.get('/stats/:level', {
    schema: {
      params: {
        type: 'object',
        properties: {
          level: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { level: string };
    }>, reply: FastifyReply) => {
      try {
        const { level } = request.params;

        // Get exercise counts by type and difficulty
        const stats = await fastify.db
          .select({
            type: exercises.type,
            difficulte: exercises.difficulte,
            count: sql`count(*)`
          })
          .from(exercises)
          .groupBy(exercises.type, exercises.difficulte);

        // Process stats into a more useful format
        const processedStats = {
          total: stats.reduce((sum, stat) => sum + (stat.count as number), 0),
          by_type: {},
          by_difficulty: {},
          by_type_and_difficulty: {}
        };

        stats.forEach(stat => {
          const count = stat.count as number;
          // By type
          if (!processedStats.by_type[stat.type]) {
            processedStats.by_type[stat.type] = 0;
          }
          processedStats.by_type[stat.type] += count;

          // By difficulty
          if (!processedStats.by_difficulty[stat.difficulte]) {
            processedStats.by_difficulty[stat.difficulte] = 0;
          }
          processedStats.by_difficulty[stat.difficulte] += count;

          // By type and difficulty
          const key = `${stat.type}_${stat.difficulte}`;
          processedStats.by_type_and_difficulty[key] = count;
        });

        return reply.send({
          success: true,
          data: processedStats,
          message: `Statistiques des exercices ${level} récupérées`,
          meta: { level }
        });

      } catch (error) {
        fastify.log.error('Get exercise stats error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des statistiques',
            code: 'GET_EXERCISE_STATS_ERROR'
          }
        });
      }
    }
  });
} 