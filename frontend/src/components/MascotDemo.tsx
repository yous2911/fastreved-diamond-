import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AdvancedMascotSystem from './AdvancedMascotSystem';

const MascotDemo: React.FC = () => {
  const [mascotType, setMascotType] = useState<'dragon' | 'fairy' | 'robot' | 'cat' | 'owl'>('dragon');
  const [currentActivity, setCurrentActivity] = useState<'idle' | 'exercise' | 'achievement' | 'mistake' | 'learning'>('idle');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [recentPerformance, setRecentPerformance] = useState<'struggling' | 'average' | 'excellent'>('average');
  const [studentLevel, setStudentLevel] = useState(3);
  const [studentXP, setStudentXP] = useState(75);
  const [currentStreak, setCurrentStreak] = useState(5);
  const [equippedItems, setEquippedItems] = useState<string[]>(['magic_wand', 'crown']);

  const mascotTypes = [
    { id: 'dragon', name: 'Dragon', emoji: '🐉', description: 'Wise and powerful companion' },
    { id: 'fairy', name: 'Fairy', emoji: '🧚', description: 'Magical and encouraging friend' },
    { id: 'robot', name: 'Robot', emoji: '🤖', description: 'Logical and precise helper' },
    { id: 'cat', name: 'Cat', emoji: '🐱', description: 'Playful and curious buddy' },
    { id: 'owl', name: 'Owl', emoji: '🦉', description: 'Wise and patient mentor' }
  ];

  const activities = [
    { id: 'idle', name: 'Idle', emoji: '😴', description: 'Just hanging out' },
    { id: 'exercise', name: 'Exercise', emoji: '📚', description: 'Working on problems' },
    { id: 'achievement', name: 'Achievement', emoji: '🏆', description: 'Just accomplished something' },
    { id: 'mistake', name: 'Mistake', emoji: '❌', description: 'Made an error' },
    { id: 'learning', name: 'Learning', emoji: '💡', description: 'Discovering new things' }
  ];

  const performances = [
    { id: 'struggling', name: 'Struggling', emoji: '😰', description: 'Having difficulties' },
    { id: 'average', name: 'Average', emoji: '😐', description: 'Doing okay' },
    { id: 'excellent', name: 'Excellent', emoji: '😄', description: 'Doing great!' }
  ];

  const timeOfDays = [
    { id: 'morning', name: 'Morning', emoji: '🌅', description: 'Early energy' },
    { id: 'afternoon', name: 'Afternoon', emoji: '☀️', description: 'Peak performance' },
    { id: 'evening', name: 'Evening', emoji: '🌆', description: 'Winding down' }
  ];

  const studentData = {
    level: studentLevel,
    xp: studentXP,
    currentStreak: currentStreak,
    timeOfDay: timeOfDay,
    recentPerformance: recentPerformance
  };

  const handleMascotInteraction = (interaction: string) => {
    console.log('Mascot interaction:', interaction);
  };

  const handleEmotionalStateChange = (state: any) => {
    console.log('AI state changed:', state);
  };

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
            🤖 Advanced AI Mascot System - Demo
          </h1>
          <p className="text-xl text-gray-600">
            Experience the most intelligent mascot with 3D rendering, personality traits, and adaptive responses
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🎛️ Mascot Controls</h2>
            
            {/* Mascot Type */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Mascot Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {mascotTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setMascotType(type.id as any)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${
                      mascotType === type.id
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={type.description}
                  >
                    {type.emoji} {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Activity */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Activity</h3>
              <div className="space-y-2">
                {activities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => setCurrentActivity(activity.id as any)}
                    className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                      currentActivity === activity.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={activity.description}
                  >
                    {activity.emoji} {activity.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Time of Day</h3>
              <div className="space-y-2">
                {timeOfDays.map((time) => (
                  <button
                    key={time.id}
                    onClick={() => setTimeOfDay(time.id as any)}
                    className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                      timeOfDay === time.id
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={time.description}
                  >
                    {time.emoji} {time.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Recent Performance</h3>
              <div className="space-y-2">
                {performances.map((performance) => (
                  <button
                    key={performance.id}
                    onClick={() => setRecentPerformance(performance.id as any)}
                    className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                      recentPerformance === performance.id
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={performance.description}
                  >
                    {performance.emoji} {performance.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Stats */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Student Stats</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Level</label>
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
                  <label className="block text-sm text-gray-600 mb-1">Streak</label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={currentStreak}
                    onChange={(e) => setCurrentStreak(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">{currentStreak} days</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mascot Display */}
          <motion.div
            className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex justify-center items-center h-96">
              <AdvancedMascotSystem
                mascotType={mascotType}
                studentData={studentData}
                currentActivity={currentActivity}
                equippedItems={equippedItems}
                onMascotInteraction={handleMascotInteraction}
                onEmotionalStateChange={handleEmotionalStateChange}
              />
            </div>
            
            {/* Current Settings Display */}
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-4 bg-white/60 rounded-full px-4 py-2">
                <span>{mascotTypes.find(t => t.id === mascotType)?.emoji}</span>
                <span className="text-sm font-medium">{mascotType}</span>
                <span>•</span>
                <span>{activities.find(a => a.id === currentActivity)?.emoji}</span>
                <span className="text-sm font-medium">{currentActivity}</span>
                <span>•</span>
                <span>{performances.find(p => p.id === recentPerformance)?.emoji}</span>
                <span className="text-sm font-medium">{recentPerformance}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features Showcase */}
        <motion.div
          className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">✨ Advanced AI Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🧠</span>
              <div>
                <h3 className="font-semibold text-gray-800">AI Personality</h3>
                <p className="text-gray-600 text-sm">Dynamic traits: extroversion, patience, playfulness, intelligence</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💭</span>
              <div>
                <h3 className="font-semibold text-gray-800">Intelligent Dialogue</h3>
                <p className="text-gray-600 text-sm">Context-aware responses based on performance and mood</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h3 className="font-semibold text-gray-800">7 Emotional States</h3>
                <p className="text-gray-600 text-sm">Happy, excited, focused, tired, curious, proud, encouraging</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎮</span>
              <div>
                <h3 className="font-semibold text-gray-800">3D Rendering</h3>
                <p className="text-gray-600 text-sm">Three.js powered 3D mascot with dynamic geometry</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">👁️</span>
              <div>
                <h3 className="font-semibold text-gray-800">Eye Tracking</h3>
                <p className="text-gray-600 text-sm">Intelligent eye movement and attention simulation</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💕</span>
              <div>
                <h3 className="font-semibold text-gray-800">Relationship Building</h3>
                <p className="text-gray-600 text-sm">Dynamic bond that grows with student interactions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold text-gray-800">Energy System</h3>
                <p className="text-gray-600 text-sm">Affects animations and responses based on time and activity</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="font-semibold text-gray-800">Dynamic Colors</h3>
                <p className="text-gray-600 text-sm">Visual changes based on relationship and energy levels</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🤔</span>
              <div>
                <h3 className="font-semibold text-gray-800">Thinking Time</h3>
                <p className="text-gray-600 text-sm">AI thinking simulation based on intelligence trait</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MascotDemo; 