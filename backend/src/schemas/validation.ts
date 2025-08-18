// src/schemas/validation.ts
import { z } from 'zod';

// JSON Schema validation schemas for RevEd Kids API

// Common validation patterns
const Email = { type: 'string', format: 'email' };
const Password = { type: 'string', minLength: 8, maxLength: 128 };
const UUID = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  format: 'uuid',
};
const SafeString = { type: 'string', pattern: '^[a-zA-Z0-9\\s\\-_.]+$' };

// Student schemas
export const StudentLoginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: Email,
    password: Password,
  },
  $id: 'StudentLogin',
  title: 'Student Login',
  description: 'Schema for student login request',
};

export const StudentRegistrationSchema = {
  type: 'object',
  required: ['email', 'password', 'firstName', 'lastName'],
  properties: {
    email: Email,
    password: Password,
    firstName: { type: 'string', minLength: 1, maxLength: 50 },
    lastName: { type: 'string', minLength: 1, maxLength: 50 },
    dateOfBirth: { type: 'string', format: 'date' },
    grade: { type: 'number', minimum: 1, maximum: 12 },
  },
  $id: 'StudentRegistration',
  title: 'Student Registration',
  description: 'Schema for student registration request',
};

export const StudentUpdateSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string', minLength: 1, maxLength: 50 },
    lastName: { type: 'string', minLength: 1, maxLength: 50 },
    dateOfBirth: { type: 'string', format: 'date' },
    grade: { type: 'number', minimum: 1, maximum: 12 },
  },
  $id: 'StudentUpdate',
  title: 'Student Update',
  description: 'Schema for student profile update',
};

// Exercise attempt schema
export const ExerciseAttemptSchema = {
  type: 'object',
  required: ['exerciseId', 'answers', 'timeSpent', 'completed'],
  properties: {
    exerciseId: UUID,
    answers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['questionId', 'answer'],
        properties: {
          questionId: UUID,
          answer: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
      },
    },
    timeSpent: { type: 'number', minimum: 0 },
    completed: { type: 'boolean' },
  },
  $id: 'ExerciseAttempt',
  title: 'Exercise Attempt',
  description: 'Schema for submitting exercise attempts',
};

// Query parameter schemas
export const PaginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, default: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
    sortBy: SafeString,
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
  $id: 'Pagination',
  title: 'Pagination Parameters',
  description: 'Schema for pagination query parameters',
};

export const StudentIdSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: UUID,
  },
  $id: 'StudentId',
  title: 'Student ID Parameter',
  description: 'Schema for student ID path parameter',
};

// Response schemas
export const ErrorResponseSchema = {
  type: 'object',
  required: ['error', 'timestamp', 'path'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {},
      },
    },
    timestamp: { type: 'string', format: 'date-time' },
    path: { type: 'string' },
  },
  $id: 'ErrorResponse',
  title: 'Error Response',
  description: 'Standard error response format',
};

// Student response schema
export const StudentResponseSchema = {
  type: 'object',
  required: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
  properties: {
    id: UUID,
    email: { type: 'string', format: 'email' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    grade: { type: 'number' },
    dateOfBirth: { type: 'string', format: 'date' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  $id: 'StudentResponse',
  title: 'Student Response',
  description: 'Student data response schema',
};

// Authentication response schema
export const AuthResponseSchema = {
  type: 'object',
  required: ['token', 'refreshToken', 'expiresIn', 'student'],
  properties: {
    token: { type: 'string' },
    refreshToken: { type: 'string' },
    expiresIn: { type: 'number' },
    student: StudentResponseSchema,
  },
  $id: 'AuthResponse',
  title: 'Authentication Response',
  description: 'Authentication success response schema',
};

// Progress response schema
export const ProgressResponseSchema = {
  type: 'object',
  required: [
    'studentId',
    'totalExercises',
    'completedExercises',
    'averageScore',
    'streakDays',
    'timeSpent',
    'subjectProgress',
  ],
  properties: {
    studentId: UUID,
    totalExercises: { type: 'number' },
    completedExercises: { type: 'number' },
    averageScore: { type: 'number', minimum: 0, maximum: 100 },
    streakDays: { type: 'number', minimum: 0 },
    timeSpent: { type: 'number', minimum: 0 },
    subjectProgress: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'subjectId',
          'subjectName',
          'exercisesCompleted',
          'totalExercises',
          'averageScore',
        ],
        properties: {
          subjectId: UUID,
          subjectName: { type: 'string' },
          exercisesCompleted: { type: 'number' },
          totalExercises: { type: 'number' },
          averageScore: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
  },
  $id: 'ProgressResponse',
  title: 'Progress Response',
  description: 'Student progress data response schema',
};

// Health check response schema
export const HealthResponseSchema = {
  type: 'object',
  required: ['status', 'timestamp', 'uptime', 'environment', 'version', 'services', 'system'],
  properties: {
    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
    timestamp: { type: 'string', format: 'date-time' },
    uptime: { type: 'number' },
    environment: { type: 'string' },
    version: { type: 'string' },
    services: {
      type: 'object',
      required: ['database', 'cache'],
      properties: {
        database: {
          type: 'object',
          required: ['status', 'connections', 'responseTime'],
          properties: {
            status: { type: 'string' },
            connections: { type: 'number' },
            responseTime: { type: 'number' },
          },
        },
        cache: {
          type: 'object',
          required: ['status', 'connected'],
          properties: {
            status: { type: 'string' },
            connected: { type: 'boolean' },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'number' },
                total: { type: 'number' },
              },
            },
          },
        },
      },
    },
    system: {
      type: 'object',
      required: ['memory', 'cpu'],
      properties: {
        memory: {
          type: 'object',
          required: ['used', 'total', 'percentage'],
          properties: {
            used: { type: 'number' },
            total: { type: 'number' },
            percentage: { type: 'number' },
          },
        },
        cpu: {
          type: 'object',
          required: ['usage', 'loadAverage'],
          properties: {
            usage: { type: 'number' },
            loadAverage: { type: 'array', items: { type: 'number' } },
          },
        },
      },
    },
  },
  $id: 'HealthResponse',
  title: 'Health Check Response',
  description: 'System health check response schema',
};

// TypeScript interfaces for type safety
export interface StudentLogin {
  email: string;
  password: string;
}

export interface StudentRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  grade?: number;
}

export interface StudentUpdate {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  grade?: number;
}

export interface ExerciseAttempt {
  exerciseId: string;
  answers: Array<{
    questionId: string;
    answer: string | number | string[];
  }>;
  timeSpent: number;
  completed: boolean;
}

export interface Pagination {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentId {
  id: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

export interface StudentResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  grade?: number;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  student: StudentResponse;
}

export interface ProgressResponse {
  studentId: string;
  totalExercises: number;
  completedExercises: number;
  averageScore: number;
  streakDays: number;
  timeSpent: number;
  subjectProgress: Array<{
    subjectId: string;
    subjectName: string;
    exercisesCompleted: number;
    totalExercises: number;
    averageScore: number;
  }>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: string;
      connections: number;
      responseTime: number;
    };
    cache: {
      status: string;
      connected: boolean;
      memory?: {
        used: number;
        total: number;
      };
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
}
