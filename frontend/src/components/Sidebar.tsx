import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
  disabled?: boolean;
}

interface SidebarProps {
  className?: string;
  items?: SidebarItem[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  className = '',
  items = [],
  currentPath = '/',
  onNavigate = () => {}
}) => {
  const { state, toggleSidebar } = useApp();

  // Use provided items or fallback to default menu
  const menuItems = items.length > 0 ? items : [
    { id: 'home', label: 'Accueil', path: '/', icon: '🏠' },
    { id: 'exercises', label: 'Exercices', path: '/exercises', icon: '📚' },
    { id: 'progress', label: 'Progrès', path: '/progress', icon: '📊' },
    { id: 'profile', label: 'Profil', path: '/profile', icon: '👤' },
    { id: 'settings', label: 'Paramètres', path: '/settings', icon: '⚙️' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-xl lg:shadow-md border-r border-gray-200 flex flex-col hidden lg:block ${className}`}>
        <nav className="flex-1 p-4" role="navigation">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = item.path === currentPath;
              const isDisabled = item.disabled;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => !isDisabled && onNavigate(item.path)}
                    disabled={isDisabled}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : isDisabled 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl mr-3">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className={`ml-auto px-2 py-1 text-xs font-bold rounded-full ${
                        isActive 
                          ? 'bg-white bg-opacity-20 text-white'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-6 border-t border-gray-200">
          <button className="w-full flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <span className="text-xl mr-3">🚪</span>
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {state.sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={toggleSidebar}
            />

            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed left-0 top-0 h-full w-72 bg-white shadow-lg z-50 lg:hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-gray-800">Menu</h2>
                  <button
                    onClick={toggleSidebar}
                    className="text-gray-500 hover:text-gray-700 p-1"
                    aria-label="Fermer le menu"
                  >
                    ✕
                  </button>
                </div>

                <nav role="navigation">
                  <ul className="space-y-2">
                    {menuItems.map((item) => {
                      const isActive = item.path === currentPath;
                      const isDisabled = item.disabled;
                      
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => !isDisabled && onNavigate(item.path)}
                            disabled={isDisabled}
                            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                              isActive 
                                ? 'bg-blue-500 text-white' 
                                : isDisabled 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-xl mr-3">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                            {item.badge && (
                              <span className={`ml-auto px-2 py-1 text-xs font-bold rounded-full ${
                                isActive 
                                  ? 'bg-white bg-opacity-20 text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button className="w-full flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-xl mr-3">🚪</span>
                    <span className="font-medium">Déconnexion</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};