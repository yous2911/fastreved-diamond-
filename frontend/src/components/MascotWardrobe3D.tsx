import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

interface MascotWardrobe3DProps {
  mascotType: 'dragon' | 'fairy' | 'robot' | 'cat' | 'owl';
  emotion: 'idle' | 'happy' | 'thinking' | 'celebrating' | 'oops';
  equippedItems: string[]; // Array of equipped wardrobe item IDs
  xpLevel: number;
  size?: 0 | 1 | 2 | 3 | 4 | 5; // SuperMemo quality levels
  enableInteraction?: boolean;
  onMascotClick?: () => void;
}

// SuperMemo Size configurations
const sizeConfig = {
  0: { scale: 0.6, containerSize: 80 },   // BLACKOUT - Smallest
  1: { scale: 0.7, containerSize: 90 },   // HARD - Small
  2: { scale: 0.8, containerSize: 100 },  // DIFFICULT - Medium-small
  3: { scale: 1.0, containerSize: 150 },  // GOOD - Medium
  4: { scale: 1.1, containerSize: 170 },  // EASY - Medium-large
  5: { scale: 1.2, containerSize: 200 }   // PERFECT - Largest
};

// Mascot colors and characteristics
const mascotConfig = {
  dragon: {
    primaryColor: 0x8A2BE2,
    secondaryColor: 0x4F46E5,
    eyes: 0xFFD700,
    personality: 'fierce'
  },
  fairy: {
    primaryColor: 0xEC4899,
    secondaryColor: 0x10B981,
    eyes: 0x87CEEB,
    personality: 'gentle'
  },
  robot: {
    primaryColor: 0x6B7280,
    secondaryColor: 0x3B82F6,
    eyes: 0x00FFFF,
    personality: 'logical'
  },
  cat: {
    primaryColor: 0xF59E0B,
    secondaryColor: 0xFFFBEB,
    eyes: 0x22C55E,
    personality: 'playful'
  },
  owl: {
    primaryColor: 0x8B4513,
    secondaryColor: 0xDEB887,
    eyes: 0xFFD700,
    personality: 'wise'
  }
};

const MascotWardrobe3D: React.FC<MascotWardrobe3DProps> = ({
  mascotType,
  emotion,
  equippedItems,
  xpLevel,
  size = 3, // GOOD level
  enableInteraction = true,
  onMascotClick
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const mascotGroupRef = useRef<THREE.Group>();
  const wardrobeItemsRef = useRef<THREE.Group>();
  const animationRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const config = sizeConfig[size];

  // Create 3D mascot base geometry
  const createMascotGeometry = (type: string) => {
    const group = new THREE.Group();
    const config = mascotConfig[type as keyof typeof mascotConfig];
    
    // Main body
    const bodyGeometry = new THREE.SphereGeometry(1, 16, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: config.primaryColor,
      shininess: 30
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 1.2, 1);
    body.position.y = 0;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.7, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ 
      color: config.primaryColor,
      shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    // Eyes with enhanced glow
    const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: config.eyes,
      emissive: config.eyes,
      emissiveIntensity: 0.4
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1.6, 0.5);
    leftEye.castShadow = true;
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1.6, 0.5);
    rightEye.castShadow = true;
    group.add(rightEye);

    // Type-specific features with wardrobe compatibility
    switch (type) {
      case 'dragon':
        const wingGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const wingMaterial = new THREE.MeshPhongMaterial({ 
          color: config.secondaryColor,
          transparent: true,
          opacity: 0.8
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-1.2, 0.5, -0.2);
        leftWing.rotation.z = Math.PI / 4;
        leftWing.castShadow = true;
        group.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(1.2, 0.5, -0.2);
        rightWing.rotation.z = -Math.PI / 4;
        rightWing.castShadow = true;
        group.add(rightWing);
        break;

      case 'fairy':
        const fairyWingGeometry = new THREE.PlaneGeometry(0.8, 1.2);
        const fairyWingMaterial = new THREE.MeshPhongMaterial({ 
          color: config.secondaryColor,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        
        const leftFairyWing = new THREE.Mesh(fairyWingGeometry, fairyWingMaterial);
        leftFairyWing.position.set(-0.8, 0.8, -0.2);
        leftFairyWing.castShadow = true;
        group.add(leftFairyWing);
        
        const rightFairyWing = new THREE.Mesh(fairyWingGeometry, fairyWingMaterial);
        rightFairyWing.position.set(0.8, 0.8, -0.2);
        rightFairyWing.castShadow = true;
        group.add(rightFairyWing);
        break;

      case 'robot':
        const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4);
        const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.y = 1.9;
        antenna.castShadow = true;
        group.add(antenna);
        
        const ballGeometry = new THREE.SphereGeometry(0.08);
        const ballMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFF0000,
          emissive: 0xFF0000,
          emissiveIntensity: 0.3
        });
        const ball = new THREE.Mesh(ballGeometry, ballMaterial);
        ball.position.y = 2.1;
        ball.castShadow = true;
        group.add(ball);
        break;

      case 'cat':
        const earGeometry = new THREE.ConeGeometry(0.25, 0.5, 8);
        const earMaterial = new THREE.MeshPhongMaterial({ color: config.primaryColor });
        
        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.25, 1.9, 0);
        leftEar.castShadow = true;
        group.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.25, 1.9, 0);
        rightEar.castShadow = true;
        group.add(rightEar);
        
        const tailGeometry = new THREE.CylinderGeometry(0.1, 0.05, 1.2);
        const tail = new THREE.Mesh(tailGeometry, new THREE.MeshPhongMaterial({ color: config.primaryColor }));
        tail.position.set(0.8, -0.2, -0.8);
        tail.rotation.x = Math.PI / 3;
        tail.castShadow = true;
        group.add(tail);
        break;

      case 'owl':
        const beakGeometry = new THREE.ConeGeometry(0.12, 0.25, 8);
        const beakMaterial = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 1.4, 0.6);
        beak.rotation.x = Math.PI;
        beak.castShadow = true;
        group.add(beak);
        break;
    }

    return group;
  };

  // Wardrobe item geometry creators
  const createWardrobeItemGeometry = (itemId: string, mascotType: string): THREE.Object3D | null => {
    const group = new THREE.Group();
    
    switch (itemId) {
      case 'wizard_hat':
        const hatGeometry = new THREE.ConeGeometry(0.8, 1.2, 8);
        const hatMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x4B0082,
          shininess: 50
        });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(0, 2.5, 0);
        
        // Add stars to wizard hat
        for (let i = 0; i < 8; i++) {
          const starGeometry = new THREE.SphereGeometry(0.05);
          const starMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5
          });
          const star = new THREE.Mesh(starGeometry, starMaterial);
          const angle = (i / 8) * Math.PI * 2;
          const radius = 0.6;
          star.position.set(
            Math.cos(angle) * radius,
            2.5 + Math.sin(i * 0.8) * 0.3,
            Math.sin(angle) * radius
          );
          group.add(star);
        }
        
        group.add(hat);
        return group;

      case 'crown_gold':
        const crownBase = new THREE.CylinderGeometry(0.7, 0.6, 0.4, 8);
        const crownMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFFD700,
          shininess: 100
        });
        const crown = new THREE.Mesh(crownBase, crownMaterial);
        crown.position.set(0, 2.3, 0);
        
        // Add crown spikes
        for (let i = 0; i < 8; i++) {
          const spikeGeometry = new THREE.ConeGeometry(0.1, 0.4, 4);
          const spike = new THREE.Mesh(spikeGeometry, crownMaterial);
          const angle = (i / 8) * Math.PI * 2;
          spike.position.set(
            Math.cos(angle) * 0.65,
            2.7,
            Math.sin(angle) * 0.65
          );
          group.add(spike);
        }
        
        group.add(crown);
        return group;

      case 'magic_wand':
        const wandGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
        const wandMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const wand = new THREE.Mesh(wandGeometry, wandMaterial);
        wand.position.set(1.2, 0.5, 0);
        wand.rotation.z = -0.3;
        
        // Wand star
        const starGeometry = new THREE.SphereGeometry(0.2);
        const starMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFFD700,
          emissive: 0xFFD700,
          emissiveIntensity: 0.7
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(1.8, 1.2, 0);
        
        // Sparkle particles around wand
        for (let i = 0; i < 12; i++) {
          const sparkleGeometry = new THREE.SphereGeometry(0.03);
          const sparkleMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.8
          });
          const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
          const angle = (i / 12) * Math.PI * 2;
          const radius = 0.4 + Math.random() * 0.3;
          sparkle.position.set(
            1.8 + Math.cos(angle) * radius,
            1.2 + Math.sin(angle) * radius,
            (Math.random() - 0.5) * 0.4
          );
          group.add(sparkle);
        }
        
        group.add(wand);
        group.add(star);
        return group;

      case 'magic_glasses':
        const frameGeometry = new THREE.TorusGeometry(0.25, 0.03, 8, 16);
        const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x000080 });
        
        const leftLens = new THREE.Mesh(frameGeometry, frameMaterial);
        leftLens.position.set(-0.3, 1.6, 0.45);
        leftLens.rotation.y = Math.PI / 2;
        
        const rightLens = new THREE.Mesh(frameGeometry, frameMaterial);
        rightLens.position.set(0.3, 1.6, 0.45);
        rightLens.rotation.y = Math.PI / 2;
        
        // Bridge
        const bridgeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.set(0, 1.6, 0.45);
        bridge.rotation.z = Math.PI / 2;
        
        // Lens glass
        const glassGeometry = new THREE.CircleGeometry(0.22);
        const glassMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x87CEEB,
          transparent: true,
          opacity: 0.3
        });
        
        const leftGlass = new THREE.Mesh(glassGeometry, glassMaterial);
        leftGlass.position.set(-0.3, 1.6, 0.46);
        
        const rightGlass = new THREE.Mesh(glassGeometry, glassMaterial);
        rightGlass.position.set(0.3, 1.6, 0.46);
        
        group.add(leftLens);
        group.add(rightLens);
        group.add(bridge);
        group.add(leftGlass);
        group.add(rightGlass);
        return group;

      case 'baseball_cap':
        const capTop = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 16);
        const capMaterial = new THREE.MeshPhongMaterial({ color: 0xFF6347 });
        const capTopMesh = new THREE.Mesh(capTop, capMaterial);
        capTopMesh.position.set(0, 2.0, 0);
        
        // Cap visor
        const visorGeometry = new THREE.CylinderGeometry(0.8, 0.9, 0.05, 16, 1, false, 0, Math.PI);
        const visor = new THREE.Mesh(visorGeometry, capMaterial);
        visor.position.set(0, 1.9, 0.4);
        visor.rotation.x = -0.2;
        
        group.add(capTopMesh);
        group.add(visor);
        return group;

      case 'rainbow_aura':
        const auraGeometry = new THREE.SphereGeometry(2, 16, 16);
        const auraMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.1,
          emissive: 0xFF69B4,
          emissiveIntensity: 0.2
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.position.set(0, 0, 0);
        
        // Rainbow particles
        for (let i = 0; i < 30; i++) {
          const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];
          const particleGeometry = new THREE.SphereGeometry(0.05);
          const particleMaterial = new THREE.MeshPhongMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
            emissive: colors[Math.floor(Math.random() * colors.length)],
            emissiveIntensity: 0.6
          });
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const radius = 1.5 + Math.random() * 0.5;
          
          particle.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
          );
          
          group.add(particle);
        }
        
        group.add(aura);
        return group;

      case 'graduation_cap':
        const gradCapBase = new THREE.BoxGeometry(0.9, 0.2, 0.9);
        const gradCapMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const gradCap = new THREE.Mesh(gradCapBase, gradCapMaterial);
        gradCap.position.set(0, 2.2, 0);
        
        // Tassel
        const tasselString = new THREE.CylinderGeometry(0.02, 0.02, 0.5);
        const tasselStringMesh = new THREE.Mesh(tasselString, new THREE.MeshPhongMaterial({ color: 0xFFD700 }));
        tasselStringMesh.position.set(0.4, 2.0, 0.4);
        
        const tasselEnd = new THREE.SphereGeometry(0.08);
        const tasselEndMesh = new THREE.Mesh(tasselEnd, new THREE.MeshPhongMaterial({ color: 0xFFD700 }));
        tasselEndMesh.position.set(0.4, 1.7, 0.4);
        
        group.add(gradCap);
        group.add(tasselStringMesh);
        group.add(tasselEndMesh);
        return group;

      case 'superhero_cape':
        const capeGeometry = new THREE.BoxGeometry(1.2, 1.5, 0.1);
        const capeMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFF0000,
          side: THREE.DoubleSide
        });
        const cape = new THREE.Mesh(capeGeometry, capeMaterial);
        cape.position.set(0, 0.5, -0.8);
        cape.rotation.x = 0.2;
        
        // Add cape emblem
        const emblemGeometry = new THREE.CircleGeometry(0.2);
        const emblemMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFFD700,
          emissive: 0xFFD700,
          emissiveIntensity: 0.3
        });
        const emblem = new THREE.Mesh(emblemGeometry, emblemMaterial);
        emblem.position.set(0, 0.8, -0.74);
        
        group.add(cape);
        group.add(emblem);
        return group;

      case 'lab_coat':
        const coatGeometry = new THREE.BoxGeometry(1.1, 1.3, 0.2);
        const coatMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const coat = new THREE.Mesh(coatGeometry, coatMaterial);
        coat.position.set(0, 0, 0.5);
        
        // Lab coat buttons
        for (let i = 0; i < 4; i++) {
          const buttonGeometry = new THREE.SphereGeometry(0.05);
          const buttonMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
          const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
          button.position.set(0, 0.4 - i * 0.2, 0.61);
          group.add(button);
        }
        
        group.add(coat);
        return group;

      case 'rainbow_shirt':
        const shirtGeometry = new THREE.BoxGeometry(1.0, 0.8, 0.2);
        const shirtMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFF69B4,
          transparent: true,
          opacity: 0.9
        });
        const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
        shirt.position.set(0, 0.2, 0.4);
        
        // Rainbow stripes
        const stripeColors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];
        stripeColors.forEach((color, index) => {
          const stripeGeometry = new THREE.BoxGeometry(1.0, 0.1, 0.01);
          const stripeMaterial = new THREE.MeshPhongMaterial({ color });
          const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
          stripe.position.set(0, 0.5 - index * 0.12, 0.51);
          group.add(stripe);
        });
        
        group.add(shirt);
        return group;

      case 'bow_tie':
        const bowTieGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.15);
        const bowTieMaterial = new THREE.MeshPhongMaterial({ color: 0x800080 });
        const bowTie = new THREE.Mesh(bowTieGeometry, bowTieMaterial);
        bowTie.position.set(0, 1.2, 0.5);
        
        // Bow tie center knot
        const knotGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2);
        const knot = new THREE.Mesh(knotGeometry, new THREE.MeshPhongMaterial({ color: 0x4B0082 }));
        knot.position.set(0, 1.2, 0.5);
        knot.rotation.x = Math.PI / 2;
        
        group.add(bowTie);
        group.add(knot);
        return group;

      case 'medal_bronze':
      case 'medal_silver':
      case 'medal_gold':
        const medalColor = itemId === 'medal_gold' ? 0xFFD700 : 
                          itemId === 'medal_silver' ? 0xC0C0C0 : 0xCD7F32;
        
        const medalGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.05);
        const medalMaterial = new THREE.MeshPhongMaterial({ 
          color: medalColor,
          shininess: 100
        });
        const medal = new THREE.Mesh(medalGeometry, medalMaterial);
        medal.position.set(0, 0.8, 0.5);
        
        // Medal ribbon
        const ribbonGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.02);
        const ribbonMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
        ribbon.position.set(0, 1.4, 0.49);
        
        // Medal emblem
        const emblemSize = 0.08;
        const emblemGeo = new THREE.SphereGeometry(emblemSize);
        const emblemMat = new THREE.MeshPhongMaterial({ 
          color: itemId === 'medal_gold' ? 0xFF6347 : 0xFFFFFF,
          emissive: itemId === 'medal_gold' ? 0xFF6347 : 0x000000,
          emissiveIntensity: itemId === 'medal_gold' ? 0.3 : 0
        });
        const medalEmblem = new THREE.Mesh(emblemGeo, emblemMat);
        medalEmblem.position.set(0, 0.8, 0.56);
        
        group.add(ribbon);
        group.add(medal);
        group.add(medalEmblem);
        return group;

      case 'magic_boots':
        const bootGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8);
        const bootMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x4B0082,
          shininess: 80
        });
        
        const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        leftBoot.position.set(-0.3, -1.2, 0.3);
        
        const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
        rightBoot.position.set(0.3, -1.2, 0.3);
        
        // Boot magical glow
        for (let i = 0; i < 2; i++) {
          const glowGeometry = new THREE.SphereGeometry(0.05);
          const glowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8A2BE2,
            emissive: 0x8A2BE2,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6
          });
          const glow = new THREE.Mesh(glowGeometry, glowMaterial);
          glow.position.set(i === 0 ? -0.3 : 0.3, -1.0, 0.7);
          group.add(glow);
        }
        
        group.add(leftBoot);
        group.add(rightBoot);
        return group;

      case 'sneakers':
        const sneakerGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.7);
        const sneakerMaterial = new THREE.MeshPhongMaterial({ color: 0x00FF00 });
        
        const leftSneaker = new THREE.Mesh(sneakerGeometry, sneakerMaterial);
        leftSneaker.position.set(-0.25, -1.2, 0.2);
        
        const rightSneaker = new THREE.Mesh(sneakerGeometry, sneakerMaterial);
        rightSneaker.position.set(0.25, -1.2, 0.2);
        
        // Sneaker stripes
        for (let i = 0; i < 3; i++) {
          const stripeGeometry = new THREE.BoxGeometry(0.05, 0.32, 0.72);
          const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
          
          const leftStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
          leftStripe.position.set(-0.4 + i * 0.1, -1.2, 0.2);
          
          const rightStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
          rightStripe.position.set(0.1 + i * 0.1, -1.2, 0.2);
          
          group.add(leftStripe);
          group.add(rightStripe);
        }
        
        group.add(leftSneaker);
        group.add(rightSneaker);
        return group;

      case 'fire_wings':
        const wingGeometry = new THREE.BoxGeometry(1.5, 1.0, 0.2);
        const wingMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFF4500,
          transparent: true,
          opacity: 0.8,
          emissive: 0xFF4500,
          emissiveIntensity: 0.4
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-1.2, 0.5, -0.5);
        leftWing.rotation.y = -0.3;
        leftWing.rotation.x = 0.2;
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(1.2, 0.5, -0.5);
        rightWing.rotation.y = 0.3;
        rightWing.rotation.x = 0.2;
        
        // Fire particles
        for (let i = 0; i < 20; i++) {
          const fireGeometry = new THREE.SphereGeometry(0.08);
          const fireMaterial = new THREE.MeshPhongMaterial({ 
            color: i % 2 === 0 ? 0xFF4500 : 0xFFD700,
            emissive: i % 2 === 0 ? 0xFF4500 : 0xFFD700,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.7
          });
          const fireParticle = new THREE.Mesh(fireGeometry, fireMaterial);
          
          const side = i < 10 ? -1 : 1;
          fireParticle.position.set(
            side * (1.2 + (Math.random() - 0.5) * 1.0),
            0.5 + (Math.random() - 0.5) * 0.8,
            -0.5 + (Math.random() - 0.5) * 0.4
          );
          
          group.add(fireParticle);
        }
        
        group.add(leftWing);
        group.add(rightWing);
        return group;

      default:
        return null;
    }
  };

  // Update wardrobe items
  const updateWardrobeItems = (mascotGroup: THREE.Group, items: string[]) => {
    // Remove existing wardrobe items
    if (wardrobeItemsRef.current) {
      mascotGroup.remove(wardrobeItemsRef.current);
    }

    // Create new wardrobe items group
    const wardrobeGroup = new THREE.Group();
    wardrobeItemsRef.current = wardrobeGroup;

    items.forEach(itemId => {
      const itemGeometry = createWardrobeItemGeometry(itemId, mascotType);
      if (itemGeometry) {
        itemGeometry.castShadow = true;
        itemGeometry.receiveShadow = true;
        wardrobeGroup.add(itemGeometry);
      }
    });

    mascotGroup.add(wardrobeGroup);
  };

  // Animation based on emotion with wardrobe items
  const updateAnimation = (time: number) => {
    if (!mascotGroupRef.current) return;

    const mascot = mascotGroupRef.current;
    const wardrobeItems = wardrobeItemsRef.current;
    
    switch (emotion) {
      case 'idle':
        mascot.position.y = Math.sin(time * 0.002) * 0.1;
        mascot.rotation.y = Math.sin(time * 0.001) * 0.1;
        break;
        
      case 'happy':
        mascot.position.y = Math.sin(time * 0.01) * 0.3 + 0.2;
        mascot.rotation.z = Math.sin(time * 0.01) * 0.2;
        
        // Animate wardrobe items during happiness
        if (wardrobeItems) {
          wardrobeItems.children.forEach((item: THREE.Object3D, index: number) => {
            if (item.userData.itemId === 'magic_wand') {
              item.rotation.z = Math.sin(time * 0.02 + index) * 0.1;
            }
            if (item.userData.itemId === 'superhero_cape') {
              item.rotation.x = 0.2 + Math.sin(time * 0.015) * 0.1;
            }
          });
        }
        break;
        
      case 'thinking':
        mascot.rotation.y = Math.sin(time * 0.005) * 0.3;
        mascot.position.x = Math.sin(time * 0.003) * 0.1;
        break;
        
      case 'celebrating':
        mascot.position.y = Math.sin(time * 0.02) * 0.5 + 0.5;
        mascot.rotation.y = time * 0.01;
        mascot.scale.setScalar(1 + Math.sin(time * 0.01) * 0.1);
        
        // Special celebration effects for wardrobe items
        if (wardrobeItems) {
          wardrobeItems.children.forEach((item: THREE.Object3D, index: number) => {
            item.position.y += Math.sin(time * 0.02 + index) * 0.05;
            if (item.userData.itemId === 'crown_gold' || item.userData.itemId === 'wizard_hat') {
              item.rotation.y = time * 0.02;
            }
          });
        }
        break;
        
      case 'oops':
        mascot.rotation.x = Math.sin(time * 0.02) * 0.1;
        mascot.position.x = Math.sin(time * 0.05) * 0.1;
        break;
    }

    // Mouse following effect
    if (enableInteraction) {
      const targetRotationY = (mousePosition.x - 0.5) * 0.3;
      const targetRotationX = (mousePosition.y - 0.5) * 0.2;
      
      mascot.rotation.y += (targetRotationY - mascot.rotation.y) * 0.05;
      mascot.rotation.x += (targetRotationX - mascot.rotation.x) * 0.05;
    }

    // Animate magical effects
    if (wardrobeItems) {
      wardrobeItems.children.forEach((item: THREE.Object3D, index: number) => {
        // Rotating sparkles for magical items
        item.traverse((child) => {
          if (child.userData.isMagicalParticle) {
            child.rotation.y = time * 0.01;
            child.position.y += Math.sin(time * 0.008 + index) * 0.02;
          }
        });
      });
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      premultipliedAlpha: false
    });
    renderer.setSize(config.containerSize, config.containerSize);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Enhanced lighting setup for wardrobe items
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // Additional rim light for better wardrobe item visibility
    const rimLight = new THREE.DirectionalLight(0x8A2BE2, 0.3);
    rimLight.position.set(-5, 0, -5);
    scene.add(rimLight);

    // Magical atmosphere lights
    const magicalLight1 = new THREE.PointLight(0x8A2BE2, 0.6, 15);
    magicalLight1.position.set(-4, 3, 4);
    scene.add(magicalLight1);

    const magicalLight2 = new THREE.PointLight(0xEC4899, 0.6, 15);
    magicalLight2.position.set(4, -2, 4);
    scene.add(magicalLight2);

    const magicalLight3 = new THREE.PointLight(0xFFD700, 0.4, 10);
    magicalLight3.position.set(0, 8, -2);
    scene.add(magicalLight3);

    // Create mascot
    const mascotGroup = createMascotGeometry(mascotType);
    mascotGroup.scale.setScalar(config.scale);
    mascotGroup.castShadow = true;
    mascotGroup.receiveShadow = true;
    scene.add(mascotGroup);
    mascotGroupRef.current = mascotGroup;

    // Add wardrobe items
    updateWardrobeItems(mascotGroup, equippedItems);

    // Enhanced particle system for magical atmosphere
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 12;
      positions[i3 + 1] = (Math.random() - 0.5) * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 12;
      
      // Random magical colors
      const colorChoices = [
        [0.54, 0.17, 0.89], // Purple
        [0.93, 0.29, 0.6],  // Pink
        [1.0, 0.84, 0.0],   // Gold
        [0.0, 1.0, 1.0],    // Cyan
        [0.5, 1.0, 0.5]     // Light green
      ];
      const colorChoice = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i3] = colorChoice[0];
      colors[i3 + 1] = colorChoice[1];
      colors[i3 + 2] = colorChoice[2];
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.5;
    ground.receiveShadow = true;
    scene.add(ground);

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = (time: number) => {
      updateAnimation(time);
      
      // Animate magical particles
      particles.rotation.y = time * 0.0005;
      particles.rotation.x = time * 0.0003;
      
      // Animate magical lights
      magicalLight1.intensity = 0.6 + Math.sin(time * 0.003) * 0.2;
      magicalLight2.intensity = 0.6 + Math.cos(time * 0.004) * 0.2;
      magicalLight3.intensity = 0.4 + Math.sin(time * 0.002) * 0.1;

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate(0);
    setIsLoaded(true);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [mascotType, size]);

  // Update wardrobe items when they change
  useEffect(() => {
    if (mascotGroupRef.current && isLoaded) {
      updateWardrobeItems(mascotGroupRef.current, equippedItems);
    }
  }, [equippedItems, isLoaded]);

  // Mouse tracking for interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!enableInteraction) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    });
  };

  const handleClick = () => {
    if (enableInteraction && onMascotClick) {
      onMascotClick();
    }
  };

  return (
    <div className="relative">
      <div 
        ref={mountRef}
        className={`
          relative rounded-2xl overflow-hidden cursor-pointer
          transition-all duration-500 hover:scale-105
          ${!isLoaded ? 'bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 animate-pulse' : ''}
          ${enableInteraction ? 'hover:shadow-2xl hover:shadow-purple-500/30' : ''}
          shadow-xl shadow-purple-500/20
        `}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          width: config.containerSize,
          height: config.containerSize,
          background: !isLoaded ? undefined : 'radial-gradient(circle, rgba(138,43,226,0.05) 0%, rgba(236,72,153,0.05) 50%, rgba(59,130,246,0.05) 100%)'
        }}
      />
      
      {/* XP Level indicator */}
      {xpLevel > 0 && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold text-white shadow-2xl shadow-yellow-500/50 animate-pulse">
          {xpLevel}
        </div>
      )}
      
      {/* Equipped items count */}
      {equippedItems.length > 0 && (
        <div className="absolute -bottom-2 -left-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white shadow-lg">
          {equippedItems.length}
        </div>
      )}
      
      {/* Enhanced magic sparkles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className={`absolute w-2 h-2 rounded-full animate-ping opacity-75 ${
              index % 3 === 0 ? 'bg-yellow-400' :
              index % 3 === 1 ? 'bg-pink-400' : 'bg-purple-400'
            }`}
            style={{
              top: `${10 + (index * 15)}%`,
              left: `${5 + (index * 12)}%`,
              animationDelay: `${index * 0.3}s`,
              animationDuration: `${2 + index * 0.2}s`
            }}
          />
        ))}
      </div>
      
      {/* Item unlock celebration effect */}
      {equippedItems.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full border-4 border-transparent bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-20 animate-pulse" />
        </div>
      )}
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2 animate-bounce">✨</div>
            <div className="text-sm text-gray-600 font-medium">Préparation de la magie...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MascotWardrobe3D; 