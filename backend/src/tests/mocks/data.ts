import { vi } from 'vitest';

// Mock students data
export const mockStudents = [
  {
    id: 1,
    prenom: 'Alice',
    nom: 'Dupont',
    niveau: 'CP',
    points: 150,
    dateCreation: new Date('2024-01-15'),
    dernierAcces: new Date('2024-07-20'),
    statsPoints: {
      total: 150,
      semaine: 45,
      mois: 120,
    },
  },
  {
    id: 2,
    prenom: 'Bob',
    nom: 'Martin',
    niveau: 'CE1',
    points: 200,
    dateCreation: new Date('2024-02-01'),
    dernierAcces: new Date('2024-07-19'),
    statsPoints: {
      total: 200,
      semaine: 60,
      mois: 180,
    },
  },
  {
    id: 3,
    prenom: 'Charlie',
    nom: 'Dubois',
    niveau: 'CE2',
    points: 300,
    dateCreation: new Date('2024-01-10'),
    dernierAcces: new Date('2024-07-20'),
    statsPoints: {
      total: 300,
      semaine: 75,
      mois: 250,
    },
  },
];

// Mock exercises data
export const mockExercises = [
  {
    id: 1,
    titre: 'Addition simple',
    type: 'calcul',
    niveau: 'CP',
    difficulte: 1,
    matiereId: 1,
    chapitreId: 1,
    enonce: 'Calculez 3 + 4',
    reponseAttendue: '7',
    explicationReponse: '3 + 4 = 7',
    pointsReussite: 10,
    pointsEchec: 2,
    tempsLimiteSecondes: 60,
    aidesDisponibles: ['Utilise tes doigts', 'Compte de 3 à 7'],
  },
  {
    id: 2,
    titre: 'Soustraction simple',
    type: 'calcul',
    niveau: 'CP',
    difficulte: 2,
    matiereId: 1,
    chapitreId: 1,
    enonce: 'Calculez 8 - 3',
    reponseAttendue: '5',
    explicationReponse: '8 - 3 = 5',
    pointsReussite: 12,
    pointsEchec: 3,
    tempsLimiteSecondes: 90,
    aidesDisponibles: ['Utilise tes doigts', 'Compte à rebours de 8'],
  },
  {
    id: 3,
    titre: 'Lecture de mot',
    type: 'lecture',
    niveau: 'CP',
    difficulte: 1,
    matiereId: 2,
    chapitreId: 3,
    enonce: 'Lis ce mot : CHAT',
    reponseAttendue: 'chat',
    explicationReponse: 'Le mot est "chat"',
    pointsReussite: 8,
    pointsEchec: 2,
    tempsLimiteSecondes: 45,
    aidesDisponibles: ['Décompose les syllabes', 'CH-AT'],
  },
];

// Mock subjects data
export const mockSubjects = [
  {
    id: 1,
    nom: 'Mathématiques',
    description: 'Calculs et géométrie',
    couleur: '#4F46E5',
    icone: '🔢',
    ordre: 1,
  },
  {
    id: 2,
    nom: 'Français',
    description: 'Lecture et écriture',
    couleur: '#DC2626',
    icone: '📚',
    ordre: 2,
  },
  {
    id: 3,
    nom: 'Sciences',
    description: 'Découverte du monde',
    couleur: '#059669',
    icone: '🔬',
    ordre: 3,
  },
];

// Mock chapters data
export const mockChapters = [
  {
    id: 1,
    nom: 'Addition et soustraction',
    description: 'Opérations de base',
    matiereId: 1,
    niveau: 'CP',
    ordre: 1,
  },
  {
    id: 2,
    nom: 'Multiplication',
    description: 'Tables de multiplication',
    matiereId: 1,
    niveau: 'CE1',
    ordre: 2,
  },
  {
    id: 3,
    nom: 'Lecture de mots',
    description: 'Premiers mots simples',
    matiereId: 2,
    niveau: 'CP',
    ordre: 1,
  },
];

// Mock attempts data
export const mockAttempts = [
  {
    id: 1,
    etudiantId: 1,
    exerciceId: 1,
    reponse: '7',
    reussi: true,
    tempsSecondes: 25,
    aidesUtilisees: 0,
    pointsGagnes: 10,
    dateCreation: new Date('2024-07-20T10:30:00'),
  },
  {
    id: 2,
    etudiantId: 1,
    exerciceId: 2,
    reponse: '4',
    reussi: false,
    tempsSecondes: 45,
    aidesUtilisees: 1,
    pointsGagnes: 3,
    dateCreation: new Date('2024-07-20T10:32:00'),
  },
];

// Mock sessions data
export const mockSessions = [
  {
    id: 1,
    etudiantId: 1,
    dateDebut: new Date('2024-07-20T10:00:00'),
    dateFin: new Date('2024-07-20T10:45:00'),
    dureeSecondes: 2700,
    exercicesReussis: 8,
    exercicesEchoues: 2,
    pointsGagnes: 95,
    progression: 0.8,
  },
  {
    id: 2,
    etudiantId: 1,
    dateDebut: new Date('2024-07-19T14:00:00'),
    dateFin: new Date('2024-07-19T14:30:00'),
    dureeSecondes: 1800,
    exercicesReussis: 6,
    exercicesEchoues: 1,
    pointsGagnes: 65,
    progression: 0.85,
  },
];

// Mock revision data (spaced repetition)
export const mockRevisions = [
  {
    id: 1,
    etudiantId: 1,
    exerciceId: 1,
    prochaineDateRevision: new Date('2024-07-21'),
    intervalleJours: 1,
    facteurFacilite: 2.5,
    nombreRevisions: 3,
    dernierResultat: true,
    dateCreation: new Date('2024-07-18'),
  },
  {
    id: 2,
    etudiantId: 1,
    exerciceId: 3,
    prochaineDateRevision: new Date('2024-07-22'),
    intervalleJours: 3,
    facteurFacilite: 2.8,
    nombreRevisions: 2,
    dernierResultat: true,
    dateCreation: new Date('2024-07-19'),
  },
];

// Authentication tokens for testing
export const mockAuthTokens = {
  valid: 'mock-jwt-token-alice',
  invalid: 'invalid-token',
  expired: 'expired-token',
};

// Mock JWT payloads
export const mockJwtPayloads = {
  alice: {
    studentId: 1,
    prenom: 'Alice',
    nom: 'Dupont',
    niveau: 'CP',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24h from now
  },
  bob: {
    studentId: 2,
    prenom: 'Bob',
    nom: 'Martin',
    niveau: 'CE1',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24h from now
  },
};

// Helper functions for tests
export const mockHelpers = {
  // Get student by ID
  getStudentById: (id: number) => mockStudents.find(s => s.id === id),
  
  // Get exercises by level
  getExercisesByLevel: (niveau: string) => mockExercises.filter(e => e.niveau === niveau),
  
  // Get exercises by subject
  getExercisesBySubject: (matiereId: number) => mockExercises.filter(e => e.matiereId === matiereId),
  
  // Get student attempts
  getStudentAttempts: (etudiantId: number) => mockAttempts.filter(a => a.etudiantId === etudiantId),
  
  // Get due revisions for student
  getDueRevisions: (etudiantId: number) => {
    const now = new Date();
    return mockRevisions.filter(r => 
      r.etudiantId === etudiantId && 
      new Date(r.prochaineDateRevision) <= now
    );
  },
  
  // Create mock successful attempt response
  createSuccessfulAttemptResponse: (exerciseId: number, pointsGagnes: number) => ({
    success: true,
    data: {
      reussi: true,
      pointsGagnes,
      exerciseId,
      progression: {
        exercicesReussis: 9,
        exercicesEchoues: 2,
        tauxReussite: 0.82,
      },
      recommandations: {
        prochainExercice: mockExercises.find(e => e.id === exerciseId + 1),
        revisions: [],
      },
    },
  }),
  
  // Create mock failed attempt response
  createFailedAttemptResponse: (exerciseId: number, pointsGagnes: number) => ({
    success: true,
    data: {
      reussi: false,
      pointsGagnes,
      exerciseId,
      progression: {
        exercicesReussis: 8,
        exercicesEchoues: 3,
        tauxReussite: 0.73,
      },
      recommandations: {
        prochainExercice: mockExercises.find(e => e.id === exerciseId),
        revisions: [mockExercises.find(e => e.id === exerciseId)],
      },
    },
  }),
};

// Database query mocks
export const mockDbQueries = {
  // Student queries
  findStudentByName: vi.fn().mockImplementation((prenom: string, nom: string) => {
    return Promise.resolve([mockStudents.find(s => s.prenom === prenom && s.nom === nom)]);
  }),
  
  findStudentById: vi.fn().mockImplementation((id: number) => {
    return Promise.resolve([mockStudents.find(s => s.id === id)]);
  }),
  
  // Exercise queries
  findExercisesByLevel: vi.fn().mockImplementation((niveau: string) => {
    return Promise.resolve(mockExercises.filter(e => e.niveau === niveau));
  }),
  
  findExerciseById: vi.fn().mockImplementation((id: number) => {
    return Promise.resolve([mockExercises.find(e => e.id === id)]);
  }),
  
  // Attempt queries
  insertAttempt: vi.fn().mockImplementation(() => {
    return Promise.resolve({ affectedRows: 1, insertId: mockAttempts.length + 1 });
  }),
  
  findStudentAttempts: vi.fn().mockImplementation((etudiantId: number) => {
    return Promise.resolve(mockAttempts.filter(a => a.etudiantId === etudiantId));
  }),
  
  // Revision queries
  findDueRevisions: vi.fn().mockImplementation((etudiantId: number) => {
    return Promise.resolve(mockHelpers.getDueRevisions(etudiantId));
  }),
  
  updateRevision: vi.fn().mockImplementation(() => {
    return Promise.resolve({ affectedRows: 1 });
  }),
};

export default {
  mockStudents,
  mockExercises,
  mockSubjects,
  mockChapters,
  mockAttempts,
  mockSessions,
  mockRevisions,
  mockAuthTokens,
  mockJwtPayloads,
  mockHelpers,
  mockDbQueries,
}; 