import { db } from '../db/connection';
import * as schema from '../db/schema';
import { eq, and, sql, gte, lte, desc, count } from 'drizzle-orm';

export class AnalyticsService {
  async getStudentProgress(studentId: number): Promise<{
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
    progressByModule: Array<{
      moduleId: number;
      moduleName: string;
      completed: number;
      total: number;
      averageScore: number;
    }>;
  }> {
    try {
      // Get total exercises completed by student
      const progressData = await db
        .select({
          exerciseId: schema.progress.exerciseId,
          score: schema.progress.score,
          completed: schema.progress.completed,
        })
        .from(schema.progress)
        .where(eq(schema.progress.studentId, studentId));

      const completedExercises = progressData.filter(p => p.completed === true);
      const totalExercises = progressData.length;
      const averageScore = completedExercises.length > 0 
        ? completedExercises.reduce((sum, p) => sum + (p.score || 0), 0) / completedExercises.length 
        : 0;

      // Get progress by module - since exercises don't have moduleId, we'll group by exercise type
      const progressByModule = await db
        .select({
          moduleId: sql<number>`1`, // Default module ID since we don't have modules linked
          moduleName: schema.exercises.type,
          completed: count(schema.progress.id),
          total: count(schema.exercises.id),
        })
        .from(schema.progress)
        .innerJoin(schema.exercises, eq(schema.progress.exerciseId, schema.exercises.id))
        .where(and(
          eq(schema.progress.studentId, studentId),
          eq(schema.progress.completed, true)
        ))
        .groupBy(schema.exercises.type);

      return {
        totalExercises,
        completedExercises: completedExercises.length,
        averageScore,
        progressByModule: progressByModule.map(p => ({
          moduleId: p.moduleId,
          moduleName: p.moduleName,
          completed: Number(p.completed),
          total: Number(p.total),
          averageScore: 0, // Would need additional query to calculate
        })),
      };
    } catch (error) {
      console.error('Error getting student progress:', error);
      return {
        totalExercises: 0,
        completedExercises: 0,
        averageScore: 0,
        progressByModule: [],
      };
    }
  }

  async getStudentSessionStats(studentId: number, days: number = 30): Promise<{
    totalSessions: number;
    averageSessionDuration: number;
    totalPoints: number;
    exercisesCompleted: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sessions = await db
        .select({
          id: schema.sessions.id,
          createdAt: schema.sessions.createdAt,
        })
        .from(schema.sessions)
        .where(and(
          eq(schema.sessions.studentId, studentId),
          gte(schema.sessions.createdAt, startDate)
        ));

      // Get student progress for points calculation
      const recentProgress = await db
        .select({
          score: schema.progress.score,
          timeSpent: schema.progress.timeSpent,
          completed: schema.progress.completed,
        })
        .from(schema.progress)
        .where(and(
          eq(schema.progress.studentId, studentId),
          gte(schema.progress.createdAt, startDate)
        ));

      const totalSessions = sessions.length;
      const averageSessionDuration = recentProgress.length > 0 
        ? recentProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / recentProgress.length 
        : 0;
      const totalPoints = recentProgress.reduce((sum, p) => sum + (p.score || 0), 0);
      const exercisesCompleted = recentProgress.filter(p => p.completed).length;

      return {
        totalSessions,
        averageSessionDuration,
        totalPoints,
        exercisesCompleted,
      };
    } catch (error) {
      console.error('Error getting student session stats:', error);
      return {
        totalSessions: 0,
        averageSessionDuration: 0,
        totalPoints: 0,
        exercisesCompleted: 0,
      };
    }
  }

  async getExerciseCompletionRate(exerciseId: number): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    completionRate: number;
    averageScore: number;
  }> {
    try {
      const progress = await db
        .select({
          completed: schema.progress.completed,
          score: schema.progress.score,
        })
        .from(schema.progress)
        .where(eq(schema.progress.exerciseId, exerciseId));

      const totalAttempts = progress.length;
      const successfulAttempts = progress.filter(p => p.completed === true).length;
      const completionRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
      const averageScore = successfulAttempts > 0 
        ? progress
            .filter(p => p.completed === true)
            .reduce((sum, p) => sum + (p.score || 0), 0) / successfulAttempts 
        : 0;

      return {
        totalAttempts,
        successfulAttempts,
        completionRate,
        averageScore,
      };
    } catch (error) {
      console.error('Error getting exercise completion rate:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        completionRate: 0,
        averageScore: 0,
      };
    }
  }
}
