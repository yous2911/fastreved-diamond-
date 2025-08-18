import React, { useState } from 'react';
import { motion } from 'framer-motion';
import HybridMascotSystem from './HybridMascotSystem';
import WardrobeSystem from './WardrobeSystem';
import { WardrobeItem } from './WardrobeData';

const IntegratedMascotDemo: React.FC = () => {
  const [mascotType, setMascotType] = useState<'dragon' | 'fairy' | 'robot' | 'cat' | 'owl'>('dragon');
  const [currentActivity, setCurrentActivity] = useState<'idle' | 'exercise' | 'achievement' | 'mistake' | 'learning'>('idle');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [recentPerformance, setRecentPerformance] = useState<'struggling' | 'average' | 'excellent'>('average');
  const [studentLevel, setStudentLevel] = useState(3);
  const [studentXP, setStudentXP] = useState(75);
  const [currentStreak, setCurrentStreak] = useState(5);
  const [equippedItems, setEquippedItems] = useState<string[]>([]);
  const [showWardrobe, setShowWardrobe] = useState(false);

  const studentData = {
    level: studentLevel,
    xp: studentXP,
    currentStreak: currentStreak,
    timeOfDay: timeOfDay,
    recentPerformance: recentPerformance
  };

  const studentStats = {
    xp: studentXP,
    streak: currentStreak,
    exercisesCompleted: 25,
    achievementsUnlocked: 3
  };

  const handleMascotInteraction = (interaction: string) => {
    console.log('Mascot interaction:', interaction);
  };

  const handleEmotionalStateChange = (state: any) => {
    console.log('AI state changed:', state);
  };

  const handleItemEquip = (itemId: string) => {
    setEquippedItems(prev => [...prev, itemId]);
  };

  const handleItemUnequip = (itemId: string) => {
    setEquippedItems(prev => prev.filter(id => id !== itemId));
  };

  const handleNewItemUnlocked = (item: WardrobeItem) => {
    console.log('New item unlocked:', item.name);
  };

  const mascotTypes = [
    { id: 'dragon', name: 'Dragon', emoji: '🐉' },
    { id: 'fairy', name: 'Fairy', emoji: '🧚' },
    { id: 'robot', name: 'Robot', emoji: '🤖' },
    { id: 'cat', name: 'Cat', emoji: '🐱' },
    { id: 'owl', name: 'Owl', emoji: '🦉' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🤖 Mascot AI + Garde-Robe Intégré
          </h1>
          <p className="text-xl text-gray-600">
            Système complet avec IA intelligente et personnalisation par récompenses
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mascot Section */}
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">🤖 Mascot AI</h2>
              <button
                onClick={() => setShowWardrobe(!showWardrobe)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                {showWardrobe ? '👕 Masquer Garde-Robe' : '👗 Ouvrir Garde-Robe'}
              </button>
            </div>

            {/* Mascot Type Selector */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Type de Mascot</h3>
              <div className="grid grid-cols-5 gap-2">
                {mascotTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setMascotType(type.id as any)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${
                      mascotType === type.id
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Mascot Display */}
            <div className="flex justify-center items-center h-96">
              <HybridMascotSystem
                mascotType={mascotType}
                studentData={studentData}
                currentActivity={currentActivity}
                equippedItems={equippedItems}
                onMascotInteraction={handleMascotInteraction}
                onEmotionalStateChange={handleEmotionalStateChange}
              />
            </div>

            {/* Activity Controls */}
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Activité Actuelle</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'idle', name: 'Idle', emoji: '😴' },
                  { id: 'exercise', name: 'Exercise', emoji: '📚' },
                  { id: 'achievement', name: 'Achievement', emoji: '🏆' },
                  { id: 'mistake', name: 'Mistake', emoji: '❌' },
                  { id: 'learning', name: 'Learning', emoji: '💡' }
                ].map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => setCurrentActivity(activity.id as any)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      currentActivity === activity.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {activity.emoji} {activity.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Niveau</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={studentLevel}
                  onChange={(e) => setStudentLevel(parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{studentLevel}</span>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">XP</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={studentXP}
                  onChange={(e) => setStudentXP(parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{studentXP}</span>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Série</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={currentStreak}
                  onChange={(e) => setCurrentStreak(parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{currentStreak} jours</span>
              </div>
            </div>
          </motion.div>

          {/* Wardrobe Section */}
          {showWardrobe && (
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <WardrobeSystem
                studentStats={studentStats}
                mascotType={mascotType}
                equippedItems={equippedItems}
                onItemEquip={handleItemEquip}
                onItemUnequip={handleItemUnequip}
                onNewItemUnlocked={handleNewItemUnlocked}
              />
            </motion.div>
          )}
        </div>

        {/* Features Showcase */}
        <motion.div
          className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">✨ Fonctionnalités Intégrées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🧠</span>
              <div>
                <h3 className="font-semibold text-gray-800">IA Intelligente</h3>
                <p className="text-gray-600 text-sm">Dialogue en français, personnalité dynamique, mémoire des interactions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎮</span>
              <div>
                <h3 className="font-semibold text-gray-800">3D Avancé</h3>
                <p className="text-gray-600 text-sm">Rendu Three.js avec géométrie spécifique par type de mascot</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">👗</span>
              <div>
                <h3 className="font-semibold text-gray-800">Garde-Robe</h3>
                <p className="text-gray-600 text-sm">Objets débloqués par XP, séries, exercices et succès</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h3 className="font-semibold text-gray-800">Émotions</h3>
                <p className="text-gray-600 text-sm">7 états émotionnels avec animations et couleurs dynamiques</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💕</span>
              <div>
                <h3 className="font-semibold text-gray-800">Relation</h3>
                <p className="text-gray-600 text-sm">Système de lien qui évolue avec les interactions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold text-gray-800">Énergie</h3>
                <p className="text-gray-600 text-sm">Système d'énergie affectant animations et réponses</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default IntegratedMascotDemo; 