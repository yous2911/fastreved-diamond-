import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from '../services/analytics.service';
import { enhancedDatabaseService as databaseService } from '../services/enhanced-database.service.js';

export default async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  const analyticsService = new AnalyticsService();

  // Performance analytics endpoint
  fastify.post('/performance', {
    schema: {
      body: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric: { type: 'object' },
                url: { type: 'string' },
                userAgent: { type: 'string' },
                timestamp: { type: 'number' },
                userId: { type: 'string' },
                sessionId: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { metrics } = request.body as { metrics: any[] };
      
      // Log performance metrics (in production, you'd store these in a database)
      fastify.log.info('Performance metrics received', { 
        count: metrics.length,
        sessionId: metrics[0]?.sessionId 
      });

      return reply.send({
        success: true,
        message: 'Performance metrics received',
        count: metrics.length
      });
    } catch (error) {
      fastify.log.error('Performance analytics error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to process performance metrics',
          code: 'ANALYTICS_ERROR'
        }
      });
    }
  });

  // Get student analytics
  fastify.get('/student/:studentId/progress', {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { studentId } = request.params as { studentId: number };
      
      const progress = await analyticsService.getStudentProgress(studentId);

      return reply.send({
        success: true,
        data: progress
      });
    } catch (error) {
      fastify.log.error('Get student progress analytics error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get student progress analytics',
          code: 'ANALYTICS_ERROR'
        }
      });
    }
  });

  // Get student session stats
  fastify.get('/student/:studentId/sessions', {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'number' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { studentId } = request.params as { studentId: number };
      const { days } = request.query as { days?: number };
      
      const stats = await analyticsService.getStudentSessionStats(studentId, days);

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      fastify.log.error('Get student session stats error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get student session stats',
          code: 'ANALYTICS_ERROR'
        }
      });
    }
  });

  // Get exercise completion rate
  fastify.get('/exercise/:exerciseId/completion', {
    schema: {
      params: {
        type: 'object',
        properties: {
          exerciseId: { type: 'number' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { exerciseId } = request.params as { exerciseId: number };
      
      const completion = await analyticsService.getExerciseCompletionRate(exerciseId);

      return reply.send({
        success: true,
        data: completion
      });
    } catch (error) {
      fastify.log.error('Get exercise completion rate error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get exercise completion rate',
          code: 'ANALYTICS_ERROR'
        }
      });
    }
  });

  // GET /api/analytics/daily-progress - Get daily learning progress analytics
  fastify.get('/daily-progress', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          studentId: { type: 'number' },
          dateStart: { type: 'string', format: 'date' },
          dateEnd: { type: 'string', format: 'date' },
          matiere: { type: 'string', enum: ['FRANCAIS', 'MATHEMATIQUES', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS'] },
          groupBy: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' },
          limit: { type: 'number', default: 30 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { 
        studentId, 
        dateStart, 
        dateEnd, 
        matiere, 
        groupBy = 'day', 
        limit = 30, 
        offset = 0 
      } = request.query as any;

      // Set default date range (last 30 days if not specified)
      const endDate = dateEnd ? new Date(dateEnd) : new Date();
      const startDate = dateStart ? new Date(dateStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get daily analytics data
      const analyticsData = await databaseService.getDailyLearningAnalytics({
        studentId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        matiere,
        groupBy,
        limit,
        offset
      });

      // Calculate aggregated metrics
      const aggregatedMetrics = {
        totalDays: analyticsData.length,
        totalSessionTime: analyticsData.reduce((sum, day) => sum + day.totalSessionTime, 0),
        totalExercises: analyticsData.reduce((sum, day) => sum + day.exercisesAttempted, 0),
        totalCompletedExercises: analyticsData.reduce((sum, day) => sum + day.exercisesCompleted, 0),
        averageScore: analyticsData.length > 0 ? 
          analyticsData.reduce((sum, day) => sum + parseFloat(day.averageScore.toString()), 0) / analyticsData.length : 0,
        totalXpEarned: analyticsData.reduce((sum, day) => sum + day.xpEarned, 0),
        totalCompetencesMastered: analyticsData.reduce((sum, day) => sum + day.competencesMastered, 0),
        maxStreakDays: Math.max(...analyticsData.map(day => day.streakDays), 0),
        completionRate: analyticsData.length > 0 ? 
          analyticsData.reduce((sum, day) => sum + day.exercisesCompleted, 0) / 
          Math.max(analyticsData.reduce((sum, day) => sum + day.exercisesAttempted, 0), 1) * 100 : 0
      };

      // Subject breakdown (if no specific subject filter)
      let subjectBreakdown = null;
      if (!matiere && analyticsData.length > 0) {
        subjectBreakdown = {
          francais: {
            totalTime: analyticsData.reduce((sum, day) => sum + day.francaisTime, 0),
            percentage: 0
          },
          mathematiques: {
            totalTime: analyticsData.reduce((sum, day) => sum + day.mathematiquesTime, 0),
            percentage: 0
          },
          sciences: {
            totalTime: analyticsData.reduce((sum, day) => sum + day.sciencesTime, 0),
            percentage: 0
          },
          histoireGeographie: {
            totalTime: analyticsData.reduce((sum, day) => sum + day.histoireGeographieTime, 0),
            percentage: 0
          },
          anglais: {
            totalTime: analyticsData.reduce((sum, day) => sum + day.anglaisTime, 0),
            percentage: 0
          }
        };

        // Calculate percentages
        Object.keys(subjectBreakdown).forEach(subject => {
          subjectBreakdown[subject].percentage = aggregatedMetrics.totalSessionTime > 0 ? 
            Math.round((subjectBreakdown[subject].totalTime / aggregatedMetrics.totalSessionTime) * 100) : 0;
        });
      }

      // Trend analysis
      const trendAnalysis = calculateTrendAnalysis(analyticsData, groupBy);

      return reply.send({
        success: true,
        data: {
          analytics: analyticsData.map(day => ({
            date: day.analyticsDate,
            sessionTime: day.totalSessionTime,
            exercisesAttempted: day.exercisesAttempted,
            exercisesCompleted: day.exercisesCompleted,
            averageScore: parseFloat(day.averageScore.toString()),
            xpEarned: day.xpEarned,
            competencesMastered: day.competencesMastered,
            competencesProgressed: day.competencesProgressed,
            streakDays: day.streakDays,
            subjectTimes: {
              francais: day.francaisTime,
              mathematiques: day.mathematiquesTime,
              sciences: day.sciencesTime,
              histoireGeographie: day.histoireGeographieTime,
              anglais: day.anglaisTime
            }
          })),
          aggregatedMetrics,
          subjectBreakdown,
          trendAnalysis,
          metadata: {
            dateRange: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
            filters: { studentId, matiere, groupBy },
            pagination: { limit, offset, total: analyticsData.length }
          }
        }
      });
    } catch (error) {
      fastify.log.error('Get daily progress analytics error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get daily progress analytics',
          code: 'ANALYTICS_ERROR'
        }
      });
    }
  });

  // GET /api/analytics/learning-sessions - Get detailed learning session analytics
  fastify.get('/learning-sessions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          studentId: { type: 'number' },
          dateStart: { type: 'string', format: 'date' },
          dateEnd: { type: 'string', format: 'date' },
          deviceType: { type: 'string', enum: ['mobile', 'tablet', 'desktop'] },
          minDuration: { type: 'number' },
          maxDuration: { type: 'number' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { 
        studentId, 
        dateStart, 
        dateEnd, 
        deviceType, 
        minDuration, 
        maxDuration,
        limit = 50, 
        offset = 0 
      } = request.query as any;

      const sessions = await databaseService.getLearningSessionTracking({
        studentId,
        dateStart,
        dateEnd,
        deviceType,
        minDuration,
        maxDuration,
        limit,
        offset
      });

      // Calculate session analytics
      const sessionAnalytics = {
        totalSessions: sessions.length,
        averageSessionDuration: sessions.length > 0 ? 
          sessions.reduce((sum, s) => sum + s.totalDuration, 0) / sessions.length : 0,
        totalLearningTime: sessions.reduce((sum, s) => sum + s.totalDuration, 0),
        averageFocusScore: sessions.length > 0 ? 
          sessions.reduce((sum, s) => sum + parseFloat(s.focusScore.toString()), 0) / sessions.length : 0,
        deviceDistribution: {
          mobile: sessions.filter(s => s.deviceType === 'mobile').length,
          tablet: sessions.filter(s => s.deviceType === 'tablet').length,
          desktop: sessions.filter(s => s.deviceType === 'desktop').length
        },
        motivationLevels: {
          low: sessions.filter(s => s.motivationLevel === 'low').length,
          neutral: sessions.filter(s => s.motivationLevel === 'neutral').length,
          high: sessions.filter(s => s.motivationLevel === 'high').length
        }
      };

      return reply.send({
        success: true,
        data: {
          sessions: sessions.map(s => ({
            id: s.id,
            sessionStart: s.sessionStart,
            sessionEnd: s.sessionEnd,
            duration: s.totalDuration,
            exercisesAttempted: s.exercisesAttempted,
            exercisesCompleted: s.exercisesCompleted,
            averageScore: parseFloat(s.averageScore.toString()),
            xpEarned: s.xpEarned,
            focusScore: parseFloat(s.focusScore.toString()),
            motivationLevel: s.motivationLevel,
            deviceType: s.deviceType,
            competencesWorked: s.competencesWorked
          })),
          analytics: sessionAnalytics,
          filters: { studentId, dateStart, dateEnd, deviceType, minDuration, maxDuration },
          pagination: { limit, offset, total: sessions.length }
        }
      });
    } catch (error) {
      fastify.log.error('Get learning sessions analytics error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Failed to get learning sessions analytics',
          code: 'ANALYTICS_ERROR'
        }
      });
    }
  });
}

// Helper function to calculate trend analysis
function calculateTrendAnalysis(data: any[], groupBy: string) {
  if (data.length < 2) return null;

  const sortedData = [...data].sort((a, b) => 
    new Date(a.analyticsDate).getTime() - new Date(b.analyticsDate).getTime()
  );

  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return { direction: 'stable', change: 0 };
    
    const recent = values.slice(-7).reduce((sum, val) => sum + val, 0) / Math.min(7, values.length);
    const previous = values.slice(0, -7).reduce((sum, val) => sum + val, 0) / Math.max(1, values.length - 7);
    
    const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    
    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change: Math.round(change * 100) / 100
    };
  };

  return {
    sessionTime: calculateTrend(sortedData.map(d => d.totalSessionTime)),
    averageScore: calculateTrend(sortedData.map(d => parseFloat(d.averageScore.toString()))),
    exercisesCompleted: calculateTrend(sortedData.map(d => d.exercisesCompleted)),
    competenceProgress: calculateTrend(sortedData.map(d => d.competencesMastered + d.competencesProgressed)),
    consistency: {
      activeDays: sortedData.filter(d => d.totalSessionTime > 0).length,
      totalDays: sortedData.length,
      consistencyRate: Math.round((sortedData.filter(d => d.totalSessionTime > 0).length / sortedData.length) * 100)
    }
  };
} 