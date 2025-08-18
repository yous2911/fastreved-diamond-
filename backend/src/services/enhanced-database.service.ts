// Enhanced database service with MySQL support for CP2025 features
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
  students,
  exercises,
  studentProgress,
  studentCompetenceProgress,
  competencePrerequisites,
  studentLearningPath,
  dailyLearningAnalytics,
  weeklyProgressSummary,
  learningSessionTracking,
  exercisePerformanceAnalytics,
  studentAchievements,
  type Student,
  type Exercise,
  type Progress,
  type StudentCompetenceProgress,
  type NewStudentCompetenceProgress,
  type CompetencePrerequisite,
  type StudentLearningPath,
  type DailyLearningAnalytics,
  type StudentAchievement,
  type LearningSessionTracking,
  MasteryLevels
} from '../db/schema.js';
import { eq, and, desc, asc, sql, count, sum, avg, between, inArray } from 'drizzle-orm';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    tables: string[];
    timestamp: string;
  };
}

interface CompetenceProgressFilters {
  matiere?: string;
  niveau?: string;
  masteryLevel?: string;
  competenceCodes?: string[];
  limit?: number;
  offset?: number;
}

interface ProgressRecordingData {
  competenceCode: string;
  score: number;
  timeSpent: number;
  completed: boolean;
  attempts?: number;
  exerciseId?: number;
  difficultyLevel?: number;
  sessionData?: {
    sessionId?: string;
    deviceType?: string;
    focusScore?: number;
  };
}

interface AchievementFilters {
  category?: string;
  difficulty?: string;
  completed?: boolean;
  visible?: boolean;
  limit?: number;
  offset?: number;
}

interface AnalyticsFilters {
  studentId?: number;
  startDate?: string;
  endDate?: string;
  matiere?: string;
  groupBy?: string;
  limit?: number;
  offset?: number;
}

class EnhancedDatabaseService {
  private db: any;
  private connection: mysql.Connection | null = null;

  constructor(private config: DatabaseConfig) {}

  async initialize(): Promise<void> {
    try {
      // Create MySQL connection
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });

      // Initialize Drizzle with MySQL
      this.db = drizzle(this.connection);
      
      console.log('Enhanced database service initialized with MySQL');
    } catch (error) {
      console.error('Failed to initialize enhanced database service:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      if (!this.connection) {
        throw new Error('No database connection');
      }

      await this.connection.ping();
      
      // Check tables exist
      const [tables] = await this.connection.execute(
        `SELECT TABLE_NAME FROM information_schema.tables 
         WHERE table_schema = ? AND table_name IN (?, ?, ?, ?)`,
        [this.config.database, 'students', 'student_competence_progress', 'competence_prerequisites', 'daily_learning_analytics']
      );

      return {
        status: 'healthy',
        details: {
          connection: true,
          tables: (tables as any[]).map(t => t.TABLE_NAME),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connection: false,
          tables: [],
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Enhanced Methods for CP2025 Features

  async getStudentCompetenceProgress(studentId: number, filters: CompetenceProgressFilters = {}): Promise<StudentCompetenceProgress[]> {
    try {
      let query = this.db
        .select()
        .from(studentCompetenceProgress)
        .where(eq(studentCompetenceProgress.studentId, studentId));

      // Apply filters
      if (filters.matiere) {
        query = query.where(and(
          eq(studentCompetenceProgress.studentId, studentId),
          eq(studentCompetenceProgress.matiere, filters.matiere)
        ));
      }

      if (filters.niveau) {
        query = query.where(and(
          eq(studentCompetenceProgress.studentId, studentId),
          eq(studentCompetenceProgress.niveau, filters.niveau)
        ));
      }

      if (filters.masteryLevel) {
        query = query.where(and(
          eq(studentCompetenceProgress.studentId, studentId),
          eq(studentCompetenceProgress.masteryLevel, filters.masteryLevel)
        ));
      }

      if (filters.competenceCodes && filters.competenceCodes.length > 0) {
        query = query.where(and(
          eq(studentCompetenceProgress.studentId, studentId),
          inArray(studentCompetenceProgress.competenceCode, filters.competenceCodes)
        ));
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      query = query.orderBy(desc(studentCompetenceProgress.updatedAt));

      return await query.execute();
    } catch (error) {
      console.error('Get student competence progress error:', error);
      throw error;
    }
  }

  async recordStudentProgress(studentId: number, data: ProgressRecordingData): Promise<any> {
    try {
      // Get existing progress record or create new one
      const existingProgress = await this.db
        .select()
        .from(studentCompetenceProgress)
        .where(and(
          eq(studentCompetenceProgress.studentId, studentId),
          eq(studentCompetenceProgress.competenceCode, data.competenceCode)
        ))
        .limit(1)
        .execute();

      const now = new Date().toISOString();
      let masteryLevelChanged = false;
      let newMasteryLevel = MasteryLevels.NOT_STARTED;

      if (existingProgress.length > 0) {
        // Update existing progress
        const current = existingProgress[0];
        const newTotalAttempts = current.totalAttempts + (data.attempts || 1);
        const newSuccessfulAttempts = current.successfulAttempts + (data.completed ? 1 : 0);
        const newAverageScore = ((current.averageScore * current.totalAttempts) + data.score) / newTotalAttempts;
        const newTotalTimeSpent = current.totalTimeSpent + data.timeSpent;
        const newAverageTimePerAttempt = newTotalTimeSpent / newTotalAttempts;

        // Calculate new progress percentage
        const successRate = newSuccessfulAttempts / newTotalAttempts;
        const scoreContribution = newAverageScore / 100;
        const newProgressPercent = Math.round((successRate * 0.6 + scoreContribution * 0.4) * 100);

        // Determine new mastery level
        const oldMasteryLevel = current.masteryLevel;
        newMasteryLevel = this.calculateMasteryLevel(newProgressPercent, newAverageScore, newSuccessfulAttempts);
        masteryLevelChanged = oldMasteryLevel !== newMasteryLevel;

        // Update consecutive successes/failures
        let newConsecutiveSuccesses = current.consecutiveSuccesses;
        let newConsecutiveFailures = current.consecutiveFailures;
        
        if (data.completed && data.score >= 70) {
          newConsecutiveSuccesses++;
          newConsecutiveFailures = 0;
        } else {
          newConsecutiveSuccesses = 0;
          newConsecutiveFailures++;
        }

        await this.db
          .update(studentCompetenceProgress)
          .set({
            masteryLevel: newMasteryLevel,
            progressPercent: newProgressPercent,
            totalAttempts: newTotalAttempts,
            successfulAttempts: newSuccessfulAttempts,
            averageScore: newAverageScore,
            totalTimeSpent: newTotalTimeSpent,
            averageTimePerAttempt: Math.round(newAverageTimePerAttempt),
            difficultyLevel: data.difficultyLevel || current.difficultyLevel,
            consecutiveSuccesses: newConsecutiveSuccesses,
            consecutiveFailures: newConsecutiveFailures,
            lastAttemptAt: now,
            masteredAt: newMasteryLevel === MasteryLevels.MASTERED ? now : current.masteredAt,
            updatedAt: now
          })
          .where(eq(studentCompetenceProgress.id, current.id))
          .execute();

        return {
          id: current.id,
          masteryLevel: newMasteryLevel,
          progressPercent: newProgressPercent,
          consecutiveSuccesses: newConsecutiveSuccesses,
          masteryLevelChanged,
          averageScore: newAverageScore
        };

      } else {
        // Create new progress record
        const initialProgressPercent = data.completed ? Math.round(data.score * 0.4) : Math.round(data.score * 0.2);
        newMasteryLevel = this.calculateMasteryLevel(initialProgressPercent, data.score, data.completed ? 1 : 0);
        masteryLevelChanged = true; // First time is always a change

        // Extract competence details from code (assuming format like CP.FR.L1.1)
        const codeParts = data.competenceCode.split('.');
        const niveau = codeParts[0] || 'CP';
        const matiere = codeParts[1] || 'FRANCAIS';
        const domaine = codeParts[2] || 'L1';

        const newRecord = await this.db
          .insert(studentCompetenceProgress)
          .values({
            studentId,
            competenceCode: data.competenceCode,
            niveau,
            matiere,
            domaine,
            masteryLevel: newMasteryLevel,
            progressPercent: initialProgressPercent,
            totalAttempts: data.attempts || 1,
            successfulAttempts: data.completed ? 1 : 0,
            averageScore: data.score,
            totalTimeSpent: data.timeSpent,
            averageTimePerAttempt: data.timeSpent,
            difficultyLevel: data.difficultyLevel || 1.0,
            consecutiveSuccesses: (data.completed && data.score >= 70) ? 1 : 0,
            consecutiveFailures: (data.completed && data.score >= 70) ? 0 : 1,
            firstAttemptAt: now,
            lastAttemptAt: now,
            masteredAt: newMasteryLevel === MasteryLevels.MASTERED ? now : null,
            createdAt: now,
            updatedAt: now
          })
          .execute();

        return {
          id: newRecord.insertId,
          masteryLevel: newMasteryLevel,
          progressPercent: initialProgressPercent,
          consecutiveSuccesses: (data.completed && data.score >= 70) ? 1 : 0,
          masteryLevelChanged,
          averageScore: data.score
        };
      }
    } catch (error) {
      console.error('Record student progress error:', error);
      throw error;
    }
  }

  async getCompetencePrerequisites(competenceCode: string, options: { includeDetails?: boolean; depth?: number } = {}): Promise<CompetencePrerequisite[]> {
    try {
      const prerequisites = await this.db
        .select()
        .from(competencePrerequisites)
        .where(eq(competencePrerequisites.competenceCode, competenceCode))
        .orderBy(desc(competencePrerequisites.weight))
        .execute();

      return prerequisites;
    } catch (error) {
      console.error('Get competence prerequisites error:', error);
      throw error;
    }
  }

  async getStudentAchievements(studentId: number, filters: AchievementFilters = {}): Promise<StudentAchievement[]> {
    try {
      let query = this.db
        .select()
        .from(studentAchievements)
        .where(eq(studentAchievements.studentId, studentId));

      // Apply filters
      const conditions = [eq(studentAchievements.studentId, studentId)];
      
      if (filters.category) {
        conditions.push(eq(studentAchievements.category, filters.category));
      }
      if (filters.difficulty) {
        conditions.push(eq(studentAchievements.difficulty, filters.difficulty));
      }
      if (typeof filters.completed === 'boolean') {
        conditions.push(eq(studentAchievements.isCompleted, filters.completed));
      }
      if (typeof filters.visible === 'boolean') {
        conditions.push(eq(studentAchievements.isVisible, filters.visible));
      }

      query = query.where(and(...conditions));

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      query = query.orderBy(asc(studentAchievements.displayOrder), desc(studentAchievements.createdAt));

      return await query.execute();
    } catch (error) {
      console.error('Get student achievements error:', error);
      throw error;
    }
  }

  async getDailyLearningAnalytics(filters: AnalyticsFilters): Promise<DailyLearningAnalytics[]> {
    try {
      let query = this.db
        .select()
        .from(dailyLearningAnalytics);

      const conditions = [];
      
      if (filters.studentId) {
        conditions.push(eq(dailyLearningAnalytics.studentId, filters.studentId));
      }
      
      if (filters.startDate && filters.endDate) {
        conditions.push(
          between(
            dailyLearningAnalytics.analyticsDate,
            filters.startDate,
            filters.endDate
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      query = query.orderBy(desc(dailyLearningAnalytics.analyticsDate));

      return await query.execute();
    } catch (error) {
      console.error('Get daily learning analytics error:', error);
      throw error;
    }
  }

  async getLearningSessionTracking(filters: any): Promise<LearningSessionTracking[]> {
    try {
      let query = this.db
        .select()
        .from(learningSessionTracking);

      const conditions = [];
      
      if (filters.studentId) {
        conditions.push(eq(learningSessionTracking.studentId, filters.studentId));
      }
      
      if (filters.deviceType) {
        conditions.push(eq(learningSessionTracking.deviceType, filters.deviceType));
      }

      if (filters.dateStart && filters.dateEnd) {
        conditions.push(
          between(
            learningSessionTracking.sessionStart,
            filters.dateStart,
            filters.dateEnd
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      query = query.orderBy(desc(learningSessionTracking.sessionStart));

      return await query.execute();
    } catch (error) {
      console.error('Get learning session tracking error:', error);
      throw error;
    }
  }

  // Helper methods

  private calculateMasteryLevel(progressPercent: number, averageScore: number, successfulAttempts: number): string {
    if (progressPercent >= 95 && averageScore >= 90 && successfulAttempts >= 5) {
      return MasteryLevels.MASTERED;
    } else if (progressPercent >= 80 && averageScore >= 75) {
      return MasteryLevels.MASTERING;
    } else if (progressPercent >= 50 && successfulAttempts >= 2) {
      return MasteryLevels.PRACTICING;
    } else if (progressPercent >= 20 || successfulAttempts >= 1) {
      return MasteryLevels.DISCOVERING;
    } else {
      return MasteryLevels.NOT_STARTED;
    }
  }

  async updateLearningPath(studentId: number, competenceCode: string, masteryLevel: string): Promise<void> {
    // Update the learning path status based on mastery level
    try {
      const newStatus = masteryLevel === MasteryLevels.MASTERED ? 'completed' :
                       masteryLevel === MasteryLevels.MASTERING || masteryLevel === MasteryLevels.PRACTICING ? 'in_progress' :
                       'available';

      await this.db
        .update(studentLearningPath)
        .set({
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
        .where(and(
          eq(studentLearningPath.studentId, studentId),
          eq(studentLearningPath.competenceCode, competenceCode)
        ))
        .execute();
    } catch (error) {
      console.error('Update learning path error:', error);
      // Don't throw - this is a secondary operation
    }
  }

  async checkAndUnlockAchievements(studentId: number, context: any): Promise<any[]> {
    // Simplified achievement checking - in practice this would be more complex
    try {
      const newAchievements = [];

      // Check for competence mastery achievement
      if (context.masteryLevel === MasteryLevels.MASTERED) {
        // This would check if this achievement already exists and award it if not
        const achievementCode = `MASTERY_${context.competenceCode}`;
        // Implementation would go here
      }

      // Check for streak achievements
      if (context.consecutiveSuccesses >= 5) {
        // Award streak achievement
      }

      return newAchievements;
    } catch (error) {
      console.error('Check achievements error:', error);
      return [];
    }
  }

  async getCompetenceDetails(competenceCode: string): Promise<any> {
    // This would typically fetch from a competences table
    // For now, return mock data
    return {
      code: competenceCode,
      description: `Competence ${competenceCode}`,
      niveau: competenceCode.split('.')[0] || 'CP',
      matiere: competenceCode.split('.')[1] || 'FRANCAIS',
      domaine: competenceCode.split('.')[2] || 'L1'
    };
  }

  async searchCompetences(filters: any): Promise<any[]> {
    // This would search a competences table
    // For now, return mock data
    return [];
  }

  // Legacy compatibility methods (delegate to existing service or implement stubs)
  async getStudentById(id: number): Promise<Student | null> {
    try {
      const result = await this.db
        .select()
        .from(students)
        .where(eq(students.id, id))
        .limit(1)
        .execute();
      
      return result[0] || null;
    } catch (error) {
      console.error('Get student by ID error:', error);
      throw error;
    }
  }

  // Add other required methods as stubs
  async updateStudent(id: number, updates: any): Promise<Student> { throw new Error('Not implemented'); }
  async getStudentProgress(studentId: number, matiere?: string, limit?: number): Promise<Progress[]> { return []; }
  async getStudentStats(studentId: number): Promise<any> { return {}; }
  async getStudentSessions(studentId: number, limit?: number): Promise<any[]> { return []; }
  async createSession(sessionData: any): Promise<any> { return {}; }
  async updateSession(id: string, updates: any): Promise<any> { return {}; }
  async getRecommendedExercises(studentId: number, limit: number): Promise<any[]> { return []; }
  async getWeeklyProgress(studentId: number): Promise<any> { return {}; }
  async getSubjectProgress(studentId: number): Promise<any> { return {}; }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

// Export singleton instance
export const enhancedDatabaseService = new EnhancedDatabaseService({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fastrevedkids'
});

// Initialize on import
enhancedDatabaseService.initialize().catch(console.error);