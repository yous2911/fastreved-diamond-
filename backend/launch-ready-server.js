/**
 * FastRevEd Kids - Launch Ready Backend Server
 * Comprehensive API server with all endpoints frontend expects
 * Port 5000 to match frontend configuration
 */

const fastify = require('fastify')({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// CORS will be registered in start function

// =============================================================================
// MOCK DATA - Replace with real database later
// =============================================================================

const mockStudents = [
  {
    id: 1,
    prenom: 'Emma',
    nom: 'Martin', 
    identifiant: 'emma.martin',
    classe: 'CP',
    niveau: 'CP',
    ageGroup: '6-8',
    totalXp: 150,
    currentLevel: 3,
    currentStreak: 5,
    heartsRemaining: 3,
    dateInscription: '2024-01-15T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 2,
    prenom: 'Lucas',
    nom: 'Dubois',
    identifiant: 'lucas.dubois', 
    classe: 'CP',
    niveau: 'CP',
    ageGroup: '6-8',
    totalXp: 200,
    currentLevel: 4,
    currentStreak: 8,
    heartsRemaining: 3,
    dateInscription: '2024-01-10T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 3,
    prenom: 'Léa',
    nom: 'Bernard',
    identifiant: 'lea.bernard',
    classe: 'CP', 
    niveau: 'CP',
    ageGroup: '6-8',
    totalXp: 120,
    currentLevel: 2,
    currentStreak: 3,
    heartsRemaining: 2,
    dateInscription: '2024-01-20T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 4,
    prenom: 'Noah',
    nom: 'Garcia',
    identifiant: 'noah.garcia',
    classe: 'CE1',
    niveau: 'CE1', 
    ageGroup: '9-11',
    totalXp: 300,
    currentLevel: 6,
    currentStreak: 12,
    heartsRemaining: 3,
    dateInscription: '2024-01-05T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 5,
    prenom: 'Alice',
    nom: 'Rodriguez',
    identifiant: 'alice.rodriguez',
    classe: 'CE1',
    niveau: 'CE1',
    ageGroup: '9-11', 
    totalXp: 450,
    currentLevel: 8,
    currentStreak: 20,
    heartsRemaining: 3,
    dateInscription: '2024-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  }
];

const mockExercises = [
  {
    id: 1,
    competenceId: 1,
    type: 'MENTAL_MATH',
    question: 'Combien font 5 + 3 ?',
    correctAnswer: '8',
    options: ['6', '7', '8', '9'],
    difficultyLevel: 1,
    xpReward: 10,
    timeLimit: 30,
    hintsAvailable: 1,
    hintsText: ['Compte sur tes doigts !'],
    metadata: { level: 'CP', subject: 'MA' }
  },
  {
    id: 2,
    competenceId: 1,
    type: 'MENTAL_MATH',
    question: 'Combien font 12 - 7 ?',
    correctAnswer: '5',
    options: ['4', '5', '6', '7'],
    difficultyLevel: 2,
    xpReward: 15,
    timeLimit: 45,
    hintsAvailable: 1,
    hintsText: ['Utilise une ligne numérique !'],
    metadata: { level: 'CP', subject: 'MA' }
  },
  {
    id: 3,
    competenceId: 2,
    type: 'DRAG_DROP',
    question: 'Classe ces nombres par ordre croissant',
    correctAnswer: '1,3,5,8',
    options: [1, 3, 5, 8],
    difficultyLevel: 3,
    xpReward: 20,
    timeLimit: 60,
    hintsAvailable: 2,
    hintsText: ['Le plus petit en premier !', 'Croissant = du plus petit au plus grand'],
    metadata: { level: 'CE1', subject: 'MA' }
  }
];

const mockCompetences = [
  {
    id: 1,
    code: 'MA_CP_ADD',
    nom: 'Addition simple',
    matiere: 'MA',
    domaine: 'Nombres et calculs',
    niveauComp: 1,
    sousCompetence: 1,
    description: 'Additionner deux nombres à un chiffre',
    seuilMaitrise: 80,
    xpReward: 10
  },
  {
    id: 2,
    code: 'MA_CP_SUB', 
    nom: 'Soustraction simple',
    matiere: 'MA',
    domaine: 'Nombres et calculs',
    niveauComp: 1,
    sousCompetence: 2,
    description: 'Soustraire un nombre à un chiffre',
    seuilMaitrise: 80,
    xpReward: 15
  }
];

// Simple session storage for logged in students (replace with Redis/database)
let currentSessions = new Map();

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

// Login endpoint
fastify.post('/api/auth/login', async (request, reply) => {
  const { prenom, nom, password } = request.body || {};
  
  fastify.log.info('Login attempt:', { prenom, nom });
  
  if (!prenom || !nom || !password) {
    return reply.status(400).send({
      success: false,
      error: {
        message: 'Prénom, nom et mot de passe requis',
        code: 'MISSING_CREDENTIALS'
      }
    });
  }

  // Find student by name
  const student = mockStudents.find(s => 
    s.prenom.toLowerCase() === prenom.toLowerCase() && 
    s.nom.toLowerCase() === nom.toLowerCase()
  );

  // For demo, accept 'password123' for all students
  if (student && password === 'password123') {
    // Create session
    const sessionToken = 'session_' + Date.now() + '_' + student.id;
    currentSessions.set(sessionToken, {
      studentId: student.id,
      student: student,
      loginTime: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });

    // Set session cookie
    reply.setCookie('session', sessionToken, {
      httpOnly: true,
      secure: false, // Set true in production with HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return {
      success: true,
      data: {
        student: student,
        expiresIn: 24 * 60 * 60 * 1000
      }
    };
  }

  return reply.status(401).send({
    success: false,
    error: {
      message: 'Identifiants invalides',
      code: 'INVALID_CREDENTIALS'
    }
  });
});

// Check authentication status
fastify.get('/api/auth/me', async (request, reply) => {
  const sessionToken = request.cookies.session;
  
  if (!sessionToken) {
    return reply.status(401).send({
      success: false,
      error: {
        message: 'Non authentifié',
        code: 'NOT_AUTHENTICATED'
      }
    });
  }

  const session = currentSessions.get(sessionToken);
  
  if (!session || session.expiresAt < new Date()) {
    currentSessions.delete(sessionToken);
    return reply.status(401).send({
      success: false,
      error: {
        message: 'Session expirée',
        code: 'SESSION_EXPIRED'
      }
    });
  }

  return {
    success: true,
    data: {
      student: session.student
    }
  };
});

// Logout endpoint
fastify.post('/api/auth/logout', async (request, reply) => {
  const sessionToken = request.cookies.session;
  
  if (sessionToken) {
    currentSessions.delete(sessionToken);
  }
  
  reply.clearCookie('session');
  
  return {
    success: true,
    data: {
      message: 'Déconnexion réussie'
    }
  };
});

// =============================================================================
// STUDENT ROUTES
// =============================================================================

// Get student profile
fastify.get('/api/students/profile', async (request, reply) => {
  const sessionToken = request.cookies.session;
  const session = currentSessions.get(sessionToken);
  
  if (!session) {
    return reply.status(401).send({
      success: false,
      error: { message: 'Non authentifié', code: 'NOT_AUTHENTICATED' }
    });
  }

  return {
    success: true,
    data: {
      student: session.student
    }
  };
});

// Update student profile
fastify.put('/api/students/profile', async (request, reply) => {
  const sessionToken = request.cookies.session;
  const session = currentSessions.get(sessionToken);
  
  if (!session) {
    return reply.status(401).send({
      success: false,
      error: { message: 'Non authentifié', code: 'NOT_AUTHENTICATED' }
    });
  }

  const updates = request.body || {};
  
  // Update student data (in real app, update database)
  if (updates.prenom) session.student.prenom = updates.prenom;
  if (updates.nom) session.student.nom = updates.nom;
  
  // Update in mock array too
  const studentIndex = mockStudents.findIndex(s => s.id === session.student.id);
  if (studentIndex >= 0) {
    Object.assign(mockStudents[studentIndex], updates);
    session.student = mockStudents[studentIndex];
  }

  return {
    success: true,
    data: {
      student: session.student
    }
  };
});

// Get student stats
fastify.get('/api/students/stats', async (request, reply) => {
  const sessionToken = request.cookies.session;
  const session = currentSessions.get(sessionToken);
  
  if (!session) {
    return reply.status(401).send({
      success: false,
      error: { message: 'Non authentifié', code: 'NOT_AUTHENTICATED' }
    });
  }

  return {
    success: true,
    data: {
      stats: {
        totalExercises: 45,
        correctAnswers: 38,
        averageScore: 84,
        timeSpent: 1250,
        streak: session.student.currentStreak,
        level: session.student.currentLevel,
        xp: session.student.totalXp
      }
    }
  };
});

// =============================================================================
// COMPETENCES & CURRICULUM ROUTES
// =============================================================================

// Get competences
fastify.get('/api/competences', async (request, reply) => {
  const { matiere, niveau } = request.query || {};
  
  let competences = mockCompetences;
  
  if (matiere) {
    competences = competences.filter(c => c.matiere === matiere);
  }
  
  return {
    success: true,
    data: competences
  };
});

// =============================================================================
// EXERCISE ROUTES
// =============================================================================

// Get exercises
fastify.get('/api/exercises', async (request, reply) => {
  const { competenceId, level, type, difficulty, limit = 10 } = request.query || {};
  
  let exercises = mockExercises;
  
  if (competenceId) {
    exercises = exercises.filter(e => e.competenceId == competenceId);
  }
  
  if (level) {
    exercises = exercises.filter(e => e.metadata?.level === level);
  }
  
  if (type) {
    exercises = exercises.filter(e => e.type === type);
  }
  
  return {
    success: true,
    data: {
      items: exercises.slice(0, parseInt(limit)),
      total: exercises.length
    }
  };
});

// Get exercises by competence
fastify.get('/api/exercises/by-competence/:competenceId', async (request, reply) => {
  const competenceId = parseInt(request.params.competenceId);
  const exercises = mockExercises.filter(e => e.competenceId === competenceId);
  
  return {
    success: true,
    data: {
      items: exercises,
      total: exercises.length
    }
  };
});

// Get exercises by level
fastify.get('/api/exercises/by-level/:level', async (request, reply) => {
  const level = request.params.level;
  const exercises = mockExercises.filter(e => e.metadata?.level === level);
  
  return {
    success: true,
    data: exercises
  };
});

// Get random exercises
fastify.get('/api/exercises/random/:level', async (request, reply) => {
  const level = request.params.level;
  const { count = 5, exclude_types } = request.query || {};
  
  let exercises = mockExercises.filter(e => e.metadata?.level === level);
  
  if (exclude_types) {
    const excludeList = Array.isArray(exclude_types) ? exclude_types : [exclude_types];
    exercises = exercises.filter(e => !excludeList.includes(e.type));
  }
  
  // Shuffle and take requested count
  const shuffled = exercises.sort(() => Math.random() - 0.5);
  
  return {
    success: true,
    data: shuffled.slice(0, parseInt(count))
  };
});

// Submit exercise attempt
fastify.post('/api/exercises/attempt', async (request, reply) => {
  const { exerciseId, score, completed, timeSpent, answers } = request.body || {};
  const sessionToken = request.cookies.session;
  const session = currentSessions.get(sessionToken);
  
  if (!session) {
    return reply.status(401).send({
      success: false,
      error: { message: 'Non authentifié', code: 'NOT_AUTHENTICATED' }
    });
  }

  const exercise = mockExercises.find(e => e.id == exerciseId);
  if (!exercise) {
    return reply.status(404).send({
      success: false,
      error: { message: 'Exercice non trouvé', code: 'EXERCISE_NOT_FOUND' }
    });
  }

  // Calculate XP earned
  const scoreNum = parseFloat(score) || 0;
  let xpEarned = 0;
  if (scoreNum >= 0.8) {
    xpEarned = exercise.xpReward;
  } else if (scoreNum >= 0.6) {
    xpEarned = Math.floor(exercise.xpReward * 0.7);
  } else if (scoreNum >= 0.4) {
    xpEarned = Math.floor(exercise.xpReward * 0.5);
  }

  // Update student XP
  session.student.totalXp += xpEarned;
  
  // Update streak
  if (scoreNum >= 0.8) {
    session.student.currentStreak += 1;
  } else {
    session.student.currentStreak = 0;
  }

  // Check for level up
  let masteryLevelChanged = false;
  const newLevel = Math.floor(session.student.totalXp / 100) + 1;
  if (newLevel > session.student.currentLevel) {
    session.student.currentLevel = newLevel;
    masteryLevelChanged = true;
  }

  return {
    success: true,
    data: {
      attempt: {
        id: Date.now(),
        exerciseId: parseInt(exerciseId),
        studentId: session.student.id,
        score: scoreNum,
        completed: completed === 'true',
        timeSpent: parseInt(timeSpent) || 0,
        submittedAt: new Date().toISOString()
      },
      xpEarned,
      masteryLevelChanged
    }
  };
});

// =============================================================================
// MASCOT SYSTEM ROUTES
// =============================================================================

// Get mascot
fastify.get('/api/mascots/:studentId', async (request, reply) => {
  const studentId = parseInt(request.params.studentId);
  const student = mockStudents.find(s => s.id === studentId);
  
  if (!student) {
    return reply.status(404).send({
      success: false,
      error: { message: 'Élève non trouvé', code: 'STUDENT_NOT_FOUND' }
    });
  }

  return {
    success: true,
    data: {
      mascot: {
        id: 1,
        studentId: studentId,
        type: 'dragon',
        currentEmotion: 'idle',
        xpLevel: student.currentLevel,
        equippedItems: [],
        aiState: {},
        lastInteraction: new Date().toISOString()
      }
    }
  };
});

// Update mascot
fastify.put('/api/mascots/:studentId', async (request, reply) => {
  const studentId = parseInt(request.params.studentId);
  const updates = request.body || {};
  
  return {
    success: true,
    data: {
      mascot: {
        id: 1,
        studentId: studentId,
        type: updates.type || 'dragon',
        currentEmotion: updates.currentEmotion || 'idle',
        xpLevel: mockStudents.find(s => s.id === studentId)?.currentLevel || 1,
        equippedItems: updates.equippedItems || [],
        aiState: updates.aiState || {},
        lastInteraction: new Date().toISOString()
      }
    }
  };
});

// =============================================================================
// WARDROBE SYSTEM ROUTES
// =============================================================================

// Get wardrobe
fastify.get('/api/wardrobe/:studentId', async (request, reply) => {
  const studentId = parseInt(request.params.studentId);
  
  const mockWardrobeItems = [
    {
      id: 1,
      name: 'Chapeau magique',
      type: 'hat',
      rarity: 'rare',
      unlockRequirementType: 'xp',
      unlockRequirementValue: 100,
      description: 'Un chapeau qui brille de mille feux',
      icon: '🎩',
      isUnlocked: true,
      isEquipped: false,
      canUnlock: true,
      progressToUnlock: 100
    }
  ];

  return {
    success: true,
    data: {
      items: mockWardrobeItems,
      summary: {
        total: mockWardrobeItems.length,
        unlocked: 1,
        equipped: 0,
        canUnlock: 0
      },
      studentStats: {
        xp: mockStudents.find(s => s.id === studentId)?.totalXp || 0
      }
    }
  };
});

// =============================================================================
// SESSION MANAGEMENT ROUTES
// =============================================================================

// Start learning session
fastify.post('/api/sessions/start', async (request, reply) => {
  const { studentId, competencesPlanned } = request.body || {};
  
  return {
    success: true,
    data: {
      session: {
        id: Date.now(),
        studentId: studentId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        exercisesCompleted: 0,
        totalXpGained: 0,
        performanceScore: null,
        sessionDuration: 0,
        competencesWorked: competencesPlanned || []
      }
    }
  };
});

// Get active session
fastify.get('/api/sessions/active', async (request, reply) => {
  return {
    success: true,
    data: {
      hasActiveSession: false,
      session: null
    }
  };
});

// =============================================================================
// HEALTH CHECK ROUTE
// =============================================================================

fastify.get('/api/health', async (request, reply) => {
  return {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: ['/api/auth/login', '/api/auth/me', '/api/auth/logout'],
      students: ['/api/students/profile', '/api/students/stats'],
      exercises: ['/api/exercises', '/api/exercises/attempt'],
      competences: ['/api/competences'],
      mascots: ['/api/mascots/:studentId'],
      wardrobe: ['/api/wardrobe/:studentId'],
      sessions: ['/api/sessions/start', '/api/sessions/active']
    }
  };
});

// Root route
fastify.get('/', async (request, reply) => {
  return {
    success: true,
    message: 'FastRevEd Kids API - Launch Ready! 🚀',
    timestamp: new Date().toISOString(),
    documentation: 'GET /api/health for endpoint list'
  };
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const start = async () => {
  try {
    // Register CORS plugin first
    await fastify.register(require('@fastify/cors'), {
      origin: true, // Allow all origins for development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });
    
    // Register Cookie plugin 
    await fastify.register(require('@fastify/cookie'), {
      secret: 'my-secret-key-for-development-only'
    });
    
    // Give plugins time to register before starting server
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await fastify.listen({ port: 5000, host: '0.0.0.0' });
    
    fastify.log.info('🚀 FastRevEd Kids Backend - LAUNCH READY!');
    fastify.log.info('📍 Server: http://localhost:5000');
    fastify.log.info('🎯 Frontend Compatible: Port 5000 ✅');
    fastify.log.info('📚 Mock Students: 5 test accounts available');
    fastify.log.info('🔑 Login: prenom/nom + password123');
    fastify.log.info('🏥 Health Check: GET /api/health');
    fastify.log.info('');
    fastify.log.info('Test Students Available:');
    mockStudents.forEach(student => {
      fastify.log.info(`  👤 ${student.prenom} ${student.nom} (Level ${student.currentLevel}, ${student.totalXp} XP)`);
    });
    
  } catch (err) {
    console.error('❌ Error starting server:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  }
};

start();