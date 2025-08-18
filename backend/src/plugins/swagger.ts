import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import swagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Comprehensive OpenAPI/Swagger configuration for FastRevedKids API
 * Auto-generates documentation from existing routes with examples and schemas
 */
async function swaggerPlugin(fastify: FastifyInstance) {
  // Register Swagger documentation generator
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'FastRevedKids Educational Platform API',
        description: `
## FastRevedKids Educational Platform API

A comprehensive educational platform API designed for children's learning management with advanced features including:

### 🚀 Core Features
- **Student Management**: Complete student profile and progress tracking
- **Exercise System**: Dynamic exercise delivery with CP 2025 curriculum support
- **Authentication**: Secure JWT-based authentication with refresh tokens
- **File Upload**: Advanced file handling with image processing capabilities
- **GDPR Compliance**: Full data protection and privacy controls
- **Real-time Monitoring**: Health checks and performance metrics

### 🔒 Security Features
- **Input Sanitization**: Protection against XSS, SQL injection, and other attacks
- **CSRF Protection**: Token-based cross-site request forgery protection
- **Rate Limiting**: Multi-layered rate limiting with behavioral analysis
- **Security Headers**: Comprehensive HTTP security headers (CSP, HSTS, etc.)
- **Audit Logging**: Complete security incident tracking and monitoring

### 📚 Educational Focus
- **Curriculum Support**: CP 2025 French primary school curriculum
- **Adaptive Learning**: Personalized exercise recommendations
- **Progress Tracking**: Detailed analytics and progress monitoring
- **Multi-subject Support**: Mathematics, French, Science, and more
        `,
        version: '1.0.0',
        contact: {
          name: 'FastRevedKids Development Team',
          email: 'dev@fastrevedkids.com',
          url: 'https://github.com/fastrevedkids/backend'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        },
        termsOfService: 'https://fastrevedkids.com/terms'
      },
      servers: [
        {
          url: 'http://localhost:3003',
          description: 'Development server'
        },
        {
          url: 'https://api-staging.fastrevedkids.com',
          description: 'Staging server'
        },
        {
          url: 'https://api.fastrevedkids.com',
          description: 'Production server'
        }
      ],
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and session management endpoints'
        },
        {
          name: 'Students',
          description: 'Student profile management, progress tracking, and statistics'
        },
        {
          name: 'Exercises',
          description: 'Exercise management, recommendations, and attempt tracking'
        },
        {
          name: 'Curriculum',
          description: 'Educational curriculum and module management'
        },
        {
          name: 'Upload',
          description: 'File upload, processing, and management system'
        },
        {
          name: 'GDPR',
          description: 'Data protection, consent management, and privacy controls'
        },
        {
          name: 'Health',
          description: 'System health checks and monitoring endpoints'
        },
        {
          name: 'Monitoring',
          description: 'Performance metrics and system monitoring'
        },
        {
          name: 'CP2025',
          description: 'French CP 2025 curriculum specific endpoints'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from login endpoint'
          },
          csrfToken: {
            type: 'apiKey',
            in: 'header',
            name: 'X-CSRF-Token',
            description: 'CSRF protection token (required for state-changing operations)'
          }
        },
        schemas: {
          // Standard API Response Wrapper
          ApiResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Indicates if the request was successful'
              },
              data: {
                type: 'object',
                description: 'Response data (varies by endpoint)'
              },
              message: {
                type: 'string',
                description: 'Human-readable response message'
              }
            },
            required: ['success']
          },
          
          // Error Response Schema
          ErrorResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                default: false,
                description: 'Always false for error responses'
              },
              error: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'Machine-readable error code'
                  },
                  message: {
                    type: 'string',
                    description: 'Human-readable error message'
                  },
                  details: {
                    type: 'object',
                    description: 'Additional error details (optional)'
                  }
                },
                required: ['message']
              }
            },
            required: ['success', 'error']
          },

          // Student Schema
          Student: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Unique student identifier',
                example: 1
              },
              prenom: {
                type: 'string',
                description: 'Student first name',
                example: 'Alice'
              },
              nom: {
                type: 'string',
                description: 'Student last name',
                example: 'Dupont'
              },
              dateNaissance: {
                type: 'string',
                format: 'date',
                description: 'Student birth date',
                example: '2015-06-15'
              },
              niveauActuel: {
                type: 'string',
                description: 'Current grade level',
                enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
                example: 'CP'
              },
              totalPoints: {
                type: 'integer',
                description: 'Total points earned',
                example: 350
              },
              serieJours: {
                type: 'integer',
                description: 'Current streak in days',
                example: 7
              },
              mascotteType: {
                type: 'string',
                description: 'Selected mascot type',
                enum: ['dragon', 'robot', 'fairy', 'unicorn'],
                example: 'dragon'
              },
              preferences: {
                type: 'object',
                description: 'Student preferences and settings',
                properties: {
                  theme: { type: 'string', example: 'colorful' },
                  difficulty: { type: 'string', example: 'adaptive' },
                  notifications: { type: 'boolean', example: true }
                }
              },
              dernierAcces: {
                type: 'string',
                format: 'date-time',
                description: 'Last access timestamp',
                example: '2024-01-15T10:30:00Z'
              },
              estConnecte: {
                type: 'boolean',
                description: 'Current connection status',
                example: false
              }
            },
            required: ['id', 'prenom', 'nom', 'niveauActuel']
          },

          // Exercise Schema
          Exercise: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Unique exercise identifier',
                example: 1001
              },
              titre: {
                type: 'string',
                description: 'Exercise title',
                example: 'Addition à deux chiffres'
              },
              description: {
                type: 'string',
                description: 'Exercise description',
                example: 'Apprendre l\'addition avec des nombres à deux chiffres'
              },
              matiere: {
                type: 'string',
                description: 'Subject area',
                enum: ['mathematiques', 'francais', 'sciences', 'histoire', 'geographie'],
                example: 'mathematiques'
              },
              niveau: {
                type: 'string',
                description: 'Grade level',
                enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
                example: 'CP'
              },
              difficulte: {
                type: 'string',
                description: 'Difficulty level',
                enum: ['facile', 'moyen', 'difficile'],
                example: 'facile'
              },
              pointsMax: {
                type: 'integer',
                description: 'Maximum points for this exercise',
                example: 10
              },
              dureeEstimee: {
                type: 'integer',
                description: 'Estimated duration in minutes',
                example: 5
              },
              contenu: {
                type: 'object',
                description: 'Exercise content and questions',
                example: {
                  type: 'multiple-choice',
                  questions: [
                    {
                      question: '25 + 17 = ?',
                      options: ['42', '32', '52', '35'],
                      correct: 0
                    }
                  ]
                }
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Exercise tags for categorization',
                example: ['addition', 'deux-chiffres', 'cp']
              }
            },
            required: ['id', 'titre', 'matiere', 'niveau', 'difficulte']
          },

          // Login Request Schema
          LoginRequest: {
            type: 'object',
            properties: {
              prenom: {
                type: 'string',
                description: 'Student first name',
                example: 'Alice'
              },
              nom: {
                type: 'string',
                description: 'Student last name',
                example: 'Dupont'
              },
              motDePasse: {
                type: 'string',
                description: 'Optional password for enhanced security',
                example: 'mon-mot-de-passe'
              }
            },
            required: ['prenom', 'nom']
          },

          // File Upload Schema
          FileUpload: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Unique file identifier',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              originalName: {
                type: 'string',
                description: 'Original filename',
                example: 'exercise-image.png'
              },
              filename: {
                type: 'string',
                description: 'Stored filename',
                example: '1642681234567_exercise-image.png'
              },
              url: {
                type: 'string',
                format: 'uri',
                description: 'Public URL to access the file',
                example: 'https://files.fastrevedkids.com/uploads/1642681234567_exercise-image.png'
              },
              size: {
                type: 'integer',
                description: 'File size in bytes',
                example: 1048576
              },
              mimetype: {
                type: 'string',
                description: 'MIME type',
                example: 'image/png'
              },
              category: {
                type: 'string',
                enum: ['image', 'video', 'audio', 'document', 'exercise', 'curriculum', 'assessment', 'resource'],
                description: 'File category',
                example: 'exercise'
              },
              status: {
                type: 'string',
                enum: ['uploading', 'processing', 'ready', 'error'],
                description: 'Processing status',
                example: 'ready'
              }
            }
          }
        },
        
        responses: {
          BadRequest: {
            description: 'Bad Request - Invalid input parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'INVALID_INPUT',
                    message: 'Les paramètres fournis sont invalides'
                  }
                }
              }
            }
          },
          
          Unauthorized: {
            description: 'Unauthorized - Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'UNAUTHORIZED',
                    message: 'Token d\'authentification requis'
                  }
                }
              }
            }
          },
          
          Forbidden: {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'FORBIDDEN',
                    message: 'Accès non autorisé à cette ressource'
                  }
                }
              }
            }
          },
          
          NotFound: {
            description: 'Not Found - Resource does not exist',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'NOT_FOUND',
                    message: 'Ressource introuvable'
                  }
                }
              }
            }
          },
          
          TooManyRequests: {
            description: 'Too Many Requests - Rate limit exceeded',
            headers: {
              'X-RateLimit-Limit': {
                description: 'Request limit per time window',
                schema: { type: 'integer', example: 100 }
              },
              'X-RateLimit-Remaining': {
                description: 'Remaining requests in current window',
                schema: { type: 'integer', example: 85 }
              },
              'Retry-After': {
                description: 'Seconds to wait before retrying',
                schema: { type: 'integer', example: 60 }
              }
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Trop de requêtes. Veuillez réessayer plus tard.'
                  }
                }
              }
            }
          },
          
          InternalServerError: {
            description: 'Internal Server Error - Unexpected server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Erreur interne du serveur'
                  }
                }
              }
            }
          }
        }
      },
      
      // Global security requirements
      security: [
        { bearerAuth: [] }
      ]
    },
    
    // Transform OpenAPI object before output
    transform: ({ schema, url }) => {
      // Add custom transforms here if needed
      return { schema, url };
    },
    
    // Hide routes with specific tags or patterns
    hideUntagged: false,
    
    // Expose route schemas
    exposeRoute: true
    
  } as FastifyDynamicSwaggerOptions);

  // Register Swagger UI with enhanced configuration
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      displayOperationId: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      requestInterceptor: function(req: any) {
        // Add custom request headers or modify requests
        return req;
      },
      responseInterceptor: function(res: any) {
        // Process responses if needed
        return res;
      }
    },
    uiHooks: {
      onRequest: function (request: any, reply: any, next: any) {
        // Add any pre-processing for Swagger UI requests
        next();
      },
      preHandler: function (request: any, reply: any, next: any) {
        // Add any authentication or validation for Swagger UI
        next();
      }
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header + " 'unsafe-inline'",
    theme: {
      title: 'FastRevedKids API Documentation'
    }
  });

  // Note: /docs/json is automatically provided by @fastify/swagger
  // No need to register it manually

  // Note: YAML endpoint can be accessed via /docs/json with Accept: application/yaml header
  // No need to register a separate YAML route

  // Note: API info is available via the main /docs endpoint
  // No need for a separate info endpoint

  fastify.log.info('📚 Swagger/OpenAPI documentation configured', {
    docsUrl: '/docs',
    specUrl: '/docs/json'
  });
}

export default fp(swaggerPlugin, {
  name: 'swagger-documentation',
  dependencies: []
});
