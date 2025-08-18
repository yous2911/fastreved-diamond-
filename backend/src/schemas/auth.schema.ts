import { z } from 'zod';
import { FastifySchema } from 'fastify';

// Zod schemas for validation
export const loginSchema = z.object({
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères').max(50),
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(50),
  motDePasse: z.string().optional(),
});

export const logoutSchema = z.object({});

export const refreshSchema = z.object({});

export const verifySchema = z.object({
  studentId: z.string().regex(/^\d+$/, "L'ID doit être un nombre"),
});

// Fastify JSON schemas with comprehensive OpenAPI documentation
export const authSchemas = {
  login: {
    description: 'Authenticate student and create session',
    summary: 'Student Login',
    tags: ['Authentication'],
    operationId: 'loginStudent',
    body: {
      type: 'object',
      required: ['prenom', 'nom'],
      properties: {
        prenom: {
          type: 'string',
          minLength: 2,
          maxLength: 50,
          pattern: '^[a-zA-ZÀ-ÿ\\s\\-\']+$',
          description: 'Student first name (2-50 characters, letters only)',
          example: 'Alice'
        },
        nom: {
          type: 'string',
          minLength: 2,
          maxLength: 50,
          pattern: '^[a-zA-ZÀ-ÿ\\s\\-\']+$',
          description: 'Student last name (2-50 characters, letters only)',
          example: 'Dupont'
        },
        motDePasse: {
          type: 'string',
          minLength: 4,
          maxLength: 100,
          description: 'Optional password for enhanced security',
          example: 'mon-mot-de-passe'
        }
      },
      additionalProperties: false,
      example: {
        prenom: 'Alice',
        nom: 'Dupont',
        motDePasse: 'mon-mot-de-passe'
      }
    },
    response: {
      200: {
        description: 'Successful authentication',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              token: { 
                type: 'string', 
                description: 'JWT authentication token',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdHVkZW50SWQiOjEsInByZW5vbSI6IkFsaWNlIiwibm9tIjoiRHVwb250Iiwibml2ZWF1IjoiQ1AiLCJpYXQiOjE3MDk2NDE0MDAsImV4cCI6MTcwOTcyNzgwMH0.example'
              },
              student: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  prenom: { type: 'string', example: 'Alice' },
                  nom: { type: 'string', example: 'Dupont' },
                  dateNaissance: { type: 'string', format: 'date', example: '2015-01-01' },
                  niveauActuel: { type: 'string', example: 'CP' },
                  totalPoints: { type: 'number', example: 350 },
                  serieJours: { type: 'number', example: 7 },
                  mascotteType: { type: 'string', example: 'dragon' },
                  createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
                },
              },
            },
          },
          message: { type: 'string', example: 'Connexion réussie' },
        },
        example: {
          success: true,
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            student: {
              id: 1,
              prenom: 'Alice',
              nom: 'Dupont',
              dateNaissance: '2015-01-01',
              niveauActuel: 'CP',
              totalPoints: 350,
              serieJours: 7,
              mascotteType: 'dragon'
            }
          },
          message: 'Connexion réussie'
        }
      },
      400: {
        description: 'Invalid input parameters',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Les paramètres fournis sont invalides' },
              code: { type: 'string', example: 'INVALID_INPUT' },
            },
          },
        },
        example: {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Les paramètres fournis sont invalides'
          }
        }
      },
      404: {
        description: 'Student not found',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Étudiant non trouvé' },
              code: { type: 'string', example: 'STUDENT_NOT_FOUND' },
            },
          },
        },
        example: {
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Étudiant non trouvé'
          }
        }
      },
      500: {
        description: 'Internal server error',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Erreur lors de la connexion' },
              code: { type: 'string', example: 'LOGIN_ERROR' },
            },
          },
        },
        example: {
          success: false,
          error: {
            code: 'LOGIN_ERROR',
            message: 'Erreur lors de la connexion'
          }
        }
      },
    },
  } as FastifySchema,

  logout: {
    description: 'Logout student and invalidate session',
    summary: 'Student Logout',
    tags: ['Authentication'],
    operationId: 'logoutStudent',
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      401: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      }
    }
  } as FastifySchema,

  refresh: {
    description: 'Refresh JWT token',
    tags: ['auth'],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string' }
            }
          },
          message: { type: 'string' }
        }
      },
      401: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      }
    }
  } as FastifySchema,

  verify: {
    description: 'Verify student exists and get basic info',
    tags: ['auth'],
    params: {
      type: 'object',
      required: ['studentId'],
      properties: {
        studentId: {
          type: 'string',
          pattern: '^\\d+$',
          description: 'Student ID to verify (numeric)'
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              student: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  prenom: { type: 'string' },
                  nom: { type: 'string' },
                  niveau: { type: 'string' },
                  age: { type: 'number' },
                  dernierAcces: { type: 'string', format: 'date-time' },
                  estConnecte: { type: 'boolean' },
                },
              },
              parentCode: { type: 'string' },
            },
          },
          message: { type: 'string' },
        },
      },
      404: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
  } as FastifySchema,

  health: {
    description: 'Authentication service health check',
    tags: ['auth'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              jwt: { type: 'object' },
              database: { type: 'string' },
              uptime: { type: 'number' }
            }
          },
          message: { type: 'string' }
        }
      },
      503: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      }
    }
  } as FastifySchema,
};

// Validation helpers
export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}

export function validateVerify(data: unknown) {
  return verifySchema.safeParse(data);
}
