/**
 * FastRevEd Kids API Service
 * Comprehensive API service layer for both frontend applications
 * Handles authentication, students, exercises, mascots, wardrobe, and sessions
 */

import { ReactElement } from 'react';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Student {
  id: number;
  prenom: string;
  nom: string;
  identifiant: string;
  classe: string;
  niveau: string;
  ageGroup: '6-8' | '9-11';
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  heartsRemaining: number;
  dateInscription: string;
  lastLogin: string;
}

export interface Competence {
  id: number;
  code: string;
  nom: string;
  matiere: 'FR' | 'MA';
  domaine: string;
  niveauComp: number;
  sousCompetence: number;
  description: string;
  seuilMaitrise: number;
  xpReward: number;
}

export interface Exercise {
  id: number;
  competenceId: number;
  type: 'CALCUL' | 'MENTAL_MATH' | 'DRAG_DROP' | 'QCM' | 'LECTURE' | 'ECRITURE' | 'COMPREHENSION';
  question: string;
  correctAnswer: string;
  options?: any;
  difficultyLevel: number;
  xpReward: number;
  timeLimit: number;
  hintsAvailable: number;
  hintsText?: any;
  metadata?: any;
}

export interface StudentProgress {
  id: number;
  studentId: number;
  competenceId: number;
  status: 'not_started' | 'learning' | 'mastered' | 'failed';
  currentLevel: number;
  successRate: number;
  attemptsCount: number;
  correctAttempts: number;
  lastPracticeDate?: string;
  nextReviewDate?: string;
  repetitionNumber: number;
  easinessFactor: number;
  totalTimeSpent: number;
}

export interface Mascot {
  id: number;
  studentId: number;
  type: 'dragon' | 'fairy' | 'robot' | 'cat' | 'owl';
  currentEmotion: 'idle' | 'happy' | 'thinking' | 'celebrating' | 'oops';
  xpLevel: number;
  equippedItems: number[];
  aiState: any;
  lastInteraction?: string;
}

export interface WardrobeItem {
  id: number;
  name: string;
  type: 'hat' | 'clothing' | 'accessory' | 'shoes' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockRequirementType: 'xp' | 'streak' | 'exercises' | 'achievement';
  unlockRequirementValue: number;
  description: string;
  icon: string;
  isUnlocked?: boolean;
  isEquipped?: boolean;
  canUnlock?: boolean;
  progressToUnlock?: number;
}

export interface LearningSession {
  id: number;
  studentId: number;
  startedAt: string;
  endedAt?: string;
  exercisesCompleted: number;
  totalXpGained: number;
  performanceScore?: number;
  sessionDuration: number;
  competencesWorked: string[];
}

export interface Achievement {
  id: number;
  achievementCode: string;
  title: string;
  description: string;
  category: 'academic' | 'engagement' | 'progress' | 'social' | 'special';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  xpReward: number;
  badgeIconUrl: string;
  currentProgress: number;
  maxProgress: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  message?: string;
}

// =============================================================================
// API SERVICE CLASS
// =============================================================================

class APIService {
  private baseURL: string;
  private isAuthenticated: boolean = false;
  private currentStudent: Student | null = null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Important for HTTP-only cookies
      };

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.error?.message || `HTTP Error ${response.status}`,
            code: data.error?.code || `HTTP_${response.status}`,
            details: data.error?.details,
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // =============================================================================
  // AUTHENTICATION
  // =============================================================================

  async login(credentials: {
    prenom?: string;
    nom?: string;
    email?: string;
    password: string;
  }): Promise<ApiResponse<{ student: Student; expiresIn: number }>> {
    const response = await this.makeRequest<{ student: Student; expiresIn: number }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );

    if (response.success && response.data) {
      this.isAuthenticated = true;
      this.currentStudent = response.data.student;
      
      // Store student data in localStorage for persistence
      localStorage.setItem('currentStudent', JSON.stringify(response.data.student));
      localStorage.setItem('isAuthenticated', 'true');
    }

    return response;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.makeRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.isAuthenticated = false;
      this.currentStudent = null;
      localStorage.removeItem('currentStudent');
      localStorage.removeItem('isAuthenticated');
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ student: Student }>> {
    return this.makeRequest<{ student: Student }>('/auth/me');
  }

  // Check authentication status on app start
  async checkAuthStatus(): Promise<boolean> {
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedStudent = localStorage.getItem('currentStudent');

    if (storedAuth === 'true' && storedStudent) {
      try {
        // Verify with server
        const response = await this.getCurrentUser();
        if (response.success && response.data) {
          this.isAuthenticated = true;
          this.currentStudent = response.data.student;
          return true;
        }
      } catch (error) {
        // Clear invalid stored data
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('isAuthenticated');
      }
    }

    return false;
  }

  // =============================================================================
  // STUDENT MANAGEMENT
  // =============================================================================

  async getStudentProfile(studentId?: number): Promise<ApiResponse<{ student: Student }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{ student: Student }>(`/students/profile`);
  }

  async updateStudentProfile(
    updates: Partial<Pick<Student, 'prenom' | 'nom'>>
  ): Promise<ApiResponse<{ student: Student }>> {
    return this.makeRequest<{ student: Student }>('/students/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getStudentProgress(
    studentId?: number,
    filters?: {
      matiere?: string;
      niveau?: string;
      masteryLevel?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<{ competenceProgress: StudentProgress[]; summary: any }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/students/${id}/competence-progress${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<{ competenceProgress: StudentProgress[]; summary: any }>(endpoint);
  }

  async getStudentStats(studentId?: number): Promise<ApiResponse<{ stats: any }>> {
    const id = studentId || this.currentStudent?.id;
    return this.makeRequest<{ stats: any }>(`/students/stats`);
  }

  async getStudentAchievements(
    studentId?: number,
    filters?: {
      category?: string;
      difficulty?: string;
      completed?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<{ achievements: Achievement[]; summary: any }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/students/${id}/achievements${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<{ achievements: Achievement[]; summary: any }>(endpoint);
  }

  // =============================================================================
  // CURRICULUM & EXERCISES
  // =============================================================================

  async getCompetences(filters?: {
    matiere?: 'FR' | 'MA';
    niveau?: string;
  }): Promise<ApiResponse<Competence[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }

    const endpoint = `/competences${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<Competence[]>(endpoint);
  }

  async getExercises(filters?: {
    competenceId?: number;
    level?: string;
    type?: string;
    difficulty?: string;
    limit?: number;
  }): Promise<ApiResponse<{ items: Exercise[]; total: number }>> {
    if (filters?.competenceId) {
      return this.makeRequest<{ items: Exercise[]; total: number }>(`/exercises/by-competence/${filters.competenceId}`);
    }

    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/exercises${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<{ items: Exercise[]; total: number }>(endpoint);
  }

  async getExercisesByLevel(
    level: string,
    filters?: {
      matiere?: string;
      type?: string;
      difficulty?: string;
      limit?: number;
    }
  ): Promise<ApiResponse<Exercise[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }

    const endpoint = `/exercises/by-level/${level}${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<Exercise[]>(endpoint);
  }

  async getRandomExercises(
    level: string,
    count: number = 5,
    excludeTypes?: string[]
  ): Promise<ApiResponse<Exercise[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('count', count.toString());
    if (excludeTypes) {
      excludeTypes.forEach(type => queryParams.append('exclude_types', type));
    }

    return this.makeRequest<Exercise[]>(`/exercises/random/${level}?${queryParams}`);
  }

  async submitExercise(
    exerciseId: number,
    result: {
      score: number;
      timeSpent: number;
      completed: boolean;
      attempts?: number;
      hintsUsed?: number;
      answerGiven?: string;
    }
  ): Promise<ApiResponse<{ attempt: any; xpEarned: number; masteryLevelChanged?: boolean }>> {
    return this.makeRequest<{ attempt: any; xpEarned: number; masteryLevelChanged?: boolean }>(
      '/exercises/attempt',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciseId: exerciseId.toString(),
          score: result.score.toString(),
          completed: result.completed.toString(),
          timeSpent: result.timeSpent.toString(),
          answers: result.answerGiven || '',
        }),
      }
    );
  }

  async recordProgress(
    competenceCode: string,
    exerciseResult: {
      score: number;
      timeSpent: number;
      completed: boolean;
      attempts?: number;
      exerciseId?: number;
      difficultyLevel?: number;
    },
    sessionData?: {
      sessionId?: string;
      deviceType?: 'mobile' | 'tablet' | 'desktop';
      focusScore?: number;
    }
  ): Promise<ApiResponse<{
    progress: any;
    newAchievements: Achievement[];
    xpEarned: number;
    masteryLevelChanged: boolean;
  }>> {
    const studentId = this.currentStudent?.id;
    if (!studentId) {
      return {
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
      };
    }

    return this.makeRequest<{
      progress: any;
      newAchievements: Achievement[];
      xpEarned: number;
      masteryLevelChanged: boolean;
    }>(`/students/${studentId}/record-progress`, {
      method: 'POST',
      body: JSON.stringify({
        competenceCode,
        exerciseResult,
        sessionData,
      }),
    });
  }

  // =============================================================================
  // MASCOT SYSTEM
  // =============================================================================

  async getMascot(studentId?: number): Promise<ApiResponse<{ mascot: Mascot }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{ mascot: Mascot }>(`/mascots/${id}`);
  }

  async updateMascot(
    updates: {
      type?: Mascot['type'];
      currentEmotion?: Mascot['currentEmotion'];
      equippedItems?: number[];
      aiState?: any;
    },
    studentId?: number
  ): Promise<ApiResponse<{ mascot: Mascot }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{ mascot: Mascot }>(`/mascots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateMascotEmotion(
    performance: 'excellent' | 'good' | 'average' | 'poor',
    context?: 'exercise_complete' | 'streak_achieved' | 'level_up' | 'mistake_made',
    studentId?: number
  ): Promise<ApiResponse<{
    emotion: Mascot['currentEmotion'];
    aiState: any;
    message: string;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{
      emotion: Mascot['currentEmotion'];
      aiState: any;
      message: string;
    }>(`/mascots/${id}/emotion`, {
      method: 'POST',
      body: JSON.stringify({ performance, context }),
    });
  }

  async getMascotDialogue(
    context: 'greeting' | 'encouragement' | 'celebration' | 'help' | 'goodbye' = 'greeting',
    studentId?: number
  ): Promise<ApiResponse<{
    dialogue: string;
    mascotType: Mascot['type'];
    emotion: Mascot['currentEmotion'];
    context: string;
    timestamp: string;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{
      dialogue: string;
      mascotType: Mascot['type'];
      emotion: Mascot['currentEmotion'];
      context: string;
      timestamp: string;
    }>(`/mascots/${id}/dialogue?context=${context}`);
  }

  // =============================================================================
  // WARDROBE SYSTEM
  // =============================================================================

  async getWardrobe(
    studentId?: number,
    filters?: {
      type?: WardrobeItem['type'];
      rarity?: WardrobeItem['rarity'];
      unlocked?: boolean;
      equipped?: boolean;
    }
  ): Promise<ApiResponse<{
    items: WardrobeItem[];
    summary: {
      total: number;
      unlocked: number;
      equipped: number;
      canUnlock: number;
    };
    studentStats: any;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/wardrobe/${id}${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<{
      items: WardrobeItem[];
      summary: any;
      studentStats: any;
    }>(endpoint);
  }

  async unlockWardrobeItem(
    itemId: number,
    studentId?: number
  ): Promise<ApiResponse<{ item: WardrobeItem; unlockedAt: string }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{ item: WardrobeItem; unlockedAt: string }>(
      `/wardrobe/${id}/unlock/${itemId}`,
      { method: 'POST' }
    );
  }

  async equipWardrobeItem(
    itemId: number,
    studentId?: number
  ): Promise<ApiResponse<{
    itemId: number;
    itemName: string;
    itemType: string;
    equipped: boolean;
    equippedAt: string;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{
      itemId: number;
      itemName: string;
      itemType: string;
      equipped: boolean;
      equippedAt: string;
    }>(`/wardrobe/${id}/equip/${itemId}`, { method: 'POST' });
  }

  async unequipWardrobeItem(
    itemId: number,
    studentId?: number
  ): Promise<ApiResponse<{
    itemId: number;
    equipped: boolean;
    unequippedAt: string;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{
      itemId: number;
      equipped: boolean;
      unequippedAt: string;
    }>(`/wardrobe/${id}/unequip/${itemId}`, { method: 'POST' });
  }

  async getEquippedItems(studentId?: number): Promise<ApiResponse<{
    equippedItems: WardrobeItem[];
    count: number;
    byType: Record<string, WardrobeItem[]>;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    return this.makeRequest<{
      equippedItems: WardrobeItem[];
      count: number;
      byType: Record<string, WardrobeItem[]>;
    }>(`/wardrobe/${id}/equipped`);
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  async startSession(competencesPlanned?: string[]): Promise<ApiResponse<{ session: LearningSession }>> {
    const studentId = this.currentStudent?.id;
    return this.makeRequest<{ session: LearningSession }>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        competencesPlanned: competencesPlanned || [],
      }),
    });
  }

  async endSession(
    sessionId: number,
    summary?: {
      exercisesCompleted?: number;
      totalXpGained?: number;
      averageScore?: number;
      competencesWorked?: string[];
    }
  ): Promise<ApiResponse<{
    session: LearningSession;
    metrics: {
      duration: number;
      exercisesCompleted: number;
      xpGained: number;
      averageScore: number;
      timeSpent: number;
    };
  }>> {
    return this.makeRequest<{
      session: LearningSession;
      metrics: any;
    }>(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ summary }),
    });
  }

  async getActiveSession(): Promise<ApiResponse<{
    hasActiveSession: boolean;
    session: LearningSession | null;
  }>> {
    return this.makeRequest<{
      hasActiveSession: boolean;
      session: LearningSession | null;
    }>('/sessions/active');
  }

  async getSession(sessionId: number): Promise<ApiResponse<{
    session: LearningSession;
    exerciseResults: any[];
    summary: any;
  }>> {
    return this.makeRequest<{
      session: LearningSession;
      exerciseResults: any[];
      summary: any;
    }>(`/sessions/${sessionId}`);
  }

  async getStudentSessions(
    studentId?: number,
    options?: {
      limit?: number;
      offset?: number;
      status?: 'active' | 'completed' | 'all';
    }
  ): Promise<ApiResponse<{
    sessions: LearningSession[];
    pagination: { limit: number; offset: number; total: number };
    summary: any;
  }>> {
    const id = studentId || this.currentStudent?.id;
    if (!id) {
      return {
        success: false,
        error: { message: 'Student ID required', code: 'MISSING_STUDENT_ID' },
      };
    }

    const queryParams = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/sessions/student/${id}${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.makeRequest<{
      sessions: LearningSession[];
      pagination: any;
      summary: any;
    }>(endpoint);
  }

  // =============================================================================
  // GETTERS & STATUS
  // =============================================================================

  get authenticated(): boolean {
    return this.isAuthenticated;
  }

  get currentStudentData(): Student | null {
    return this.currentStudent;
  }

  async healthCheck(): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/health');
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const apiService = new APIService();
export default apiService;