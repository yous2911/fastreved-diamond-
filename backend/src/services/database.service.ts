// src/services/database.service.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { 
  students, 
  exercises, 
  studentProgress, 
  sessions, 
  revisions,
  type NewStudent,
  type NewExercise,
  type NewProgress,
  type NewSession,
  type NewRevision,
  type Student,
  type Exercise,
  type Progress,
  type Session,
  type Revision
} from '../db/schema.js';
import { eq, and, desc, asc, sql, count, sum, avg } from 'drizzle-orm';
import { DatabaseConfig } from '../types/index.js';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    tables: string[];
    timestamp: string;
  };
}

interface StudentStats {
  totalExercises: number;
  exercisesCompleted: number;
  totalPoints: number;
  averageSuccessRate: number;
  streakDays: number;
  lastActivity: Date | null;
}

interface WeeklyProgress {
  day: string;
  exercises: number;
  points: number;
}

interface SubjectProgress {
  subject: string;
  progress: number;
  exercises: number;
}

export class DatabaseService {
  public db: ReturnType<typeof drizzle>;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.db = this.createConnection();
  }

  private createConnection() {
    const sqlite = new Database(this.config.database || 'reved_kids.db');
    return drizzle(sqlite);
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Test connection
      await this.db.run(sql`SELECT 1`);
      
      // Get table names
      const tables = ['students', 'exercises', 'student_progress', 'sessions', 'revisions'];
      
      return {
        status: 'healthy',
        details: {
          connection: true,
          tables,
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

  // Student operations
  async createStudent(studentData: NewStudent): Promise<Student> {
    const [result] = await this.db.insert(students).values({
      ...studentData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result;
  }

  async getStudentById(id: number): Promise<Student | null> {
    const result = await this.db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0] || null;
  }

  async updateStudent(id: number, updates: Partial<NewStudent>): Promise<Student> {
    const [result] = await this.db.update(students).set({ 
      ...updates, 
      updatedAt: new Date() 
    }).where(eq(students.id, id)).returning();
    return result;
  }

  async deleteStudent(id: number): Promise<void> {
    await this.db.delete(students).where(eq(students.id, id));
  }

  // Exercise operations
  async createExercise(exerciseData: NewExercise): Promise<Exercise> {
    const [result] = await this.db.insert(exercises).values({
      ...exerciseData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result;
  }

  async getExerciseById(id: number): Promise<Exercise | null> {
    const result = await this.db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
    return result[0] || null;
  }

  async getExercisesByLevel(niveau: string, matiere?: string, limit?: number): Promise<Exercise[]> {
    // Simplified version - return all exercises
    return await this.db
      .select()
      .from(exercises)
      .limit(limit || 10);
  }

  async updateExercise(id: number, updates: Partial<NewExercise>): Promise<Exercise> {
    const [result] = await this.db.update(exercises).set({ 
      ...updates, 
      updatedAt: new Date() 
    }).where(eq(exercises.id, id)).returning();
    return result;
  }

  async deleteExercise(id: number): Promise<void> {
    await this.db.delete(exercises).where(eq(exercises.id, id));
  }

  // Progress operations
  async recordProgress(progressData: NewProgress): Promise<Progress> {
    const [result] = await this.db.insert(studentProgress).values({
      ...progressData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result;
  }

  async getStudentProgress(studentId: number, matiere?: string, limit?: number): Promise<Progress[]> {
    return await this.db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId))
      .orderBy(desc(studentProgress.createdAt))
      .limit(limit || 50);
  }

  async getStudentStats(studentId: number): Promise<StudentStats> {
    const stats = await this.db
      .select({
        totalExercises: count(studentProgress.id),
        exercisesCompleted: count(studentProgress.id),
        totalPoints: sum(studentProgress.score),
        averageSuccessRate: avg(studentProgress.score),
        lastActivity: sql<Date>`MAX(${studentProgress.completedAt})`
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

    const student = await this.getStudentById(studentId);
    
    return {
      totalExercises: Number(stats[0]?.totalExercises || 0),
      exercisesCompleted: Number(stats[0]?.exercisesCompleted || 0),
      totalPoints: Number(stats[0]?.totalPoints || 0),
      averageSuccessRate: Number(stats[0]?.averageSuccessRate || 0),
      streakDays: student?.serieJours || 0,
      lastActivity: stats[0]?.lastActivity || null
    };
  }

  // Session operations
  async createSession(sessionData: NewSession): Promise<Session> {
    const [result] = await this.db.insert(sessions).values({
      ...sessionData,
      createdAt: new Date()
    }).returning();
    return result;
  }

  async getStudentSessions(studentId: number, limit?: number): Promise<Session[]> {
    return await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.studentId, studentId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit || 10);
  }

  async updateSession(sessionId: string, updates: Partial<NewSession>): Promise<Session> {
    const [result] = await this.db.update(sessions).set({ 
      ...updates
    }).where(eq(sessions.id, sessionId)).returning();
    return result;
  }

  // Revision operations
  async createRevision(revisionData: NewRevision): Promise<Revision> {
    const [result] = await this.db.insert(revisions).values({
      ...revisionData,
      createdAt: new Date()
    }).returning();
    return result;
  }

  // Recommendation operations
  async getRecommendedExercises(studentId: number, limit: number = 5): Promise<Exercise[]> {
    // Simplified recommendation - return random exercises
    return await this.db
      .select()
      .from(exercises)
      .limit(limit);
  }

  // Progress tracking
  async getWeeklyProgress(studentId: number): Promise<WeeklyProgress[]> {
    // Simplified weekly progress
    return [
      { day: 'Monday', exercises: 5, points: 50 },
      { day: 'Tuesday', exercises: 3, points: 30 },
      { day: 'Wednesday', exercises: 7, points: 70 },
      { day: 'Thursday', exercises: 4, points: 40 },
      { day: 'Friday', exercises: 6, points: 60 }
    ];
  }

  async getSubjectProgress(studentId: number): Promise<SubjectProgress[]> {
    // Simplified subject progress
    return [
      { subject: 'Mathématiques', progress: 75, exercises: 15 },
      { subject: 'Français', progress: 60, exercises: 12 },
      { subject: 'Sciences', progress: 45, exercises: 9 }
    ];
  }

  // Dashboard data
  async getDashboardData(studentId: number) {
    const student = await this.getStudentById(studentId);
    const stats = await this.getStudentStats(studentId);
    const weeklyProgress = await this.getWeeklyProgress(studentId);
    const subjectProgress = await this.getSubjectProgress(studentId);

    return {
      student,
      stats,
      weeklyProgress,
      subjectProgress
    };
  }
}

export const databaseService = new DatabaseService({
  database: process.env.DATABASE_URL || 'reved_kids.db',
  host: '',
  port: 0,
  user: '',
  password: '',
  connectionLimit: 10
}); 