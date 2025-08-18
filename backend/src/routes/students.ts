
import { FastifyInstance } from 'fastify';
import { enhancedDatabaseService as databaseService } from '../services/enhanced-database.service.js';
import crypto from 'crypto';

export default async function studentRoutes(fastify: FastifyInstance) {
  // Get all students (for login selection)
  fastify.get('/', async (request, reply) => {
    try {
      // For now, return mock data since database service might not be fully implemented
      const mockStudents = [
        {
          id: 1,
          prenom: 'Alice',
          nom: 'Dupont',
          niveauActuel: 'CP',
          totalPoints: 150,
          serieJours: 5,
          mascotteType: 'dragon',
          dernierAcces: new Date().toISOString(),
          estConnecte: false
        },
        {
          id: 2,
          prenom: 'Lucas',
          nom: 'Martin',
          niveauActuel: 'CE1',
          totalPoints: 320,
          serieJours: 12,
          mascotteType: 'robot',
          dernierAcces: new Date().toISOString(),
          estConnecte: false
        },
        {
          id: 3,
          prenom: 'Emma',
          nom: 'Bernard',
          niveauActuel: 'CP',
          totalPoints: 85,
          serieJours: 3,
          mascotteType: 'fairy',
          dernierAcces: new Date().toISOString(),
          estConnecte: false
        }
      ];

      return {
        success: true,
        data: mockStudents
      };
    } catch (error) {
      fastify.log.error('Get all students error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get students list'
        }
      });
    }
  });

  // Get student profile
  fastify.get('/profile', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      
      const student = await databaseService.getStudentById(studentId);
      
      if (!student) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found'
          }
        });
      }

      return {
        success: true,
        data: {
          student: {
            id: student.id,
            prenom: student.prenom,
            nom: student.nom,
            dateNaissance: student.dateNaissance,
            niveauActuel: student.niveauActuel,
            totalPoints: student.totalPoints,
            serieJours: student.serieJours,
            mascotteType: student.mascotteType,
            dernierAcces: student.dernierAcces,
            estConnecte: student.estConnecte
          }
        }
      };
    } catch (error) {
      fastify.log.error('Get profile error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get student profile'
        }
      });
    }
  });

  // Update student profile
  fastify.put('/profile', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        properties: {
          prenom: { type: 'string', minLength: 1 },
          nom: { type: 'string', minLength: 1 },
          age: { type: 'number', minimum: 3, maximum: 18 },
          preferences: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      const updates = request.body as any;
      
      const updatedStudent = await databaseService.updateStudent(studentId, updates);

      return {
        success: true,
        data: {
          student: {
            id: updatedStudent.id,
            prenom: updatedStudent.prenom,
            nom: updatedStudent.nom,
            dateNaissance: updatedStudent.dateNaissance,
            niveauActuel: updatedStudent.niveauActuel,
            totalPoints: updatedStudent.totalPoints,
            serieJours: updatedStudent.serieJours,
            mascotteType: updatedStudent.mascotteType
          }
        }
      };
    } catch (error) {
      fastify.log.error('Update profile error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update student profile'
        }
      });
    }
  });

  // Get student progress
  fastify.get('/progress', {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          matiere: { type: 'string' },
          limit: { type: 'number', default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      const { matiere, limit } = request.query as { matiere?: string; limit?: number };
      
      const progress = await databaseService.getStudentProgress(studentId, matiere, limit);

      return {
        success: true,
        data: {
          progress,
          count: progress.length,
          matiere: matiere || 'all'
        }
      };
    } catch (error) {
      fastify.log.error('Get progress error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get student progress'
        }
      });
    }
  });

  // Get student statistics
  fastify.get('/stats', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      
      const stats = await databaseService.getStudentStats(studentId);

      return {
        success: true,
        data: { stats }
      };
    } catch (error) {
      fastify.log.error('Get stats error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get student statistics'
        }
      });
    }
  });

  // Get student sessions
  fastify.get('/sessions', {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      const { limit } = request.query as { limit?: number };
      
      const sessions = await databaseService.getStudentSessions(studentId, limit);

      return {
        success: true,
        data: {
          sessions,
          count: sessions.length
        }
      };
    } catch (error) {
      fastify.log.error('Get sessions error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get student sessions'
        }
      });
    }
  });

  // Create new session
  fastify.post('/sessions', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['dateDebut'],
        properties: {
          dateDebut: { type: 'string', format: 'date-time' },
          dureeSecondes: { type: 'number', default: 0 },
          exercicesCompletes: { type: 'number', default: 0 },
          pointsGagnes: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      const sessionData = request.body as any;
      
      const session = await databaseService.createSession({
        id: crypto.randomUUID(),
        studentId,
        data: JSON.stringify({
          dateDebut: sessionData.dateDebut,
          dureeSecondes: sessionData.dureeSecondes || 0,
          exercicesCompletes: sessionData.exercicesCompletes || 0,
          pointsGagnes: sessionData.pointsGagnes || 0,
          actionsUtilisateur: [],
          metadata: {}
        }),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        data: { session }
      };
    } catch (error) {
      fastify.log.error('Create session error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create session'
        }
      });
    }
  });

  // Update session
  fastify.put('/sessions/:sessionId', {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        properties: {
          dateFin: { type: 'string', format: 'date-time' },
          dureeSecondes: { type: 'number' },
          exercicesCompletes: { type: 'number' },
          pointsGagnes: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      const { sessionId } = request.params as { sessionId: number };
      const updates = request.body as any;
      
      // Verify session belongs to student
      const sessions = await databaseService.getStudentSessions(studentId, 100);
      const studentSession = sessions.find(s => s.id === sessionId.toString());
      
      if (!studentSession) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        });
      }

      // Parse existing data and merge with updates
      const existingData = JSON.parse(studentSession.data);
      const updatedData = {
        ...existingData,
        ...updates,
        dateFin: updates.dateFin || existingData.dateFin,
        updatedAt: new Date().toISOString()
      };

      const updatedSession = await databaseService.updateSession(sessionId.toString(), {
        data: JSON.stringify(updatedData)
      });

      return {
        success: true,
        data: { session: updatedSession }
      };
    } catch (error) {
      fastify.log.error('Update session error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update session'
        }
      });
    }
  });

  // Get recommended exercises
  fastify.get('/recommendations', {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 5 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      const { limit } = request.query as { limit?: number };
      
      const recommendations = await databaseService.getRecommendedExercises(studentId, limit || 5);

      return {
        success: true,
        data: {
          recommendations,
          count: recommendations.length
        }
      };
    } catch (error) {
      fastify.log.error('Get recommendations error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get recommendations'
        }
      });
    }
  });

  // Get weekly progress
  fastify.get('/weekly-progress', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      
      const weeklyProgress = await databaseService.getWeeklyProgress(studentId);

      return {
        success: true,
        data: { weeklyProgress }
      };
    } catch (error) {
      fastify.log.error('Get weekly progress error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get weekly progress'
        }
      });
    }
  });

  // Get subject progress
  fastify.get('/subject-progress', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const studentId = (request.user as any).studentId;
      
      const subjectProgress = await databaseService.getSubjectProgress(studentId);

      return {
        success: true,
        data: { subjectProgress }
      };
    } catch (error) {
      fastify.log.error('Get subject progress error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get subject progress'
        }
      });
    }
  });

  // GET /api/students/:id/competence-progress - Get detailed competence progress
  fastify.get('/:id/competence-progress', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          matiere: { type: 'string', enum: ['FRANCAIS', 'MATHEMATIQUES', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS'] },
          niveau: { type: 'string', enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CP-CE1'] },
          masteryLevel: { type: 'string', enum: ['not_started', 'discovering', 'practicing', 'mastering', 'mastered'] },
          limit: { type: 'number', default: 100 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id: studentId } = request.params as { id: number };
      const { matiere, niveau, masteryLevel, limit = 100, offset = 0 } = request.query as any;

      // Get student competence progress
      const competenceProgress = await databaseService.getStudentCompetenceProgress(studentId, {
        matiere,
        niveau,
        masteryLevel,
        limit,
        offset
      });

      // Get summary statistics
      const summary = {
        totalCompetences: competenceProgress.length,
        masteredCount: competenceProgress.filter(cp => cp.masteryLevel === 'mastered').length,
        inProgressCount: competenceProgress.filter(cp => ['practicing', 'mastering'].includes(cp.masteryLevel)).length,
        averageScore: competenceProgress.length > 0 ? 
          competenceProgress.reduce((sum, cp) => sum + parseFloat(cp.averageScore.toString()), 0) / competenceProgress.length : 0,
        totalTimeSpent: competenceProgress.reduce((sum, cp) => sum + cp.totalTimeSpent, 0)
      };

      return {
        success: true,
        data: {
          competenceProgress: competenceProgress.map(cp => ({
            id: cp.id,
            competenceCode: cp.competenceCode,
            niveau: cp.niveau,
            matiere: cp.matiere,
            domaine: cp.domaine,
            masteryLevel: cp.masteryLevel,
            progressPercent: cp.progressPercent,
            totalAttempts: cp.totalAttempts,
            successfulAttempts: cp.successfulAttempts,
            averageScore: parseFloat(cp.averageScore.toString()),
            totalTimeSpent: cp.totalTimeSpent,
            averageTimePerAttempt: cp.averageTimePerAttempt,
            difficultyLevel: parseFloat(cp.difficultyLevel.toString()),
            consecutiveSuccesses: cp.consecutiveSuccesses,
            consecutiveFailures: cp.consecutiveFailures,
            firstAttemptAt: cp.firstAttemptAt,
            lastAttemptAt: cp.lastAttemptAt,
            masteredAt: cp.masteredAt,
            updatedAt: cp.updatedAt
          })),
          summary,
          filters: { matiere, niveau, masteryLevel },
          pagination: { limit, offset, total: competenceProgress.length }
        }
      };
    } catch (error) {
      fastify.log.error('Get competence progress error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get competence progress'
        }
      });
    }
  });

  // POST /api/students/:id/record-progress - Record new progress for a competence
  fastify.post('/:id/record-progress', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        required: ['competenceCode', 'exerciseResult'],
        properties: {
          competenceCode: { type: 'string' },
          exerciseResult: {
            type: 'object',
            required: ['score', 'timeSpent', 'completed'],
            properties: {
              score: { type: 'number', minimum: 0, maximum: 100 },
              timeSpent: { type: 'number', minimum: 0 },
              completed: { type: 'boolean' },
              attempts: { type: 'number', default: 1 },
              exerciseId: { type: 'number' },
              difficultyLevel: { type: 'number', minimum: 0.5, maximum: 2.0, default: 1.0 }
            }
          },
          sessionData: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              deviceType: { type: 'string', enum: ['mobile', 'tablet', 'desktop'] },
              focusScore: { type: 'number', minimum: 0, maximum: 100 }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id: studentId } = request.params as { id: number };
      const { competenceCode, exerciseResult, sessionData } = request.body as any;

      // Record the progress
      const progressResult = await databaseService.recordStudentProgress(studentId, {
        competenceCode,
        score: exerciseResult.score,
        timeSpent: exerciseResult.timeSpent,
        completed: exerciseResult.completed,
        attempts: exerciseResult.attempts || 1,
        exerciseId: exerciseResult.exerciseId,
        difficultyLevel: exerciseResult.difficultyLevel || 1.0,
        sessionData
      });

      // Update learning path if needed
      await databaseService.updateLearningPath(studentId, competenceCode, progressResult.masteryLevel);

      // Check for achievements
      const newAchievements = await databaseService.checkAndUnlockAchievements(studentId, {
        competenceCode,
        masteryLevel: progressResult.masteryLevel,
        score: exerciseResult.score,
        consecutiveSuccesses: progressResult.consecutiveSuccesses
      });

      return {
        success: true,
        data: {
          progress: progressResult,
          newAchievements,
          xpEarned: exerciseResult.completed ? (exerciseResult.score >= 80 ? 15 : 10) : 5,
          masteryLevelChanged: progressResult.masteryLevelChanged || false
        }
      };
    } catch (error) {
      fastify.log.error('Record progress error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record progress'
        }
      });
    }
  });

  // GET /api/students/:id/achievements - Get student achievements
  fastify.get('/:id/achievements', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['academic', 'engagement', 'progress', 'social', 'special'] },
          difficulty: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
          completed: { type: 'boolean' },
          visible: { type: 'boolean', default: true },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id: studentId } = request.params as { id: number };
      const { category, difficulty, completed, visible = true, limit = 50, offset = 0 } = request.query as any;

      const achievements = await databaseService.getStudentAchievements(studentId, {
        category,
        difficulty,
        completed,
        visible,
        limit,
        offset
      });

      // Calculate summary stats
      const summary = {
        totalAchievements: achievements.length,
        completedCount: achievements.filter(a => a.isCompleted).length,
        totalXpEarned: achievements
          .filter(a => a.isCompleted)
          .reduce((sum, a) => sum + a.xpReward, 0),
        byCategory: {
          academic: achievements.filter(a => a.category === 'academic').length,
          engagement: achievements.filter(a => a.category === 'engagement').length,
          progress: achievements.filter(a => a.category === 'progress').length,
          social: achievements.filter(a => a.category === 'social').length,
          special: achievements.filter(a => a.category === 'special').length
        },
        byDifficulty: {
          bronze: achievements.filter(a => a.difficulty === 'bronze' && a.isCompleted).length,
          silver: achievements.filter(a => a.difficulty === 'silver' && a.isCompleted).length,
          gold: achievements.filter(a => a.difficulty === 'gold' && a.isCompleted).length,
          platinum: achievements.filter(a => a.difficulty === 'platinum' && a.isCompleted).length,
          diamond: achievements.filter(a => a.difficulty === 'diamond' && a.isCompleted).length
        }
      };

      return {
        success: true,
        data: {
          achievements: achievements.map(a => ({
            id: a.id,
            achievementCode: a.achievementCode,
            title: a.title,
            description: a.description,
            category: a.category,
            difficulty: a.difficulty,
            xpReward: a.xpReward,
            badgeIconUrl: a.badgeIconUrl,
            currentProgress: a.currentProgress,
            maxProgress: a.maxProgress,
            progressPercentage: a.maxProgress > 0 ? Math.round((a.currentProgress / a.maxProgress) * 100) : 0,
            isCompleted: a.isCompleted,
            completedAt: a.completedAt,
            displayOrder: a.displayOrder
          })),
          summary,
          filters: { category, difficulty, completed, visible },
          pagination: { limit, offset, total: achievements.length }
        }
      };
    } catch (error) {
      fastify.log.error('Get achievements error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get achievements'
        }
      });
    }
  });

  // Health check for student service
  fastify.get('/health', async (request, reply) => {
    try {
      const dbHealth = await databaseService.healthCheck();
      
      return {
        success: true,
        data: {
          service: 'students',
          status: 'healthy',
          timestamp: new Date(),
          database: dbHealth.status,
          details: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: dbHealth.details
          }
        }
      };
    } catch (error) {
      fastify.log.error('Student health check error:', error);
      return reply.status(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNHEALTHY',
          message: 'Student service is unhealthy'
        }
      });
    }
  });
}
