import React, { useRef, useEffect, useCallback, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  size: number;
  life: number;
  maxLife: number;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  type: 'fire' | 'water' | 'magic' | 'crystal' | 'lightning' | 'smoke' | 'sparkle' | 'heart' | 'star';
  physics: {
    gravity: number;
    friction: number;
    elasticity: number;
  };
  behavior: 'normal' | 'spiral' | 'orbit' | 'explosion' | 'attract' | 'repel';
  trail: Array<{ x: number; y: number; alpha: number }>;
}

interface AdvancedParticleEngineProps {
  width?: number;
  height?: number;
  particleCount?: number;
  particleType: 'fire' | 'water' | 'magic' | 'crystal' | 'lightning' | 'smoke' | 'sparkle' | 'heart' | 'star';
  behavior?: 'normal' | 'spiral' | 'orbit' | 'explosion' | 'attract' | 'repel';
  intensity: 0 | 1 | 2 | 3 | 4 | 5; // SuperMemo quality levels
  isActive: boolean;
  emitterPosition?: { x: number; y: number };
  attractorPosition?: { x: number; y: number };
  enablePhysics?: boolean;
  enableTrails?: boolean;
  enableCollisions?: boolean;
  windForce?: { x: number; y: number };
  className?: string;
}

const AdvancedParticleEngine: React.FC<AdvancedParticleEngineProps> = ({
  width = 800,
  height = 600,
  particleCount = 100,
  particleType,
  behavior = 'normal',
  intensity,
  isActive,
  emitterPosition = { x: 400, y: 300 },
  attractorPosition,
  enablePhysics = true,
  enableTrails = true,
  enableCollisions = false,
  windForce = { x: 0, y: 0 },
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const mousePositionRef = useRef({ x: 0, y: 0 });

  // SuperMemo Intensity configurations
  const intensityConfig = {
    0: { // BLACKOUT - Minimal particles
      maxParticles: Math.min(20, particleCount),
      spawnRate: 1,
      lifespan: 40,
      size: { min: 1, max: 3 }
    },
    1: { // HARD - Low particles
      maxParticles: Math.min(50, particleCount),
      spawnRate: 2,
      lifespan: 60,
      size: { min: 2, max: 4 }
    },
    2: { // DIFFICULT - Moderate particles
      maxParticles: Math.min(100, particleCount),
      spawnRate: 4,
      lifespan: 80,
      size: { min: 2, max: 5 }
    },
    3: { // GOOD - Balanced particles
      maxParticles: Math.min(150, particleCount),
      spawnRate: 5,
      lifespan: 90,
      size: { min: 3, max: 6 }
    },
    4: { // EASY - High particles
      maxParticles: Math.min(300, particleCount),
      spawnRate: 8,
      lifespan: 120,
      size: { min: 4, max: 8 }
    },
    5: { // PERFECT - Maximum particles
      maxParticles: Math.min(500, particleCount),
      spawnRate: 12,
      lifespan: 180,
      size: { min: 5, max: 12 }
    }
  };

  const config = intensityConfig[intensity];

  // Particle configuration interface
  interface ParticleConfig {
    colors: Array<{ r: number; g: number; b: number; a: number }>;
    physics: { gravity: number; friction: number; elasticity: number };
    behavior: 'normal' | 'spiral' | 'orbit' | 'explosion' | 'attract' | 'repel';
    glow: boolean;
  }

  // Particle type configurations
  const getParticleConfig = (type: string): ParticleConfig => {
    switch (type) {
      case 'fire':
        return {
          colors: [
            { r: 255, g: 100, b: 0, a: 1 },
            { r: 255, g: 200, b: 0, a: 0.8 },
            { r: 255, g: 50, b: 0, a: 0.6 }
          ],
          physics: { gravity: -0.5, friction: 0.98, elasticity: 0.3 },
          behavior: 'normal' as const,
          glow: true
        };
      case 'water':
        return {
          colors: [
            { r: 0, g: 150, b: 255, a: 0.8 },
            { r: 0, g: 200, b: 255, a: 0.6 },
            { r: 100, g: 255, b: 255, a: 0.4 }
          ],
          physics: { gravity: 2, friction: 0.95, elasticity: 0.7 },
          behavior: 'normal' as const,
          glow: false
        };
      case 'magic':
        return {
          colors: [
            { r: 138, g: 43, b: 226, a: 1 },
            { r: 75, g: 0, b: 130, a: 0.8 },
            { r: 255, g: 20, b: 147, a: 0.6 }
          ],
          physics: { gravity: 0, friction: 0.99, elasticity: 1 },
          behavior: 'spiral' as const,
          glow: true
        };
      case 'crystal':
        return {
          colors: [
            { r: 0, g: 255, b: 255, a: 0.9 },
            { r: 255, g: 255, b: 255, a: 0.7 },
            { r: 200, g: 200, b: 255, a: 0.5 }
          ],
          physics: { gravity: 0.5, friction: 0.97, elasticity: 0.9 },
          behavior: 'normal' as const,
          glow: true
        };
      case 'lightning':
        return {
          colors: [
            { r: 255, g: 255, b: 255, a: 1 },
            { r: 200, g: 200, b: 255, a: 0.8 },
            { r: 100, g: 100, b: 255, a: 0.6 }
          ],
          physics: { gravity: 0, friction: 1, elasticity: 0 },
          behavior: 'explosion' as const,
          glow: true
        };
      case 'sparkle':
        return {
          colors: [
            { r: 255, g: 215, b: 0, a: 1 },
            { r: 255, g: 255, b: 0, a: 0.8 },
            { r: 255, g: 255, b: 255, a: 0.6 }
          ],
          physics: { gravity: -0.2, friction: 0.98, elasticity: 0.5 },
          behavior: 'normal' as const,
          glow: true
        };
      case 'heart':
        return {
          colors: [
            { r: 255, g: 20, b: 147, a: 1 },
            { r: 255, g: 105, b: 180, a: 0.8 },
            { r: 255, g: 182, b: 193, a: 0.6 }
          ],
          physics: { gravity: -0.3, friction: 0.99, elasticity: 0.8 },
          behavior: 'orbit' as const,
          glow: true
        };
      default:
        return getParticleConfig('magic');
    }
  };

  // Create particle with advanced properties
  const createParticle = useCallback((x: number, y: number): Particle => {
    const particleConfig = getParticleConfig(particleType);
    const color = particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)];
    
    // Advanced velocity calculation based on behavior
    let vx, vy, vz;
    
    switch (behavior) {
      case 'explosion':
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        vz = (Math.random() - 0.5) * 2;
        break;
      case 'spiral':
        const spiralAngle = Math.random() * Math.PI * 2;
        vx = Math.cos(spiralAngle) * 3;
        vy = Math.sin(spiralAngle) * 3;
        vz = (Math.random() - 0.5) * 2;
        break;
      default:
        vx = (Math.random() - 0.5) * 4;
        vy = (Math.random() - 0.5) * 4;
        vz = (Math.random() - 0.5) * 2;
    }

    return {
      id: Date.now() + Math.random(),
      x,
      y,
      z: 0,
      vx,
      vy,
      vz,
      mass: Math.random() * 2 + 0.5,
      size: Math.random() * (config.size.max - config.size.min) + config.size.min,
      life: 0,
      maxLife: config.lifespan + Math.random() * 60,
      color,
      type: particleType,
      physics: particleConfig.physics,
      behavior,
      trail: enableTrails ? [] : []
    };
  }, [particleType, behavior, config, enableTrails]);

  // Advanced physics simulation
  const updateParticlePhysics = useCallback((particle: Particle, deltaTime: number) => {
    if (!enablePhysics) return;

    // Apply gravity
    particle.vy += particle.physics.gravity * deltaTime * 0.1;

    // Apply wind force
    particle.vx += windForce.x * deltaTime * 0.01;
    particle.vy += windForce.y * deltaTime * 0.01;

    // Behavior-specific forces
    switch (particle.behavior) {
      case 'spiral':
        const spiralForce = particle.life * 0.01;
        particle.vx += Math.cos(particle.life * 0.1) * spiralForce;
        particle.vy += Math.sin(particle.life * 0.1) * spiralForce;
        break;
        
      case 'orbit':
        if (attractorPosition) {
          const dx = attractorPosition.x - particle.x;
          const dy = attractorPosition.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const force = 100 / (distance * distance + 1);
          particle.vx += (dx / distance) * force * deltaTime * 0.01;
          particle.vy += (dy / distance) * force * deltaTime * 0.01;
        }
        break;
        
      case 'attract':
        const mouseDistance = Math.sqrt(
          Math.pow(mousePositionRef.current.x - particle.x, 2) + 
          Math.pow(mousePositionRef.current.y - particle.y, 2)
        );
        if (mouseDistance < 100) {
          const attractForce = (100 - mouseDistance) * 0.001;
          const angle = Math.atan2(
            mousePositionRef.current.y - particle.y,
            mousePositionRef.current.x - particle.x
          );
          particle.vx += Math.cos(angle) * attractForce;
          particle.vy += Math.sin(angle) * attractForce;
        }
        break;
        
      case 'repel':
        const repelDistance = Math.sqrt(
          Math.pow(mousePositionRef.current.x - particle.x, 2) + 
          Math.pow(mousePositionRef.current.y - particle.y, 2)
        );
        if (repelDistance < 150) {
          const repelForce = (150 - repelDistance) * 0.002;
          const angle = Math.atan2(
            particle.y - mousePositionRef.current.y,
            particle.x - mousePositionRef.current.x
          );
          particle.vx += Math.cos(angle) * repelForce;
          particle.vy += Math.sin(angle) * repelForce;
        }
        break;
    }

    // Apply friction
    particle.vx *= particle.physics.friction;
    particle.vy *= particle.physics.friction;
    particle.vz *= particle.physics.friction;

    // Update position
    particle.x += particle.vx * deltaTime * 0.1;
    particle.y += particle.vy * deltaTime * 0.1;
    particle.z += particle.vz * deltaTime * 0.1;

    // Boundary collisions with elasticity
    if (enableCollisions) {
      if (particle.x <= particle.size || particle.x >= width - particle.size) {
        particle.vx *= -particle.physics.elasticity;
        particle.x = Math.max(particle.size, Math.min(width - particle.size, particle.x));
      }
      if (particle.y <= particle.size || particle.y >= height - particle.size) {
        particle.vy *= -particle.physics.elasticity;
        particle.y = Math.max(particle.size, Math.min(height - particle.size, particle.y));
      }
    }

    // Update trail
    if (enableTrails && particle.trail) {
      particle.trail.push({
        x: particle.x,
        y: particle.y,
        alpha: 1
      });
      
      // Fade and limit trail length
      particle.trail = particle.trail
        .map((point, index) => ({
          ...point,
          alpha: point.alpha * 0.95
        }))
        .filter(point => point.alpha > 0.1)
        .slice(-20);
    }

    // Age particle
    particle.life += deltaTime;
  }, [enablePhysics, windForce, attractorPosition, enableCollisions, enableTrails, width, height]);

  // Advanced rendering with multiple effects
  const renderParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    
    // Sort particles by depth for proper 3D rendering
    const sortedParticles = [...particlesRef.current].sort((a, b) => a.z - b.z);
    
    sortedParticles.forEach(particle => {
      const alpha = 1 - (particle.life / particle.maxLife);
      const size = particle.size * (1 + particle.z * 0.1); // 3D size scaling
      
      ctx.save();
      
      // 3D positioning
      const screenX = particle.x + particle.z * 0.1;
      const screenY = particle.y + particle.z * 0.05;
      
      // Render trail first
      if (enableTrails && particle.trail && particle.trail.length > 1) {
        ctx.strokeStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha * 0.3})`;
        ctx.lineWidth = size * 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        
        for (let i = 1; i < particle.trail.length; i++) {
          const trailAlpha = particle.trail[i].alpha * alpha * 0.3;
          ctx.globalAlpha = trailAlpha;
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        ctx.stroke();
      }
      
      ctx.globalAlpha = alpha;
      
      // Glow effect for certain particle types
      const particleConfig = getParticleConfig(particle.type);
      if (particleConfig.glow) {
        const gradient = ctx.createRadialGradient(
          screenX, screenY, 0,
          screenX, screenY, size * 2
        );
        gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Main particle body
      switch (particle.type) {
        case 'fire':
          // Flame-like shape
          ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, size, size * 1.5, particle.life * 0.1, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'crystal':
          // Diamond shape
          ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
          ctx.translate(screenX, screenY);
          ctx.rotate(particle.life * 0.05);
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.7, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          
          // Crystal reflection
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(0, -size * 0.7);
          ctx.lineTo(size * 0.3, -size * 0.3);
          ctx.lineTo(0, 0);
          ctx.lineTo(-size * 0.3, -size * 0.3);
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'heart':
          // Heart shape
          ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
          ctx.translate(screenX, screenY);
          ctx.scale(size / 10, size / 10);
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-5, -2, -15, -2, 0, 10);
          ctx.bezierCurveTo(15, -2, 5, -2, 0, 3);
          ctx.fill();
          break;
          
        case 'star':
          // Star shape
          ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
          ctx.translate(screenX, screenY);
          ctx.rotate(particle.life * 0.1);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            const innerAngle = ((i + 0.5) * 2 * Math.PI) / 5;
            const innerX = Math.cos(innerAngle) * size * 0.5;
            const innerY = Math.sin(innerAngle) * size * 0.5;
            ctx.lineTo(innerX, innerY);
          }
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'lightning':
          // Lightning bolt
          ctx.strokeStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
          ctx.lineWidth = size * 0.3;
          ctx.lineCap = 'round';
          ctx.translate(screenX, screenY);
          ctx.beginPath();
          ctx.moveTo(-size, -size);
          ctx.lineTo(size * 0.3, 0);
          ctx.lineTo(-size * 0.3, 0);
          ctx.lineTo(size, size);
          ctx.stroke();
          break;
          
        default:
          // Default circle
          ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
          ctx.fill();
      }
      
      ctx.restore();
    });
  }, [width, height, enableTrails, getParticleConfig]);

  // Main animation loop
  const animate = useCallback((currentTime: number) => {
    if (!isActive) return;
    
    const deltaTime = currentTime - lastTimeRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Spawn new particles
    if (particlesRef.current.length < config.maxParticles) {
      for (let i = 0; i < config.spawnRate; i++) {
        const x = emitterPosition.x + (Math.random() - 0.5) * 20;
        const y = emitterPosition.y + (Math.random() - 0.5) * 20;
        particlesRef.current.push(createParticle(x, y));
      }
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter(particle => {
      updateParticlePhysics(particle, deltaTime);
      return particle.life < particle.maxLife && 
             particle.x > -50 && particle.x < width + 50 &&
             particle.y > -50 && particle.y < height + 50;
    });

    // Render
    renderParticles(ctx);
    
    lastTimeRef.current = currentTime;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isActive, config, emitterPosition, createParticle, updateParticlePhysics, renderParticles]);

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mousePositionRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);

  // Initialize and cleanup
  useEffect(() => {
    if (isActive) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = [];
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`pointer-events-auto ${className}`}
      onMouseMove={handleMouseMove}
      style={{
        imageRendering: 'crisp-edges',
        background: 'transparent'
      }}
    />
  );
};

export default AdvancedParticleEngine; 