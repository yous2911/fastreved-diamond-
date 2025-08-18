import { mysqlTable, varchar, int, decimal, timestamp, text, boolean, json, date, blob } from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel, relations, sql } from 'drizzle-orm';

// =============================================================================
// CORE TABLES
// =============================================================================

// Students table
export const students = mysqlTable('students', {
  id: int('id').primaryKey().autoincrement(),
  prenom: varchar('prenom', { length: 100 }).notNull(),
  nom: varchar('nom', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  dateNaissance: date('date_naissance').notNull(),
  niveauActuel: varchar('niveau_actuel', { length: 20 }).notNull(),
  totalPoints: int('total_points').default(0),
  serieJours: int('serie_jours').default(0),
  mascotteType: varchar('mascotte_type', { length: 50 }).default('dragon'),
  dernierAcces: timestamp('dernier_acces'),
  estConnecte: integer('est_connecte', { mode: 'boolean' }).default(false),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: text('locked_until'), // ISO datetime string
  passwordResetToken: text('password_reset_token', { length: 255 }),
  passwordResetExpires: text('password_reset_expires'), // ISO datetime string
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Exercises table
export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titre: varchar('titre', { length: 200 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(),
  difficulte: varchar('difficulte', { length: 50 }).notNull(),
  xp: int('xp').default(10),
  configuration: json('configuration'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Student progress table (legacy - kept for compatibility)
export const studentProgress = mysqlTable('student_progress', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  exerciseId: int('exercise_id').notNull().references(() => exercises.id),
  completed: boolean('completed').default(false),
  score: int('score').default(0),
  timeSpent: int('time_spent').default(0),
  attempts: int('attempts').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// =============================================================================
// CP2025 ENHANCED PROGRESS TRACKING TABLES
// =============================================================================

// Detailed student competence progress
export const studentCompetenceProgress = mysqlTable('student_competence_progress', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  niveau: varchar('niveau', { length: 10 }).notNull(),
  matiere: varchar('matiere', { length: 30 }).notNull(),
  domaine: varchar('domaine', { length: 10 }).notNull(),
  
  // Progress tracking fields
  masteryLevel: varchar('mastery_level', { length: 20 }).notNull().default('not_started'),
  progressPercent: int('progress_percent').default(0),
  totalAttempts: int('total_attempts').default(0),
  successfulAttempts: int('successful_attempts').default(0),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0.00'),
  
  // Time tracking
  totalTimeSpent: int('total_time_spent').default(0),
  averageTimePerAttempt: int('average_time_per_attempt').default(0),
  
  // Adaptive learning data
  difficultyLevel: decimal('difficulty_level', { precision: 3, scale: 1 }).default('1.0'),
  consecutiveSuccesses: int('consecutive_successes').default(0),
  consecutiveFailures: int('consecutive_failures').default(0),
  
  // Timestamps
  firstAttemptAt: timestamp('first_attempt_at'),
  lastAttemptAt: timestamp('last_attempt_at'),
  masteredAt: timestamp('mastered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Competence prerequisites and dependencies
export const competencePrerequisites = mysqlTable('competence_prerequisites', {
  id: int('id').primaryKey().autoincrement(),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  prerequisiteCode: varchar('prerequisite_code', { length: 20 }).notNull(),
  
  // Prerequisite type and strength
  prerequisiteType: varchar('prerequisite_type', { length: 20 }).notNull().default('required'),
  masteryThreshold: int('mastery_threshold').default(80),
  
  // Learning path metadata
  weight: decimal('weight', { precision: 3, scale: 1 }).default('1.0'),
  description: text('description'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Student learning path and recommendations
export const studentLearningPath = mysqlTable('student_learning_path', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  
  // Path status
  status: varchar('status', { length: 20 }).notNull().default('available'),
  priority: varchar('priority', { length: 20 }).notNull().default('normal'),
  
  // Adaptive recommendations
  recommendedDifficulty: varchar('recommended_difficulty', { length: 30 }).notNull().default('decouverte'),
  estimatedCompletionTime: int('estimated_completion_time'),
  personalizedOrder: int('personalized_order').default(0),
  
  // Blocking and unlocking
  isBlocked: boolean('is_blocked').default(false),
  blockingReasons: json('blocking_reasons'),
  unlockedAt: timestamp('unlocked_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// =============================================================================
// ANALYTICS AND REPORTING TABLES
// =============================================================================

// Daily learning analytics
export const dailyLearningAnalytics = mysqlTable('daily_learning_analytics', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  analyticsDate: date('analytics_date').notNull(),
  
  // Activity metrics
  totalSessionTime: int('total_session_time').default(0),
  exercisesAttempted: int('exercises_attempted').default(0),
  exercisesCompleted: int('exercises_completed').default(0),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0.00'),
  
  // Subject breakdown
  francaisTime: int('francais_time').default(0),
  mathematiquesTime: int('mathematiques_time').default(0),
  sciencesTime: int('sciences_time').default(0),
  histoireGeographieTime: int('histoire_geographie_time').default(0),
  anglaisTime: int('anglais_time').default(0),
  
  // Competence progress
  competencesMastered: int('competences_mastered').default(0),
  competencesProgressed: int('competences_progressed').default(0),
  
  // Engagement metrics
  streakDays: int('streak_days').default(0),
  xpEarned: int('xp_earned').default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Weekly progress summaries
export const weeklyProgressSummary = mysqlTable('weekly_progress_summary', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  weekStartDate: date('week_start_date').notNull(),
  weekEndDate: date('week_end_date').notNull(),
  weekOfYear: int('week_of_year').notNull(),
  yearNumber: int('year_number').notNull(),
  
  // Weekly totals
  totalLearningTime: int('total_learning_time').default(0),
  totalExercises: int('total_exercises').default(0),
  totalXpEarned: int('total_xp_earned').default(0),
  
  // Progress metrics
  competencesMastered: int('competences_mastered').default(0),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0.00'),
  improvementRate: decimal('improvement_rate', { precision: 5, scale: 2 }).default('0.00'),
  
  // Subject performance
  francaisProgress: decimal('francais_progress', { precision: 5, scale: 2 }).default('0.00'),
  mathematiquesProgress: decimal('mathematiques_progress', { precision: 5, scale: 2 }).default('0.00'),
  sciencesProgress: decimal('sciences_progress', { precision: 5, scale: 2 }).default('0.00'),
  histoireGeographieProgress: decimal('histoire_geographie_progress', { precision: 5, scale: 2 }).default('0.00'),
  anglaisProgress: decimal('anglais_progress', { precision: 5, scale: 2 }).default('0.00'),
  
  // Goals and achievements
  weeklyGoalMet: boolean('weekly_goal_met').default(false),
  achievementsUnlocked: int('achievements_unlocked').default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Learning session tracking
export const learningSessionTracking = mysqlTable('learning_session_tracking', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: int('student_id').notNull().references(() => students.id),
  
  // Session metadata
  sessionStart: timestamp('session_start').notNull(),
  sessionEnd: timestamp('session_end'),
  totalDuration: int('total_duration').default(0),
  
  // Activity tracking
  exercisesAttempted: int('exercises_attempted').default(0),
  exercisesCompleted: int('exercises_completed').default(0),
  competencesWorked: json('competences_worked'),
  
  // Performance metrics
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0.00'),
  xpEarned: int('xp_earned').default(0),
  streakIncrement: int('streak_increment').default(0),
  
  // Engagement metrics
  focusScore: decimal('focus_score', { precision: 5, scale: 2 }).default('0.00'),
  motivationLevel: varchar('motivation_level', { length: 20 }).default('neutral'),
  
  // Device and context
  deviceType: varchar('device_type', { length: 20 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Exercise performance analytics
export const exercisePerformanceAnalytics = mysqlTable('exercise_performance_analytics', {
  id: int('id').primaryKey().autoincrement(),
  exerciseId: int('exercise_id').notNull().references(() => exercises.id),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  weekOfYear: int('week_of_year').notNull(),
  yearNumber: int('year_number').notNull(),
  
  // Performance aggregates
  totalAttempts: int('total_attempts').default(0),
  successfulAttempts: int('successful_attempts').default(0),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0.00'),
  averageCompletionTime: int('average_completion_time').default(0),
  
  // Difficulty analysis
  perceivedDifficulty: decimal('perceived_difficulty', { precision: 3, scale: 1 }).default('0.0'),
  dropoffRate: decimal('dropoff_rate', { precision: 5, scale: 2 }).default('0.00'),
  retryRate: decimal('retry_rate', { precision: 5, scale: 2 }).default('0.00'),
  
  // Adaptive metrics
  optimalDifficultyLevel: decimal('optimal_difficulty_level', { precision: 3, scale: 1 }).default('1.0'),
  recommendedPrerequisites: json('recommended_prerequisites'),
  
  lastUpdated: timestamp('last_updated').notNull().defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Student achievement tracking
export const studentAchievements = mysqlTable('student_achievements', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  
  // Achievement metadata
  achievementType: varchar('achievement_type', { length: 30 }).notNull(),
  achievementCode: varchar('achievement_code', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  
  // Achievement data
  category: varchar('category', { length: 20 }).notNull(),
  difficulty: varchar('difficulty', { length: 20 }).notNull().default('bronze'),
  xpReward: int('xp_reward').default(0),
  badgeIconUrl: varchar('badge_icon_url', { length: 500 }),
  
  // Tracking
  currentProgress: int('current_progress').default(0),
  maxProgress: int('max_progress').default(100),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  
  // Visibility
  isVisible: boolean('is_visible').default(true),
  displayOrder: int('display_order').default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// =============================================================================
// LEGACY COMPATIBILITY TABLES
// =============================================================================

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: int('student_id').references(() => students.id),
  data: text('data').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const revisions = mysqlTable('revisions', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').references(() => students.id),
  exerciseId: int('exercise_id').references(() => exercises.id),
  revisionDate: date('revision_date').notNull(),
  score: int('score').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const modules = mysqlTable('modules', {
  id: int('id').primaryKey().autoincrement(),
  titre: varchar('titre', { length: 200 }).notNull(),
  description: text('description'),
  matiere: varchar('matiere', { length: 50 }).notNull(),
  niveau: varchar('niveau', { length: 20 }).notNull(),
  ordre: int('ordre').default(0),
  estActif: boolean('est_actif').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Legacy alias
export const progress = studentProgress;

// =============================================================================
// RELATIONS
// =============================================================================

// Student competence progress relations
export const studentCompetenceProgressRelations = relations(studentCompetenceProgress, ({ one }) => ({
  student: one(students, {
    fields: [studentCompetenceProgress.studentId],
    references: [students.id],
  }),
}));

// Student learning path relations
export const studentLearningPathRelations = relations(studentLearningPath, ({ one }) => ({
  student: one(students, {
    fields: [studentLearningPath.studentId],
    references: [students.id],
  }),
}));

// Daily learning analytics relations
export const dailyLearningAnalyticsRelations = relations(dailyLearningAnalytics, ({ one }) => ({
  student: one(students, {
    fields: [dailyLearningAnalytics.studentId],
    references: [students.id],
  }),
}));

// Weekly progress summary relations
export const weeklyProgressSummaryRelations = relations(weeklyProgressSummary, ({ one }) => ({
  student: one(students, {
    fields: [weeklyProgressSummary.studentId],
    references: [students.id],
  }),
}));

// Learning session tracking relations
export const learningSessionTrackingRelations = relations(learningSessionTracking, ({ one }) => ({
  student: one(students, {
    fields: [learningSessionTracking.studentId],
    references: [students.id],
  }),
}));

// Exercise performance analytics relations
export const exercisePerformanceAnalyticsRelations = relations(exercisePerformanceAnalytics, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exercisePerformanceAnalytics.exerciseId],
    references: [exercises.id],
  }),
}));

// Student achievements relations
export const studentAchievementsRelations = relations(studentAchievements, ({ one }) => ({
  student: one(students, {
    fields: [studentAchievements.studentId],
    references: [students.id],
  }),
}));

// Updated students relations to include new tables
export const studentsRelations = relations(students, ({ many }) => ({
  // Legacy tables
  progress: many(studentProgress),
  sessions: many(sessions),
  revisions: many(revisions),
  
  // Enhanced CP2025 tables
  competenceProgress: many(studentCompetenceProgress),
  learningPath: many(studentLearningPath),
  dailyAnalytics: many(dailyLearningAnalytics),
  weeklyProgress: many(weeklyProgressSummary),
  learningSessions: many(learningSessionTracking),
  achievements: many(studentAchievements),
}));

// Exercise relations
export const exercisesRelations = relations(exercises, ({ many }) => ({
  progress: many(studentProgress),
  performanceAnalytics: many(exercisePerformanceAnalytics),
}));

// =============================================================================
// TYPESCRIPT TYPE EXPORTS
// =============================================================================

// Core table types
export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;

export type Exercise = InferSelectModel<typeof exercises>;
export type NewExercise = InferInsertModel<typeof exercises>;

export type Progress = InferSelectModel<typeof studentProgress>;
export type NewProgress = InferInsertModel<typeof studentProgress>;

// Enhanced CP2025 table types
export type StudentCompetenceProgress = InferSelectModel<typeof studentCompetenceProgress>;
export type NewStudentCompetenceProgress = InferInsertModel<typeof studentCompetenceProgress>;

export type CompetencePrerequisite = InferSelectModel<typeof competencePrerequisites>;
export type NewCompetencePrerequisite = InferInsertModel<typeof competencePrerequisites>;

export type StudentLearningPath = InferSelectModel<typeof studentLearningPath>;
export type NewStudentLearningPath = InferInsertModel<typeof studentLearningPath>;

// Analytics types
export type DailyLearningAnalytics = InferSelectModel<typeof dailyLearningAnalytics>;
export type NewDailyLearningAnalytics = InferInsertModel<typeof dailyLearningAnalytics>;

export type WeeklyProgressSummary = InferSelectModel<typeof weeklyProgressSummary>;
export type NewWeeklyProgressSummary = InferInsertModel<typeof weeklyProgressSummary>;

export type LearningSessionTracking = InferSelectModel<typeof learningSessionTracking>;
export type NewLearningSessionTracking = InferInsertModel<typeof learningSessionTracking>;

export type ExercisePerformanceAnalytics = InferSelectModel<typeof exercisePerformanceAnalytics>;
export type NewExercisePerformanceAnalytics = InferInsertModel<typeof exercisePerformanceAnalytics>;

export type StudentAchievement = InferSelectModel<typeof studentAchievements>;
export type NewStudentAchievement = InferInsertModel<typeof studentAchievements>;

// Legacy compatibility types
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Revision = InferSelectModel<typeof revisions>;
export type NewRevision = InferInsertModel<typeof revisions>;

export type Module = InferSelectModel<typeof modules>;
export type NewModule = InferInsertModel<typeof modules>;

// =============================================================================
// ENUMS AND CONSTANTS FOR TYPE SAFETY
// =============================================================================

// Mastery levels for competence progress
export const MasteryLevels = {
  NOT_STARTED: 'not_started',
  DISCOVERING: 'discovering',
  PRACTICING: 'practicing',
  MASTERING: 'mastering',
  MASTERED: 'mastered',
} as const;

export type MasteryLevel = typeof MasteryLevels[keyof typeof MasteryLevels];

// Learning path status
export const PathStatus = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
} as const;

export type PathStatusType = typeof PathStatus[keyof typeof PathStatus];

// Priority levels
export const PriorityLevels = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type PriorityLevel = typeof PriorityLevels[keyof typeof PriorityLevels];

// Achievement types
export const AchievementTypes = {
  COMPETENCE_MASTERY: 'competence_mastery',
  STREAK: 'streak',
  SCORE_MILESTONE: 'score_milestone',
  TIME_GOAL: 'time_goal',
  SPECIAL_EVENT: 'special_event',
} as const;

export type AchievementType = typeof AchievementTypes[keyof typeof AchievementTypes];

// Achievement categories
export const AchievementCategories = {
  ACADEMIC: 'academic',
  ENGAGEMENT: 'engagement',
  PROGRESS: 'progress',
  SOCIAL: 'social',
  SPECIAL: 'special',
} as const;

export type AchievementCategory = typeof AchievementCategories[keyof typeof AchievementCategories];

// Achievement difficulty levels
export const AchievementDifficulties = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
} as const;

export type AchievementDifficulty = typeof AchievementDifficulties[keyof typeof AchievementDifficulties];

// Motivation levels
export const MotivationLevels = {
  LOW: 'low',
  NEUTRAL: 'neutral',
  HIGH: 'high',
} as const;

export type MotivationLevel = typeof MotivationLevels[keyof typeof MotivationLevels];

// Device types
export const DeviceTypes = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;

export type DeviceType = typeof DeviceTypes[keyof typeof DeviceTypes];