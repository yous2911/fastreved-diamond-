// Unified Educational System Types for CP, CE1, CE2
// =================================================

export type EducationalLevel = 'CP' | 'CE1' | 'CE2';
export type Subject = 'FRANCAIS' | 'MATHEMATIQUES' | 'SCIENCES' | 'HISTOIRE_GEOGRAPHIE' | 'ANGLAIS';
export type Period = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P1-P2' | 'P3-P4' | 'P1-P3' | 'P2-P4' | 'P2-P3';
export type ExerciseType = 'QCM' | 'CALCUL' | 'DRAG_DROP' | 'TEXT_INPUT' | 'LECTURE' | 'GEOMETRIE' | 'PROBLEME' | 'CONJUGAISON' | 'VOCABULAIRE';
export type Difficulty = 'decouverte' | 'entrainement' | 'consolidation' | 'approfondissement';
export type MasteryLevel = 'not_started' | 'in_progress' | 'mastered';

// Base Module Interface
export interface BaseModule {
  id: number;
  titre: string;
  description: string;
  niveau: EducationalLevel;
  matiere: Subject;
  periode: Period;
  ordre: number;
  metadata: {
    competenceDomain: string;
    [key: string]: unknown;
  };
}

// Level-specific Module Interfaces
export interface CPModule extends BaseModule {
  niveau: 'CP';
  metadata: {
    competenceDomain: string;
    cp2025: boolean;
    [key: string]: unknown;
  };
}

export interface CE1Module extends BaseModule {
  niveau: 'CE1';
  metadata: {
    competenceDomain: string;
    ce1_2025: boolean;
    prerequis_cp: string[];
    [key: string]: unknown;
  };
}

export interface CE2Module extends BaseModule {
  niveau: 'CE2';
  metadata: {
    competenceDomain: string;
    ce2_2026: boolean;
    prerequis_ce1: string[];
    [key: string]: unknown;
  };
}

export type EducationalModule = CPModule | CE1Module | CE2Module;

// Image Object Interface
export interface ImageObject {
  url_placeholder: string;
  description: string;
  alt?: string;
}

// Audio Object Interface
export interface AudioObject {
  url: string;
  description: string;
  duration?: number;
}

// Exercise Choice Interface
export interface ExerciseChoice {
  id: string;
  text?: string;
  image?: ImageObject;
  audio?: AudioObject;
}

// Exercise Configuration Interfaces
export interface QCMConfiguration {
  question: string;
  choix: ExerciseChoice[];
  bonneReponse: string;
  audioRequired?: boolean;
  image_url?: string;
  image?: ImageObject;
  phrase_template?: string;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface DragDropConfiguration {
  question: string;
  dragItems: Array<{id: string; content: string; image?: ImageObject}>;
  zones: Array<{id: string; label: string; limit?: number}>;
  solution: string[] | Record<string, string[]>;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface CalculConfiguration {
  operation: string;
  resultat: number;
  question?: string;
  aide?: string;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface TextInputConfiguration {
  question: string;
  inputType: 'keyboard' | 'clickable_letters';
  bonneReponse: string | string[];
  audioRequired?: boolean;
  lettres?: string[];
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface GeometryConfiguration {
  question: string;
  image_url?: string;
  image?: ImageObject;
  bonneReponse: string;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface LectureConfiguration {
  texte: string;
  questions: Array<{
    question: string;
    choix?: ExerciseChoice[];
    bonneReponse: string;
    type: 'QCM' | 'TEXT_INPUT';
  }>;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface ProblemeConfiguration {
  enonce: string;
  donnees: Record<string, any>;
  question: string;
  solution: number | string;
  etapes?: string[];
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface ConjugaisonConfiguration {
  verbe: string;
  temps: string;
  personne: string;
  bonneReponse: string;
  aide?: string;
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export interface VocabulaireConfiguration {
  question: string;
  type: 'synonyme' | 'antonyme' | 'definition' | 'famille_mots';
  mot: string;
  bonneReponse: string | string[];
  choix?: ExerciseChoice[];
  feedback?: {
    correct: string;
    incorrect: string;
  };
}

export type ExerciseConfiguration = 
  | QCMConfiguration 
  | DragDropConfiguration 
  | CalculConfiguration 
  | TextInputConfiguration 
  | GeometryConfiguration 
  | LectureConfiguration 
  | ProblemeConfiguration 
  | ConjugaisonConfiguration 
  | VocabulaireConfiguration;

// Base Exercise Interface
export interface BaseExercise {
  titre: string;
  consigne: string;
  type: ExerciseType;
  difficulte: Difficulty;
  moduleId: number;
  configuration: ExerciseConfiguration;
  metadata: {
    competenceCode: string;
    cognitiveLoad?: 'low' | 'medium' | 'high';
    engagement?: 'low' | 'medium' | 'high';
    storyContext?: string;
    [key: string]: unknown;
  };
}

// Level-specific Exercise Interfaces
export interface CPExercise extends BaseExercise {
  metadata: {
    competenceCode: string;
    cp2025: boolean;
    cognitiveLoad?: 'low' | 'medium' | 'high';
    engagement?: 'low' | 'medium' | 'high';
    storyContext?: string;
    [key: string]: unknown;
  };
}

export interface CE1Exercise extends BaseExercise {
  metadata: {
    competenceCode: string;
    ce1_2025: boolean;
    prerequis_cp: string[];
    cognitiveLoad?: 'low' | 'medium' | 'high';
    engagement?: 'low' | 'medium' | 'high';
    storyContext?: string;
    [key: string]: unknown;
  };
}

export interface CE2Exercise extends BaseExercise {
  metadata: {
    competenceCode: string;
    ce2_2026: boolean;
    prerequis_ce1: string[];
    cognitiveLoad?: 'low' | 'medium' | 'high';
    engagement?: 'low' | 'medium' | 'high';
    storyContext?: string;
    [key: string]: unknown;
  };
}

export type EducationalExercise = CPExercise | CE1Exercise | CE2Exercise;

// Competence Interfaces
export interface BaseCompetence {
  code: string;
  titre: string;
  description: string;
  niveau: EducationalLevel;
  domaine: string;
  sousDomaine: string;
  prerequis: string[];
  prerequis_details?: string[];
  saut_qualitatif?: string;
  nouveaute?: string;
  evaluation: string;
  donnees_chiffrees?: Record<string, any>;
  periode?: string;
  objectifs?: string[];
}

export interface CPCompetence extends BaseCompetence {
  niveau: 'CP';
  periode: string;
  objectifs: string[];
}

export interface CE1Competence extends BaseCompetence {
  niveau: 'CE1';
  prerequis_cp: string[];
  prerequis_details: string[];
}

export interface CE2Competence extends BaseCompetence {
  niveau: 'CE2';
  prerequis_ce1: string[];
  prerequis_details: string[];
}

export type EducationalCompetence = CPCompetence | CE1Competence | CE2Competence;

// Progress Tracking Interfaces
export interface CompetenceProgress {
  competenceCode: string;
  niveau: EducationalLevel;
  progressPercent: number;
  masteryLevel: MasteryLevel;
  totalAttempts: number;
  successfulAttempts: number;
  averageQuality: number;
  needsReview: boolean;
  lastAttemptAt: Date | null;
  masteredAt: Date | null;
  nextReviewAt?: Date;
  isBlocked: boolean;
  blockingPrerequisites?: string[];
}

export interface LearningPath {
  studentId: number;
  niveau: EducationalLevel;
  competences: CompetenceProgress[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    competenceCode: string;
    reason: string;
    type: 'review' | 'new' | 'remediation' | 'prerequisite';
  }[];
  summary: {
    totalCompetences: number;
    mastered: number;
    inProgress: number;
    notStarted: number;
    blocked: number;
    overallProgress: number;
  };
}

// Main Educational Data Structure
export interface EducationalData {
  modules: {
    CP: CPModule[];
    CE1: CE1Module[];
    CE2: CE2Module[];
  };
  exercises: {
    CP: CPExercise[];
    CE1: CE1Exercise[];
    CE2: CE2Exercise[];
  };
  competences: {
    CP: CPCompetence[];
    CE1: CE1Competence[];
    CE2: CE2Competence[];
  };
}

// Statistics Interface
export interface EducationalStatistics {
  totalModules: number;
  totalExercises: number;
  exercisesByDifficulty: Record<Difficulty, number>;
  exercisesByType: Record<ExerciseType, number>;
  modulesByLevel: Record<EducationalLevel, number>;
  modulesBySubject: Record<Subject, number>;
  competencesByLevel: Record<EducationalLevel, number>;
  competencesByDomain: Record<string, number>;
}

// Service Response Interfaces
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter Interfaces
export interface ExerciseFilter {
  level?: EducationalLevel;
  type?: ExerciseType;
  difficulty?: Difficulty;
  subject?: Subject;
  competenceCode?: string;
  moduleId?: number;
}

export interface ModuleFilter {
  level?: EducationalLevel;
  subject?: Subject;
  period?: Period;
  competenceDomain?: string;
}

export interface CompetenceFilter {
  level?: EducationalLevel;
  domain?: string;
  subDomain?: string;
  hasPrerequisites?: boolean;
  hasQualitativeLeap?: boolean;
}
