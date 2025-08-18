import { FastifySchema } from 'fastify';

export const studentSchemas = {
  getStudent: {
    description: 'Get detailed student information including profile, progress, and statistics',
    summary: 'Get Student Profile',
    tags: ['Students'],
    operationId: 'getStudentProfile',
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { 
          type: 'string', 
          pattern: '^\\d+$',
          description: 'Student unique identifier',
          example: '1'
        },
      },
    },
    response: {
      200: {
        description: 'Student profile information retrieved successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              prenom: { type: 'string', example: 'Alice' },
              nom: { type: 'string', example: 'Dupont' },
              dateNaissance: { type: 'string', format: 'date', example: '2015-06-15' },
              niveauActuel: { type: 'string', enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'], example: 'CP' },
              age: { type: 'number', example: 7 },
              totalPoints: { type: 'number', example: 350 },
              serieJours: { type: 'number', example: 7 },
              mascotteType: { type: 'string', example: 'dragon' },
              preferences: { 
                type: 'object',
                properties: {
                  theme: { type: 'string', example: 'colorful' },
                  difficulty: { type: 'string', example: 'adaptive' },
                  notifications: { type: 'boolean', example: true }
                },
                example: {
                  theme: 'colorful',
                  difficulty: 'adaptive',
                  notifications: true
                }
              },
              dernierAcces: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
              estConnecte: { type: 'boolean', example: false },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
            },
          },
          message: { type: 'string', example: 'Profil étudiant récupéré avec succès' },
        },
        example: {
          success: true,
          data: {
            id: 1,
            prenom: 'Alice',
            nom: 'Dupont',
            dateNaissance: '2015-06-15',
            niveauActuel: 'CP',
            age: 7,
            totalPoints: 350,
            serieJours: 7,
            mascotteType: 'dragon',
            preferences: {
              theme: 'colorful',
              difficulty: 'adaptive',
              notifications: true
            },
            dernierAcces: '2024-01-15T10:30:00Z',
            estConnecte: false
          },
          message: 'Profil étudiant récupéré avec succès'
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
              code: { type: 'string', example: 'STUDENT_NOT_FOUND' },
              message: { type: 'string', example: 'Étudiant non trouvé' }
            }
          }
        },
        example: {
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Étudiant non trouvé'
          }
        }
      },
      401: {
        description: 'Authentication required',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string', example: 'Token d\'authentification requis' }
            }
          }
        }
      }
    },
  } as FastifySchema,

  getRecommendations: {
    description: 'Get exercise recommendations for student',
    tags: ['students'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' },
      },
    },
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string', pattern: '^\\d+$' },
        niveau: { type: 'string' },
        matiere: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                titre: { type: 'string' },
                consigne: { type: 'string' },
                type: { type: 'string' },
                difficulte: { type: 'string' },
                pointsReussite: { type: 'number' },
                dureeEstimee: { type: 'number' },
                moduleTitle: { type: 'string' },
                moduleMatiere: { type: 'string' },
              },
            },
          },
          message: { type: 'string' },
        },
      },
    },
  } as FastifySchema,

  submitAttempt: {
    description: 'Submit exercise attempt',
    tags: ['students'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' },
      },
    },
    body: {
      type: 'object',
      required: ['exerciseId', 'attempt'],
      properties: {
        exerciseId: { type: 'number' },
        attempt: {
          type: 'object',
          required: ['reponse', 'reussi', 'tempsSecondes'],
          properties: {
            reponse: {},
            reussi: { type: 'boolean' },
            tempsSecondes: { type: 'number', minimum: 1, maximum: 3600 },
            aidesUtilisees: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              reussi: { type: 'boolean' },
              pointsGagnes: { type: 'number' },
              totalPoints: { type: 'number' },
              recommendations: { type: 'string' },
            },
          },
          message: { type: 'string' },
        },
      },
    },
  } as FastifySchema,

  getProgress: {
    description: 'Get student progress',
    tags: ['students'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' },
      },
    },
    querystring: {
      type: 'object',
      properties: {
        matiere: { type: 'string' },
        limit: { type: 'string', pattern: '^\\d+$' },
      },
    },
  } as FastifySchema,

  getSessions: {
    description: 'Get student sessions and analytics',
    tags: ['students'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' },
      },
    },
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string', pattern: '^\\d+$' },
        days: { type: 'string', pattern: '^\\d+$' },
      },
    },
  } as FastifySchema,

  createStudent: {
    description: 'Create new student',
    tags: ['students'],
    body: {
      type: 'object',
      required: ['prenom', 'nom', 'dateNaissance', 'niveauActuel'],
      properties: {
        prenom: { type: 'string', minLength: 2, maxLength: 50 },
        nom: { type: 'string', minLength: 2, maxLength: 50 },
        dateNaissance: { type: 'string', format: 'date' },
        niveauActuel: { type: 'string', enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
        emailParent: { type: 'string', format: 'email' },
        motDePasse: { type: 'string', minLength: 6 },
      },
    },
  } as FastifySchema,

  updateStudent: {
    description: 'Update student information',
    tags: ['students'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' },
      },
    },
    body: {
      type: 'object',
      properties: {
        prenom: { type: 'string', minLength: 2, maxLength: 50 },
        nom: { type: 'string', minLength: 2, maxLength: 50 },
        niveauActuel: { type: 'string', enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
        emailParent: { type: 'string', format: 'email' },
        preferences: { type: 'object' },
        adaptations: { type: 'object' },
      },
    },
  } as FastifySchema,

  deleteStudent: {
    description: 'Delete student account',
    tags: ['students'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' },
      },
    },
  } as FastifySchema,
};
