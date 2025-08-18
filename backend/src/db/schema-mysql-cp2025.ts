// MySQL Schema for CP 2025 curriculum - Compatible with the SQL schema
import { 
  mysqlTable, 
  serial, 
  varchar, 
  text, 
  int, 
  boolean, 
  timestamp, 
  datetime, 
  json, 
  decimal,
  mysqlEnum,
  unique
} from 'drizzle-orm/mysql-core';

// =============================================================================
// TABLE DES ÉLÈVES (Students)
// =============================================================================
export const students = mysqlTable('students', {
  id: serial('id').primaryKey(),
  prenom: varchar('prenom', { length: 50 }).notNull(),
  nom: varchar('nom', { length: 50 }).notNull(),
  identifiant: varchar('identifiant', { length: 20 }).notNull().unique(),
  motDePasse: varchar('mot_de_passe', { length: 255 }).notNull(),
  classe: varchar('classe', { length: 10 }).notNull().default('CP'),
  niveau: varchar('niveau', { length: 10 }).notNull().default('CP'),
  ageGroup: mysqlEnum('age_group', ['6-8', '9-11']).notNull().default('6-8'),
  dateInscription: datetime('date_inscription').default(new Date()),
  lastLogin: datetime('last_login'),
  totalXp: int('total_xp').default(0),
  currentLevel: int('current_level').default(1),
  currentStreak: int('current_streak').default(0),
  heartsRemaining: int('hearts_remaining').default(3),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

// =============================================================================
// TABLE DES COMPÉTENCES CP 2025
// =============================================================================
export const competencesCp = mysqlTable('competences_cp', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  nom: varchar('nom', { length: 200 }).notNull(),
  matiere: mysqlEnum('matiere', ['FR', 'MA']).notNull(),
  domaine: varchar('domaine', { length: 10 }).notNull(),
  niveauComp: int('niveau_comp').notNull(),
  sousCompetence: int('sous_competence').notNull(),
  description: text('description'),
  seuilMaitrise: decimal('seuil_maitrise', { precision: 3, scale: 2 }).default('0.80'),
  xpReward: int('xp_reward').default(10),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

// =============================================================================
// TABLE DES EXERCICES
// =============================================================================
export const exercises = mysqlTable('exercises', {
  id: serial('id').primaryKey(),
  competenceId: int('competence_id').notNull(),
  type: mysqlEnum('type', ['CALCUL', 'MENTAL_MATH', 'DRAG_DROP', 'QCM', 'LECTURE', 'ECRITURE', 'COMPREHENSION']).notNull(),
  question: text('question').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  options: json('options'),
  difficultyLevel: int('difficulty_level').notNull().default(3),
  xpReward: int('xp_reward').default(5),
  timeLimit: int('time_limit').default(60),
  hintsAvailable: int('hints_available').default(0),
  hintsText: json('hints_text'),
  metadata: json('metadata'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

// =============================================================================
// TABLE DES PROGRÈS DES ÉLÈVES
// =============================================================================
export const studentProgress = mysqlTable('student_progress', {
  id: serial('id').primaryKey(),
  studentId: int('student_id').notNull(),
  competenceId: int('competence_id').notNull(),
  status: mysqlEnum('status', ['not_started', 'learning', 'mastered', 'failed']).default('not_started'),
  currentLevel: int('current_level').default(0),
  successRate: decimal('success_rate', { precision: 3, scale: 2 }).default('0.00'),
  attemptsCount: int('attempts_count').default(0),
  correctAttempts: int('correct_attempts').default(0),
  lastPracticeDate: datetime('last_practice_date'),
  nextReviewDate: datetime('next_review_date'),
  repetitionNumber: int('repetition_number').default(0),
  easinessFactor: decimal('easiness_factor', { precision: 3, scale: 2 }).default('2.5'),
  totalTimeSpent: int('total_time_spent').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  uniqueStudentCompetence: unique('unique_student_competence').on(table.studentId, table.competenceId)
}));

// =============================================================================
// TABLE DES SESSIONS D'APPRENTISSAGE
// =============================================================================
export const learningSessions = mysqlTable('learning_sessions', {
  id: serial('id').primaryKey(),
  studentId: int('student_id').notNull(),
  startedAt: datetime('started_at').notNull(),
  endedAt: datetime('ended_at'),
  exercisesCompleted: int('exercises_completed').default(0),
  totalXpGained: int('total_xp_gained').default(0),
  performanceScore: decimal('performance_score', { precision: 3, scale: 2 }),
  sessionDuration: int('session_duration').default(0),
  competencesWorked: json('competences_worked'),
  createdAt: timestamp('created_at').defaultNow()
});

// =============================================================================
// TABLE DES RÉSULTATS D'EXERCICES
// =============================================================================
export const exerciseResults = mysqlTable('exercise_results', {
  id: serial('id').primaryKey(),
  sessionId: int('session_id').notNull(),
  studentId: int('student_id').notNull(),
  exerciseId: int('exercise_id').notNull(),
  competenceId: int('competence_id').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeSpent: int('time_spent').default(0),
  hintsUsed: int('hints_used').default(0),
  supermemoQuality: int('supermemo_quality').default(3),
  answerGiven: text('answer_given'),
  createdAt: timestamp('created_at').defaultNow()
});

// =============================================================================
// TABLE DES MASCOTS
// =============================================================================
export const mascots = mysqlTable('mascots', {
  id: serial('id').primaryKey(),
  studentId: int('student_id').notNull().unique(),
  type: mysqlEnum('type', ['dragon', 'fairy', 'robot', 'cat', 'owl']).default('dragon'),
  currentEmotion: mysqlEnum('current_emotion', ['idle', 'happy', 'thinking', 'celebrating', 'oops']).default('happy'),
  xpLevel: int('xp_level').default(1),
  equippedItems: json('equipped_items').default('[]'),
  aiState: json('ai_state'),
  lastInteraction: datetime('last_interaction'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

// =============================================================================
// TABLE DES OBJETS DE GARDE-ROBE
// =============================================================================
export const wardrobeItems = mysqlTable('wardrobe_items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: mysqlEnum('type', ['hat', 'clothing', 'accessory', 'shoes', 'special']).notNull(),
  rarity: mysqlEnum('rarity', ['common', 'rare', 'epic', 'legendary']).default('common'),
  unlockRequirementType: mysqlEnum('unlock_requirement_type', ['xp', 'streak', 'exercises', 'achievement']).notNull(),
  unlockRequirementValue: int('unlock_requirement_value').notNull(),
  mascotCompatibility: json('mascot_compatibility'),
  positionData: json('position_data'),
  color: int('color').default(0xFFFFFF),
  geometryType: varchar('geometry_type', { length: 20 }).default('box'),
  magicalEffect: boolean('magical_effect').default(false),
  description: text('description'),
  icon: varchar('icon', { length: 10 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

// =============================================================================
// TABLE DE LA GARDE-ROBE DES ÉLÈVES
// =============================================================================
export const studentWardrobe = mysqlTable('student_wardrobe', {
  id: serial('id').primaryKey(),
  studentId: int('student_id').notNull(),
  itemId: int('item_id').notNull(),
  unlockedAt: datetime('unlocked_at').defaultNow(),
  isEquipped: boolean('is_equipped').default(false),
  equippedAt: datetime('equipped_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniqueStudentItem: unique('unique_student_item').on(table.studentId, table.itemId)
}));

// =============================================================================
// TABLE DES RÉALISATIONS
// =============================================================================
export const achievements = mysqlTable('achievements', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 10 }),
  requirementType: mysqlEnum('requirement_type', ['xp', 'streak', 'exercises', 'competences']).notNull(),
  requirementValue: int('requirement_value').notNull(),
  xpReward: int('xp_reward').default(0),
  rarity: mysqlEnum('rarity', ['common', 'rare', 'epic', 'legendary']).default('common'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

// =============================================================================
// TABLE DES RÉALISATIONS DÉBLOQUÉES
// =============================================================================
export const studentAchievements = mysqlTable('student_achievements', {
  id: serial('id').primaryKey(),
  studentId: int('student_id').notNull(),
  achievementId: int('achievement_id').notNull(),
  unlockedAt: datetime('unlocked_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniqueStudentAchievement: unique('unique_student_achievement').on(table.studentId, table.achievementId)
}));

// =============================================================================
// TABLE DES STATISTIQUES
// =============================================================================
export const studentStats = mysqlTable('student_stats', {
  id: serial('id').primaryKey(),
  studentId: int('student_id').notNull().unique(),
  totalExercisesCompleted: int('total_exercises_completed').default(0),
  totalCorrectAnswers: int('total_correct_answers').default(0),
  totalTimeSpent: int('total_time_spent').default(0),
  averagePerformance: decimal('average_performance', { precision: 3, scale: 2 }).default('0.00'),
  longestStreak: int('longest_streak').default(0),
  competencesMastered: int('competences_mastered').default(0),
  totalAchievements: int('total_achievements').default(0),
  lastActivity: datetime('last_activity'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

// Export relations for future use
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type CompetenceCp = typeof competencesCp.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type StudentProgress = typeof studentProgress.$inferSelect;
export type LearningSession = typeof learningSessions.$inferSelect;
export type Mascot = typeof mascots.$inferSelect;
export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type StudentWardrobe = typeof studentWardrobe.$inferSelect;