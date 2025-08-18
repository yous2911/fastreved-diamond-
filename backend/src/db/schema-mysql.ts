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
  estConnecte: boolean('est_connecte').default(false),
  failedLoginAttempts: int('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  niveauScolaire: varchar('niveau_scolaire', { length: 20 }).notNull(),
  mascotteColor: varchar('mascotte_color', { length: 20 }).default('#ff6b35'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
});

// Exercises table
export const exercises = mysqlTable('exercises', {
  id: int('id').primaryKey().autoincrement(),
  titre: varchar('titre', { length: 200 }).notNull(),
  description: text('description'),
  matiere: varchar('matiere', { length: 50 }).notNull(),
  niveau: varchar('niveau', { length: 20 }).notNull(),
  difficulte: varchar('difficulte', { length: 30 }).notNull(),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  prerequis: json('prerequis'),
  contenu: json('contenu').notNull(),
  solution: json('solution').notNull(),
  pointsRecompense: int('points_recompense').default(10),
  tempsEstime: int('temps_estime').default(300),
  typeExercice: varchar('type_exercice', { length: 30 }).notNull(),
  ordre: int('ordre').default(0),
  estActif: boolean('est_actif').default(true),
  metadonnees: json('metadonnees'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
});

// Student Progress table
export const studentProgress = mysqlTable('student_progress', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  exerciseId: int('exercise_id').notNull().references(() => exercises.id),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  progressPercent: decimal('progress_percent', { precision: 5, scale: 2 }).default('0.00'),
  masteryLevel: varchar('mastery_level', { length: 20 }).notNull().default('not_started'),
  totalAttempts: int('total_attempts').default(0),
  successfulAttempts: int('successful_attempts').default(0),
  averageScore: decimal('average_score', { precision: 5, scale: 2 }).default('0.00'),
  bestScore: decimal('best_score', { precision: 5, scale: 2 }).default('0.00'),
  totalTimeSpent: int('total_time_spent').default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  masteredAt: timestamp('mastered_at'),
  needsReview: boolean('needs_review').default(false),
  reviewScheduledAt: timestamp('review_scheduled_at'),
  streakCount: int('streak_count').default(0),
  difficultyPreference: varchar('difficulty_preference', { length: 30 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
});

// Student Learning Path table
export const studentLearningPath = mysqlTable('student_learning_path', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').notNull().references(() => students.id),
  competenceCode: varchar('competence_code', { length: 20 }).notNull(),
  currentLevel: varchar('current_level', { length: 20 }).notNull().default('decouverte'),
  targetLevel: varchar('target_level', { length: 20 }).notNull().default('maitrise'),
  status: varchar('status', { length: 20 }).notNull().default('available'),
  priority: varchar('priority', { length: 20 }).notNull().default('normal'),
  recommendedDifficulty: varchar('recommended_difficulty', { length: 30 }).notNull().default('decouverte'),
  estimatedCompletionTime: int('estimated_completion_time'),
  personalizedOrder: int('personalized_order').default(0),
  isBlocked: boolean('is_blocked').default(false),
  blockingReasons: json('blocking_reasons'),
  unlockedAt: timestamp('unlocked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
});

// Sessions table
export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  studentId: int('student_id').references(() => students.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Revisions table
export const revisions = mysqlTable('revisions', {
  id: int('id').primaryKey().autoincrement(),
  studentId: int('student_id').references(() => students.id),
  exerciseId: int('exercise_id').references(() => exercises.id),
  revisionDate: date('revision_date').notNull(),
  score: int('score').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Modules table
export const modules = mysqlTable('modules', {
  id: int('id').primaryKey().autoincrement(),
  titre: varchar('titre', { length: 200 }).notNull(),
  matiere: varchar('matiere', { length: 50 }).notNull(),
  niveau: varchar('niveau', { length: 20 }).notNull(),
  ordre: int('ordre').default(0),
  estActif: boolean('est_actif').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;
export type Exercise = InferSelectModel<typeof exercises>;
export type NewExercise = InferInsertModel<typeof exercises>;
export type StudentProgress = InferSelectModel<typeof studentProgress>;
export type NewStudentProgress = InferInsertModel<typeof studentProgress>;
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
export type Revision = InferSelectModel<typeof revisions>;
export type NewRevision = InferInsertModel<typeof revisions>;
export type Module = InferSelectModel<typeof modules>;
export type NewModule = InferInsertModel<typeof modules>;

// =============================================================================
// RELATIONS
// =============================================================================

export const studentsRelations = relations(students, ({ many }) => ({
  progress: many(studentProgress),
  sessions: many(sessions),
  revisions: many(revisions),
  learningPath: many(studentLearningPath)
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  progress: many(studentProgress),
  revisions: many(revisions)
}));

export const studentProgressRelations = relations(studentProgress, ({ one }) => ({
  student: one(students, {
    fields: [studentProgress.studentId],
    references: [students.id]
  }),
  exercise: one(exercises, {
    fields: [studentProgress.exerciseId],
    references: [exercises.id]
  })
}));


