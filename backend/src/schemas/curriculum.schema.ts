// src/schemas/curriculum.ts

export const curriculumSchemas = {
  // GET /curriculum/levels
  getLevels: {
    summary: 'Get all supported educational levels',
    tags: ['curriculum'],
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
                id: { type: 'string' },
                name: { type: 'string' },
                displayName: { type: 'string' },
                order: { type: 'number' },
                subjectsCount: { type: 'number' },
                available: { type: 'boolean' }
              },
              required: ['id', 'name', 'displayName', 'order', 'subjectsCount', 'available']
            }
          },
          message: { type: 'string' }
        },
        required: ['success', 'data', 'message']
      }
    }
  },

  // GET /curriculum/:level
  getCurriculumByLevel: {
    summary: 'Get complete curriculum for a specific level',
    tags: ['curriculum'],
    params: {
      type: 'object',
      properties: {
        level: { 
          type: 'string',
          enum: ['cp', 'ce1', 'ce2', 'cm1', 'cm2', 'cp-ce1']
        }
      },
      required: ['level']
    },
    querystring: {
      type: 'object',
      properties: {
        subject: { 
          type: 'string',
          enum: ['MATHEMATIQUES', 'FRANCAIS', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS']
        },
        period: { type: 'string' }
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
              level: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  displayName: { type: 'string' },
                  order: { type: 'number' }
                },
                required: ['id', 'name', 'displayName', 'order']
              },
              curriculum: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    nom: { type: 'string' },
                    chapitres: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          titre: { type: 'string' },
                          description: { type: 'string' },
                          sousChapitres: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'number' },
                                titre: { type: 'string' },
                                description: { type: 'string' },
                                exercicesCount: { type: 'number' }
                              },
                              required: ['id', 'titre', 'exercicesCount']
                            }
                          }
                        },
                        required: ['id', 'titre', 'sousChapitres']
                      }
                    }
                  },
                  required: ['id', 'nom', 'chapitres']
                }
              },
              totalExercises: { type: 'number' },
              lastUpdated: { type: 'string' }
            },
            required: ['level', 'curriculum', 'totalExercises', 'lastUpdated']
          },
          message: { type: 'string' }
        },
        required: ['success', 'data', 'message']
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
              supportedLevels: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['message', 'code']
          }
        },
        required: ['success', 'error']
      }
    }
  },

  // GET /curriculum/:level/subjects
  getSubjectsByLevel: {
    summary: 'Get subjects for a specific level',
    tags: ['curriculum'],
    params: {
      type: 'object',
      properties: {
        level: { 
          type: 'string',
          enum: ['cp', 'ce1', 'ce2', 'cm1', 'cm2', 'cp-ce1']
        }
      },
      required: ['level']
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
                nom: { 
                  type: 'string',
                  enum: ['MATHEMATIQUES', 'FRANCAIS', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS']
                },
                chapitresCount: { type: 'number' },
                exercicesCount: { type: 'number' }
              },
              required: ['id', 'nom', 'chapitresCount', 'exercicesCount']
            }
          },
          message: { type: 'string' }
        },
        required: ['success', 'data', 'message']
      },
      404: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' }
            },
            required: ['message', 'code']
          }
        },
        required: ['success', 'error']
      }
    }
  },

  // GET /curriculum/:level/exercises
  getExercisesByLevel: {
    summary: 'Get exercises for a specific level with filtering',
    tags: ['curriculum'],
    params: {
      type: 'object',
      properties: {
        level: { 
          type: 'string',
          enum: ['cp', 'ce1', 'ce2', 'cm1', 'cm2', 'cp-ce1']
        }
      },
      required: ['level']
    },
    querystring: {
      type: 'object',
      properties: {
        subject: { 
          type: 'string',
          enum: ['MATHEMATIQUES', 'FRANCAIS', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS']
        },
        difficulty: { 
          type: 'string',
          enum: ['FACILE', 'MOYEN', 'DIFFICILE']
        },
        type: { 
          type: 'string',
          enum: ['QCM', 'CALCUL', 'TEXTE_LIBRE', 'DRAG_DROP', 'CONJUGAISON', 'LECTURE', 'GEOMETRIE', 'PROBLEME']
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'number', minimum: 0, default: 0 }
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
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    type: { 
                      type: 'string',
                      enum: ['QCM', 'CALCUL', 'TEXTE_LIBRE', 'DRAG_DROP', 'CONJUGAISON', 'LECTURE', 'GEOMETRIE', 'PROBLEME']
                    },
                    configuration: { type: 'object' },
                    xp: { type: 'number' },
                    difficulte: { 
                      type: 'string',
                      enum: ['FACILE', 'MOYEN', 'DIFFICILE']
                    },
                    context: {
                      type: 'object',
                      properties: {
                        sousChapitre: { type: 'string' },
                        chapitre: { type: 'string' },
                        matiere: { type: 'string' },
                        niveau: { type: 'string' }
                      },
                      required: ['sousChapitre', 'chapitre', 'matiere', 'niveau']
                    }
                  },
                  required: ['id', 'type', 'configuration', 'xp', 'difficulte', 'context']
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' }
                },
                required: ['total', 'limit', 'offset', 'hasMore']
              }
            },
            required: ['exercises', 'pagination']
          },
          message: { type: 'string' }
        },
        required: ['success', 'data', 'message']
      }
    }
  },

  // GET /curriculum/statistics
  getStatistics: {
    summary: 'Get curriculum statistics across all levels',
    tags: ['curriculum'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              levelStatistics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    level: { type: 'string' },
                    subjectsCount: { type: 'number' },
                    chaptersCount: { type: 'number' },
                    subChaptersCount: { type: 'number' },
                    exercisesCount: { type: 'number' }
                  },
                  required: ['level', 'subjectsCount', 'chaptersCount', 'subChaptersCount', 'exercisesCount']
                }
              },
              exerciseTypes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { 
                      type: 'string',
                      enum: ['QCM', 'CALCUL', 'TEXTE_LIBRE', 'DRAG_DROP', 'CONJUGAISON', 'LECTURE', 'GEOMETRIE', 'PROBLEME']
                    },
                    count: { type: 'number' }
                  },
                  required: ['type', 'count']
                }
              },
              difficultyDistribution: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    difficulty: { 
                      type: 'string',
                      enum: ['FACILE', 'MOYEN', 'DIFFICILE']
                    },
                    count: { type: 'number' }
                  },
                  required: ['difficulty', 'count']
                }
              },
              totalLevels: { type: 'number' },
              lastUpdated: { type: 'string' }
            },
            required: ['levelStatistics', 'exerciseTypes', 'difficultyDistribution', 'totalLevels', 'lastUpdated']
          },
          message: { type: 'string' }
        },
        required: ['success', 'data', 'message']
      }
    }
  }
}; 