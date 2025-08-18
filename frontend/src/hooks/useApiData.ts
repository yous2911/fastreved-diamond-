/**
 * Custom hooks for managing API data in FastRevEd Kids
 * Provides efficient data fetching, caching, and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, Exercise, Competence, StudentProgress, Mascot, WardrobeItem, LearningSession, Achievement } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// UTILITY TYPES
// =============================================================================

interface UseApiDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

interface UseApiDataOptions {
  autoFetch?: boolean;
  cacheTime?: number; // minutes
  refetchOnWindowFocus?: boolean;
}

// =============================================================================
// GENERIC API DATA HOOK
// =============================================================================

const useApiData = <T>(
  fetchFunction: () => Promise<{ success: boolean; data?: T; error?: { message: string } }>,
  options: UseApiDataOptions = {}
) => {
  const { autoFetch = true, cacheTime = 5, refetchOnWindowFocus = true } = options;
  
  const [state, setState] = useState<UseApiDataState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastFetch: null,
  });

  const isMountedRef = useRef(true);
  const { isAuthenticated } = useAuth();

  const fetch = useCallback(async () => {
    if (!isAuthenticated) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetchFunction();
      
      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        setState({
          data: response.data,
          isLoading: false,
          error: null,
          lastFetch: new Date(),
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error?.message || 'Unknown error occurred',
        }));
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      }));
    }
  }, [fetchFunction, isAuthenticated]);

  const refetch = useCallback(() => {
    fetch();
  }, [fetch]);

  // Auto-fetch on mount and auth changes
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetch();
    }
  }, [fetch, autoFetch, isAuthenticated]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !isAuthenticated) return;

    const handleFocus = () => {
      const { lastFetch } = state;
      const now = new Date();
      
      if (!lastFetch || (now.getTime() - lastFetch.getTime()) > cacheTime * 60 * 1000) {
        fetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, cacheTime, fetch, isAuthenticated, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    refetch,
    isFresh: state.lastFetch && (new Date().getTime() - state.lastFetch.getTime()) < cacheTime * 60 * 1000,
  };
};

// =============================================================================
// STUDENT DATA HOOKS
// =============================================================================

export const useStudentProgress = (filters?: {
  matiere?: string;
  niveau?: string;
  masteryLevel?: string;
}) => {
  return useApiData(
    () => apiService.getStudentProgress(undefined, filters),
    { cacheTime: 2 } // 2 minutes cache for progress data
  );
};

export const useStudentStats = () => {
  return useApiData(
    () => apiService.getStudentStats(),
    { cacheTime: 5 } // 5 minutes cache for stats
  );
};

export const useStudentAchievements = (filters?: {
  category?: string;
  difficulty?: string;
  completed?: boolean;
}) => {
  return useApiData(
    () => apiService.getStudentAchievements(undefined, filters),
    { cacheTime: 10 } // 10 minutes cache for achievements
  );
};

// =============================================================================
// CURRICULUM & EXERCISES HOOKS
// =============================================================================

export const useCompetences = (filters?: { matiere?: 'FR' | 'MA'; niveau?: string }) => {
  return useApiData(
    () => apiService.getCompetences(filters),
    { cacheTime: 30 } // 30 minutes cache for competences
  );
};

export const useExercises = (filters?: {
  competenceId?: number;
  level?: string;
  type?: string;
  difficulty?: string;
  limit?: number;
}) => {
  return useApiData(
    () => apiService.getExercises(filters),
    { cacheTime: 15 } // 15 minutes cache for exercises
  );
};

export const useExercisesByLevel = (level: string, filters?: {
  matiere?: string;
  type?: string;
  difficulty?: string;
  limit?: number;
}) => {
  return useApiData(
    () => apiService.getExercisesByLevel(level, filters),
    { cacheTime: 15 }
  );
};

export const useRandomExercises = (level: string, count: number = 5, excludeTypes?: string[]) => {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomExercises = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getRandomExercises(level, count, excludeTypes);
      
      if (response.success && response.data) {
        setExercises(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch exercises');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [level, count, excludeTypes]);

  return {
    data: exercises,
    isLoading,
    error,
    refetch: fetchRandomExercises,
  };
};

// =============================================================================
// MASCOT HOOKS
// =============================================================================

export const useMascot = () => {
  const mascotState = useApiData(() => apiService.getMascot(), { cacheTime: 1 });

  const updateEmotion = useCallback(async (
    performance: 'excellent' | 'good' | 'average' | 'poor',
    context?: 'exercise_complete' | 'streak_achieved' | 'level_up' | 'mistake_made'
  ) => {
    try {
      const response = await apiService.updateMascotEmotion(performance, context);
      if (response.success) {
        mascotState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating mascot emotion:', error);
      return null;
    }
  }, [mascotState]);

  const getDialogue = useCallback(async (
    context: 'greeting' | 'encouragement' | 'celebration' | 'help' | 'goodbye' = 'greeting'
  ) => {
    try {
      const response = await apiService.getMascotDialogue(context);
      return response.data;
    } catch (error) {
      console.error('Error getting mascot dialogue:', error);
      return null;
    }
  }, []);

  const updateMascot = useCallback(async (updates: {
    type?: Mascot['type'];
    equippedItems?: number[];
  }) => {
    try {
      const response = await apiService.updateMascot(updates);
      if (response.success) {
        mascotState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating mascot:', error);
      return null;
    }
  }, [mascotState]);

  return {
    ...mascotState,
    updateEmotion,
    getDialogue,
    updateMascot,
  };
};

// =============================================================================
// WARDROBE HOOKS
// =============================================================================

export const useWardrobe = (filters?: {
  type?: WardrobeItem['type'];
  rarity?: WardrobeItem['rarity'];
  unlocked?: boolean;
  equipped?: boolean;
}) => {
  const wardrobeState = useApiData(() => apiService.getWardrobe(undefined, filters), { cacheTime: 5 });

  const unlockItem = useCallback(async (itemId: number) => {
    try {
      const response = await apiService.unlockWardrobeItem(itemId);
      if (response.success) {
        wardrobeState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error unlocking wardrobe item:', error);
      return null;
    }
  }, [wardrobeState]);

  const equipItem = useCallback(async (itemId: number) => {
    try {
      const response = await apiService.equipWardrobeItem(itemId);
      if (response.success) {
        wardrobeState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error equipping wardrobe item:', error);
      return null;
    }
  }, [wardrobeState]);

  const unequipItem = useCallback(async (itemId: number) => {
    try {
      const response = await apiService.unequipWardrobeItem(itemId);
      if (response.success) {
        wardrobeState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error unequipping wardrobe item:', error);
      return null;
    }
  }, [wardrobeState]);

  return {
    ...wardrobeState,
    unlockItem,
    equipItem,
    unequipItem,
  };
};

export const useEquippedItems = () => {
  return useApiData(() => apiService.getEquippedItems(), { cacheTime: 2 });
};

// =============================================================================
// SESSION MANAGEMENT HOOKS
// =============================================================================

export const useActiveSession = () => {
  return useApiData(() => apiService.getActiveSession(), { cacheTime: 0.5, autoFetch: true });
};

export const useSessionManagement = () => {
  const activeSessionState = useActiveSession();
  
  const startSession = useCallback(async (competencesPlanned?: string[]) => {
    try {
      const response = await apiService.startSession(competencesPlanned);
      if (response.success) {
        activeSessionState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  }, [activeSessionState]);

  const endSession = useCallback(async (sessionId: number, summary?: {
    exercisesCompleted?: number;
    totalXpGained?: number;
    averageScore?: number;
    competencesWorked?: string[];
  }) => {
    try {
      const response = await apiService.endSession(sessionId, summary);
      if (response.success) {
        activeSessionState.refetch();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error ending session:', error);
      return null;
    }
  }, [activeSessionState]);

  return {
    ...activeSessionState,
    startSession,
    endSession,
  };
};

// =============================================================================
// EXERCISE SUBMISSION HOOK
// =============================================================================

export const useExerciseSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const submitExercise = useCallback(async (
    exerciseId: number,
    result: {
      score: number;
      timeSpent: number;
      completed: boolean;
      attempts?: number;
      hintsUsed?: number;
      answerGiven?: string;
    }
  ) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await apiService.submitExercise(exerciseId, result);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
          xpEarned: response.data?.xpEarned || 0,
          masteryLevelChanged: response.data?.masteryLevelChanged || false,
        };
      } else {
        setSubmissionError(response.error?.message || 'Submission failed');
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      setSubmissionError(errorMessage);
      return { success: false, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const recordProgress = useCallback(async (
    competenceCode: string,
    exerciseResult: {
      score: number;
      timeSpent: number;
      completed: boolean;
      attempts?: number;
      exerciseId?: number;
      difficultyLevel?: number;
    }
  ) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await apiService.recordProgress(competenceCode, exerciseResult);
      
      if (response.success && response.data) {
        return {
          success: true,
          ...response.data,
        };
      } else {
        setSubmissionError(response.error?.message || 'Progress recording failed');
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      setSubmissionError(errorMessage);
      return { success: false, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    submitExercise,
    recordProgress,
    isSubmitting,
    error: submissionError,
    clearError: () => setSubmissionError(null),
  };
};

// =============================================================================
// REALTIME XP TRACKING HOOK
// =============================================================================

export const useXpTracking = () => {
  const { student, refreshStudentData } = useAuth();
  const [xpGained, setXpGained] = useState(0);
  const [showXpAnimation, setShowXpAnimation] = useState(false);

  const addXp = useCallback(async (amount: number) => {
    setXpGained(prev => prev + amount);
    setShowXpAnimation(true);
    
    // Refresh student data to get updated XP
    setTimeout(() => {
      refreshStudentData();
    }, 500);
    
    // Hide animation after 3 seconds
    setTimeout(() => {
      setShowXpAnimation(false);
      setXpGained(0);
    }, 3000);
  }, [refreshStudentData]);

  return {
    currentXp: student?.totalXp || 0,
    currentLevel: student?.currentLevel || 1,
    xpGained,
    showXpAnimation,
    addXp,
  };
};