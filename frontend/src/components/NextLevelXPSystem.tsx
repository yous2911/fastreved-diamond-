import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiquidDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  type: 'xp' | 'bonus' | 'streak' | 'achievement';
}

interface LiquidBubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  alpha: number;
}

interface NextLevelXPSystemProps {
  currentXP: number;
  maxXP: number;
  level: number;
  xpGained?: number;
  bonusMultiplier?: number;
  streakActive?: boolean;
  recentAchievements?: string[];
  onLevelUp?: (newLevel: number) => void;
  onMilestone?: (milestone: number) => void;
  size?: 'compact' | 'normal' | 'large' | 'massive';
  theme?: 'default' | 'fire' | 'water' | 'magic' | 'crystal' | 'rainbow';
  enablePhysics?: boolean;
  interactive?: boolean;
}

const NextLevelXPSystem: React.FC<NextLevelXPSystemProps> = ({
  currentXP,
  maxXP,
  level,
  xpGained = 0,
  bonusMultiplier = 1,
  streakActive = false,
  recentAchievements = [],
  onLevelUp,
  onMilestone,
  size = 'normal',
  theme = 'magic',
  enablePhysics = true,
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const liquidDropsRef = useRef<LiquidDrop[]>([]);
  const bubblesRef = useRef<LiquidBubble[]>([]);
  const waveOffsetRef = useRef(0);
  const lastXPRef = useRef(currentXP);
  const lastLevelRef = useRef(level);

  const [isLevelingUp, setIsLevelingUp] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showXPGain, setShowXPGain] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{
    id: number;
    value: number;
    x: number;
    y: number;
    color: string;
    type: string;
  }>>([]);

  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'compact':
        return { width: 200, height: 20, fontSize: '12px', bubbleCount: 8 };
      case 'normal':
        return { width: 300, height: 30, fontSize: '14px', bubbleCount: 12 };
      case 'large':
        return { width: 400, height: 40, fontSize: '16px', bubbleCount: 16 };
      case 'massive':
        return { width: 500, height: 60, fontSize: '20px', bubbleCount: 24 };
      default:
        return { width: 300, height: 30, fontSize: '14px', bubbleCount: 12 };
    }
  }, [size]);

  // Theme configurations with advanced color schemes
  const themeConfig = useMemo(() => {
    switch (theme) {
      case 'fire':
        return {
          liquidGradient: ['#FF4500', '#FF6347', '#FFD700'],
          glowColor: '#FF4500',
          bubbleColor: '#FFA500',
          particleColors: ['#FF0000', '#FF4500', '#FFD700'],
          backgroundColor: 'rgba(255, 69, 0, 0.1)'
        };
      case 'water':
        return {
          liquidGradient: ['#0066CC', '#0099FF', '#66CCFF'],
          glowColor: '#0099FF',
          bubbleColor: '#66CCFF',
          particleColors: ['#0066CC', '#0099FF', '#66CCFF'],
          backgroundColor: 'rgba(0, 153, 255, 0.1)'
        };
      case 'crystal':
        return {
          liquidGradient: ['#E6E6FA', '#DDA0DD', '#DA70D6'],
          glowColor: '#DDA0DD',
          bubbleColor: '#E6E6FA',
          particleColors: ['#E6E6FA', '#DDA0DD', '#DA70D6'],
          backgroundColor: 'rgba(221, 160, 221, 0.1)'
        };
      case 'rainbow':
        return {
          liquidGradient: ['#8A2BE2', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000'],
          glowColor: '#8A2BE2',
          bubbleColor: '#FFFFFF',
          particleColors: ['#8A2BE2', '#4B0082', '#0000FF', '#00FF00', '#FFFF00'],
          backgroundColor: 'rgba(138, 43, 226, 0.1)'
        };
      default: // magic
        return {
          liquidGradient: ['#8A2BE2', '#9370DB', '#BA55D3'],
          glowColor: '#8A2BE2',
          bubbleColor: '#DDA0DD',
          particleColors: ['#8A2BE2', '#9370DB', '#BA55D3'],
          backgroundColor: 'rgba(138, 43, 226, 0.1)'
        };
    }
  }, [theme]);

  const progress = Math.min((currentXP / maxXP) * 100, 100);

  // Create liquid drop physics
  const createLiquidDrop = useCallback((x: number, y: number, type: 'xp' | 'bonus' | 'streak' | 'achievement', value: number) => {
    const colors = themeConfig.particleColors;
    return {
      id: Date.now() + Math.random(),
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 8 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      type
    };
  }, [themeConfig]);

  // Create liquid bubbles inside the XP bar
  const createBubble = useCallback(() => {
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * sizeConfig.width,
      y: sizeConfig.height * 0.7 + Math.random() * (sizeConfig.height * 0.3),
      radius: Math.random() * 4 + 2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 2 - 1,
      life: 0,
      maxLife: 60 + Math.random() * 60,
      alpha: 0.3 + Math.random() * 0.4
    };
  }, [sizeConfig]);

  // Advanced liquid rendering with realistic physics
  const renderLiquidXP = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = sizeConfig;
    const fillWidth = (progress / 100) * width;
    
    ctx.clearRect(0, 0, width, height);

    // Background container
    ctx.fillStyle = themeConfig.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Border with glow effect
    ctx.strokeStyle = themeConfig.glowColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = themeConfig.glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.shadowBlur = 0;

    if (fillWidth > 0) {
      // Create liquid gradient
      const gradient = ctx.createLinearGradient(0, 0, fillWidth, 0);
      themeConfig.liquidGradient.forEach((color, index) => {
        gradient.addColorStop(index / (themeConfig.liquidGradient.length - 1), color);
      });

      // Liquid wave effect
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);
      
      // Bottom of liquid (mostly straight)
      ctx.lineTo(fillWidth, height);
      
      // Liquid surface with realistic wave physics
      const waveHeight = Math.min(height * 0.1, 4);
      const waveFrequency = 0.02;
      const numPoints = Math.ceil(fillWidth / 2);
      
      for (let i = numPoints; i >= 0; i--) {
        const x = (i / numPoints) * fillWidth;
        const wave1 = Math.sin(x * waveFrequency + waveOffsetRef.current) * waveHeight;
        const wave2 = Math.sin(x * waveFrequency * 2 + waveOffsetRef.current * 1.5) * (waveHeight * 0.5);
        const wave3 = Math.sin(x * waveFrequency * 3 + waveOffsetRef.current * 0.8) * (waveHeight * 0.3);
        const y = height * 0.1 + wave1 + wave2 + wave3;
        
        if (i === numPoints) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.lineTo(0, height * 0.1);
      ctx.closePath();
      
      // Fill liquid
      ctx.fillStyle = gradient;
      ctx.fill();

      // Liquid surface reflection
      const reflectionGradient = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = reflectionGradient;
      ctx.fillRect(0, 0, fillWidth, height * 0.3);

      // Render bubbles inside liquid
      bubblesRef.current.forEach(bubble => {
        if (bubble.x < fillWidth) {
          ctx.save();
          ctx.globalAlpha = bubble.alpha * (1 - bubble.life / bubble.maxLife);
          
          // Bubble with realistic lighting
          const bubbleGradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.radius
          );
          bubbleGradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.alpha})`);
          bubbleGradient.addColorStop(0.7, `rgba(255, 255, 255, ${bubble.alpha * 0.3})`);
          bubbleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.fillStyle = bubbleGradient;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Bubble highlight
          ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(
            bubble.x - bubble.radius * 0.3, 
            bubble.y - bubble.radius * 0.3, 
            bubble.radius * 0.3, 
            0, Math.PI * 2
          );
          ctx.fill();
          
          ctx.restore();
        }
      });

      // Level up particle explosion
      if (isLevelingUp) {
        liquidDropsRef.current.forEach(drop => {
          ctx.save();
          ctx.globalAlpha = 1 - (drop.life / 100);
          
          // Particle glow
          ctx.shadowColor = drop.color;
          ctx.shadowBlur = 15;
          ctx.fillStyle = drop.color;
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        });
      }
    }

    // XP Text overlay with 3D effect
    ctx.save();
    ctx.font = `bold ${sizeConfig.fontSize} Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text shadow for 3D effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(`${currentXP} / ${maxXP} XP`, width / 2 + 1, height / 2 + 1);
    
    // Main text
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeText(`${currentXP} / ${maxXP} XP`, width / 2, height / 2);
    ctx.fillText(`${currentXP} / ${maxXP} XP`, width / 2, height / 2);
    
    ctx.restore();
  }, [progress, sizeConfig, themeConfig, currentXP, maxXP, isLevelingUp]);

  // Physics simulation
  const updatePhysics = useCallback(() => {
    // Update wave animation
    waveOffsetRef.current += 0.1;

    // Update bubbles
    bubblesRef.current = bubblesRef.current.filter(bubble => {
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;
      bubble.life++;
      
      // Bubble physics - rise and pop
      bubble.vy -= 0.05; // Buoyancy
      bubble.vx *= 0.99; // Friction
      
      // Remove bubbles that are too old or off-screen
      return bubble.life < bubble.maxLife && bubble.y > -10;
    });

    // Add new bubbles periodically
    if (Math.random() < 0.1 && bubblesRef.current.length < sizeConfig.bubbleCount) {
      bubblesRef.current.push(createBubble());
    }

    // Update liquid drops
    liquidDropsRef.current = liquidDropsRef.current.filter(drop => {
      drop.x += drop.vx;
      drop.y += drop.vy;
      drop.vy += 0.3; // Gravity
      drop.vx *= 0.98; // Air resistance
      drop.life++;
      
      return drop.life < 120 && drop.y < sizeConfig.height + 50;
    });
  }, [sizeConfig, createBubble]);

  // Animation loop
  const animate = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (enablePhysics) {
      updatePhysics();
    }
    
    renderLiquidXP(ctx);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [enablePhysics, updatePhysics, renderLiquidXP]);

  // Handle XP changes and level ups
  useEffect(() => {
    // Detect XP gain
    if (currentXP > lastXPRef.current && xpGained > 0) {
      setShowXPGain(true);
      
      // Create floating number
      const newFloating = {
        id: Date.now(),
        value: xpGained,
        x: 50 + Math.random() * 100,
        y: 50,
        color: streakActive ? '#FFD700' : themeConfig.glowColor,
        type: streakActive ? 'streak' : bonusMultiplier > 1 ? 'bonus' : 'normal'
      };
      
      setFloatingNumbers(prev => [...prev, newFloating]);
      
      // Create liquid drops for visual feedback
      for (let i = 0; i < Math.min(xpGained / 10, 20); i++) {
        liquidDropsRef.current.push(
          createLiquidDrop(
            sizeConfig.width * 0.8, 
            sizeConfig.height * 0.5, 
            streakActive ? 'streak' : 'xp',
            xpGained
          )
        );
      }
      
      setTimeout(() => {
        setShowXPGain(false);
        setFloatingNumbers(prev => prev.filter(f => f.id !== newFloating.id));
      }, 2000);
    }

    // Detect level up
    if (level > lastLevelRef.current) {
      setIsLevelingUp(true);
      
      // Massive particle explosion
      for (let i = 0; i < 50; i++) {
        liquidDropsRef.current.push(
          createLiquidDrop(
            sizeConfig.width / 2 + (Math.random() - 0.5) * sizeConfig.width,
            sizeConfig.height / 2,
            'achievement',
            level
          )
        );
      }

      onLevelUp?.(level);
      
      setTimeout(() => {
        setIsLevelingUp(false);
      }, 3000);
    }

    // Check for milestones
    const milestones = [25, 50, 75, 90, 95, 99];
    milestones.forEach(milestone => {
      if (progress >= milestone && lastXPRef.current / maxXP * 100 < milestone) {
        onMilestone?.(milestone);
      }
    });

    lastXPRef.current = currentXP;
    lastLevelRef.current = level;
  }, [currentXP, level, xpGained, streakActive, bonusMultiplier, progress, maxXP, themeConfig, sizeConfig, createLiquidDrop, onLevelUp, onMilestone]);

  // Initialize animation
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  // Handle canvas click for interaction
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create ripple effect
    for (let i = 0; i < 10; i++) {
      liquidDropsRef.current.push(createLiquidDrop(x, y, 'xp', 1));
    }
    
    // Add some bonus bubbles
    for (let i = 0; i < 5; i++) {
      const bubble = createBubble();
      bubble.x = x + (Math.random() - 0.5) * 20;
      bubble.y = y + (Math.random() - 0.5) * 20;
      bubblesRef.current.push(bubble);
    }
  }, [interactive, createLiquidDrop, createBubble]);

  return (
    <div className="relative inline-block">
      {/* Level Display */}
      <div className="flex items-center justify-between mb-2">
        <motion.div
          className="flex items-center space-x-2"
          animate={isLevelingUp ? { 
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.5, repeat: isLevelingUp ? Infinity : 0 }}
        >
          <div className="text-lg font-bold text-purple-600">
            Niveau {level}
          </div>
          {streakActive && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-yellow-500"
            >
              🔥
            </motion.div>
          )}
        </motion.div>
        
        {bonusMultiplier > 1 && (
          <div className="text-sm font-semibold text-orange-500">
            x{bonusMultiplier} Bonus!
          </div>
        )}
      </div>

      {/* Main XP Bar Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={sizeConfig.width}
          height={sizeConfig.height}
          className={`rounded-lg cursor-pointer transition-all duration-300 ${
            interactive ? 'hover:scale-105 hover:shadow-lg' : ''
          } ${isLevelingUp ? 'animate-pulse' : ''}`}
          onClick={handleCanvasClick}
          style={{
            background: `linear-gradient(90deg, ${themeConfig.backgroundColor}, rgba(255,255,255,0.1))`,
            border: `2px solid ${themeConfig.glowColor}`,
            boxShadow: `0 0 20px ${themeConfig.glowColor}40`
          }}
        />
        
        {/* Progress percentage overlay */}
        <div className="absolute top-0 right-0 -mt-6 text-xs font-semibold text-gray-600">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Floating XP Numbers */}
      <AnimatePresence>
        {floatingNumbers.map((floating) => (
          <motion.div
            key={floating.id}
            className="absolute pointer-events-none font-bold text-lg z-10"
            style={{
              left: `${floating.x}%`,
              top: `${floating.y}%`,
              color: floating.color,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.3, 1.2, 0.8],
              y: [-50, -80, -100, -120]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            +{floating.value} XP
            {floating.type === 'bonus' && <span className="text-orange-400"> (Bonus!)</span>}
            {floating.type === 'streak' && <span className="text-yellow-400"> (Série!)</span>}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Recent Achievements Notification */}
      <AnimatePresence>
        {recentAchievements.length > 0 && (
          <motion.div
            className="absolute -bottom-8 left-0 right-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold text-center shadow-lg">
              🏆 {recentAchievements[0]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Celebration */}
      <AnimatePresence>
        {isLevelingUp && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <div className="text-white text-4xl font-bold mb-2 drop-shadow-lg">
                NIVEAU {level}!
              </div>
              <div className="text-white text-xl opacity-90">
                Incroyable progression!
              </div>
              
              {/* Confetti-like particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: themeConfig.particleColors[i % themeConfig.particleColors.length],
                      left: '50%',
                      top: '50%'
                    }}
                    animate={{
                      x: [0, (Math.random() - 0.5) * 400],
                      y: [0, (Math.random() - 0.5) * 400],
                      rotate: [0, 360],
                      scale: [1, 0]
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Level Preview */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        {maxXP - currentXP > 0 ? (
          `${maxXP - currentXP} XP jusqu'au niveau ${level + 1}`
        ) : (
          'Niveau maximum atteint!'
        )}
      </div>
    </div>
  );
};

export default NextLevelXPSystem; 