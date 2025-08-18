import * as THREE from 'three';

// Wardrobe Items Data Structure
export interface WardrobeItem {
  id: string;
  name: string;
  type: 'hat' | 'clothing' | 'accessory' | 'shoes' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockRequirement: {
    type: 'xp' | 'streak' | 'exercises' | 'achievement';
    value: number;
  };
  mascotType?: string[]; // Which mascots can wear this
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Vector3;
  color: number;
  geometry: 'box' | 'sphere' | 'cone' | 'cylinder' | 'custom';
  customGeometry?: THREE.BufferGeometry;
  animation?: string;
  magicalEffect?: boolean;
  description: string;
  icon: string;
}

// Wardrobe Database
export const WARDROBE_ITEMS: WardrobeItem[] = [
  // HATS
  {
    id: 'wizard_hat',
    name: 'Chapeau de Magicien',
    type: 'hat',
    rarity: 'epic',
    unlockRequirement: { type: 'xp', value: 1000 },
    position: new THREE.Vector3(0, 2.5, 0),
    scale: new THREE.Vector3(0.8, 1.2, 0.8),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0x4B0082,
    geometry: 'cone',
    magicalEffect: true,
    description: 'Un chapeau magique qui scintille d\'étoiles !',
    icon: '🧙‍♂️'
  },
  {
    id: 'crown_gold',
    name: 'Couronne Royale',
    type: 'hat',
    rarity: 'legendary',
    unlockRequirement: { type: 'streak', value: 30 },
    position: new THREE.Vector3(0, 2.3, 0),
    scale: new THREE.Vector3(0.7, 0.4, 0.7),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xFFD700,
    geometry: 'cylinder',
    magicalEffect: true,
    description: 'Pour les vrais champions de l\'apprentissage !',
    icon: '👑'
  },
  {
    id: 'baseball_cap',
    name: 'Casquette Cool',
    type: 'hat',
    rarity: 'common',
    unlockRequirement: { type: 'exercises', value: 10 },
    position: new THREE.Vector3(0, 2.0, 0.2),
    scale: new THREE.Vector3(0.8, 0.3, 0.8),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xFF6347,
    geometry: 'cylinder',
    description: 'Style décontracté pour apprendre !',
    icon: '🧢'
  },
  {
    id: 'graduation_cap',
    name: 'Toque d\'Étudiant',
    type: 'hat',
    rarity: 'rare',
    unlockRequirement: { type: 'achievement', value: 5 },
    position: new THREE.Vector3(0, 2.2, 0),
    scale: new THREE.Vector3(0.9, 0.2, 0.9),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0x000000,
    geometry: 'box',
    description: 'Symbole de la réussite scolaire !',
    icon: '🎓'
  },

  // CLOTHING
  {
    id: 'superhero_cape',
    name: 'Cape de Super-Héros',
    type: 'clothing',
    rarity: 'epic',
    unlockRequirement: { type: 'xp', value: 2000 },
    position: new THREE.Vector3(0, 0.5, -0.8),
    scale: new THREE.Vector3(1.2, 1.5, 0.1),
    rotation: new THREE.Vector3(0.2, 0, 0),
    color: 0xFF0000,
    geometry: 'box',
    animation: 'cape_flow',
    magicalEffect: true,
    description: 'Vole vers la connaissance !',
    icon: '🦸‍♀️'
  },
  {
    id: 'lab_coat',
    name: 'Blouse de Scientifique',
    type: 'clothing',
    rarity: 'rare',
    unlockRequirement: { type: 'exercises', value: 50 },
    mascotType: ['robot', 'owl'],
    position: new THREE.Vector3(0, 0, 0.5),
    scale: new THREE.Vector3(1.1, 1.3, 0.2),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xFFFFFF,
    geometry: 'box',
    description: 'Parfait pour les expériences !',
    icon: '🥽'
  },
  {
    id: 'rainbow_shirt',
    name: 'T-shirt Arc-en-ciel',
    type: 'clothing',
    rarity: 'rare',
    unlockRequirement: { type: 'streak', value: 7 },
    position: new THREE.Vector3(0, 0.2, 0.4),
    scale: new THREE.Vector3(1.0, 0.8, 0.2),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xFF69B4,
    geometry: 'box',
    magicalEffect: true,
    description: 'Couleurs magiques de l\'apprentissage !',
    icon: '🌈'
  },

  // ACCESSORIES
  {
    id: 'magic_glasses',
    name: 'Lunettes Magiques',
    type: 'accessory',
    rarity: 'rare',
    unlockRequirement: { type: 'xp', value: 500 },
    position: new THREE.Vector3(0, 1.6, 0.45),
    scale: new THREE.Vector3(0.6, 0.2, 0.1),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0x000080,
    geometry: 'box',
    magicalEffect: true,
    description: 'Vois les solutions plus clairement !',
    icon: '👓'
  },
  {
    id: 'magic_wand',
    name: 'Baguette Magique',
    type: 'accessory',
    rarity: 'epic',
    unlockRequirement: { type: 'achievement', value: 10 },
    mascotType: ['fairy', 'dragon'],
    position: new THREE.Vector3(1.2, 0.5, 0),
    scale: new THREE.Vector3(0.1, 1.5, 0.1),
    rotation: new THREE.Vector3(0, 0, -0.3),
    color: 0x8B4513,
    geometry: 'cylinder',
    magicalEffect: true,
    animation: 'wand_sparkle',
    description: 'Transforme chaque erreur en apprentissage !',
    icon: '🪄'
  },
  {
    id: 'bow_tie',
    name: 'Nœud Papillon Élégant',
    type: 'accessory',
    rarity: 'common',
    unlockRequirement: { type: 'exercises', value: 25 },
    position: new THREE.Vector3(0, 1.2, 0.5),
    scale: new THREE.Vector3(0.4, 0.2, 0.15),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0x800080,
    geometry: 'box',
    description: 'Pour les occasions spéciales !',
    icon: '🎀'
  },
  {
    id: 'medal_bronze',
    name: 'Médaille de Bronze',
    type: 'accessory',
    rarity: 'common',
    unlockRequirement: { type: 'exercises', value: 20 },
    position: new THREE.Vector3(0, 0.8, 0.5),
    scale: new THREE.Vector3(0.3, 0.3, 0.05),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xCD7F32,
    geometry: 'cylinder',
    description: 'Première étape vers la gloire !',
    icon: '🥉'
  },
  {
    id: 'medal_silver',
    name: 'Médaille d\'Argent',
    type: 'accessory',
    rarity: 'rare',
    unlockRequirement: { type: 'streak', value: 14 },
    position: new THREE.Vector3(0, 0.8, 0.5),
    scale: new THREE.Vector3(0.3, 0.3, 0.05),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xC0C0C0,
    geometry: 'cylinder',
    description: 'Excellent progrès !',
    icon: '🥈'
  },
  {
    id: 'medal_gold',
    name: 'Médaille d\'Or',
    type: 'accessory',
    rarity: 'epic',
    unlockRequirement: { type: 'streak', value: 21 },
    position: new THREE.Vector3(0, 0.8, 0.5),
    scale: new THREE.Vector3(0.3, 0.3, 0.05),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xFFD700,
    geometry: 'cylinder',
    magicalEffect: true,
    description: 'Champion de l\'apprentissage !',
    icon: '🥇'
  },

  // SHOES
  {
    id: 'magic_boots',
    name: 'Bottes Magiques',
    type: 'shoes',
    rarity: 'epic',
    unlockRequirement: { type: 'xp', value: 1500 },
    position: new THREE.Vector3(0, -1.2, 0.3),
    scale: new THREE.Vector3(0.6, 0.4, 0.8),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0x4B0082,
    geometry: 'box',
    magicalEffect: true,
    animation: 'boots_glow',
    description: 'Marche vers le succès avec style !',
    icon: '👢'
  },
  {
    id: 'sneakers',
    name: 'Baskets de Champion',
    type: 'shoes',
    rarity: 'common',
    unlockRequirement: { type: 'exercises', value: 15 },
    position: new THREE.Vector3(0, -1.2, 0.2),
    scale: new THREE.Vector3(0.5, 0.3, 0.7),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0x00FF00,
    geometry: 'box',
    description: 'Confort et performance !',
    icon: '👟'
  },

  // SPECIAL ITEMS
  {
    id: 'rainbow_aura',
    name: 'Aura Arc-en-ciel',
    type: 'special',
    rarity: 'legendary',
    unlockRequirement: { type: 'achievement', value: 25 },
    position: new THREE.Vector3(0, 0, 0),
    scale: new THREE.Vector3(2, 2, 2),
    rotation: new THREE.Vector3(0, 0, 0),
    color: 0xFFFFFF,
    geometry: 'sphere',
    animation: 'rainbow_pulse',
    magicalEffect: true,
    description: 'Rayonne de toute la magie de tes apprentissages !',
    icon: '✨'
  },
  {
    id: 'fire_wings',
    name: 'Ailes de Feu',
    type: 'special',
    rarity: 'legendary',
    unlockRequirement: { type: 'xp', value: 5000 },
    mascotType: ['dragon', 'fairy'],
    position: new THREE.Vector3(0, 0.5, -0.5),
    scale: new THREE.Vector3(1.5, 1.0, 0.2),
    rotation: new THREE.Vector3(0.2, 0, 0),
    color: 0xFF4500,
    geometry: 'box',
    animation: 'wing_flap',
    magicalEffect: true,
    description: 'Vole au sommet de tes capacités !',
    icon: '🔥'
  }
];

// Helper function to create 3D item mesh
export const createItemMesh = (item: WardrobeItem): THREE.Mesh => {
  let geometry: THREE.BufferGeometry;

  switch (item.geometry) {
    case 'box':
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(0.5, 16, 16);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(0.5, 1, 8);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 1, 1);
  }

  const material = new THREE.MeshPhongMaterial({
    color: item.color,
    shininess: item.magicalEffect ? 100 : 30,
    transparent: item.magicalEffect,
    opacity: item.magicalEffect ? 0.9 : 1
  });

  const mesh = new THREE.Mesh(geometry, material);
  
  // Apply item positioning
  mesh.position.copy(item.position);
  mesh.scale.copy(item.scale);
  mesh.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
  
  // Add magical glow effect
  if (item.magicalEffect) {
    const glowGeometry = geometry.clone();
    const glowMaterial = new THREE.MeshPhongMaterial({
      color: item.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.scale.multiplyScalar(1.2);
    mesh.add(glowMesh);
  }

  return mesh;
}; 