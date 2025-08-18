import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { 
  learningSessions, 
  exerciseResults, 
  students, 
  competencesCp,
  studentProgress
} from '../db/schema-mysql-cp2025';
import { getDatabase } from '../db/connection';

interface AuthenticatedUser {
  studentId: number;
  email: string;
}

export default async function sessionsRoutes(fastify: FastifyInstance) {
  const db = getDatabase();

  // POST /api/sessions/start - Start learning session
  fastify.post('/start', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          studentId: { type: 'number' },
          competencesPlanned: { 
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Body: {
        studentId?: number;
        competencesPlanned?: string[];
      };
    }>, reply: FastifyReply) => {
      try {
        const { studentId: bodyStudentId, competencesPlanned = [] } = request.body;
        const user = (request as any).user as AuthenticatedUser;
        
        // Use authenticated user's ID if not provided in body
        const studentId = bodyStudentId || user.studentId;

        // Verify student access
        if (user.studentId !== studentId) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Check if there's already an active session for this student
        const activeSessions = await db
          .select()
          .from(learningSessions)
          .where(and(
            eq(learningSessions.studentId, studentId),
            sql`${learningSessions.endedAt} IS NULL`
          ))
          .limit(1);

        if (activeSessions.length > 0) {
          return reply.status(400).send({
            success: false,
            error: {
              message: 'Une session est déjà active',
              code: 'SESSION_ALREADY_ACTIVE',
              data: {
                sessionId: activeSessions[0].id,
                startedAt: activeSessions[0].startedAt
              }
            }
          });
        }

        // Create new learning session
        const sessionResult = await db
          .insert(learningSessions)
          .values({
            studentId,
            startedAt: new Date(),
            exercisesCompleted: 0,
            totalXpGained: 0,
            performanceScore: null,
            sessionDuration: 0,
            competencesWorked: JSON.stringify(competencesPlanned)
          });

        // Get the created session
        const newSession = await db
          .select()
          .from(learningSessions)
          .where(and(
            eq(learningSessions.studentId, studentId),
            sql`${learningSessions.endedAt} IS NULL`
          ))
          .orderBy(desc(learningSessions.id))
          .limit(1);

        return reply.send({
          success: true,
          data: {
            session: newSession[0],
            message: 'Session démarrée avec succès'
          }
        });

      } catch (error) {
        fastify.log.error('Start session error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors du démarrage de la session',
            code: 'START_SESSION_ERROR'
          }
        });
      }
    }
  });

  // POST /api/sessions/:id/end - End learning session
  fastify.post('/:id/end', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              exercisesCompleted: { type: 'number' },
              totalXpGained: { type: 'number' },
              averageScore: { type: 'number' },
              competencesWorked: { 
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: {
        summary?: {
          exercisesCompleted?: number;
          totalXpGained?: number;
          averageScore?: number;
          competencesWorked?: string[];
        };
      };
    }>, reply: FastifyReply) => {
      try {
        const { id: sessionId } = request.params;
        const { summary = {} } = request.body;
        const user = (request as any).user as AuthenticatedUser;

        // Get session and verify ownership
        const session = await db
          .select()
          .from(learningSessions)
          .where(eq(learningSessions.id, parseInt(sessionId)))
          .limit(1);

        if (session.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Session introuvable',
              code: 'SESSION_NOT_FOUND'
            }
          });
        }

        if (session[0].studentId !== user.studentId) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        if (session[0].endedAt) {
          return reply.status(400).send({
            success: false,
            error: {
              message: 'Session déjà terminée',
              code: 'SESSION_ALREADY_ENDED'
            }
          });
        }

        // Calculate session metrics from exercise results
        const exerciseResultsData = await db
          .select({
            totalExercises: sql<number>`COUNT(*)`,
            totalXp: sql<number>`SUM(CASE WHEN ${exerciseResults.isCorrect} THEN 5 ELSE 1 END)`,
            averageScore: sql<number>`AVG(CASE WHEN ${exerciseResults.isCorrect} THEN 100 ELSE 0 END)`,
            totalTimeSpent: sql<number>`SUM(${exerciseResults.timeSpent})`
          })
          .from(exerciseResults)
          .where(eq(exerciseResults.sessionId, parseInt(sessionId)))
          .groupBy(exerciseResults.sessionId);

        const sessionMetrics = exerciseResultsData[0] || {
          totalExercises: 0,
          totalXp: 0,
          averageScore: 0,
          totalTimeSpent: 0
        };

        // Calculate session duration
        const startTime = new Date(session[0].startedAt).getTime();
        const endTime = Date.now();
        const sessionDuration = Math.floor((endTime - startTime) / 1000); // in seconds

        // Update session with end data
        await db
          .update(learningSessions)
          .set({
            endedAt: new Date(),
            exercisesCompleted: summary.exercisesCompleted || sessionMetrics.totalExercises,
            totalXpGained: summary.totalXpGained || sessionMetrics.totalXp,
            performanceScore: summary.averageScore || sessionMetrics.averageScore,
            sessionDuration,
            competencesWorked: summary.competencesWorked 
              ? JSON.stringify(summary.competencesWorked)
              : session[0].competencesWorked
          })
          .where(eq(learningSessions.id, parseInt(sessionId)));

        // Update student's total XP and stats
        await db.execute(sql`
          UPDATE students 
          SET 
            total_xp = total_xp + ${sessionMetrics.totalXp},
            last_login = NOW(),
            updated_at = NOW()
          WHERE id = ${user.studentId}
        `);

        // Update student stats
        await db.execute(sql`
          UPDATE student_stats 
          SET 
            total_exercises_completed = total_exercises_completed + ${sessionMetrics.totalExercises},
            total_correct_answers = total_correct_answers + (
              SELECT COUNT(*) FROM exercise_results 
              WHERE session_id = ${parseInt(sessionId)} AND is_correct = true
            ),
            total_time_spent = total_time_spent + ${sessionDuration},
            last_activity = NOW(),
            updated_at = NOW()
          WHERE student_id = ${user.studentId}
        `);

        // Get updated session
        const updatedSession = await db
          .select()
          .from(learningSessions)
          .where(eq(learningSessions.id, parseInt(sessionId)))
          .limit(1);

        return reply.send({
          success: true,
          data: {
            session: updatedSession[0],
            metrics: {
              duration: sessionDuration,
              exercisesCompleted: sessionMetrics.totalExercises,
              xpGained: sessionMetrics.totalXp,
              averageScore: Math.round(sessionMetrics.averageScore),
              timeSpent: sessionDuration
            },
            message: 'Session terminée avec succès'
          }
        });

      } catch (error) {
        fastify.log.error('End session error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la fin de session',
            code: 'END_SESSION_ERROR'
          }
        });
      }
    }
  });

  // GET /api/sessions/:id - Get session details
  fastify.get('/:id', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      try {
        const { id: sessionId } = request.params;
        const user = (request as any).user as AuthenticatedUser;

        // Get session with exercise results
        const sessionData = await db
          .select()
          .from(learningSessions)
          .where(and(
            eq(learningSessions.id, parseInt(sessionId)),
            eq(learningSessions.studentId, user.studentId)
          ))
          .limit(1);

        if (sessionData.length === 0) {
          return reply.status(404).send({
            success: false,
            error: {
              message: 'Session introuvable',
              code: 'SESSION_NOT_FOUND'
            }
          });
        }

        const session = sessionData[0];

        // Get exercise results for this session
        const exerciseResultsData = await db
          .select({
            id: exerciseResults.id,
            exerciseId: exerciseResults.exerciseId,
            competenceId: exerciseResults.competenceId,
            isCorrect: exerciseResults.isCorrect,
            timeSpent: exerciseResults.timeSpent,
            hintsUsed: exerciseResults.hintsUsed,
            supermemoQuality: exerciseResults.supermemoQuality,
            answerGiven: exerciseResults.answerGiven,
            createdAt: exerciseResults.createdAt,
            competenceCode: competencesCp.code,
            competenceName: competencesCp.nom
          })
          .from(exerciseResults)
          .leftJoin(competencesCp, eq(exerciseResults.competenceId, competencesCp.id))
          .where(eq(exerciseResults.sessionId, parseInt(sessionId)))
          .orderBy(exerciseResults.createdAt);

        return reply.send({
          success: true,
          data: {
            session,
            exerciseResults: exerciseResultsData,
            summary: {
              totalExercises: exerciseResultsData.length,
              correctAnswers: exerciseResultsData.filter(r => r.isCorrect).length,
              totalTimeSpent: exerciseResultsData.reduce((sum, r) => sum + (r.timeSpent || 0), 0),
              averageScore: exerciseResultsData.length > 0 
                ? Math.round(exerciseResultsData.filter(r => r.isCorrect).length / exerciseResultsData.length * 100)
                : 0,
              competencesWorked: [...new Set(exerciseResultsData.map(r => r.competenceCode).filter(Boolean))]
            }
          }
        });

      } catch (error) {
        fastify.log.error('Get session error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération de la session',
            code: 'GET_SESSION_ERROR'
          }
        });
      }
    }
  });

  // GET /api/sessions/student/:studentId - Get student's sessions
  fastify.get('/student/:studentId', {
    preHandler: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
          offset: { type: 'number', default: 0 },
          status: { type: 'string', enum: ['active', 'completed', 'all'] }
        }
      }
    },
    handler: async (request: FastifyRequest<{
      Params: { studentId: string };
      Querystring: { limit?: number; offset?: number; status?: string };
    }>, reply: FastifyReply) => {
      try {
        const { studentId } = request.params;
        const { limit = 10, offset = 0, status = 'all' } = request.query;
        const user = (request as any).user as AuthenticatedUser;

        // Verify student access
        if (user.studentId !== parseInt(studentId)) {
          return reply.status(403).send({
            success: false,
            error: {
              message: 'Accès non autorisé',
              code: 'FORBIDDEN'
            }
          });
        }

        // Build query with status filter
        let query = db
          .select()
          .from(learningSessions)
          .where(eq(learningSessions.studentId, parseInt(studentId)));

        if (status === 'active') {
          query = query.where(and(
            eq(learningSessions.studentId, parseInt(studentId)),
            sql`${learningSessions.endedAt} IS NULL`
          ));
        } else if (status === 'completed') {
          query = query.where(and(
            eq(learningSessions.studentId, parseInt(studentId)),
            sql`${learningSessions.endedAt} IS NOT NULL`
          ));
        }

        const sessions = await query
          .orderBy(desc(learningSessions.startedAt))
          .limit(limit)
          .offset(offset);

        // Get summary statistics
        const totalSessions = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(learningSessions)
          .where(eq(learningSessions.studentId, parseInt(studentId)));

        const activeSessions = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(learningSessions)
          .where(and(
            eq(learningSessions.studentId, parseInt(studentId)),
            sql`${learningSessions.endedAt} IS NULL`
          ));

        return reply.send({
          success: true,
          data: {
            sessions,
            pagination: {
              limit,
              offset,
              total: totalSessions[0].count
            },
            summary: {
              totalSessions: totalSessions[0].count,
              activeSessions: activeSessions[0].count,
              completedSessions: totalSessions[0].count - activeSessions[0].count
            }
          }
        });

      } catch (error) {
        fastify.log.error('Get student sessions error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération des sessions',
            code: 'GET_STUDENT_SESSIONS_ERROR'
          }
        });
      }
    }
  });

  // GET /api/sessions/active - Get current active session
  fastify.get('/active', {
    preHandler: [(fastify as any).authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user as AuthenticatedUser;

        // Get active session for authenticated user
        const activeSession = await db
          .select()
          .from(learningSessions)
          .where(and(
            eq(learningSessions.studentId, user.studentId),
            sql`${learningSessions.endedAt} IS NULL`
          ))
          .orderBy(desc(learningSessions.startedAt))
          .limit(1);

        if (activeSession.length === 0) {
          return reply.send({
            success: true,
            data: {
              hasActiveSession: false,
              session: null
            }
          });
        }

        const session = activeSession[0];

        // Calculate current session duration
        const startTime = new Date(session.startedAt).getTime();
        const currentTime = Date.now();
        const currentDuration = Math.floor((currentTime - startTime) / 1000);

        return reply.send({
          success: true,
          data: {
            hasActiveSession: true,
            session: {
              ...session,
              currentDuration
            }
          }
        });

      } catch (error) {
        fastify.log.error('Get active session error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            message: 'Erreur lors de la récupération de la session active',
            code: 'GET_ACTIVE_SESSION_ERROR'
          }
        });
      }
    }
  });
}