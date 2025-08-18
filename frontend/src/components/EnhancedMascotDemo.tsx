import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MascotWardrobe3D from './MascotWardrobe3D';
import WardrobeSystem from './WardrobeSystem';
import { WardrobeItem } from './WardrobeData';

const EnhancedMascotDemo: React.FC = () => {
  const [mascotType, setMascotType] = useState<'dragon' | 'fairy' | 'robot' | 'cat' | 'owl'>('dragon');
  const [emotion, setEmotion] = useState<'idle' | 'happy' | 'thinking' | 'celebrating' | 'oops'>('idle');
  const [equippedItems, setEquippedItems] = useState<string[]>([]);
  const [xpLevel, setXpLevel] = useState(5);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [size, setSize] = useState<0 | 1 | 2 | 3 | 4 | 5>(3); // SuperMemo quality levels

  const studentStats = {
    xp: 750,
    streak: 12,
    exercisesCompleted: 45,
    achievementsUnlocked: 8
  };

  const handleMascotClick = () => {
    console.log('Mascot clicked!');
    // Cycle through emotions
    const emotions: Array<'idle' | 'happy' | 'thinking' | 'celebrating' | 'oops'> = ['idle', 'happy', 'thinking', 'celebrating', 'oops'];
    const currentIndex = emotions.indexOf(emotion);
    const nextIndex = (currentIndex + 1) % emotions.length;
    setEmotion(emotions[nextIndex]);
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
    { id: 'dragon', name: 'Dragon', emoji: '🐉', description: 'Fierce and powerful' },
    { id: 'fairy', name: 'Fairy', emoji: '🧚', description: 'Gentle and magical' },
    { id: 'robot', name: 'Robot', emoji: '🤖', description: 'Logical and precise' },
    { id: 'cat', name: 'Cat', emoji: '🐱', description: 'Playful and curious' },
    { id: 'owl', name: 'Owl', emoji: '🦉', description: 'Wise and knowledgeable' }
  ];

  const emotions = [
    { id: 'idle', name: 'Idle', emoji: '😴', description: 'Relaxed state' },
    { id: 'happy', name: 'Happy', emoji: '😊', description: 'Joyful mood' },
    { id: 'thinking', name: 'Thinking', emoji: '🤔', description: 'Deep in thought' },
    { id: 'celebrating', name: 'Celebrating', emoji: '🎉', description: 'Excited celebration' },
    { id: 'oops', name: 'Oops', emoji: '😅', description: 'Slight mistake' }
  ];

  const sizes = [
    { id: 0, name: 'BLACKOUT', size: '80px' },
    { id: 1, name: 'HARD', size: '90px' },
    { id: 2, name: 'DIFFICULT', size: '100px' },
    { id: 3, name: 'GOOD', size: '150px' },
    { id: 4, name: 'EASY', size: '170px' },
    { id: 5, name: 'PERFECT', size: '200px' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl font-bold text-gray-800 mb-4">
            🎮 Mascot 3D Avancé + Garde-Robe
          </h1>
          <p className="text-xl text-gray-600">
            Système complet avec rendu 3D avancé et personnalisation par récompenses
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Mascot Display Section */}
          <motion.div
            className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">🤖 Mascot 3D Avancé</h2>
              <button
                onClick={() => setShowWardrobe(!showWardrobe)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                {showWardrobe ? '👕 Masquer Garde-Robe' : '👗 Ouvrir Garde-Robe'}
              </button>
            </div>

            {/* Mascot Display */}
            <div className="flex justify-center items-center h-96 mb-6">
              <MascotWardrobe3D
                mascotType={mascotType}
                emotion={emotion}
                equippedItems={equippedItems}
                xpLevel={xpLevel}
                size={size}
                enableInteraction={true}
                onMascotClick={handleMascotClick}
              />
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mascot Type Selector */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Type de Mascot</h3>
                <div className="grid grid-cols-5 gap-2">
                  {mascotTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setMascotType(type.id as any)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        mascotType === type.id
                          ? 'bg-purple-500 text-white shadow-lg scale-110'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
                      }`}
                      title={type.description}
                    >
                      {type.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotion Controls */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Émotion Actuelle</h3>
                <div className="grid grid-cols-5 gap-2">
                  {emotions.map((emotionType) => (
                    <button
                      key={emotionType.id}
                      onClick={() => setEmotion(emotionType.id as any)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        emotion === emotionType.id
                          ? 'bg-blue-500 text-white shadow-lg scale-110'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
                      }`}
                      title={emotionType.description}
                    >
                      {emotionType.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Controls */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Taille</h3>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map((sizeOption) => (
                    <button
                      key={sizeOption.id}
                      onClick={() => setSize(sizeOption.id as any)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        size === sizeOption.id
                          ? 'bg-green-500 text-white shadow-lg scale-110'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
                      }`}
                    >
                      {sizeOption.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* XP Level Control */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Niveau XP</h3>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={xpLevel}
                  onChange={(e) => setXpLevel(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-bold text-purple-600 min-w-[3rem] text-center">
                  {xpLevel}
                </span>
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
          className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">✨ Fonctionnalités Avancées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Rendu 3D Avancé</h3>
              <p className="text-gray-600 text-sm">Three.js avec géométrie complexe, ombres et effets magiques</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
              <div className="text-4xl mb-4">👗</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Garde-Robe Interactive</h3>
              <p className="text-gray-600 text-sm">Objets 3D débloqués par progression avec animations</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <div className="text-4xl mb-4">🎭</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Émotions Dynamiques</h3>
              <p className="text-gray-600 text-sm">5 états émotionnels avec animations et réponses</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Performance Optimisée</h3>
              <p className="text-gray-600 text-sm">60fps fluide avec gestion mémoire avancée</p>
            </div>
          </div>
        </motion.div>

        {/* Technical Details */}
        <motion.div
          className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-center">🔧 Détails Techniques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Three.js Features</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Rendu WebGL avec antialiasing</li>
                <li>• Système d'ombres PCFSoftShadowMap</li>
                <li>• Matériaux Phong avec émission</li>
                <li>• Géométrie complexe (Torus, Cone, Sphere)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Animations</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• requestAnimationFrame optimisé</li>
                <li>• Interpolation fluide des mouvements</li>
                <li>• Effets de particules magiques</li>
                <li>• Suivi de souris interactif</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Gamification</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Déblocage par XP, séries, exercices</li>
                <li>• Raretés: Commun → Rare → Épique → Légendaire</li>
                <li>• Compatibilité mascot par objet</li>
                <li>• Effets visuels par rareté</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedMascotDemo; 