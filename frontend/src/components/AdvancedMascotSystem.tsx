import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// Advanced AI States for truly intelligent mascot behavior
interface MascotAIState {
  mood: 'happy' | 'excited' | 'focused' | 'tired' | 'curious' | 'proud' | 'encouraging';
  energy: number; // 0-100
  attention: number; // 0-100
  relationship: number; // 0-100 (bond with student)
  personality: {
    extroversion: number;
    patience: number;
    playfulness: number;
    intelligence: number;
  };
  memory: {
    lastInteraction: Date;
    favoriteActivities: string[];
    studentProgress: number;
    mistakePatterns: string[];
  };
}

interface AdvancedMascotProps {
  mascotType: 'dragon' | 'fairy' | 'robot' | 'cat' | 'owl';
  studentData: {
    level: number;
    xp: number;
    currentStreak: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    recentPerformance: 'struggling' | 'average' | 'excellent';
  };
  currentActivity: 'idle' | 'exercise' | 'achievement' | 'mistake' | 'learning';
  equippedItems: string[];
  onMascotInteraction: (interaction: string) => void;
  onEmotionalStateChange: (state: MascotAIState) => void;
}

// Advanced 3D Mascot with AI personality
const AdvancedMascotSystem: React.FC<AdvancedMascotProps> = ({
  mascotType,
  studentData,
  currentActivity,
  equippedItems,
  onMascotInteraction,
  onEmotionalStateChange
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mascotGroupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>();
  
  // Advanced AI State Management
  const [aiState, setAiState] = useState<MascotAIState>({
    mood: 'happy',
    energy: 80,
    attention: 90,
    relationship: 50,
    personality: {
      extroversion: 0.7,
      patience: 0.6,
      playfulness: 0.8,
      intelligence: 0.9
    },
    memory: {
      lastInteraction: new Date(),
      favoriteActivities: ['exercises', 'achievements'],
      studentProgress: studentData.level,
      mistakePatterns: []
    }
  });

  const [currentDialogue, setCurrentDialogue] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [eyeTracking, setEyeTracking] = useState({ x: 0, y: 0 });
  const [breathingPhase, setBreathingPhase] = useState(0);

  // Advanced AI Decision Making
  const calculateMoodShift = useCallback(() => {
    let newMood = aiState.mood;
    let energyChange = 0;
    let relationshipChange = 0;

    // Time of day affects energy
    switch (studentData.timeOfDay) {
      case 'morning':
        energyChange = 5;
        break;
      case 'evening':
        energyChange = -10;
        break;
    }

    // Performance affects relationship and mood
    switch (studentData.recentPerformance) {
      case 'excellent':
        newMood = 'proud';
        relationshipChange = 5;
        energyChange += 10;
        break;
      case 'struggling':
        newMood = aiState.personality.patience > 0.5 ? 'encouraging' : 'focused';
        relationshipChange = 2; // Still caring
        break;
      case 'average':
        newMood = 'curious';
        relationshipChange = 1;
        break;
    }

    // Activity affects mood
    switch (currentActivity) {
      case 'achievement':
        newMood = 'excited';
        energyChange += 15;
        relationshipChange += 3;
        break;
      case 'mistake':
        newMood = 'encouraging';
        relationshipChange += 1; // Still supportive
        break;
      case 'exercise':
        newMood = 'focused';
        energyChange -= 5;
        relationshipChange += 1;
        break;
    }

    // Update AI state
    setAiState(prev => ({
      ...prev,
      mood: newMood,
      energy: Math.max(0, Math.min(100, prev.energy + energyChange)),
      relationship: Math.max(0, Math.min(100, prev.relationship + relationshipChange)),
      memory: {
        ...prev.memory,
        lastInteraction: new Date(),
        studentProgress: studentData.level
      }
    }));
  }, [aiState, studentData, currentActivity]);

  // Intelligent Dialogue Generation
  const generateIntelligentDialogue = useCallback(() => {
    const { mood, energy, relationship } = aiState;
    const { currentStreak, recentPerformance } = studentData;

    let dialogues: string[] = [];

    // Mood-based responses
    switch (mood) {
      case 'proud':
        dialogues = [
          `Incredible! You've mastered ${studentData.level} levels!`,
          `I'm so proud of your ${currentStreak}-day streak!`,
          `You're becoming a real expert! ✨`
        ];
        break;
      case 'encouraging':
        dialogues = [
          "Everyone learns differently - you're doing great!",
          "Mistakes help your brain grow stronger! 💪",
          "Let's try a different approach together."
        ];
        break;
      case 'excited':
        dialogues = [
          "WOW! That was AMAZING! 🎉",
          "You just unlocked something incredible!",
          "I can't contain my excitement! You rock!"
        ];
        break;
      case 'curious':
        dialogues = [
          "I wonder what you'll discover next?",
          "What's your favorite thing we've learned?",
          "Ready for a new challenge? 🤔"
        ];
        break;
    }

    // Performance-based adjustments
    if (recentPerformance === 'struggling' && relationship > 70) {
      dialogues.push("Remember when you solved that hard problem? You can do this too!");
    }

    // Energy-based variations
    if (energy < 30) {
      dialogues = dialogues.map(d => d.replace('!', '.').toLowerCase());
    }

    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }, [aiState, studentData]);

  // Advanced 3D Rendering with Personality
  const create3DMascot = useCallback(() => {
    const group = new THREE.Group();
    
    // Base mascot geometry with personality traits
    const headSize = 0.7 + (aiState.personality.extroversion * 0.2);
    const eyeSize = 0.15 + (aiState.personality.intelligence * 0.05);
    
    // Dynamic body based on energy level
    const bodyScale = 1 + (aiState.energy / 500);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(headSize, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color().setHSL(
        (aiState.relationship / 100) * 0.3, // Hue changes with relationship
        0.8,
        0.6 + (aiState.energy / 200)
      ),
      shininess: 100,
      transparent: true,
      opacity: 0.9 + (aiState.attention / 1000)
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.5, 0);
    head.castShadow = true;
    group.add(head);

    // Intelligent Eyes with Tracking
    const eyeGeometry = new THREE.SphereGeometry(eyeSize, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      emissive: new THREE.Color(0x4444FF),
      emissiveIntensity: aiState.attention / 200
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2 + eyeTracking.x * 0.1, 1.6 + eyeTracking.y * 0.1, 0.5);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2 + eyeTracking.x * 0.1, 1.6 + eyeTracking.y * 0.1, 0.5);
    
    group.add(leftEye, rightEye);

    // Body with breathing animation
    const bodyGeometry = new THREE.SphereGeometry(1, 24, 24);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: headMaterial.color,
      shininess: 80
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(bodyScale, bodyScale * (1 + Math.sin(breathingPhase) * 0.05), bodyScale);
    body.position.set(0, 0, 0);
    body.castShadow = true;
    group.add(body);

    // Mood-based special effects
    if (aiState.mood === 'excited') {
      // Particle aura for excitement
      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 100;
      const positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 5;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0xFFD700,
        size: 0.1,
        transparent: true,
        opacity: 0.8
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      group.add(particles);
    }

    return group;
  }, [aiState, eyeTracking, breathingPhase]);

  // Advanced Animation Controller
  const updateMascotAnimation = useCallback((time: number) => {
    if (!mascotGroupRef.current) return;

    const mascot = mascotGroupRef.current;
    
    // Breathing animation
    setBreathingPhase(time * 0.002);
    
    // Mood-based animations
    switch (aiState.mood) {
      case 'excited':
        mascot.position.y = Math.sin(time * 0.01) * 0.3 + 0.2;
        mascot.rotation.z = Math.sin(time * 0.008) * 0.1;
        break;
        
      case 'encouraging':
        mascot.position.y = Math.sin(time * 0.003) * 0.1;
        mascot.rotation.x = Math.sin(time * 0.004) * 0.05;
        break;
        
      case 'focused':
        // Minimal movement when focused
        mascot.position.y = Math.sin(time * 0.001) * 0.02;
        break;
        
      case 'tired':
        mascot.position.y = Math.sin(time * 0.002) * 0.05 - 0.1;
        mascot.rotation.z = Math.sin(time * 0.001) * 0.02;
        break;
        
      default: // happy, curious, proud
        mascot.position.y = Math.sin(time * 0.004) * 0.15;
        mascot.rotation.y = Math.sin(time * 0.002) * 0.05;
    }

    // Energy affects animation speed
    const energyMultiplier = aiState.energy / 100;
    mascot.children.forEach((child: THREE.Object3D) => {
      if (child.userData.isAnimated) {
        child.rotation.y = time * 0.001 * energyMultiplier;
      }
    });

    // Eye tracking simulation (looking around intelligently)
    if (Math.random() < 0.01) { // Occasional eye movement
      setEyeTracking({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      });
    }
  }, [aiState]);

  // Smart Interaction Handler
  const handleIntelligentInteraction = useCallback((interactionType: string) => {
    setIsThinking(true);
    
    // Simulate AI thinking time based on personality
    const thinkingTime = (1 - aiState.personality.intelligence) * 1000 + 500;
    
    setTimeout(() => {
      const dialogue = generateIntelligentDialogue();
      setCurrentDialogue(dialogue);
      setIsThinking(false);
      
      // Update relationship based on interaction
      setAiState(prev => ({
        ...prev,
        relationship: Math.min(100, prev.relationship + 1),
        energy: Math.max(0, prev.energy - 2)
      }));
      
      onMascotInteraction(interactionType);
      onEmotionalStateChange(aiState);
    }, thinkingTime);
  }, [aiState, generateIntelligentDialogue, onMascotInteraction, onEmotionalStateChange]);

  // Initialize 3D Scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.background = null;
    sceneRef.current = scene;

    // Camera with dynamic positioning
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 4);
    cameraRef.current = camera;

    // Advanced renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(200, 200);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Advanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Mood lighting
    const moodLight = new THREE.PointLight(0x8A2BE2, 0.5, 10);
    moodLight.position.set(0, 2, 2);
    scene.add(moodLight);

    // Create mascot
    const mascot = create3DMascot();
    scene.add(mascot);
    mascotGroupRef.current = mascot;

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = (time: number) => {
      updateMascotAnimation(time);
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate(0);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [create3DMascot, updateMascotAnimation]);

  // AI State Updates
  useEffect(() => {
    calculateMoodShift();
    const interval = setInterval(calculateMoodShift, 5000);
    return () => clearInterval(interval);
  }, [calculateMoodShift]);

  return (
    <div className="relative">
      {/* 3D Mascot Container */}
      <div 
        ref={mountRef}
        className="w-50 h-50 rounded-full cursor-pointer hover:scale-105 transition-transform duration-300"
        onClick={() => handleIntelligentInteraction('click')}
      />
      
      {/* AI Status Display */}
      <div className="absolute -top-2 -right-2 space-y-1">
        {/* Mood Indicator */}
        <div className={`w-4 h-4 rounded-full ${
          aiState.mood === 'excited' ? 'bg-yellow-400 animate-pulse' :
          aiState.mood === 'happy' ? 'bg-green-400' :
          aiState.mood === 'encouraging' ? 'bg-blue-400' :
          aiState.mood === 'focused' ? 'bg-purple-400' :
          aiState.mood === 'tired' ? 'bg-gray-400' :
          'bg-pink-400'
        }`} />
        
        {/* Energy Level */}
        <div className="w-4 h-8 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-t from-red-400 to-green-400 rounded-full transition-all duration-1000"
            style={{ height: `${aiState.energy}%` }}
          />
        </div>
      </div>

      {/* Intelligent Dialogue */}
      <AnimatePresence>
        {currentDialogue && (
          <motion.div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 max-w-xs"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
          >
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-4 rounded-2xl shadow-xl">
              <p className="text-sm font-medium">{currentDialogue}</p>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-purple-600" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking Indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Relationship Hearts */}
      {aiState.relationship > 80 && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <motion.div
            animate={{ y: [-5, -15, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-red-400 text-lg"
          >
            💕
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdvancedMascotSystem; 