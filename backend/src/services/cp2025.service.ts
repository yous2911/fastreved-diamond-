import { CP2025DatabaseService } from './cp2025-database.service';
import type { Exercise, Module, Student } from '../db/schema';

export class CP2025Service {
  private dbService: CP2025DatabaseService;

  constructor() {
    this.dbService = new CP2025DatabaseService();
  }

  async getAllExercises(): Promise<Exercise[]> {
    return await this.dbService.getAllExercises();
  }

  async getExerciseById(id: number): Promise<Exercise | null> {
    const exercise = await this.dbService.getExerciseById(id);
    return exercise || null;
  }

  async getExercisesByModule(moduleId: number): Promise<Exercise[]> {
    return await this.dbService.getExercisesByModule(moduleId);
  }

  async getExercisesByLevel(niveau: string): Promise<Exercise[]> {
    return await this.dbService.getExercisesByLevel(niveau);
  }

  async getExercisesByDifficulty(difficulte: 'FACILE' | 'MOYEN' | 'DIFFICILE'): Promise<Exercise[]> {
    return await this.dbService.getExercisesByDifficulty(difficulte);
  }

  async getExercisesBySubject(matiere: string): Promise<Exercise[]> {
    return await this.dbService.getExercisesBySubject(matiere);
  }

  async searchExercises(searchTerm: string): Promise<Exercise[]> {
    return await this.dbService.searchExercises(searchTerm);
  }

  async getAllModules(): Promise<Module[]> {
    return await this.dbService.getAllModules();
  }

  async getModuleById(id: number): Promise<Module | null> {
    const module = await this.dbService.getModuleById(id);
    return module || null;
  }

  async getStudentById(id: number): Promise<Student | null> {
    const student = await this.dbService.getStudentById(id);
    return student || null;
  }

  async getExerciseStatistics(): Promise<any> {
    return await this.dbService.getExerciseStatistics();
  }

  async getModuleStatistics(): Promise<any> {
    try {
      const modules = await this.dbService.getAllModules();
      
      const stats = {
        totalModules: modules.length,
        byNiveau: {} as Record<string, number>,
        byMatiere: {} as Record<string, number>,
      };

      modules.forEach(module => {
        // Count by niveau
        stats.byNiveau[module.niveau] = (stats.byNiveau[module.niveau] || 0) + 1;
        
        // Count by matiere
        stats.byMatiere[module.matiere] = (stats.byMatiere[module.matiere] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting module statistics:', error);
      return {
        totalModules: 0,
        byNiveau: {},
        byMatiere: {},
      };
    }
  }
} 