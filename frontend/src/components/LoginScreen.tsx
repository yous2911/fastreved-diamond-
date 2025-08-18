/**
 * Login Screen Component for FastRevEd Kids Diamond Interface
 * Child-friendly login interface with magical animations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, User, Lock, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// TEST ACCOUNTS COMPONENT
// =============================================================================
const TestAccounts: React.FC<{
  onSelectAccount: (prenom: string, nom: string) => void;
}> = ({ onSelectAccount }) => {
  const testAccounts = [
    { prenom: 'Emma', nom: 'Martin', level: 'CP', age: '6-8', emoji: '👧', color: 'from-pink-400 to-purple-500' },
    { prenom: 'Lucas', nom: 'Dubois', level: 'CP', age: '6-8', emoji: '👦', color: 'from-blue-400 to-cyan-500' },
    { prenom: 'Léa', nom: 'Bernard', level: 'CP', age: '6-8', emoji: '👧', color: 'from-green-400 to-teal-500' },
    { prenom: 'Noah', nom: 'Garcia', level: 'CE1', age: '9-11', emoji: '👦', color: 'from-orange-400 to-red-500' },
    { prenom: 'Alice', nom: 'Rodriguez', level: 'CE1', age: '9-11', emoji: '👧', color: 'from-purple-400 to-pink-500' },
  ];

  return (
    <motion.div
      className="mt-8 p-6 bg-white/80 rounded-2xl backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">🧪 Comptes de Test</h3>
        <p className="text-sm text-gray-600">Clique sur un élève pour te connecter rapidement</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {testAccounts.map((account, index) => (
          <motion.button
            key={account.prenom}
            onClick={() => onSelectAccount(account.prenom, account.nom)}
            className={`
              p-4 rounded-xl bg-gradient-to-r ${account.color} text-white
              hover:shadow-lg transform hover:scale-105 transition-all duration-300
              text-left
            `}
            whileHover={{ scale: 1.05, rotate: 1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.1 }}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{account.emoji}</div>
              <div className="flex-1">
                <div className="font-bold text-sm">{account.prenom} {account.nom}</div>
                <div className="text-xs opacity-90">{account.level} • {account.age} ans</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Mot de passe pour tous : <code className="bg-gray-100 px-2 py-1 rounded">password123</code>
        </p>
      </div>
    </motion.div>
  );
};

// =============================================================================
// MAIN LOGIN SCREEN COMPONENT
// =============================================================================
const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    password: ''
  });
  const [showTestAccounts, setShowTestAccounts] = useState(true);
  const [magicalParticles, setMagicalParticles] = useState(false);

  // =============================================================================
  // FORM HANDLERS
  // =============================================================================
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleTestAccountSelect = (prenom: string, nom: string) => {
    setFormData({
      prenom,
      nom,
      password: 'password123'
    });
    setShowTestAccounts(false);
    setMagicalParticles(true);
    setTimeout(() => setMagicalParticles(false), 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prenom || !formData.nom || !formData.password) {
      return;
    }

    setMagicalParticles(true);
    
    try {
      const response = await login({
        prenom: formData.prenom,
        nom: formData.nom,
        password: formData.password
      });

      if (response.success) {
        // Login successful - the AuthProvider will handle state updates
        console.log('🎉 Login successful!');
      } else {
        setMagicalParticles(false);
      }
    } catch (error) {
      setMagicalParticles(false);
      console.error('Login error:', error);
    }
  };

  // =============================================================================
  // MAGICAL PARTICLES BACKGROUND
  // =============================================================================
  
  const MagicalBackground: React.FC = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-70"
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 50,
          }}
          animate={{
            y: -50,
            x: Math.random() * window.innerWidth,
            scale: [0.5, 1.5, 0.5],
            rotate: [0, 360, 0],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 flex items-center justify-center p-6">
      <MagicalBackground />
      
      {/* Magical particles on interaction */}
      <AnimatePresence>
        {magicalParticles && (
          <motion.div
            className="fixed inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-yellow-300 rounded-full"
                initial={{
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                  scale: 0,
                }}
                animate={{
                  x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
                  y: window.innerHeight / 2 + (Math.random() - 0.5) * 400,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.05,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        {/* Logo and Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            ✨
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">FastRevEd Kids</h1>
          <p className="text-white/90 text-lg">Interface Diamant 💎</p>
          <p className="text-white/70">Pour les 6-8 ans</p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Connexion</h2>
            <p className="text-gray-600 text-sm">Entre tes informations pour commencer !</p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Ton prénom"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de famille
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Ton nom"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Ton mot de passe"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !formData.prenom || !formData.nom || !formData.password}
            className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Connexion...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <LogIn className="w-5 h-5" />
                <span>Se connecter</span>
              </div>
            )}
          </motion.button>
        </motion.form>

        {/* Test Accounts */}
        <AnimatePresence>
          {showTestAccounts && (
            <TestAccounts onSelectAccount={handleTestAccountSelect} />
          )}
        </AnimatePresence>

        {/* Toggle Test Accounts Button */}
        <motion.button
          onClick={() => setShowTestAccounts(!showTestAccounts)}
          className="w-full mt-4 text-white/80 hover:text-white text-sm transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showTestAccounts ? '🔽 Masquer les comptes de test' : '🔼 Afficher les comptes de test'}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default LoginScreen;