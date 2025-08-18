import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AdvancedParticleEngine from './AdvancedParticleEngine';

const ParticleDemo: React.FC = () => {
  const [isActive, setIsActive] = useState(true);
  const [particleType, setParticleType] = useState<'fire' | 'water' | 'magic' | 'crystal' | 'lightning' | 'smoke' | 'sparkle' | 'heart' | 'star'>('magic');
  const [behavior, setBehavior] = useState<'normal' | 'spiral' | 'orbit' | 'explosion' | 'attract' | 'repel'>('normal');
  const [intensity, setIntensity] = useState<0 | 1 | 2 | 3 | 4 | 5>(3); // SuperMemo quality levels
  const [enablePhysics, setEnablePhysics] = useState(true);
  const [enableTrails, setEnableTrails] = useState(true);
  const [enableCollisions, setEnableCollisions] = useState(false);
  const [windForce, setWindForce] = useState({ x: 0, y: 0 });
  const [emitterPosition, setEmitterPosition] = useState({ x: 400, y: 300 });
  const [attractorPosition, setAttractorPosition] = useState({ x: 400, y: 300 });

  const particleTypes = [
    { id: 'fire', name: 'Fire', emoji: '🔥', description: 'Flame-like particles with upward movement' },
    { id: 'water', name: 'Water', emoji: '💧', description: 'Liquid particles with gravity' },
    { id: 'magic', name: 'Magic', emoji: '✨', description: 'Spiral particles with glow effects' },
    { id: 'crystal', name: 'Crystal', emoji: '💎', description: 'Diamond shapes with reflections' },
    { id: 'lightning', name: 'Lightning', emoji: '⚡', description: 'Bolt shapes with explosion behavior' },
    { id: 'sparkle', name: 'Sparkle', emoji: '⭐', description: 'Golden particles with upward drift' },
    { id: 'heart', name: 'Heart', emoji: '❤️', description: 'Heart shapes with orbital behavior' },
    { id: 'star', name: 'Star', emoji: '⭐', description: 'Star shapes with rotation' }
  ];

  const behaviorOptions = [
    { id: 'normal', name: 'Normal', description: 'Standard physics behavior' },
    { id: 'spiral', name: 'Spiral', description: 'Circular motion with increasing radius' },
    { id: 'orbit', name: 'Orbit', description: 'Attraction to central point' },
    { id: 'explosion', name: 'Explosion', description: 'Radial outward movement' },
    { id: 'attract', name: 'Attract', description: 'Particles drawn to mouse' },
    { id: 'repel', name: 'Repel', description: 'Particles pushed from mouse' }
  ];

  const intensityOptions = [
    { id: 0, name: 'BLACKOUT', description: '20 particles, minimal' },
    { id: 1, name: 'HARD', description: '50 particles, low' },
    { id: 2, name: 'DIFFICULT', description: '100 particles, moderate' },
    { id: 3, name: 'GOOD', description: '150 particles, balanced' },
    { id: 4, name: 'EASY', description: '300 particles, high' },
    { id: 5, name: 'PERFECT', description: '500 particles, maximum' }
  ];

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEmitterPosition({ x, y });
    setAttractorPosition({ x, y });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            🌟 Advanced Particle Engine - Demo
          </h1>
          <p className="text-xl text-gray-300">
            Experience the most advanced particle system with 3D physics, multiple behaviors, and stunning visual effects
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">🎛️ Controls</h2>
            
            {/* Toggle */}
            <div className="mb-6">
              <label className="flex items-center space-x-3 text-white">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <span className="text-lg">Active Engine</span>
              </label>
            </div>

            {/* Particle Type */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Particle Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {particleTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setParticleType(type.id as any)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${
                      particleType === type.id
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={type.description}
                  >
                    {type.emoji} {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Behavior */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Behavior</h3>
              <div className="space-y-2">
                {behaviorOptions.map((behaviorOption) => (
                  <button
                    key={behaviorOption.id}
                    onClick={() => setBehavior(behaviorOption.id as any)}
                    className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                      behaviorOption.id === behavior
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={behaviorOption.description}
                  >
                    {behaviorOption.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Intensity</h3>
              <div className="space-y-2">
                {intensityOptions.map((intensityOption) => (
                  <button
                    key={intensityOption.id}
                    onClick={() => setIntensity(intensityOption.id as any)}
                    className={`w-full p-2 rounded-lg text-sm font-medium transition-all ${
                      intensityOption.id === intensity
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={intensityOption.description}
                  >
                    {intensityOption.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Physics Options */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Physics Options</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 text-white">
                  <input
                    type="checkbox"
                    checked={enablePhysics}
                    onChange={(e) => setEnablePhysics(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span>Enable Physics</span>
                </label>
                <label className="flex items-center space-x-3 text-white">
                  <input
                    type="checkbox"
                    checked={enableTrails}
                    onChange={(e) => setEnableTrails(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span>Enable Trails</span>
                </label>
                <label className="flex items-center space-x-3 text-white">
                  <input
                    type="checkbox"
                    checked={enableCollisions}
                    onChange={(e) => setEnableCollisions(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <span>Enable Collisions</span>
                </label>
              </div>
            </div>

            {/* Wind Force */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Wind Force</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">X Force</label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={windForce.x}
                    onChange={(e) => setWindForce(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{windForce.x}</span>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Y Force</label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={windForce.y}
                    onChange={(e) => setWindForce(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{windForce.y}</span>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setWindForce({ x: 0, y: 0 });
                setEmitterPosition({ x: 400, y: 300 });
                setAttractorPosition({ x: 400, y: 300 });
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              🔄 Reset Settings
            </button>
          </motion.div>

          {/* Particle Engine Display */}
          <motion.div
            className="lg:col-span-2 bg-black/50 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="relative">
              <div
                className="relative cursor-crosshair"
                onClick={handleCanvasClick}
                style={{ width: '800px', height: '600px' }}
              >
                <AdvancedParticleEngine
                  width={800}
                  height={600}
                  particleCount={1000}
                  particleType={particleType}
                  behavior={behavior}
                  intensity={intensity}
                  isActive={isActive}
                  emitterPosition={emitterPosition}
                  attractorPosition={attractorPosition}
                  enablePhysics={enablePhysics}
                  enableTrails={enableTrails}
                  enableCollisions={enableCollisions}
                  windForce={windForce}
                  className="rounded-lg"
                />
                
                {/* Click Instructions */}
                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                  Click anywhere to move emitter
                </div>
                
                {/* Current Settings Display */}
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                  {particleTypes.find(t => t.id === particleType)?.emoji} {particleType} | {behavior} | {intensity}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features Showcase */}
        <motion.div
          className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">✨ Advanced Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🌊</span>
              <div>
                <h3 className="font-semibold text-white">3D Physics</h3>
                <p className="text-gray-300 text-sm">Realistic depth, gravity, friction, and elasticity</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="font-semibold text-white">8 Particle Types</h3>
                <p className="text-gray-300 text-sm">Fire, water, magic, crystal, lightning, sparkle, heart, star</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🌀</span>
              <div>
                <h3 className="font-semibold text-white">6 Behaviors</h3>
                <p className="text-gray-300 text-sm">Normal, spiral, orbit, explosion, attract, repel</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💫</span>
              <div>
                <h3 className="font-semibold text-white">Trail System</h3>
                <p className="text-gray-300 text-sm">Fading particle trails with customizable length</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💨</span>
              <div>
                <h3 className="font-semibold text-white">Wind Forces</h3>
                <p className="text-gray-300 text-sm">Dynamic wind affecting particle movement</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold text-white">5 Intensities</h3>
                <p className="text-gray-300 text-sm">From gentle (50 particles) to nuclear (1000 particles)</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-semibold text-white">Mouse Interaction</h3>
                <p className="text-gray-300 text-sm">Attract/repel particles with mouse movement</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💎</span>
              <div>
                <h3 className="font-semibold text-white">Shape Rendering</h3>
                <p className="text-gray-300 text-sm">Custom shapes: hearts, stars, crystals, lightning</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🌟</span>
              <div>
                <h3 className="font-semibold text-white">Glow Effects</h3>
                <p className="text-gray-300 text-sm">Radial gradients and lighting for magical particles</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ParticleDemo; 