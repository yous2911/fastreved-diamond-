import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppState {
  theme: 'light' | 'dark';
  language: 'fr' | 'en';
  sidebarOpen: boolean;
}

interface AppContextType {
  state: AppState;
  toggleTheme: () => void;
  setLanguage: (language: 'fr' | 'en') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const defaultState: AppState = {
  theme: 'light',
  language: 'fr',
  sidebarOpen: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const toggleTheme = () => {
    setState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const setLanguage = (language: 'fr' | 'en') => {
    setState(prev => ({
      ...prev,
      language,
    }));
  };

  const toggleSidebar = () => {
    setState(prev => ({
      ...prev,
      sidebarOpen: !prev.sidebarOpen,
    }));
  };

  const setSidebarOpen = (open: boolean) => {
    setState(prev => ({
      ...prev,
      sidebarOpen: open,
    }));
  };

  const value: AppContextType = {
    state,
    toggleTheme,
    setLanguage,
    toggleSidebar,
    setSidebarOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};