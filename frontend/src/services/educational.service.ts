// Unified Educational Service for CP, CE1, CE2
// =============================================

import {
  EducationalData,
  EducationalLevel,
  EducationalModule,
  EducationalExercise,
  EducationalCompetence,
  ExerciseType,
  Difficulty,
  Subject,
  Period,
  ExerciseFilter,
  ModuleFilter,
  CompetenceFilter,
  EducationalStatistics,
  ServiceResponse,
  CPModule,
  CE1Module,
  CE2Module,
  CPExercise,
  CE1Exercise,
  CE2Exercise,
  CPCompetence,
  CE1Competence,
  CE2Competence
} from '../types/educational.types';

export class EducationalService {
  private data: EducationalData;

  constructor(data: EducationalData) {
    this.data = data;
    this.validateData();
  }

  // ========================================
  // DATA VALIDATION
  // ========================================

  private validateData(): void {
    if (!this.data.modules || !this.data.exercises || !this.data.competences) {
      throw new Error('Invalid educational data structure');
    }
  }

  // ========================================
  // MODULE MANAGEMENT
  // ========================================

  /**
   * Get all modules for a specific level
   */
  getModulesByLevel(level: EducationalLevel): EducationalModule[] {
    switch (level) {
      case 'CP':
        return this.data.modules.CP;
      case 'CE1':
        return this.data.modules.CE1;
      case 'CE2':
        return this.data.modules.CE2;
      default:
        return [];
    }
  }

  /**
   * Get all modules across all levels
   */
  getAllModules(): EducationalModule[] {
    return [
      ...this.data.modules.CP,
      ...this.data.modules.CE1,
      ...this.data.modules.CE2
    ];
  }

  /**
   * Get modules by filter criteria
   */
  getModulesByFilter(filter: ModuleFilter): EducationalModule[] {
    let modules = this.getAllModules();

    if (filter.level) {
      modules = modules.filter(m => m.niveau === filter.level);
    }

    if (filter.subject) {
      modules = modules.filter(m => m.matiere === filter.subject);
    }

    if (filter.period) {
      modules = modules.filter(m => m.periode === filter.period);
    }

    if (filter.competenceDomain) {
      modules = modules.filter(m => m.metadata.competenceDomain === filter.competenceDomain);
    }

    return modules;
  }

  /**
   * Get a specific module by ID
   */
  getModuleById(id: number): EducationalModule | null {
    const allModules = this.getAllModules();
    return allModules.find(m => m.id === id) || null;
  }

  /**
   * Get modules by level and subject
   */
  getModulesByLevelAndSubject(level: EducationalLevel, subject: Subject): EducationalModule[] {
    return this.getModulesByLevel(level).filter(m => m.matiere === subject);
  }

  // ========================================
  // EXERCISE MANAGEMENT
  // ========================================

  /**
   * Get all exercises for a specific level
   */
  getExercisesByLevel(level: EducationalLevel): EducationalExercise[] {
    switch (level) {
      case 'CP':
        return this.data.exercises.CP;
      case 'CE1':
        return this.data.exercises.CE1;
      case 'CE2':
        return this.data.exercises.CE2;
      default:
        return [];
    }
  }

  /**
   * Get all exercises across all levels
   */
  getAllExercises(): EducationalExercise[] {
    return [
      ...this.data.exercises.CP,
      ...this.data.exercises.CE1,
      ...this.data.exercises.CE2
    ];
  }

  /**
   * Get exercises by filter criteria
   */
  getExercisesByFilter(filter: ExerciseFilter): EducationalExercise[] {
    let exercises = this.getAllExercises();

    if (filter.level) {
      exercises = exercises.filter(e => {
        const module = this.getModuleById(e.moduleId);
        return module?.niveau === filter.level;
      });
    }

    if (filter.type) {
      exercises = exercises.filter(e => e.type === filter.type);
    }

    if (filter.difficulty) {
      exercises = exercises.filter(e => e.difficulte === filter.difficulty);
    }

    if (filter.subject) {
      exercises = exercises.filter(e => {
        const module = this.getModuleById(e.moduleId);
        return module?.matiere === filter.subject;
      });
    }

    if (filter.competenceCode) {
      exercises = exercises.filter(e => e.metadata.competenceCode === filter.competenceCode);
    }

    if (filter.moduleId) {
      exercises = exercises.filter(e => e.moduleId === filter.moduleId);
    }

    return exercises;
  }

  /**
   * Get exercises by module ID
   */
  getExercisesByModuleId(moduleId: number): EducationalExercise[] {
    return this.getAllExercises().filter(e => e.moduleId === moduleId);
  }

  /**
   * Get exercises by type
   */
  getExercisesByType(type: ExerciseType): EducationalExercise[] {
    return this.getAllExercises().filter(e => e.type === type);
  }

  /**
   * Get exercises by difficulty
   */
  getExercisesByDifficulty(difficulty: Difficulty): EducationalExercise[] {
    return this.getAllExercises().filter(e => e.difficulte === difficulty);
  }

  /**
   * Get exercises by competence code
   */
  getExercisesByCompetenceCode(competenceCode: string): EducationalExercise[] {
    return this.getAllExercises().filter(e => e.metadata.competenceCode === competenceCode);
  }

  /**
   * Get module exercise progression
   */
  getModuleExerciseProgression(moduleId: number): EducationalExercise[] {
    const exercises = this.getExercisesByModuleId(moduleId);
    return exercises.sort((a, b) => {
      const difficultyOrder = {
        'decouverte': 1,
        'entrainement': 2,
        'consolidation': 3,
        'approfondissement': 4
      };
      return difficultyOrder[a.difficulte] - difficultyOrder[b.difficulte];
    });
  }

  // ========================================
  // COMPETENCE MANAGEMENT
  // ========================================

  /**
   * Get all competences for a specific level
   */
  getCompetencesByLevel(level: EducationalLevel): EducationalCompetence[] {
    switch (level) {
      case 'CP':
        return this.data.competences.CP;
      case 'CE1':
        return this.data.competences.CE1;
      case 'CE2':
        return this.data.competences.CE2;
      default:
        return [];
    }
  }

  /**
   * Get all competences across all levels
   */
  getAllCompetences(): EducationalCompetence[] {
    return [
      ...this.data.competences.CP,
      ...this.data.competences.CE1,
      ...this.data.competences.CE2
    ];
  }

  /**
   * Get competences by filter criteria
   */
  getCompetencesByFilter(filter: CompetenceFilter): EducationalCompetence[] {
    let competences = this.getAllCompetences();

    if (filter.level) {
      competences = competences.filter(c => c.niveau === filter.level);
    }

    if (filter.domain) {
      competences = competences.filter(c => c.domaine === filter.domain);
    }

    if (filter.subDomain) {
      competences = competences.filter(c => c.sousDomaine === filter.subDomain);
    }

    if (filter.hasPrerequisites) {
      competences = competences.filter(c => c.prerequis.length > 0);
    }

    if (filter.hasQualitativeLeap) {
      competences = competences.filter(c => !!c.saut_qualitatif);
    }

    return competences;
  }

  /**
   * Get competence by code
   */
  getCompetenceByCode(code: string): EducationalCompetence | null {
    return this.getAllCompetences().find(c => c.code === code) || null;
  }

  /**
   * Get competences by domain
   */
  getCompetencesByDomain(domain: string): EducationalCompetence[] {
    return this.getAllCompetences().filter(c => c.domaine === domain);
  }

  /**
   * Get competences with qualitative leaps
   */
  getCompetencesWithQualitativeLeaps(): EducationalCompetence[] {
    return this.getAllCompetences().filter(c => !!c.saut_qualitatif);
  }

  /**
   * Get competences with prerequisites
   */
  getCompetencesWithPrerequisites(): EducationalCompetence[] {
    return this.getAllCompetences().filter(c => c.prerequis.length > 0);
  }

  // ========================================
  // COMPETENCE CODE VALIDATION
  // ========================================

  /**
   * Validate competence code format
   */
  static validateCompetenceCode(code: string): boolean {
    const pattern = /^(CP|CE1|CE2)\.(FR|MA)\.([A-Z0-9]+)\.([0-9]+)$/;
    return pattern.test(code);
  }

  /**
   * Parse competence code
   */
  static parseCompetenceCode(code: string): { level: EducationalLevel; subject: string; domain: string; number: string } | null {
    if (!this.validateCompetenceCode(code)) {
      return null;
    }

    const parts = code.split('.');
    return {
      level: parts[0] as EducationalLevel,
      subject: parts[1],
      domain: parts[2],
      number: parts[3]
    };
  }

  /**
   * Generate exercise template for competence
   */
  static generateExerciseTemplate(competenceCode: string): Partial<EducationalExercise> {
    const parsed = this.parseCompetenceCode(competenceCode);
    if (!parsed) {
      throw new Error('Invalid competence code');
    }

    const level = parsed.level as EducationalLevel;
    
    if (level === 'CP') {
      return {
        titre: `Exercice pour ${competenceCode}`,
        consigne: `Exercice basé sur la compétence ${competenceCode}`,
        type: 'QCM',
        difficulte: 'decouverte',
        moduleId: 1,
        configuration: { question: '', choix: [], bonneReponse: '' },
        metadata: {
          competenceCode,
          cp2025: true,
          cognitiveLoad: 'medium',
          engagement: 'medium'
        }
      } as Partial<CPExercise>;
    } else if (level === 'CE1') {
      return {
        titre: `Exercice pour ${competenceCode}`,
        consigne: `Exercice basé sur la compétence ${competenceCode}`,
        type: 'QCM',
        difficulte: 'decouverte',
        moduleId: 1,
        configuration: { question: '', choix: [], bonneReponse: '' },
        metadata: {
          competenceCode,
          ce1_2025: true,
          prerequis_cp: [],
          cognitiveLoad: 'medium',
          engagement: 'medium'
        }
      } as Partial<CE1Exercise>;
    } else {
      return {
        titre: `Exercice pour ${competenceCode}`,
        consigne: `Exercice basé sur la compétence ${competenceCode}`,
        type: 'QCM',
        difficulte: 'decouverte',
        moduleId: 1,
        configuration: { question: '', choix: [], bonneReponse: '' },
        metadata: {
          competenceCode,
          ce2_2026: true,
          prerequis_ce1: [],
          cognitiveLoad: 'medium',
          engagement: 'medium'
        }
      } as Partial<CE2Exercise>;
    }
  }

  // ========================================
  // STATISTICS
  // ========================================

  /**
   * Get comprehensive statistics
   */
  getStatistics(): EducationalStatistics {
    const allExercises = this.getAllExercises();
    const allModules = this.getAllModules();
    const allCompetences = this.getAllCompetences();

    const exercisesByDifficulty: Record<Difficulty, number> = {
      decouverte: 0,
      entrainement: 0,
      consolidation: 0,
      approfondissement: 0
    };

    const exercisesByType: Record<ExerciseType, number> = {
      QCM: 0,
      CALCUL: 0,
      DRAG_DROP: 0,
      TEXT_INPUT: 0,
      LECTURE: 0,
      GEOMETRIE: 0,
      PROBLEME: 0,
      CONJUGAISON: 0,
      VOCABULAIRE: 0
    };

    const modulesByLevel: Record<EducationalLevel, number> = {
      CP: 0,
      CE1: 0,
      CE2: 0
    };

    const modulesBySubject: Record<Subject, number> = {
      FRANCAIS: 0,
      MATHEMATIQUES: 0,
      SCIENCES: 0,
      HISTOIRE_GEOGRAPHIE: 0,
      ANGLAIS: 0
    };

    const competencesByLevel: Record<EducationalLevel, number> = {
      CP: 0,
      CE1: 0,
      CE2: 0
    };

    const competencesByDomain: Record<string, number> = {};

    // Count exercises
    allExercises.forEach(exercise => {
      exercisesByDifficulty[exercise.difficulte]++;
      exercisesByType[exercise.type]++;
    });

    // Count modules
    allModules.forEach(module => {
      modulesByLevel[module.niveau]++;
      modulesBySubject[module.matiere]++;
    });

    // Count competences
    allCompetences.forEach(competence => {
      competencesByLevel[competence.niveau]++;
      competencesByDomain[competence.domaine] = (competencesByDomain[competence.domaine] || 0) + 1;
    });

    return {
      totalModules: allModules.length,
      totalExercises: allExercises.length,
      exercisesByDifficulty,
      exercisesByType,
      modulesByLevel,
      modulesBySubject,
      competencesByLevel,
      competencesByDomain
    };
  }

  // ========================================
  // DATA EXPORT/IMPORT
  // ========================================

  /**
   * Export data to JSON
   */
  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Get data object
   */
  getData(): EducationalData {
    return this.data;
  }

  /**
   * Update data
   */
  updateData(newData: EducationalData): void {
    this.data = newData;
    this.validateData();
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get level progression path
   */
  getLevelProgression(): EducationalLevel[] {
    return ['CP', 'CE1', 'CE2'];
  }

  /**
   * Check if level is valid
   */
  static isValidLevel(level: string): level is EducationalLevel {
    return ['CP', 'CE1', 'CE2'].includes(level);
  }

  /**
   * Get next level in progression
   */
  getNextLevel(currentLevel: EducationalLevel): EducationalLevel | null {
    const progression = this.getLevelProgression();
    const currentIndex = progression.indexOf(currentLevel);
    return currentIndex < progression.length - 1 ? progression[currentIndex + 1] : null;
  }

  /**
   * Get previous level in progression
   */
  getPreviousLevel(currentLevel: EducationalLevel): EducationalLevel | null {
    const progression = this.getLevelProgression();
    const currentIndex = progression.indexOf(currentLevel);
    return currentIndex > 0 ? progression[currentIndex - 1] : null;
  }

  /**
   * Get competences that are prerequisites for a given competence
   */
  getPrerequisitesForCompetence(competenceCode: string): EducationalCompetence[] {
    const competence = this.getCompetenceByCode(competenceCode);
    if (!competence) return [];

    return competence.prerequis
      .map(prereqCode => this.getCompetenceByCode(prereqCode))
      .filter((c): c is EducationalCompetence => c !== null);
  }

  /**
   * Get competences that depend on a given competence
   */
  getDependentCompetences(competenceCode: string): EducationalCompetence[] {
    return this.getAllCompetences().filter(c => 
      c.prerequis.includes(competenceCode)
    );
  }

  /**
   * Integrate existing CP2025 data from the main project
   * This method transforms the old CP2025 structure into the new unified format
   */
  static integrateCP2025Data(cp2025Data: any): EducationalData {
    const cpModules: CPModule[] = [];
    const cpExercises: CPExercise[] = [];
    const cpCompetences: CPCompetence[] = [];

    // Transform modules
    if (cp2025Data.modules) {
      cp2025Data.modules.forEach((module: any) => {
        const cpModule: CPModule = {
          id: module.id,
          titre: module.titre,
          description: module.description,
          niveau: 'CP',
          matiere: this.mapMatiere(module.matiere),
          periode: this.mapPeriode(module.periode),
          ordre: module.ordre,
          metadata: {
            competenceDomain: module.metadata?.competenceDomain || '',
            cp2025: true,
            originalStructure: 'CP2025',
            ...module.metadata
          }
        };
        cpModules.push(cpModule);
      });
    }

    // Transform exercises
    if (cp2025Data.exercises) {
      cp2025Data.exercises.forEach((exercise: any, index: number) => {
        const cpExercise: CPExercise = {
          titre: exercise.titre,
          consigne: exercise.consigne,
          type: this.mapExerciseType(exercise.type),
          difficulte: this.mapDifficulte(exercise.difficulte),
          moduleId: exercise.moduleId,
          configuration: this.transformExerciseConfiguration(exercise.configuration, exercise.type),
          metadata: {
            competenceCode: exercise.metadata?.competenceCode || `CP.EX.${index + 1}`,
            cp2025: true,
            originalStructure: 'CP2025',
            ...exercise.metadata
          }
        };
        cpExercises.push(cpExercise);
      });
    }

    // Transform competences if available
    if (cp2025Data.competences) {
      Object.entries(cp2025Data.competences).forEach(([code, competence]: [string, any]) => {
        const cpCompetence: CPCompetence = {
          code,
          titre: competence.titre,
          description: competence.description,
          niveau: 'CP',
          domaine: this.mapDomaine(competence.domaine),
          sousDomaine: competence.domaine?.toLowerCase() || 'general',
          prerequis: competence.prerequis || [],
          periode: competence.periode,
          objectifs: competence.objectifs || [],
          evaluation: competence.evaluation || 'Auto-évaluation',
          donnees_chiffrees: {
            seuil_maitrise: competence.seuil_maitrise || 80,
            exemples: competence.exemples || []
          }
        };
        cpCompetences.push(cpCompetence);
      });
    }

    return {
      modules: {
        CP: cpModules,
        CE1: [],
        CE2: []
      },
      exercises: {
        CP: cpExercises,
        CE1: [],
        CE2: []
      },
      competences: {
        CP: cpCompetences,
        CE1: [],
        CE2: []
      }
    };
  }

  /**
   * Map old CP2025 matiere to new EducationalLevel
   */
  private static mapMatiere(oldMatiere: string): Subject {
    const mapping: Record<string, Subject> = {
      'FRANCAIS': 'FRANCAIS',
      'MATHEMATIQUES': 'MATHEMATIQUES',
      'SCIENCES': 'SCIENCES',
      'HISTOIRE_GEOGRAPHIE': 'HISTOIRE_GEOGRAPHIE',
      'ANGLAIS': 'ANGLAIS'
    };
    return mapping[oldMatiere] || 'FRANCAIS';
  }

  /**
   * Map old CP2025 periode to new Period
   */
  private static mapPeriode(oldPeriode: string): Period {
    const mapping: Record<string, Period> = {
      'P1': 'P1',
      'P2': 'P2',
      'P3': 'P3',
      'P4': 'P4',
      'P5': 'P5',
      'P1-P2': 'P1-P2',
      'P2-P3': 'P2-P3',
      'P3-P4': 'P3-P4',
      'P1-P3': 'P1-P3',
      'P2-P4': 'P2-P4'
    };
    return mapping[oldPeriode] || 'P1';
  }

  /**
   * Map old CP2025 exercise type to new ExerciseType
   */
  private static mapExerciseType(oldType: string): ExerciseType {
    const mapping: Record<string, ExerciseType> = {
      'QCM': 'QCM',
      'CALCUL': 'CALCUL',
      'DRAG_DROP': 'DRAG_DROP',
      'TEXT_INPUT': 'TEXT_INPUT',
      'LECTURE': 'LECTURE',
      'GEOMETRIE': 'GEOMETRIE',
      'PROBLEME': 'PROBLEME'
    };
    return mapping[oldType] || 'QCM';
  }

  /**
   * Map old CP2025 difficulte to new Difficulty
   */
  private static mapDifficulte(oldDifficulte: string): Difficulty {
    const mapping: Record<string, Difficulty> = {
      'decouverte': 'decouverte',
      'entrainement': 'entrainement',
      'consolidation': 'consolidation',
      'approfondissement': 'approfondissement'
    };
    return mapping[oldDifficulte] || 'decouverte';
  }

  /**
   * Map old CP2025 domaine to new domain
   */
  private static mapDomaine(oldDomaine: string): string {
    const mapping: Record<string, string> = {
      'LECTURE': 'lecture',
      'ECRITURE': 'ecriture',
      'COMPREHENSION': 'comprehension',
      'GRAMMAIRE': 'grammaire',
      'NOMBRES': 'nombres',
      'CALCUL': 'calcul',
      'PROBLEMES': 'problemes',
      'GEOMETRIE': 'geometrie',
      'MESURES': 'mesures'
    };
    return mapping[oldDomaine] || 'lecture';
  }

  /**
   * Transform exercise configuration from old CP2025 format to new unified format
   */
  private static transformExerciseConfiguration(config: any, type: string): any {
    if (!config) return {};

    switch (type) {
      case 'QCM':
        return {
          question: config.question || '',
          choix: config.choix || [],
          bonneReponse: config.bonneReponse || '',
          audioRequired: config.audioRequired || false,
          image_url: config.image_url || '',
          image: config.image || null,
          phrase_template: config.phrase_template || ''
        };
      case 'CALCUL':
        return {
          operation: config.operation || '',
          resultat: config.resultat || 0,
          type_calcul: config.type_calcul || 'addition',
          difficulte: config.difficulte || 'simple'
        };
      case 'DRAG_DROP':
        return {
          elements: config.elements || [],
          zones: config.zones || [],
          consigne_drag: config.consigne_drag || ''
        };
      case 'TEXT_INPUT':
        return {
          reponse_attendue: config.reponse_attendue || '',
          type_saisie: config.type_saisie || 'texte',
          validation: config.validation || 'exacte'
        };
      default:
        return config;
    }
  }
}
