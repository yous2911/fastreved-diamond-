// Unified Educational Data Hook for CP, CE1, CE2
// ===============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { EducationalService } from '../services/educational.service';
import {
  EducationalData,
  EducationalLevel,
  EducationalModule,
  EducationalExercise,
  EducationalCompetence,
  ExerciseFilter,
  ModuleFilter,
  CompetenceFilter,
  EducationalStatistics,
  ServiceResponse
} from '../types/educational.types';

interface UseEducationalDataOptions {
  initialData?: EducationalData;
  autoLoad?: boolean;
  dataUrl?: string;
  refreshInterval?: number;
}

interface UseEducationalDataReturn {
  // Data
  modules: {
    CP: EducationalModule[];
    CE1: EducationalModule[];
    CE2: EducationalModule[];
  };
  exercises: {
    CP: EducationalExercise[];
    CE1: EducationalExercise[];
    CE2: EducationalExercise[];
  };
  competences: {
    CP: EducationalCompetence[];
    CE1: EducationalCompetence[];
    CE2: EducationalCompetence[];
  };
  
  // Service methods
  getModulesByLevel: (level: EducationalLevel) => EducationalModule[];
  getExercisesByLevel: (level: EducationalLevel) => EducationalExercise[];
  getCompetencesByLevel: (level: EducationalLevel) => EducationalCompetence[];
  getExercisesByFilter: (filter: ExerciseFilter) => EducationalExercise[];
  getModulesByFilter: (filter: ModuleFilter) => EducationalModule[];
  getCompetencesByFilter: (filter: CompetenceFilter) => EducationalCompetence[];
  getStatistics: () => EducationalStatistics;
  
  // State
  loading: boolean;
  error: string | null;
  service: EducationalService | null;
  
  // Actions
  refresh: () => Promise<void>;
  updateData: (newData: EducationalData) => void;
  exportData: () => string;
}

export function useEducationalData(options: UseEducationalDataOptions = {}): UseEducationalDataReturn {
  const {
    initialData,
    autoLoad = false,
    dataUrl,
    refreshInterval
  } = options;

  // State
  const [data, setData] = useState<EducationalData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<EducationalService | null>(null);

  // Initialize service when data changes
  useEffect(() => {
    if (data) {
      try {
        const newService = new EducationalService(data);
        setService(newService);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize educational service');
        setService(null);
      }
    }
  }, [data]);

  // Load data from URL
  const loadDataFromUrl = useCallback(async (url: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load educational data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load data
  useEffect(() => {
    if (autoLoad && dataUrl && !data) {
      loadDataFromUrl(dataUrl);
    }
  }, [autoLoad, dataUrl, data, loadDataFromUrl]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval && dataUrl) {
      const interval = setInterval(() => {
        loadDataFromUrl(dataUrl);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, dataUrl, loadDataFromUrl]);

  // Service methods
  const getModulesByLevel = useCallback((level: EducationalLevel): EducationalModule[] => {
    return service?.getModulesByLevel(level) || [];
  }, [service]);

  const getExercisesByLevel = useCallback((level: EducationalLevel): EducationalExercise[] => {
    return service?.getExercisesByLevel(level) || [];
  }, [service]);

  const getCompetencesByLevel = useCallback((level: EducationalLevel): EducationalCompetence[] => {
    return service?.getCompetencesByLevel(level) || [];
  }, [service]);

  const getExercisesByFilter = useCallback((filter: ExerciseFilter): EducationalExercise[] => {
    return service?.getExercisesByFilter(filter) || [];
  }, [service]);

  const getModulesByFilter = useCallback((filter: ModuleFilter): EducationalModule[] => {
    return service?.getModulesByFilter(filter) || [];
  }, [service]);

  const getCompetencesByFilter = useCallback((filter: CompetenceFilter): EducationalCompetence[] => {
    return service?.getCompetencesByFilter(filter) || [];
  }, [service]);

  const getStatistics = useCallback((): EducationalStatistics => {
    return service?.getStatistics() || {
      totalModules: 0,
      totalExercises: 0,
      exercisesByDifficulty: {
        decouverte: 0,
        entrainement: 0,
        consolidation: 0,
        approfondissement: 0
      },
      exercisesByType: {
        QCM: 0,
        CALCUL: 0,
        DRAG_DROP: 0,
        TEXT_INPUT: 0,
        LECTURE: 0,
        GEOMETRIE: 0,
        PROBLEME: 0,
        CONJUGAISON: 0,
        VOCABULAIRE: 0
      },
      modulesByLevel: {
        CP: 0,
        CE1: 0,
        CE2: 0
      },
      modulesBySubject: {
        FRANCAIS: 0,
        MATHEMATIQUES: 0,
        SCIENCES: 0,
        HISTOIRE_GEOGRAPHIE: 0,
        ANGLAIS: 0
      },
      competencesByLevel: {
        CP: 0,
        CE1: 0,
        CE2: 0
      },
      competencesByDomain: {}
    };
  }, [service]);

  // Actions
  const refresh = useCallback(async (): Promise<void> => {
    if (dataUrl) {
      await loadDataFromUrl(dataUrl);
    }
  }, [dataUrl, loadDataFromUrl]);

  const updateData = useCallback((newData: EducationalData): void => {
    setData(newData);
  }, []);

  const exportData = useCallback((): string => {
    return service?.exportData() || JSON.stringify({ modules: {}, exercises: {}, competences: {} });
  }, [service]);

  // Memoized data structure
  const modules = useMemo(() => ({
    CP: getModulesByLevel('CP'),
    CE1: getModulesByLevel('CE1'),
    CE2: getModulesByLevel('CE2')
  }), [getModulesByLevel]);

  const exercises = useMemo(() => ({
    CP: getExercisesByLevel('CP'),
    CE1: getExercisesByLevel('CE1'),
    CE2: getExercisesByLevel('CE2')
  }), [getExercisesByLevel]);

  const competences = useMemo(() => ({
    CP: getCompetencesByLevel('CP'),
    CE1: getCompetencesByLevel('CE1'),
    CE2: getCompetencesByLevel('CE2')
  }), [getCompetencesByLevel]);

  return {
    // Data
    modules,
    exercises,
    competences,
    
    // Service methods
    getModulesByLevel,
    getExercisesByLevel,
    getCompetencesByLevel,
    getExercisesByFilter,
    getModulesByFilter,
    getCompetencesByFilter,
    getStatistics,
    
    // State
    loading,
    error,
    service,
    
    // Actions
    refresh,
    updateData,
    exportData
  };
}

// Specialized hooks for specific levels
export function useCPData(options: UseEducationalDataOptions = {}): {
  modules: EducationalModule[];
  exercises: EducationalExercise[];
  competences: EducationalCompetence[];
  loading: boolean;
  error: string | null;
  service: EducationalService | null;
} {
  const educationalData = useEducationalData(options);
  
  return {
    modules: educationalData.modules.CP,
    exercises: educationalData.exercises.CP,
    competences: educationalData.competences.CP,
    loading: educationalData.loading,
    error: educationalData.error,
    service: educationalData.service
  };
}

export function useCE1Data(options: UseEducationalDataOptions = {}): {
  modules: EducationalModule[];
  exercises: EducationalExercise[];
  competences: EducationalCompetence[];
  loading: boolean;
  error: string | null;
  service: EducationalService | null;
} {
  const educationalData = useEducationalData(options);
  
  return {
    modules: educationalData.modules.CE1,
    exercises: educationalData.exercises.CE1,
    competences: educationalData.competences.CE1,
    loading: educationalData.loading,
    error: educationalData.error,
    service: educationalData.service
  };
}

export function useCE2Data(options: UseEducationalDataOptions = {}): {
  modules: EducationalModule[];
  exercises: EducationalExercise[];
  competences: EducationalCompetence[];
  loading: boolean;
  error: string | null;
  service: EducationalService | null;
} {
  const educationalData = useEducationalData(options);
  
  return {
    modules: educationalData.modules.CE2,
    exercises: educationalData.exercises.CE2,
    competences: educationalData.competences.CE2,
    loading: educationalData.loading,
    error: educationalData.error,
    service: educationalData.service
  };
}

// Hook for specific level
export function useLevelData(level: EducationalLevel, options: UseEducationalDataOptions = {}): {
  modules: EducationalModule[];
  exercises: EducationalExercise[];
  competences: EducationalCompetence[];
  loading: boolean;
  error: string | null;
  service: EducationalService | null;
} {
  const educationalData = useEducationalData(options);
  
  return {
    modules: educationalData.modules[level],
    exercises: educationalData.exercises[level],
    competences: educationalData.competences[level],
    loading: educationalData.loading,
    error: educationalData.error,
    service: educationalData.service
  };
}
