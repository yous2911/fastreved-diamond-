/**
 * Optimized Database Queries for RevEd Kids Backend
 * Implements N+1 problem prevention, efficient joins, and query optimization
 */

import { eq, and, or, like, desc, asc, inArray, sql, gt, lt, gte, lte, isNotNull, isNull } from 'drizzle-orm';
import { db } from './connection';
import { 
  students, 
  exercises, 
  studentProgress, 
  studentLearningPath, 
  sessions, 
  revisions, 
  modules 
} from './schema';
import { logger } from '../utils/logger';

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
  orderField?: string;
}

interface StudentWithProgress {
  student: typeof students.$inferSelect;
  progress: (typeof studentProgress.$inferSelect)[];
  currentExercises: (typeof exercises.$inferSelect)[];
  learningPath: (typeof studentLearningPath.$inferSelect)[];
}

interface ExerciseWithStats {
  exercise: typeof exercises.$inferSelect;
  completionRate: number;
  averageScore: number;
  totalAttempts: number;
}

class OptimizedQueries {
  /**
   * Get student with all related data in a single optimized query
   * Prevents N+1 problem by using JOIN instead of multiple queries
   */
  async getStudentWithProgress(studentId: number): Promise<StudentWithProgress | null> {
    const startTime = Date.now();
    
    try {
      // Single query with LEFT JOINs to get all related data
      const result = await db
        .select({
          // Student fields
          student: students,
          // Progress fields
          progress: studentProgress,
          // Exercise fields (for current exercises)
          exercise: exercises,
          // Learning path fields
          learningPath: studentLearningPath,
        })
        .from(students)
        .leftJoin(studentProgress, eq(students.id, studentProgress.studentId))
        .leftJoin(exercises, eq(studentProgress.exerciseId, exercises.id))
        .leftJoin(studentLearningPath, eq(students.id, studentLearningPath.studentId))
        .where(eq(students.id, studentId));

      if (result.length === 0) return null;

      // Group results to prevent data duplication
      const student = result[0].student;
      const progressMap = new Map();
      const exerciseMap = new Map();
      const learningPathMap = new Map();

      result.forEach(row => {
        if (row.progress && !progressMap.has(row.progress.id)) {
          progressMap.set(row.progress.id, row.progress);
        }
        if (row.exercise && !exerciseMap.has(row.exercise.id)) {
          exerciseMap.set(row.exercise.id, row.exercise);
        }
        if (row.learningPath && !learningPathMap.has(row.learningPath.id)) {
          learningPathMap.set(row.learningPath.id, row.learningPath);
        }
      });

      const queryTime = Date.now() - startTime;
      logger.debug('Student with progress query completed', { 
        studentId, 
        queryTime, 
        progressCount: progressMap.size,
        exerciseCount: exerciseMap.size,
        learningPathCount: learningPathMap.size
      });

      return {
        student,
        progress: Array.from(progressMap.values()),
        currentExercises: Array.from(exerciseMap.values()),
        learningPath: Array.from(learningPathMap.values()),
      };
    } catch (error) {
      logger.error('Failed to get student with progress', { studentId, error });
      throw error;
    }
  }

  /**
   * Get exercises with completion statistics
   * Uses efficient aggregation to prevent multiple queries
   */
  async getExercisesWithStats(
    filters: {
      matiere?: string;
      niveau?: string;
      difficulte?: string;
      estActif?: boolean;
    } = {},
    options: QueryOptions = {}
  ): Promise<ExerciseWithStats[]> {
    const startTime = Date.now();
    
    try {
      const { limit = 50, offset = 0 } = options;

      // Build WHERE conditions
      const conditions = [];
      if (filters.matiere) conditions.push(eq(exercises.matiere, filters.matiere));
      if (filters.niveau) conditions.push(eq(exercises.niveau, filters.niveau));
      if (filters.difficulte) conditions.push(eq(exercises.difficulte, filters.difficulte));
      if (filters.estActif !== undefined) conditions.push(eq(exercises.estActif, filters.estActif));

      // Single query with aggregation to get exercises and their stats
      const result = await db
        .select({
          exercise: exercises,
          totalStudents: sql<number>`COUNT(DISTINCT ${studentProgress.studentId})`,
          completedStudents: sql<number>`SUM(CASE WHEN ${studentProgress.completed} = 1 THEN 1 ELSE 0 END)`,
          totalAttempts: sql<number>`SUM(${studentProgress.totalAttempts})`,
          averageScore: sql<number>`AVG(${studentProgress.averageScore})`,
        })
        .from(exercises)
        .leftJoin(studentProgress, eq(exercises.id, studentProgress.exerciseId))
        .where(and(...conditions))
        .groupBy(exercises.id)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(exercises.createdAt));

      const exercisesWithStats: ExerciseWithStats[] = result.map(row => ({
        exercise: row.exercise,
        completionRate: row.totalStudents > 0 ? (row.completedStudents / row.totalStudents) * 100 : 0,
        averageScore: row.averageScore || 0,
        totalAttempts: row.totalAttempts || 0,
      }));

      const queryTime = Date.now() - startTime;
      logger.debug('Exercises with stats query completed', { 
        queryTime, 
        resultCount: exercisesWithStats.length,
        filters
      });

      return exercisesWithStats;
    } catch (error) {
      logger.error('Failed to get exercises with stats', { filters, error });
      throw error;
    }
  }

  /**
   * Get students' progress summary for a specific competence
   * Optimized for dashboard analytics
   */
  async getCompetenceProgressSummary(
    competenceCode: string,
    studentIds?: number[]
  ): Promise<Array<{
    studentId: number;
    studentName: string;
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
    masteryLevel: string;
    lastActivity: Date | null;
  }>> {
    const startTime = Date.now();
    
    try {
      // Build conditions
      const conditions = [eq(studentProgress.competenceCode, competenceCode)];
      if (studentIds && studentIds.length > 0) {
        conditions.push(inArray(studentProgress.studentId, studentIds));
      }

      const result = await db
        .select({
          studentId: students.id,
          studentName: sql<string>`CONCAT(${students.prenom}, ' ', ${students.nom})`,
          totalExercises: sql<number>`COUNT(${studentProgress.id})`,
          completedExercises: sql<number>`SUM(CASE WHEN ${studentProgress.completed} = 1 THEN 1 ELSE 0 END)`,
          averageScore: sql<number>`AVG(${studentProgress.averageScore})`,
          bestMasteryLevel: sql<string>`MAX(${studentProgress.masteryLevel})`,
          lastActivity: sql<Date>`MAX(${studentProgress.lastAttemptAt})`,
        })
        .from(studentProgress)
        .innerJoin(students, eq(studentProgress.studentId, students.id))
        .where(and(...conditions))
        .groupBy(students.id, students.prenom, students.nom)
        .orderBy(desc(sql`AVG(${studentProgress.averageScore})`));

      const summary = result.map(row => ({
        studentId: row.studentId,
        studentName: row.studentName,
        totalExercises: row.totalExercises,
        completedExercises: row.completedExercises,
        averageScore: row.averageScore || 0,
        masteryLevel: row.bestMasteryLevel || 'not_started',
        lastActivity: row.lastActivity,
      }));

      const queryTime = Date.now() - startTime;
      logger.debug('Competence progress summary query completed', { 
        competenceCode,
        queryTime, 
        resultCount: summary.length 
      });

      return summary;
    } catch (error) {
      logger.error('Failed to get competence progress summary', { competenceCode, error });
      throw error;
    }
  }

  /**
   * Get active sessions with student information
   * Optimized for session management
   */
  async getActiveSessions(limit: number = 100): Promise<Array<{
    session: typeof sessions.$inferSelect;
    student: Pick<typeof students.$inferSelect, 'id' | 'prenom' | 'nom' | 'niveauActuel'>;
  }>> {
    const startTime = Date.now();
    
    try {
      const result = await db
        .select({
          session: sessions,
          student: {
            id: students.id,
            prenom: students.prenom,
            nom: students.nom,
            niveauActuel: students.niveauActuel,
          }
        })
        .from(sessions)
        .innerJoin(students, eq(sessions.studentId, students.id))
        .where(gt(sessions.expiresAt, new Date()))
        .orderBy(desc(sessions.createdAt))
        .limit(limit);

      const queryTime = Date.now() - startTime;
      logger.debug('Active sessions query completed', { 
        queryTime, 
        sessionCount: result.length 
      });

      return result;
    } catch (error) {
      logger.error('Failed to get active sessions', { error });
      throw error;
    }
  }

  /**
   * Get students requiring revision (spaced repetition)
   * Optimized for educational scheduling
   */
  async getStudentsNeedingRevision(date: Date = new Date()): Promise<Array<{
    studentId: number;
    studentName: string;
    exerciseId: number;
    exerciseTitle: string;
    competenceCode: string;
    scheduledAt: Date | null;
    priority: 'high' | 'medium' | 'low';
  }>> {
    const startTime = Date.now();
    
    try {
      const result = await db
        .select({
          studentId: students.id,
          studentName: sql<string>`CONCAT(${students.prenom}, ' ', ${students.nom})`,
          exerciseId: exercises.id,
          exerciseTitle: exercises.titre,
          competenceCode: studentProgress.competenceCode,
          scheduledAt: studentProgress.reviewScheduledAt,
          masteryLevel: studentProgress.masteryLevel,
          lastAttempt: studentProgress.lastAttemptAt,
        })
        .from(studentProgress)
        .innerJoin(students, eq(studentProgress.studentId, students.id))
        .innerJoin(exercises, eq(studentProgress.exerciseId, exercises.id))
        .where(
          and(
            eq(studentProgress.needsReview, true),
            or(
              isNull(studentProgress.reviewScheduledAt),
              lte(studentProgress.reviewScheduledAt, date)
            ),
            eq(exercises.estActif, true)
          )
        )
        .orderBy(asc(studentProgress.reviewScheduledAt), desc(studentProgress.lastAttemptAt));

      // Calculate priority based on mastery level and time since last attempt
      const studentsWithPriority = result.map(row => {
        let priority: 'high' | 'medium' | 'low' = 'medium';
        
        const daysSinceLastAttempt = row.lastAttempt 
          ? Math.floor((date.getTime() - row.lastAttempt.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (row.masteryLevel === 'en_cours' && daysSinceLastAttempt > 7) {
          priority = 'high';
        } else if (row.masteryLevel === 'maitrise' && daysSinceLastAttempt > 30) {
          priority = 'high';
        } else if (daysSinceLastAttempt > 14) {
          priority = 'medium';
        } else {
          priority = 'low';
        }

        return {
          studentId: row.studentId,
          studentName: row.studentName,
          exerciseId: row.exerciseId,
          exerciseTitle: row.exerciseTitle,
          competenceCode: row.competenceCode,
          scheduledAt: row.scheduledAt,
          priority,
        };
      });

      const queryTime = Date.now() - startTime;
      logger.debug('Students needing revision query completed', { 
        queryTime, 
        resultCount: studentsWithPriority.length 
      });

      return studentsWithPriority;
    } catch (error) {
      logger.error('Failed to get students needing revision', { error });
      throw error;
    }
  }

  /**
   * Get learning analytics for dashboard
   * Highly optimized aggregation query
   */
  async getLearningAnalytics(
    studentId?: number,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalStudents: number;
    totalExercises: number;
    completionRate: number;
    averageScore: number;
    activeStudents: number;
    topCompetences: Array<{
      competenceCode: string;
      completionRate: number;
      averageScore: number;
      studentCount: number;
    }>;
    activityTrend: Array<{
      date: string;
      completions: number;
      averageScore: number;
    }>;
  }> {
    const startTime = Date.now();
    
    try {
      // Build date condition
      const dateCondition = dateRange 
        ? and(
            gte(studentProgress.lastAttemptAt, dateRange.start),
            lte(studentProgress.lastAttemptAt, dateRange.end)
          )
        : undefined;

      const studentCondition = studentId ? eq(studentProgress.studentId, studentId) : undefined;
      const whereCondition = and(dateCondition, studentCondition);

      // Parallel execution of multiple analytics queries
      const [
        overallStats,
        competenceStats,
        activityStats
      ] = await Promise.all([
        // Overall statistics
        db
          .select({
            totalStudents: sql<number>`COUNT(DISTINCT ${studentProgress.studentId})`,
            totalExercises: sql<number>`COUNT(DISTINCT ${studentProgress.exerciseId})`,
            completedExercises: sql<number>`SUM(CASE WHEN ${studentProgress.completed} = 1 THEN 1 ELSE 0 END)`,
            totalAttempts: sql<number>`SUM(${studentProgress.totalAttempts})`,
            averageScore: sql<number>`AVG(${studentProgress.averageScore})`,
            activeStudents: sql<number>`COUNT(DISTINCT CASE WHEN ${studentProgress.lastAttemptAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN ${studentProgress.studentId} END)`,
          })
          .from(studentProgress)
          .where(whereCondition),

        // Top competences
        db
          .select({
            competenceCode: studentProgress.competenceCode,
            completionRate: sql<number>`(SUM(CASE WHEN ${studentProgress.completed} = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`,
            averageScore: sql<number>`AVG(${studentProgress.averageScore})`,
            studentCount: sql<number>`COUNT(DISTINCT ${studentProgress.studentId})`,
          })
          .from(studentProgress)
          .where(whereCondition)
          .groupBy(studentProgress.competenceCode)
          .orderBy(desc(sql`AVG(${studentProgress.averageScore})`))
          .limit(10),

        // Activity trend (last 30 days)
        db
          .select({
            date: sql<string>`DATE(${studentProgress.lastAttemptAt})`,
            completions: sql<number>`SUM(CASE WHEN ${studentProgress.completed} = 1 THEN 1 ELSE 0 END)`,
            averageScore: sql<number>`AVG(${studentProgress.averageScore})`,
          })
          .from(studentProgress)
          .where(
            and(
              gte(studentProgress.lastAttemptAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
              studentCondition
            )
          )
          .groupBy(sql`DATE(${studentProgress.lastAttemptAt})`)
          .orderBy(asc(sql`DATE(${studentProgress.lastAttemptAt})`))
      ]);

      const overall = overallStats[0] || {};
      const completionRate = overall.totalAttempts > 0 
        ? (overall.completedExercises / overall.totalAttempts) * 100 
        : 0;

      const result = {
        totalStudents: overall.totalStudents || 0,
        totalExercises: overall.totalExercises || 0,
        completionRate,
        averageScore: overall.averageScore || 0,
        activeStudents: overall.activeStudents || 0,
        topCompetences: competenceStats,
        activityTrend: activityStats,
      };

      const queryTime = Date.now() - startTime;
      logger.debug('Learning analytics query completed', { 
        queryTime, 
        studentId,
        totalStudents: result.totalStudents 
      });

      return result;
    } catch (error) {
      logger.error('Failed to get learning analytics', { studentId, error });
      throw error;
    }
  }

  /**
   * Batch update student progress to prevent N+1 problem
   */
  async batchUpdateProgress(
    updates: Array<{
      studentId: number;
      exerciseId: number;
      score: number;
      completed: boolean;
      timeSpent: number;
    }>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Use batch insert/update for efficiency
      const updatePromises = updates.map(update => 
        db
          .update(studentProgress)
          .set({
            averageScore: sql`(${studentProgress.averageScore} * ${studentProgress.totalAttempts} + ${update.score}) / (${studentProgress.totalAttempts} + 1)`,
            bestScore: sql`GREATEST(${studentProgress.bestScore}, ${update.score})`,
            totalAttempts: sql`${studentProgress.totalAttempts} + 1`,
            successfulAttempts: sql`${studentProgress.successfulAttempts} + ${update.completed ? 1 : 0}`,
            totalTimeSpent: sql`${studentProgress.totalTimeSpent} + ${update.timeSpent}`,
            completed: update.completed,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(studentProgress.studentId, update.studentId),
              eq(studentProgress.exerciseId, update.exerciseId)
            )
          )
      );

      await Promise.all(updatePromises);

      const queryTime = Date.now() - startTime;
      logger.info('Batch progress update completed', { 
        queryTime, 
        updateCount: updates.length 
      });
    } catch (error) {
      logger.error('Failed to batch update progress', { updateCount: updates.length, error });
      throw error;
    }
  }

  /**
   * Get recommended exercises for a student
   * Uses intelligent algorithm based on progress and learning path
   */
  async getRecommendedExercises(
    studentId: number,
    limit: number = 10
  ): Promise<Array<{
    exercise: typeof exercises.$inferSelect;
    recommendationScore: number;
    reason: string;
  }>> {
    const startTime = Date.now();
    
    try {
      // Complex query to get personalized exercise recommendations
      const result = await db
        .select({
          exercise: exercises,
          currentProgress: studentProgress.masteryLevel,
          competenceProgress: sql<number>`
            COALESCE(
              (SELECT AVG(sp2.progress_percent) 
               FROM student_progress sp2 
               WHERE sp2.student_id = ${studentId} 
               AND sp2.competence_code = ${exercises.competenceCode}), 
              0
            )
          `,
          learningPathStatus: sql<string>`
            COALESCE(
              (SELECT slp.status 
               FROM student_learning_path slp 
               WHERE slp.student_id = ${studentId} 
               AND slp.competence_code = ${exercises.competenceCode}), 
              'available'
            )
          `,
          isCompleted: sql<boolean>`
            COALESCE(
              (SELECT sp.completed 
               FROM student_progress sp 
               WHERE sp.student_id = ${studentId} 
               AND sp.exercise_id = ${exercises.id}), 
              false
            )
          `,
        })
        .from(exercises)
        .leftJoin(
          studentProgress, 
          and(
            eq(studentProgress.exerciseId, exercises.id),
            eq(studentProgress.studentId, studentId)
          )
        )
        .where(
          and(
            eq(exercises.estActif, true),
            or(
              isNull(studentProgress.completed),
              eq(studentProgress.completed, false)
            )
          )
        )
        .limit(limit * 3) // Get more for filtering
        .orderBy(asc(exercises.ordre));

      // Calculate recommendation scores
      const recommendations = result
        .map(row => {
          let score = 50; // Base score
          let reason = 'Standard recommendation';

          // Boost score based on learning path
          if (row.learningPathStatus === 'in_progress') {
            score += 30;
            reason = 'Currently in learning path';
          } else if (row.learningPathStatus === 'available') {
            score += 10;
            reason = 'Available in learning path';
          }

          // Boost based on competence progress
          if (row.competenceProgress > 0 && row.competenceProgress < 100) {
            score += 20;
            reason = 'Continuing competence development';
          }

          // Penalize if too advanced
          if (row.competenceProgress < 30 && row.exercise.difficulte === 'maitrise') {
            score -= 25;
            reason = 'Too advanced for current level';
          }

          // Boost recent competences
          if (row.competenceProgress > 70) {
            score += 15;
            reason = 'Near mastery - good for reinforcement';
          }

          return {
            exercise: row.exercise,
            recommendationScore: score,
            reason,
          };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

      const queryTime = Date.now() - startTime;
      logger.debug('Recommended exercises query completed', { 
        studentId,
        queryTime, 
        resultCount: recommendations.length 
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to get recommended exercises', { studentId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const optimizedQueries = new OptimizedQueries();

// Export individual query methods for convenience
export const {
  getStudentWithProgress,
  getExercisesWithStats,
  getCompetenceProgressSummary,
  getActiveSessions,
  getStudentsNeedingRevision,
  getLearningAnalytics,
  batchUpdateProgress,
  getRecommendedExercises,
} = optimizedQueries;