import React, { useState } from 'react';
import { motion } from 'framer-motion';
import NextLevelXPSystem from './NextLevelXPSystem';

const XPDemo: React.FC = () => {
  const [currentXP, setCurrentXP] = useState(75);
  const [maxXP, setMaxXP] = useState(100);
  const [level, setLevel] = useState(3);
  const [xpGained, setXpGained] = useState(0);
  const [bonusMultiplier, setBonusMultiplier] = useState(1);
  const [streakActive, setStreakActive] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'magic' | 'fire' | 'water' | 'crystal' | 'rainbow'>('magic');
  const [selectedSize, setSelectedSize] = useState<'compact' | 'normal' | 'large' | 'massive'>('large');
  const [recentAchievements, setRecentAchievements] = useState<string[]>([]);

  const themes = [
    { id: 'magic', name: 'Magic', emoji: '✨' },
    { id: 'fire', name: 'Fire', emoji: '🔥' },
    { id: 'water', name: 'Water', emoji: '💧' },
    { id: 'crystal', name: 'Crystal', emoji: '💎' },
    { id: 'rainbow', name: 'Rainbow', emoji: '🌈' }
  ];

  const sizes = [
    { id: 'compact', name: 'Compact' },
    { id: 'normal', name: 'Normal' },
    { id: 'large', name: 'Large' },
    { id: 'massive', name: 'Massive' }
  ];

  const handleAddXP = (amount: number) => {
    const newXP = Math.min(currentXP + amount, maxXP);
    setCurrentXP(newXP);
    setXpGained(amount);
    
    // Clear XP gained after animation
    setTimeout(() => setXpGained(0), 2000);
  };

  const handleLevelUp = (newLevel: number) => {
    setLevel(newLevel);
    setMaxXP(prev => prev + 20);
    setCurrentXP(0);
    setRecentAchievements(prev => [...prev, `Niveau ${newLevel} atteint!`]);
    
    // Remove old achievements after 5 seconds
    setTimeout(() => {
      setRecentAchievements(prev => prev.slice(1));
    }, 5000);
  };

  const handleMilestone = (milestone: number) => {
    console.log(`Milestone reached: ${milestone}%`);
    setRecentAchievements(prev => [...prev, `Progression: ${milestone}% !`]);
    
    // Remove old achievements after 5 seconds
    setTimeout(() => {
      setRecentAchievements(prev => prev.slice(1));
    }, 5000);
  };

  const toggleStreak = () => {
    setStreakActive(!streakActive);
    setBonusMultiplier(streakActive ? 1 : 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎮 Système XP Avancé - Démo
          </h1>
          <p className="text-lg text-gray-600">
            Découvrez le système XP avec physique liquide et animations avancées
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎛️ Contrôles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* XP Controls */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">XP Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAddXP(5)}
                  className="btn-magical text-sm px-3 py-1"
                >
                  +5 XP
                </button>
                <button
                  onClick={() => handleAddXP(15)}
                  className="btn-magical text-sm px-3 py-1"
                >
                  +15 XP
                </button>
                <button
                  onClick={() => handleAddXP(25)}
                  className="btn-magical text-sm px-3 py-1"
                >
                  +25 XP
                </button>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Thème</h3>
              <div className="flex flex-wrap gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedTheme === theme.id
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {theme.emoji} {theme.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Taille</h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedSize === size.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Effects */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Effets</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleStreak}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    streakActive
                      ? 'bg-yellow-500 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🔥 Série
                </button>
                <button
                  onClick={() => setRecentAchievements(prev => [...prev, 'Nouveau succès!'])}
                  className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-600"
                >
                  🏆 Succès
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* XP System Display */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <NextLevelXPSystem
            currentXP={currentXP}
            maxXP={maxXP}
            level={level}
            xpGained={xpGained}
            bonusMultiplier={bonusMultiplier}
            streakActive={streakActive}
            recentAchievements={recentAchievements}
            onLevelUp={handleLevelUp}
            onMilestone={handleMilestone}
            size={selectedSize}
            theme={selectedTheme}
            enablePhysics={true}
            interactive={true}
          />
        </motion.div>

        {/* Stats Display */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-2">📊 Statistiques</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Niveau:</span>
                <span className="font-bold">{level}</span>
              </div>
              <div className="flex justify-between">
                <span>XP Actuel:</span>
                <span className="font-bold">{currentXP}</span>
              </div>
              <div className="flex justify-between">
                <span>XP Max:</span>
                <span className="font-bold">{maxXP}</span>
              </div>
              <div className="flex justify-between">
                <span>Progression:</span>
                <span className="font-bold">{Math.round((currentXP / maxXP) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-2">🎯 Bonus Actifs</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Multiplicateur:</span>
                <span className="font-bold">x{bonusMultiplier}</span>
              </div>
              <div className="flex justify-between">
                <span>Série Active:</span>
                <span className={`font-bold ${streakActive ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {streakActive ? '🔥 Oui' : 'Non'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Thème:</span>
                <span className="font-bold">{themes.find(t => t.id === selectedTheme)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Taille:</span>
                <span className="font-bold">{sizes.find(s => s.id === selectedSize)?.name}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-2">🏆 Succès Récents</h3>
            <div className="space-y-2 text-sm">
              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement, index) => (
                  <div key={index} className="text-green-600 font-medium">
                    🏆 {achievement}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 italic">
                  Aucun succès récent
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Features List */}
        <motion.div
          className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">✨ Fonctionnalités Avancées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌊</span>
              <span>Physique liquide réaliste</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎨</span>
              <span>5 thèmes différents</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📏</span>
              <span>4 tailles configurables</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <span>Détection de jalons</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔥</span>
              <span>Système de séries</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏆</span>
              <span>Notifications de succès</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎉</span>
              <span>Célébrations de niveau</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💫</span>
              <span>Particules interactives</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎵</span>
              <span>Effets sonores</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default XPDemo; 