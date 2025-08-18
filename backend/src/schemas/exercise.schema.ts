import { FastifySchema } from 'fastify';

export const exerciseSchemas = {
  createModule: {
    description: 'Create a new pedagogical module aligned with CP 2025 curriculum standards',
    summary: 'Create Pedagogical Module',
    tags: ['Exercises'],
    operationId: 'createModule',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['titre', 'description', 'niveau', 'matiere', 'periode'],
      properties: {
        titre: { 
          type: 'string', 
          minLength: 3, 
          maxLength: 200,
          description: 'Module title',
          example: 'Addition et soustraction'
        },
        description: { 
          type: 'string', 
          minLength: 10, 
          maxLength: 1000,
          description: 'Detailed module description',
          example: 'Module d\'apprentissage des opérations d\'addition et de soustraction pour les élèves de CP'
        },
        niveau: { 
          type: 'string', 
          enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
          description: 'Grade level',
          example: 'CP'
        },
        matiere: { 
          type: 'string', 
          enum: ['MATHEMATIQUES', 'FRANCAIS', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS'],
          description: 'Subject area',
          example: 'MATHEMATIQUES'
        },
        periode: { 
          type: 'string', 
          enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
          description: 'School period (1-5)',
          example: 'P1'
        },
        ordre: { 
          type: 'number', 
          minimum: 1,
          description: 'Order within the curriculum',
          example: 1
        },
        competenceCode: { 
          type: 'string', 
          pattern: '^(CP|CE1|CE2|CM1|CM2)\\.(FR|MA)\\.[A-Z]+\\d+\\.\\d+$',
          description: 'CP 2025 competence code',
          example: 'CP.MA.CALCUL01.1'
        },
        metadata: { 
          type: 'object',
          description: 'Additional module metadata',
          example: {
            dureeEstimee: 45,
            prerequis: ['CP.MA.NOMBRE01.1'],
            objectifs: ['Maîtriser l\'addition simple']
          }
        }
      },
      example: {
        titre: 'Addition et soustraction',
        description: 'Module d\'apprentissage des opérations d\'addition et de soustraction pour les élèves de CP',
        niveau: 'CP',
        matiere: 'MATHEMATIQUES',
        periode: 'P1',
        ordre: 1,
        competenceCode: 'CP.MA.CALCUL01.1',
        metadata: {
          dureeEstimee: 45,
          prerequis: ['CP.MA.NOMBRE01.1'],
          objectifs: ['Maîtriser l\'addition simple']
        }
      }
    },
    response: {
      201: {
        description: 'Module created successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { 
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              titre: { type: 'string', example: 'Addition et soustraction' },
              niveau: { type: 'string', example: 'CP' },
              matiere: { type: 'string', example: 'MATHEMATIQUES' },
              competenceCode: { type: 'string', example: 'CP.MA.CALCUL01.1' },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
            }
          },
          message: { type: 'string', example: 'Module créé avec succès' }
        },
        example: {
          success: true,
          data: {
            id: 1,
            titre: 'Addition et soustraction',
            niveau: 'CP',
            matiere: 'MATHEMATIQUES',
            competenceCode: 'CP.MA.CALCUL01.1',
            createdAt: '2024-01-15T10:30:00Z'
          },
          message: 'Module créé avec succès'
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
              code: { type: 'string', example: 'INVALID_INPUT' },
              message: { type: 'string', example: 'Les paramètres fournis sont invalides' }
            }
          }
        }
      }
    }
  } as FastifySchema,

  createExercise: {
    description: 'Create a new exercise with CP 2025 competence mapping and adaptive difficulty',
    summary: 'Create Exercise',
    tags: ['Exercises'],
    operationId: 'createExercise',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['titre', 'consigne', 'type', 'moduleId', 'competenceCode', 'configuration'],
      properties: {
        titre: { 
          type: 'string', 
          minLength: 3, 
          maxLength: 200,
          description: 'Exercise title',
          example: 'Addition de nombres à 2 chiffres'
        },
        consigne: { 
          type: 'string', 
          minLength: 10, 
          maxLength: 1000,
          description: 'Exercise instructions for students',
          example: 'Calcule le résultat des additions suivantes'
        },
        type: { 
          type: 'string', 
          enum: ['QCM', 'CALCUL', 'TEXTE_LIBRE', 'DRAG_DROP', 'CONJUGAISON', 'LECTURE', 'GEOMETRIE', 'PROBLEME'],
          description: 'Type of exercise interaction',
          example: 'CALCUL'
        },
        difficulte: { 
          type: 'string', 
          enum: ['decouverte', 'entrainement', 'consolidation', 'approfondissement'],
          description: 'Difficulty level according to learning progression',
          example: 'entrainement'
        },
        moduleId: { 
          type: 'number', 
          minimum: 1,
          description: 'ID of the parent module',
          example: 1
        },
        competenceCode: { 
          type: 'string', 
          pattern: '^(CP|CE1|CE2|CM1|CM2)\\.(FR|MA)\\.[A-Z]+\\d+\\.\\d+$',
          description: 'CP 2025 competence code',
          example: 'CP.MA.CALCUL01.2'
        },
        configuration: { 
          type: 'object',
          description: 'Exercise configuration and content',
          properties: {
            questions: {
              type: 'array',
              items: { type: 'object' }
            },
            scoring: { type: 'object' },
            adaptiveSettings: { type: 'object' }
          },
          example: {
            questions: [
              {
                question: '25 + 17 = ?',
                type: 'input',
                correctAnswer: '42',
                points: 2
              }
            ],
            scoring: {
              maxPoints: 10,
              passingScore: 6
            },
            adaptiveSettings: {
              adjustDifficulty: true,
              maxAttempts: 3
            }
          }
        },
        pointsReussite: { 
          type: 'number', 
          minimum: 1, 
          maximum: 100,
          description: 'Points awarded for successful completion',
          example: 10
        },
        dureeEstimee: { 
          type: 'number', 
          minimum: 1, 
          maximum: 60,
          description: 'Estimated duration in minutes',
          example: 5
        },
        ordre: { 
          type: 'number', 
          minimum: 1,
          description: 'Order within the module',
          example: 2
        },
        metadata: { 
          type: 'object',
          description: 'Additional exercise metadata',
          example: {
            tags: ['addition', 'deux-chiffres'],
            accessibility: { audioSupport: true },
            version: '1.0'
          }
        }
      },
      example: {
        titre: 'Addition de nombres à 2 chiffres',
        consigne: 'Calcule le résultat des additions suivantes',
        type: 'CALCUL',
        difficulte: 'entrainement',
        moduleId: 1,
        competenceCode: 'CP.MA.CALCUL01.2',
        configuration: {
          questions: [
            {
              question: '25 + 17 = ?',
              type: 'input',
              correctAnswer: '42',
              points: 2
            }
          ],
          scoring: {
            maxPoints: 10,
            passingScore: 6
          }
        },
        pointsReussite: 10,
        dureeEstimee: 5,
        ordre: 2
      }
    },
    response: {
      201: {
        description: 'Exercise created successfully',
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1001 },
              titre: { type: 'string', example: 'Addition de nombres à 2 chiffres' },
              type: { type: 'string', example: 'CALCUL' },
              competenceCode: { type: 'string', example: 'CP.MA.CALCUL01.2' },
              pointsReussite: { type: 'number', example: 10 },
              createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
            }
          },
          message: { type: 'string', example: 'Exercice créé avec succès' }
        }
      }
    }
  } as FastifySchema,

  bulkGenerate: {
    description: 'Bulk generate exercises from CP 2025 competences',
    tags: ['exercises'],
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['competenceCodes', 'moduleId', 'baseConfiguration'],
      properties: {
        competenceCodes: { 
          type: 'array', 
          items: { type: 'string', pattern: '^(CP|CE1|CE2|CM1|CM2)\\.(FR|MA)\\.[A-Z]+\\d+\\.\\d+$' },
          minItems: 1,
          maxItems: 50
        },
        moduleId: { type: 'number', minimum: 1 },
        baseConfiguration: { type: 'object' },
        generateVariations: { type: 'boolean' }
      }
    }
  } as FastifySchema,

  getByCompetence: {
    description: 'Get exercises by competence code',
    tags: ['exercises'],
    params: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string', pattern: '^(CP|CE1|CE2|CM1|CM2)\\.(FR|MA)\\.[A-Z]+\\d+\\.\\d+$' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string', pattern: '^\\d+$' },
        offset: { type: 'string', pattern: '^\\d+$' },
        difficulte: { type: 'string', enum: ['decouverte', 'entrainement', 'consolidation', 'approfondissement'] }
      }
    }
  } as FastifySchema,

  updateExercise: {
    description: 'Update exercise',
    tags: ['exercises'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' }
      }
    }
  } as FastifySchema,

  deleteExercise: {
    description: 'Delete exercise',
    tags: ['exercises'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', pattern: '^\\d+$' }
      }
    }
  } as FastifySchema
}; 