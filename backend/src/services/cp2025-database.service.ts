import { db } from '../db/connection';
import * as schema from '../db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import type { Exercise, NewExercise, Module, Student } from '../db/schema';

export class CP2025DatabaseService {
  async getAllExercises(): Promise<Exercise[]> {
    try {
      const exercises = await db.select().from(schema.exercises);
      return exercises || [];
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }
  }

  async getExerciseById(id: number): Promise<Exercise | undefined> {
    try {
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.id, id))
        .limit(1);
      
      return exercises[0];
    } catch (error) {
      console.error('Error fetching exercise by ID:', error);
      return undefined;
    }
  }

  async getExercisesByModule(moduleId: number): Promise<Exercise[]> {
    try {
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.type, moduleId.toString()));
      
      return exercises || [];
    } catch (error) {
      console.error('Error fetching exercises by module:', error);
      return [];
    }
  }

  async createExercise(exerciseData: NewExercise): Promise<Exercise | null> {
    try {
      await db
        .insert(schema.exercises)
        .values({
          ...exerciseData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      // Get the created exercise by searching for it
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.titre, exerciseData.titre))
        .limit(1);
      
      return exercises[0] || null;
    } catch (error) {
      console.error('Error creating exercise:', error);
      return null;
    }
  }

  async getAllModules(): Promise<Module[]> {
    try {
      const modules = await db.select().from(schema.modules);
      return modules || [];
    } catch (error) {
      console.error('Error fetching modules:', error);
      return [];
    }
  }

  async getModuleById(id: number): Promise<Module | undefined> {
    try {
      const modules = await db
        .select()
        .from(schema.modules)
        .where(eq(schema.modules.id, id))
        .limit(1);
      
      return modules[0];
    } catch (error) {
      console.error('Error fetching module by ID:', error);
      return undefined;
    }
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    try {
      const students = await db
        .select()
        .from(schema.students)
        .where(eq(schema.students.id, id))
        .limit(1);
      
      return students[0];
    } catch (error) {
      console.error('Error fetching student by ID:', error);
      return undefined;
    }
  }

  async getExercisesByLevel(niveau: string): Promise<Exercise[]> {
    try {
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.difficulte, niveau));
      
      return exercises || [];
    } catch (error) {
      console.error('Error fetching exercises by level:', error);
      return [];
    }
  }

  async getExercisesByDifficulty(difficulte: 'FACILE' | 'MOYEN' | 'DIFFICILE'): Promise<Exercise[]> {
    try {
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.difficulte, difficulte));
      
      return exercises || [];
    } catch (error) {
      console.error('Error fetching exercises by difficulty:', error);
      return [];
    }
  }

  async getExercisesBySubject(matiere: string): Promise<Exercise[]> {
    try {
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.type, matiere));
      
      return exercises || [];
    } catch (error) {
      console.error('Error fetching exercises by subject:', error);
      return [];
    }
  }

  async searchExercises(searchTerm: string): Promise<Exercise[]> {
    try {
      const exercises = await db
        .select()
        .from(schema.exercises)
        .where(like(schema.exercises.titre, `%${searchTerm}%`));
      
      return exercises || [];
    } catch (error) {
      console.error('Error searching exercises:', error);
      return [];
    }
  }

  async getExerciseStatistics(): Promise<any> {
    try {
      const stats = await db
        .select({
          totalExercises: sql<number>`count(*)`,
          facileCount: sql<number>`count(case when difficulte = 'FACILE' then 1 end)`,
          moyenCount: sql<number>`count(case when difficulte = 'MOYEN' then 1 end)`,
          difficileCount: sql<number>`count(case when difficulte = 'DIFFICILE' then 1 end)`,
        })
        .from(schema.exercises);
      
      return stats[0] || {};
    } catch (error) {
      console.error('Error fetching exercise statistics:', error);
      return {};
    }
  }
} 