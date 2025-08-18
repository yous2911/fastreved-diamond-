export * from './fastify-extended';
export * from './gdpr.types';

// Core type definitions for the RevEd Kids application

// Database and ORM types
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

// Redis types
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  maxRetriesPerRequest: number;
  connectTimeout?: number;
  commandTimeout?: number;
  family?: 4 | 6;
}

// Cache types
export interface CacheOptions {
  ttl: number;
  max: number;
  maxAge?: number;
  updateAgeOnGet?: boolean;
  allowStale?: boolean;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

// Schema-specific types for JSON columns
export interface StudentMetadata {
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
    soundEnabled?: boolean;
    difficultyPreference?: 'easy' | 'medium' | 'hard';
  };
  achievements?: string[];
  settings?: {
    sessionTimeout?: number;
    autoSave?: boolean;
    hintsEnabled?: boolean;
  };
  parentalControls?: {
    timeLimit?: number;
    allowedHours?: { start: string; end: string };
    blockedContent?: string[];
  };
}

export interface ExerciseContent {
  question: string;
  options?: string[];
  correctAnswer: string | number | string[];
  explanation?: string;
  hints?: string[];
  mediaUrl?: string;
  type: 'multiple-choice' | 'fill-in-blank' | 'true-false' | 'matching' | 'essay';
  timeLimit?: number;
  resources?: {
    images?: string[];
    videos?: string[];
    audio?: string[];
  };
}

export interface ProgressHistory {
  timestamp: string;
  score: number;
  timeSpent: number;
  attempts: number;
  errors?: string[];
  hintsUsed?: number;
  completed: boolean;
}

export interface SessionActions {
  action: string;
  timestamp: string;
  data?: Record<string, unknown>;
  duration?: number;
  result?: 'success' | 'failure' | 'timeout';
} 