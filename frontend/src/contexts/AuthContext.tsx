/**
 * Authentication Context for FastRevEd Kids
 * Manages user authentication state and provides auth methods to components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, Student, ApiResponse } from '../services/api';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  student: Student | null;
  error: string | null;
  
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<ApiResponse<{ student: Student; expiresIn: number }>>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
  
  // Student data refresh
  refreshStudentData: () => Promise<void>;
}

interface LoginCredentials {
  prenom?: string;
  nom?: string;
  email?: string;
  password: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

// =============================================================================
// AUTH PROVIDER COMPONENT
// =============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // AUTH METHODS
  // =============================================================================

  const login = async (credentials: LoginCredentials): Promise<ApiResponse<{ student: Student; expiresIn: number }>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.login(credentials);

      if (response.success && response.data) {
        setIsAuthenticated(true);
        setStudent(response.data.student);
        setError(null);
        
        console.log('✅ Login successful:', response.data.student.prenom);
      } else {
        setError(response.error?.message || 'Login failed');
        console.error('❌ Login failed:', response.error);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('❌ Login error:', error);
      
      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'LOGIN_ERROR'
        }
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      await apiService.logout();
      setIsAuthenticated(false);
      setStudent(null);
      setError(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if logout fails on server, clear local state
      setIsAuthenticated(false);
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      const isAuth = await apiService.checkAuthStatus();
      
      if (isAuth) {
        const currentStudentData = apiService.currentStudentData;
        setIsAuthenticated(true);
        setStudent(currentStudentData);
        console.log('✅ Auth status verified:', currentStudentData?.prenom);
      } else {
        setIsAuthenticated(false);
        setStudent(null);
        console.log('ℹ️ No active authentication');
      }
    } catch (error) {
      console.error('❌ Auth status check error:', error);
      setIsAuthenticated(false);
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStudentData = async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      const response = await apiService.getStudentProfile();
      
      if (response.success && response.data) {
        setStudent(response.data.student);
        console.log('✅ Student data refreshed');
      } else {
        console.error('❌ Failed to refresh student data:', response.error);
      }
    } catch (error) {
      console.error('❌ Error refreshing student data:', error);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Auto-refresh student data periodically (every 5 minutes)
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        refreshStudentData();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    student,
    error,
    login,
    logout,
    checkAuthStatus,
    clearError,
    refreshStudentData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// =============================================================================
// CUSTOM HOOK
// =============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

// Hook for requiring authentication
export const useRequireAuth = (): AuthContextType => {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      console.warn('⚠️ Authentication required but user not logged in');
    }
  }, [auth.isLoading, auth.isAuthenticated]);
  
  return auth;
};

// Hook for student data with automatic refresh
export const useStudentData = () => {
  const { student, refreshStudentData, isAuthenticated, isLoading } = useAuth();
  
  const refreshData = React.useCallback(async () => {
    if (isAuthenticated) {
      await refreshStudentData();
    }
  }, [isAuthenticated, refreshStudentData]);
  
  return {
    student,
    refreshData,
    isAuthenticated,
    isLoading,
  };
};