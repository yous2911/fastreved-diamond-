import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Home, Volume2, VolumeX, LogOut } from 'lucide-react';
import NextLevelXPSystem from './components/NextLevelXPSystem';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  useCompetences, 
  useExercisesByLevel, 
  useMascot, 
  useWardrobe,
  useSessionManagement, 
  useExerciseSubmission,
  useStudentStats,
  useStudentAchievements,
  useXpTracking 
} from './hooks/useApiData';

// =============================================================================
// 🔊 SYSTÈME AUDIO PREMIUM DIAMANT (UNCHANGED)
// =============================================================================
const useMagicalSounds = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (soundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported');
      }
    }
  }, [soundEnabled]);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }, [soundEnabled]);

  const playMagicalChord = useCallback(() => {
    setTimeout(() => playTone(523.25, 0.3), 0);    // C5
    setTimeout(() => playTone(659.25, 0.3), 100);  // E5
    setTimeout(() => playTone(783.99, 0.3), 200);  // G5
    setTimeout(() => playTone(1046.50, 0.5), 300); // C6
  }, [playTone]);

  const playSparkleSound = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        playTone(800 + Math.random() * 600, 0.1, 'sine');
      }, i * 80);
    }
  }, [playTone]);

  const playLevelUpFanfare = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((note, index) => {
      setTimeout(() => playTone(note, 0.4), index * 150);
    });
  }, [playTone]);

  const playButtonClick = useCallback(() => {
    playTone(800, 0.1, 'square');
  }, [playTone]);

  const playErrorSound = useCallback(() => {
    playTone(200, 0.3, 'square');
    setTimeout(() => playTone(150, 0.3, 'square'), 200);
  }, [playTone]);

  return {
    playMagicalChord,
    playSparkleSound,
    playLevelUpFanfare,
    playButtonClick,
    playErrorSound,
    soundEnabled,
    setSoundEnabled
  };
};

// =============================================================================
// ✨ MOTEUR DE PARTICULES DIAMANT 3D (UNCHANGED)
// =============================================================================
interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'sparkle' | 'crystal' | 'star' | 'heart';
}

const ParticleEngine: React.FC<{
  isActive: boolean;
  intensity: 0 | 1 | 2 | 3 | 4 | 5; // SuperMemo quality levels
  type: 'success' | 'levelup' | 'magic';
  position?: { x: number; y: number };
}> = ({ isActive, intensity, type, position = { x: 50, y: 50 } }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  const colors = useMemo(() => ({
    success: ['#10b981', '#34d399', '#6ee7b7', '#d1fae5'],
    levelup: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe'],
    magic: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe']
  }), []);

  const createParticle = useCallback((x: number, y: number): Particle => {
    const particleColors = colors[type];
    return {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 3,
      size: Math.random() * 6 + 3,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      life: 0,
      maxLife: Math.random() * 80 + 40,
      type: (['sparkle', 'crystal', 'star', 'heart'] as const)[Math.floor(Math.random() * 4)]
    };
  }, [type, colors]);

  const updateParticles = useCallback(() => {
    particlesRef.current = particlesRef.current.filter(particle => {
      particle.life++;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.15; // Gravité magique
      particle.vx *= 0.98; // Friction
      return particle.life < particle.maxLife;
    });
  }, []);

  const drawParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach(particle => {
      const alpha = Math.max(0, 1 - (particle.life / particle.maxLife));
      ctx.save();
      
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.life * 0.1);
      
      // Dessiner selon le type avec effets 3D
      switch (particle.type) {
        case 'sparkle':
          // Étoile brillante
          ctx.shadowBlur = 10;
          ctx.shadowColor = particle.color;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = i % 2 === 0 ? particle.size : particle.size * 0.4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'crystal':
          // Cristal 3D
          ctx.shadowBlur = 8;
          ctx.shadowColor = particle.color;
          ctx.beginPath();
          ctx.moveTo(0, -particle.size);
          ctx.lineTo(particle.size * 0.7, 0);
          ctx.lineTo(0, particle.size);
          ctx.lineTo(-particle.size * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          // Reflet
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.moveTo(0, -particle.size * 0.6);
          ctx.lineTo(particle.size * 0.3, -particle.size * 0.2);
          ctx.lineTo(0, particle.size * 0.2);
          ctx.lineTo(-particle.size * 0.3, -particle.size * 0.2);
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'star':
          // Étoile 5 branches
          ctx.shadowBlur = 6;
          ctx.shadowColor = particle.color;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? particle.size : particle.size * 0.5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'heart':
          // Cœur 3D
          ctx.shadowBlur = 8;
          ctx.shadowColor = particle.color;
          const size = particle.size;
          ctx.beginPath();
          ctx.moveTo(0, size * 0.3);
          ctx.bezierCurveTo(-size, -size * 0.5, -size, size * 0.3, 0, size);
          ctx.bezierCurveTo(size, size * 0.3, size, -size * 0.5, 0, size * 0.3);
          ctx.fill();
          break;
      }
      
      ctx.restore();
    });
  }, []);

  const animate = useCallback(() => {
    updateParticles();
    drawParticles();
    animationRef.current = requestAnimationFrame(animate);
  }, [updateParticles, drawParticles]);

  useEffect(() => {
    if (isActive) {
      const intensityConfig = {
        low: { count: 15, interval: 80 },
        0: { count: 10, interval: 100 }, // BLACKOUT
    1: { count: 15, interval: 80 },  // HARD
    2: { count: 20, interval: 70 },  // DIFFICULT
    3: { count: 30, interval: 50 },  // GOOD
    4: { count: 40, interval: 40 },  // EASY
    5: { count: 50, interval: 30 },  // PERFECT
        high: { count: 60, interval: 30 },
        epic: { count: 120, interval: 15 }
      };

      const config = intensityConfig[intensity];
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Créer les particules
      for (let i = 0; i < config.count; i++) {
        setTimeout(() => {
          const x = (position.x / 100) * canvas.width + (Math.random() - 0.5) * 200;
          const y = (position.y / 100) * canvas.height + (Math.random() - 0.5) * 200;
          particlesRef.current.push(createParticle(x, y));
        }, i * config.interval);
      }

      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, intensity, position, createParticle, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      style={{ background: 'transparent' }}
    />
  );
};

// =============================================================================
// 🐸 MASCOTTE PREMIUM DIAMANT AVEC API INTÉGRÉE
// =============================================================================
const MascottePremium: React.FC<{
  emotion: 'idle' | 'happy' | 'excited' | 'thinking' | 'celebrating' | 'sleepy';
  message?: string;
  onInteraction?: () => void;
}> = ({ emotion, message, onInteraction }) => {
  const [currentEmotion, setCurrentEmotion] = useState(emotion);
  const [showMessage, setShowMessage] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [dialogueText, setDialogueText] = useState<string>('');

  // Utilisation du hook mascot API
  const { data: mascotApiData, getDialogue } = useMascot();

  const emotionEmojis = {
    idle: mascotApiData?.mascot?.type === 'dragon' ? '🐲' : 
          mascotApiData?.mascot?.type === 'fairy' ? '🧚‍♀️' : 
          mascotApiData?.mascot?.type === 'robot' ? '🤖' : 
          mascotApiData?.mascot?.type === 'cat' ? '🐱' : 
          mascotApiData?.mascot?.type === 'owl' ? '🦉' : '🐸',
    happy: '😊',
    excited: '🤩',
    thinking: '🤔',
    celebrating: '🎉',
    sleepy: '😴'
  };

  const emotionMessages = {
    idle: ['Prêt pour l\'aventure ?', 'Que veux-tu apprendre ?'],
    happy: ['Super travail !', 'Tu es fantastique !'],
    excited: ['INCROYABLE !', 'Tu es un génie !'],
    thinking: ['Réfléchissons ensemble...', 'Prenons notre temps'],
    celebrating: ['BRAVO ! 🎉', 'Tu as réussi !'],
    sleepy: ['Zzz... Prêt à continuer ?', '*bâille*']
  };

  useEffect(() => {
    setCurrentEmotion(emotion);
    if (message) {
      setShowMessage(true);
      setDialogueText(message);
      setTimeout(() => setShowMessage(false), 3000);
    }
  }, [emotion, message]);

  const handleClick = async () => {
    setIsInteracting(true);
    setCurrentEmotion('excited');
    
    // Obtenir un dialogue contextuel de l'API
    try {
      const dialogueData = await getDialogue('greeting');
      if (dialogueData) {
        setDialogueText(dialogueData.dialogue);
      } else {
        setDialogueText(emotionMessages.excited[Math.floor(Math.random() * emotionMessages.excited.length)]);
      }
    } catch (error) {
      setDialogueText(emotionMessages.excited[Math.floor(Math.random() * emotionMessages.excited.length)]);
    }
    
    setShowMessage(true);
    
    setTimeout(() => {
      setCurrentEmotion('happy');
      setIsInteracting(false);
      setShowMessage(false);
    }, 2000);

    onInteraction?.();
  };

  const getEmotionAnimation = () => {
    switch (currentEmotion) {
      case 'happy':
        return 'animate-bounce';
      case 'excited':
        return 'animate-pulse';
      case 'thinking':
        return 'animate-pulse';
      case 'celebrating':
        return 'animate-spin';
      default:
        return '';
    }
  };

  return (
    <div className="mascot-container fixed bottom-4 right-4 z-40">
      {/* Aura magique */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/20 via-blue-400/20 to-green-400/20 blur-xl animate-pulse" />
      
      {/* Particules autour de la mascotte */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              top: `${20 + Math.sin(i * 60) * 30}%`,
              left: `${20 + Math.cos(i * 60) * 30}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 360]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Mascotte principale */}
      <motion.div
        className={`
          text-6xl cursor-pointer relative z-10 filter drop-shadow-lg
          ${getEmotionAnimation()}
          ${isInteracting ? 'scale-125' : 'hover:scale-110'}
          transition-all duration-300
        `}
        onClick={handleClick}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20 
        }}
      >
        {emotionEmojis[currentEmotion]}
      </motion.div>

      {/* Bulle de dialogue */}
      <AnimatePresence>
        {showMessage && (
          <motion.div
            className="absolute bottom-full right-0 mb-4 bg-white/95 backdrop-blur-sm border-2 border-purple-200 rounded-2xl px-4 py-2 shadow-xl max-w-xs"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="absolute bottom-0 right-4 transform translate-y-full">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white/95" />
            </div>
            
            <p className="text-sm font-medium text-gray-800 text-center">
              {dialogueText || emotionMessages[currentEmotion][Math.floor(Math.random() * emotionMessages[currentEmotion].length)]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Effet de clic */}
      <AnimatePresence>
        {isInteracting && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-yellow-400"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// 🎯 INTERFACE PRINCIPALE AVEC API INTÉGRÉE
// =============================================================================
const DiamondCPCE2Interface = () => {
  const { student, logout } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [mascotEmotion, setMascotEmotion] = useState<'idle' | 'happy' | 'excited' | 'thinking' | 'celebrating' | 'sleepy'>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showParticles, setShowParticles] = useState(false);
  const [particleType, setParticleType] = useState<'success' | 'levelup' | 'magic'>('magic');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Hooks API
  const { data: competencesData } = useCompetences();
  const { data: exercisesData } = useExercisesByLevel(student?.niveau || 'CP');
  const { data: statsData } = useStudentStats();
  const { data: achievementsData } = useStudentAchievements();
  const { data: mascotData, updateEmotion: updateMascotEmotion } = useMascot();
  const { data: wardrobeData, unlockItem, equipItem } = useWardrobe();
  const { startSession, endSession, data: activeSessionData } = useSessionManagement();
  const { submitExercise, recordProgress } = useExerciseSubmission();
  const { currentXp, currentLevel, addXp } = useXpTracking();

  const { 
    playMagicalChord, 
    playSparkleSound, 
    playButtonClick, 
    playErrorSound,
    soundEnabled, 
    setSoundEnabled 
  } = useMagicalSounds();

  // Données d'étudiant avec API
  const studentData = useMemo(() => ({
    prenom: student?.prenom || 'Élève',
    niveau: student?.niveau || 'CP',
    stars: statsData?.stats?.totalCorrectAnswers || 0,
    hearts: student?.heartsRemaining || 3,
    streak: student?.currentStreak || 0,
    currentXP: currentXp,
    maxXP: 100 + (currentLevel * 20),
    level: currentLevel
  }), [student, statsData, currentXp, currentLevel]);

  // Matières basées sur les vraies compétences
  const subjects = useMemo(() => {
    const competences = competencesData || [];
    const mathCompetences = competences.filter(c => c.matiere === 'MA');
    const frenchCompetences = competences.filter(c => c.matiere === 'FR');

    return [
      {
        id: 'mathematiques',
        name: 'Mathématiques',
        emoji: '🔢',
        gradient: 'from-blue-400 via-blue-500 to-blue-600',
        shadowColor: 'shadow-blue-500/50',
        description: 'Compter, additionner, géométrie',
        competences: mathCompetences,
        exercises: exercisesData?.filter(ex => 
          mathCompetences.some(comp => comp.id === ex.competenceId)
        ) || []
      },
      {
        id: 'francais',
        name: 'Français',
        emoji: '📚',
        gradient: 'from-green-400 via-green-500 to-green-600',
        shadowColor: 'shadow-green-500/50',
        description: 'Lettres, mots, lecture',
        competences: frenchCompetences,
        exercises: exercisesData?.filter(ex => 
          frenchCompetences.some(comp => comp.id === ex.competenceId)
        ) || []
      }
    ];
  }, [competencesData, exercisesData]);

  // Gestion des interactions
  const handleSubjectClick = async (subject: any) => {
    playButtonClick();
    setSelectedSubject(subject.id);
    setMascotEmotion('thinking');
    setMascotMessage('C\'est parti pour une nouvelle aventure !');
    
    // Mettre à jour l'émotion de la mascotte via l'API
    try {
      await updateMascotEmotion('good', 'exercise_complete');
    } catch (error) {
      console.warn('Failed to update mascot emotion:', error);
    }

    // Démarrer une session si pas déjà active
    if (!activeSessionData?.hasActiveSession) {
      try {
        const session = await startSession(subject.competences?.map((c: any) => c.code) || []);
        console.log('Session started:', session);
      } catch (error) {
        console.warn('Failed to start session:', error);
      }
    }
    
    if (subject.exercises.length > 0) {
      const randomExercise = subject.exercises[Math.floor(Math.random() * subject.exercises.length)];
      setCurrentView('exercise');
      setCurrentExercise(randomExercise);
    } else {
      setMascotEmotion('sleepy');
      setMascotMessage('Cette matière arrive bientôt ! 🚧');
      setShowParticles(true);
      setParticleType('magic');
      setTimeout(() => setShowParticles(false), 2000);
    }
  };

  const handleAnswerSubmit = async (answer: any, isCorrect: boolean) => {
    const startTime = Date.now();
    
    try {
      if (isCorrect) {
        setMascotEmotion('celebrating');
        setMascotMessage('BRAVO ! Tu as réussi ! 🎉');
        setShowParticles(true);
        setParticleType('success');
        playSparkleSound();
        
        // Soumettre à l'API
        const exerciseResult = {
          score: isCorrect ? 100 : 0,
          timeSpent: Math.floor((Date.now() - startTime) / 1000),
          completed: true,
          answerGiven: answer?.toString()
        };

        const submission = await submitExercise(currentExercise.id, exerciseResult);
        
        if (submission.success) {
          await addXp(submission.xpEarned || 15);
          console.log('Exercise submitted successfully:', submission);
          
          // Vérifier les déblocages de garde-robe basés sur les accomplissements
          await checkWardrobeUnlocks(submission);
        }

        // Mettre à jour l'émotion de la mascotte
        await updateMascotEmotion('excellent', 'exercise_complete');
        
        setTimeout(() => {
          setShowParticles(false);
          setCurrentView('home');
          setMascotEmotion('happy');
        }, 2000);
      } else {
        setMascotEmotion('thinking');
        setMascotMessage('Essaie encore, tu vas y arriver ! 💪');
        playErrorSound();
        
        // Mettre à jour l'émotion de la mascotte pour erreur
        await updateMascotEmotion('poor', 'mistake_made');
      }
    } catch (error) {
      console.error('Error handling answer submission:', error);
    }
  };

  // Système de déblocage de garde-robe basé sur les accomplissements
  const checkWardrobeUnlocks = async (submission: any) => {
    try {
      if (!wardrobeData || !achievementsData) return;
      
      const wardrobe = Array.isArray(wardrobeData) ? wardrobeData : wardrobeData.items || [];
      const achievements = Array.isArray(achievementsData) ? achievementsData : achievementsData.achievements || [];
      
      // Logique de déblocage basée sur différents critères
      const unlockedItems = [];
      
      // Débloquer en fonction du niveau XP
      if (currentLevel >= 3) {
        const crownItem = wardrobe.find(item => 
          item.name?.toLowerCase().includes('couronne') && !item.isUnlocked
        );
        if (crownItem) {
          await unlockItem(crownItem.id);
          unlockedItems.push(crownItem);
        }
      }
      
      // Débloquer en fonction du nombre d'exercices réussis
      const completedExercises = statsData?.stats?.totalCorrectAnswers || 0;
      if (completedExercises >= 10) {
        const capeItem = wardrobe.find(item => 
          item.name?.toLowerCase().includes('cape') && !item.isUnlocked
        );
        if (capeItem) {
          await unlockItem(capeItem.id);
          unlockedItems.push(capeItem);
        }
      }
      
      // Débloquer en fonction des achievements spécifiques
      achievements.forEach(async (achievement: any) => {
        if (achievement.completed && achievement.wardrobeReward) {
          const rewardItem = wardrobe.find(item => 
            item.id === achievement.wardrobeReward && !item.isUnlocked
          );
          if (rewardItem) {
            await unlockItem(rewardItem.id);
            unlockedItems.push(rewardItem);
          }
        }
      });
      
      // Afficher les notifications de déblocage
      if (unlockedItems.length > 0) {
        unlockedItems.forEach(item => {
          setMascotMessage(`🎉 Nouvel objet débloqué : ${item.name}!`);
          playMagicalChord();
          setShowParticles(true);
          setParticleType('success');
          
          setTimeout(() => {
            setShowParticles(false);
          }, 2000);
        });
      }
      
    } catch (error) {
      console.warn('Failed to check wardrobe unlocks:', error);
    }
  };

  const handleLevelUp = (newLevel: number) => {
    console.log('Level up to:', newLevel);
    setMascotEmotion('excited');
    setMascotMessage('NIVEAU SUPÉRIEUR ! 🎉');
    
    // Mettre à jour l'émotion de la mascotte pour level up
    updateMascotEmotion('excellent', 'level_up').catch(console.warn);
    
    // Vérifier les déblocages de garde-robe pour le nouveau niveau
    checkWardrobeUnlocks({ levelUp: true, newLevel }).catch(console.warn);
  };

  const handleMascotInteraction = () => {
    playMagicalChord();
    setShowParticles(true);
    setParticleType('magic');
    setTimeout(() => setShowParticles(false), 1000);
  };

  const handleLogout = async () => {
    try {
      // Terminer la session active si elle existe
      if (activeSessionData?.hasActiveSession && activeSessionData.session) {
        await endSession(activeSessionData.session.id);
      }
      
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
      // Logout anyway
      await logout();
    }
  };

  // Rendu de l'écran d'accueil avec données API
  const renderHome = () => (
    <div className="min-h-screen p-6">
      {/* Header avec stats */}
      <motion.div 
        className="flex justify-between items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-4">
          <motion.div 
            className="text-4xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🌟
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bonjour {studentData.prenom} !</h1>
            <p className="text-gray-600">Niveau {studentData.niveau}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white/80 rounded-full px-4 py-2">
            <Star className="w-6 h-6 text-yellow-500 mr-2" />
            <span className="font-bold text-gray-800">{studentData.stars}</span>
          </div>
          <div className="flex items-center bg-white/80 rounded-full px-4 py-2">
            <Heart className="w-6 h-6 text-red-500 mr-2" />
            <span className="font-bold text-gray-800">{studentData.hearts}</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/80 rounded-full p-2 hover:bg-white transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-6 h-6 text-green-500" />
            ) : (
              <VolumeX className="w-6 h-6 text-gray-400" />
            )}
          </button>
          <button
            onClick={handleLogout}
            className="bg-white/80 rounded-full p-2 hover:bg-white transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </motion.div>

      {/* Système XP Avancé avec données réelles */}
      <motion.div
        className="mb-8 flex justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <NextLevelXPSystem
          currentXP={studentData.currentXP}
          maxXP={studentData.maxXP}
          level={studentData.level}
          xpGained={15}
          bonusMultiplier={studentData.streak > 3 ? 2 : 1}
          streakActive={studentData.streak > 3}
          recentAchievements={['Premier exercice réussi!', 'Série de 5!']}
          onLevelUp={handleLevelUp}
          onMilestone={(milestone) => {
            console.log(`Milestone reached: ${milestone}%`);
            setMascotEmotion('excited');
            setMascotMessage(`Progression: ${milestone}% !`);
          }}
          size="large"
          theme="magic"
          enablePhysics={true}
          interactive={true}
        />
      </motion.div>

      {/* Matières basées sur les compétences API */}
      <motion.div 
        className="grid grid-cols-2 gap-6 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {subjects.map((subject, index) => (
          <motion.button
            key={subject.id}
            onClick={() => handleSubjectClick(subject)}
            className={`
              bg-gradient-to-br ${subject.gradient} p-8 rounded-3xl shadow-xl border-4 border-white/50
              hover:shadow-2xl transform hover:scale-105 transition-all duration-300
              ${subject.shadowColor}
            `}
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-4 animate-float">{subject.emoji}</div>
              <h3 className="text-xl font-bold mb-2">{subject.name}</h3>
              <p className="text-sm opacity-90">{subject.description}</p>
              <p className="text-xs opacity-75 mt-2">
                {subject.competences.length} compétences • {subject.exercises.length} exercices
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Informations de session active */}
      {activeSessionData?.hasActiveSession && (
        <motion.div
          className="mt-8 max-w-md mx-auto bg-blue-100 border border-blue-300 rounded-2xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <div className="text-blue-600 font-medium">📚 Session en cours</div>
            <div className="text-sm text-blue-500">
              {activeSessionData.session?.exercisesCompleted || 0} exercices complétés
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  // Rendu de l'exercice (simplifié pour la démo)
  const renderExercise = () => {
    if (!currentExercise) return null;

    return (
      <div className="min-h-screen p-6">
        {/* Header avec retour */}
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => {
              setCurrentView('home');
              setMascotEmotion('happy');
            }}
            className="flex items-center space-x-2 bg-white/80 rounded-xl px-4 py-2 hover:bg-white transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Accueil</span>
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800">Exercice</h2>
          
          <div className="flex items-center space-x-4">
            <Star className="w-6 h-6 text-yellow-500" />
            <span className="font-bold">{studentData.stars}</span>
          </div>
        </motion.div>

        {/* Contenu de l'exercice */}
        <motion.div
          className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-xl font-bold text-center mb-6">{currentExercise.question}</h3>
          
          {/* Exercice QCM basique pour test */}
          {currentExercise.options && (
            <div className="space-y-4">
              {currentExercise.options.map((option: string, index: number) => (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSubmit(option, option === currentExercise.correctAnswer)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {String.fromCharCode(65 + index)}. {option}
                </motion.button>
              ))}
            </div>
          )}

          {/* Exercice simple si pas d'options */}
          {!currentExercise.options && (
            <div className="text-center">
              <div className="text-4xl font-bold mb-6">{currentExercise.question}</div>
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  onClick={() => handleAnswerSubmit('correct', true)}
                  className="bg-green-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✓ Correct
                </motion.button>
                <motion.button
                  onClick={() => handleAnswerSubmit('incorrect', false)}
                  className="bg-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✗ Test Erreur
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-magic-sky/30 via-magic-ocean/20 to-magic-forest/30">
      {/* Particules */}
      <ParticleEngine
        isActive={showParticles}
        intensity={4}
        type={particleType}
        position={{ x: 50, y: 50 }}
      />

      {/* Mascotte */}
      <MascottePremium
        emotion={mascotEmotion}
        message={mascotMessage}
        onInteraction={handleMascotInteraction}
      />

      {/* Contenu principal */}
      <AnimatePresence mode="wait">
        {currentView === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.5 }}
          >
            {renderHome()}
          </motion.div>
        )}
        
        {currentView === 'exercise' && (
          <motion.div
            key="exercise"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            {renderExercise()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// APPLICATION PRINCIPALE AVEC AUTHENTIFICATION
// =============================================================================
const AppWithAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-blue-500 flex items-center justify-center">
        <motion.div
          className="text-white text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="text-6xl mb-4"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            ✨
          </motion.div>
          <h2 className="text-2xl font-bold">FastRevEd Kids</h2>
          <p className="text-lg opacity-90">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  return isAuthenticated ? <DiamondCPCE2Interface /> : <LoginScreen />;
};

// =============================================================================
// APP PRINCIPALE AVEC PROVIDERS
// =============================================================================
function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}

export default App;