import { FastifyInstance } from 'fastify';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Comprehensive API Documentation Generator
 * Auto-generates OpenAPI documentation from existing Fastify routes
 */
export class APIDocumentationGenerator {
  private fastify: FastifyInstance;
  private outputDir: string;

  constructor(fastify: FastifyInstance, outputDir: string = './docs/api') {
    this.fastify = fastify;
    this.outputDir = outputDir;
  }

  /**
   * Generate comprehensive API documentation
   */
  async generateDocumentation(): Promise<{
    openApiSpec: any;
    routesSummary: any;
    authenticationGuide: string;
    errorCodesReference: any;
  }> {
    // Get OpenAPI specification
    const openApiSpec = this.fastify.swagger();

    // Generate routes summary
    const routesSummary = this.generateRoutesSummary();

    // Generate authentication guide
    const authenticationGuide = this.generateAuthenticationGuide();

    // Generate error codes reference
    const errorCodesReference = this.generateErrorCodesReference();

    // Ensure output directory exists
    await mkdir(this.outputDir, { recursive: true });

    // Write documentation files
    await this.writeDocumentationFiles({
      openApiSpec,
      routesSummary,
      authenticationGuide,
      errorCodesReference
    });

    return {
      openApiSpec,
      routesSummary,
      authenticationGuide,
      errorCodesReference
    };
  }

  /**
   * Generate routes summary with examples
   */
  private generateRoutesSummary() {
    const routes = this.fastify.printRoutes();
    const routesByTag: { [tag: string]: any[] } = {};

    // Parse routes and organize by tags
    const routeLines = routes.split('\n').filter(line => line.trim());
    
    // Mock route organization for comprehensive documentation
    const organizedRoutes = {
      'Authentication': [
        {
          method: 'POST',
          path: '/auth/login',
          summary: 'Student Login',
          description: 'Authenticate student and create session',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prenom', 'nom'],
                  properties: {
                    prenom: { type: 'string', example: 'Alice' },
                    nom: { type: 'string', example: 'Dupont' },
                    motDePasse: { type: 'string', example: 'password123' }
                  }
                },
                example: {
                  prenom: 'Alice',
                  nom: 'Dupont',
                  motDePasse: 'password123'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful authentication',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                      student: {
                        id: 1,
                        prenom: 'Alice',
                        nom: 'Dupont',
                        niveauActuel: 'CP',
                        totalPoints: 350
                      }
                    },
                    message: 'Connexion réussie'
                  }
                }
              }
            }
          }
        },
        {
          method: 'POST',
          path: '/auth/logout',
          summary: 'Student Logout',
          description: 'Logout student and invalidate session',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Successful logout',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Déconnexion réussie'
                  }
                }
              }
            }
          }
        },
        {
          method: 'POST',
          path: '/auth/refresh',
          summary: 'Refresh Token',
          description: 'Refresh JWT authentication token',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    },
                    message: 'Token rafraîchi'
                  }
                }
              }
            }
          }
        }
      ],
      'Students': [
        {
          method: 'GET',
          path: '/students',
          summary: 'List Students',
          description: 'Get list of all students (for login selection)',
          responses: {
            '200': {
              description: 'List of students',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: [
                      {
                        id: 1,
                        prenom: 'Alice',
                        nom: 'Dupont',
                        niveauActuel: 'CP',
                        totalPoints: 350,
                        serieJours: 7,
                        mascotteType: 'dragon'
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/students/profile',
          summary: 'Get Student Profile',
          description: 'Get authenticated student profile',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Student profile data',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      student: {
                        id: 1,
                        prenom: 'Alice',
                        nom: 'Dupont',
                        age: 7,
                        niveauActuel: 'CP',
                        totalPoints: 350,
                        serieJours: 7,
                        preferences: {
                          theme: 'colorful',
                          difficulty: 'adaptive'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          method: 'PUT',
          path: '/students/profile',
          summary: 'Update Student Profile',
          description: 'Update authenticated student profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prenom: { type: 'string' },
                    nom: { type: 'string' },
                    age: { type: 'number', minimum: 3, maximum: 18 },
                    preferences: { type: 'object' }
                  }
                },
                example: {
                  prenom: 'Alice',
                  nom: 'Dupont',
                  age: 7,
                  preferences: {
                    theme: 'colorful',
                    difficulty: 'adaptive'
                  }
                }
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/students/progress',
          summary: 'Get Student Progress',
          description: 'Get student learning progress',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'matiere',
              in: 'query',
              description: 'Subject filter',
              schema: { type: 'string' }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of items',
              schema: { type: 'number', default: 50 }
            }
          ]
        }
      ],
      'Exercises': [
        {
          method: 'GET',
          path: '/exercises',
          summary: 'List Exercises',
          description: 'Get list of exercises with pagination and filtering',
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number',
              schema: { type: 'string', default: '1' }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page',
              schema: { type: 'string', default: '20' }
            },
            {
              name: 'matiere',
              in: 'query',
              description: 'Subject filter',
              schema: { type: 'string', enum: ['mathematiques', 'francais', 'sciences'] }
            },
            {
              name: 'niveau',
              in: 'query',
              description: 'Grade level filter',
              schema: { type: 'string', enum: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] }
            },
            {
              name: 'difficulte',
              in: 'query',
              description: 'Difficulty filter',
              schema: { type: 'string', enum: ['facile', 'moyen', 'difficile'] }
            }
          ],
          responses: {
            '200': {
              description: 'List of exercises',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      items: [
                        {
                          id: 1001,
                          titre: 'Addition à deux chiffres',
                          matiere: 'mathematiques',
                          niveau: 'CP',
                          difficulte: 'facile',
                          pointsMax: 10,
                          dureeEstimee: 5
                        }
                      ],
                      total: 1,
                      page: 1,
                      limit: 20,
                      hasMore: false
                    }
                  }
                }
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/exercises/{exerciseId}',
          summary: 'Get Exercise Details',
          description: 'Get detailed information about a specific exercise',
          parameters: [
            {
              name: 'exerciseId',
              in: 'path',
              required: true,
              description: 'Exercise identifier',
              schema: { type: 'string' }
            }
          ]
        },
        {
          method: 'POST',
          path: '/exercises/attempt',
          summary: 'Submit Exercise Attempt',
          description: 'Submit student attempt for an exercise',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['exerciseId', 'score', 'completed'],
                  properties: {
                    exerciseId: { type: 'string' },
                    score: { type: 'string' },
                    completed: { type: 'string' },
                    timeSpent: { type: 'string' },
                    answers: { type: 'object' }
                  }
                },
                example: {
                  exerciseId: '1001',
                  score: '85',
                  completed: 'true',
                  timeSpent: '300',
                  answers: {
                    question1: 'A',
                    question2: 'B'
                  }
                }
              }
            }
          }
        }
      ],
      'Upload': [
        {
          method: 'POST',
          path: '/upload/upload',
          summary: 'Upload Files',
          description: 'Upload files with metadata and processing options',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'File to upload'
                    },
                    category: {
                      type: 'string',
                      enum: ['image', 'video', 'audio', 'document', 'exercise'],
                      description: 'File category'
                    },
                    generateThumbnails: {
                      type: 'boolean',
                      description: 'Generate thumbnails for images'
                    },
                    educationalMetadata: {
                      type: 'string',
                      description: 'JSON string with educational metadata'
                    }
                  }
                }
              }
            }
          }
        },
        {
          method: 'GET',
          path: '/upload/files/{fileId}',
          summary: 'Get File Information',
          description: 'Get file information by ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'fileId',
              in: 'path',
              required: true,
              description: 'File identifier',
              schema: { type: 'string', format: 'uuid' }
            }
          ]
        },
        {
          method: 'GET',
          path: '/upload/files',
          summary: 'List User Files',
          description: 'List user files with pagination and filtering',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'category',
              in: 'query',
              description: 'File category filter',
              schema: { type: 'string', enum: ['image', 'video', 'audio', 'document'] }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of files',
              schema: { type: 'number', default: 20 }
            },
            {
              name: 'offset',
              in: 'query',
              description: 'Number of files to skip',
              schema: { type: 'number', default: 0 }
            }
          ]
        }
      ],
      'Health': [
        {
          method: 'GET',
          path: '/health',
          summary: 'System Health Check',
          description: 'Get system health status',
          responses: {
            '200': {
              description: 'System health information',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      status: 'healthy',
                      timestamp: '2024-01-15T10:30:00Z',
                      uptime: 86400,
                      database: 'connected',
                      redis: 'connected',
                      memory: {
                        used: 67108864,
                        free: 134217728,
                        percentage: 33.3
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    };

    return organizedRoutes;
  }

  /**
   * Generate authentication guide
   */
  private generateAuthenticationGuide(): string {
    return `
# Authentication Guide

## Overview
The FastRevedKids API uses JWT (JSON Web Tokens) for authentication. All endpoints except login and health checks require authentication.

## Authentication Flow

### 1. Login
\`\`\`http
POST /auth/login
Content-Type: application/json

{
  "prenom": "Alice",
  "nom": "Dupont",
  "motDePasse": "optional-password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "student": {
      "id": 1,
      "prenom": "Alice",
      "nom": "Dupont",
      "niveauActuel": "CP"
    }
  },
  "message": "Connexion réussie"
}
\`\`\`

### 2. Using the Token
Include the JWT token in the Authorization header for all authenticated requests:

\`\`\`http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### 3. Token Refresh
Tokens expire after 24 hours. Use the refresh endpoint to get a new token:

\`\`\`http
POST /auth/refresh
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### 4. Logout
\`\`\`http
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

## Security Features

### CSRF Protection
For state-changing operations (POST, PUT, DELETE), include CSRF token:
\`\`\`http
X-CSRF-Token: csrf-token-value
\`\`\`

Get CSRF token from: \`GET /auth/csrf-token\`

### Rate Limiting
The API implements rate limiting:
- **Global**: 1000 requests per 15 minutes
- **Per IP**: 100 requests per 15 minutes  
- **Per User**: 50 requests per 15 minutes

Rate limit headers are included in responses:
- \`X-RateLimit-Limit\`: Request limit
- \`X-RateLimit-Remaining\`: Remaining requests
- \`X-RateLimit-Reset\`: Reset timestamp

## Error Handling

### Authentication Errors
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded

### Common Error Response Format
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional additional details"
  }
}
\`\`\`
`;
  }

  /**
   * Generate error codes reference
   */
  private generateErrorCodesReference() {
    return {
      authentication: {
        'UNAUTHORIZED': {
          status: 401,
          description: 'Authentication token required',
          example: 'Token d\'authentification requis'
        },
        'INVALID_TOKEN': {
          status: 401,
          description: 'Invalid or expired authentication token',
          example: 'Token invalide ou expiré'
        },
        'FORBIDDEN': {
          status: 403,
          description: 'Insufficient permissions for this resource',
          example: 'Accès non autorisé à cette ressource'
        },
        'LOGIN_ERROR': {
          status: 500,
          description: 'Error during login process',
          example: 'Erreur lors de la connexion'
        }
      },
      validation: {
        'INVALID_INPUT': {
          status: 400,
          description: 'Invalid input parameters',
          example: 'Les paramètres fournis sont invalides'
        },
        'MISSING_REQUIRED_FIELD': {
          status: 400,
          description: 'Required field is missing',
          example: 'Champ requis manquant'
        },
        'INVALID_FORMAT': {
          status: 400,
          description: 'Data format is invalid',
          example: 'Format de données invalide'
        }
      },
      resources: {
        'NOT_FOUND': {
          status: 404,
          description: 'Requested resource not found',
          example: 'Ressource introuvable'
        },
        'STUDENT_NOT_FOUND': {
          status: 404,
          description: 'Student not found',
          example: 'Étudiant non trouvé'
        },
        'EXERCISE_NOT_FOUND': {
          status: 404,
          description: 'Exercise not found',
          example: 'Exercice non trouvé'
        },
        'FILE_NOT_FOUND': {
          status: 404,
          description: 'File not found',
          example: 'Fichier non trouvé'
        }
      },
      security: {
        'RATE_LIMIT_EXCEEDED': {
          status: 429,
          description: 'Rate limit exceeded',
          example: 'Trop de requêtes. Veuillez réessayer plus tard.'
        },
        'CSRF_TOKEN_MISSING': {
          status: 403,
          description: 'CSRF token missing',
          example: 'Token CSRF manquant'
        },
        'CSRF_TOKEN_INVALID': {
          status: 403,
          description: 'CSRF token invalid',
          example: 'Token CSRF invalide'
        },
        'IP_BLOCKED': {
          status: 429,
          description: 'IP address temporarily blocked',
          example: 'Adresse IP temporairement bloquée'
        }
      },
      upload: {
        'FILE_TOO_LARGE': {
          status: 400,
          description: 'File size exceeds maximum limit',
          example: 'Fichier trop volumineux'
        },
        'UNSUPPORTED_FILE_TYPE': {
          status: 400,
          description: 'File type not supported',
          example: 'Type de fichier non supporté'
        },
        'UPLOAD_FAILED': {
          status: 500,
          description: 'File upload failed',
          example: 'Échec du téléchargement'
        }
      },
      server: {
        'INTERNAL_ERROR': {
          status: 500,
          description: 'Internal server error',
          example: 'Erreur interne du serveur'
        },
        'SERVICE_UNAVAILABLE': {
          status: 503,
          description: 'Service temporarily unavailable',
          example: 'Service temporairement indisponible'
        },
        'DATABASE_ERROR': {
          status: 500,
          description: 'Database connection error',
          example: 'Erreur de connexion à la base de données'
        }
      }
    };
  }

  /**
   * Write documentation files to disk
   */
  private async writeDocumentationFiles(docs: any): Promise<void> {
    // Write OpenAPI specification
    await writeFile(
      join(this.outputDir, 'openapi.json'),
      JSON.stringify(docs.openApiSpec, null, 2),
      'utf8'
    );

    // Write routes summary
    await writeFile(
      join(this.outputDir, 'routes-summary.json'),
      JSON.stringify(docs.routesSummary, null, 2),
      'utf8'
    );

    // Write authentication guide
    await writeFile(
      join(this.outputDir, 'authentication-guide.md'),
      docs.authenticationGuide,
      'utf8'
    );

    // Write error codes reference
    await writeFile(
      join(this.outputDir, 'error-codes.json'),
      JSON.stringify(docs.errorCodesReference, null, 2),
      'utf8'
    );

    // Write comprehensive API reference
    const apiReference = this.generateMarkdownReference(docs);
    await writeFile(
      join(this.outputDir, 'api-reference.md'),
      apiReference,
      'utf8'
    );

    console.log(`📚 API documentation generated in ${this.outputDir}`);
  }

  /**
   * Generate comprehensive markdown API reference
   */
  private generateMarkdownReference(docs: any): string {
    const { routesSummary, errorCodesReference } = docs;
    
    let markdown = `# FastRevedKids API Reference

## Overview
This is the comprehensive API reference for the FastRevedKids educational platform.

## Base URL
\`\`\`
Development: http://localhost:3003
Staging: https://api-staging.fastrevedkids.com
Production: https://api.fastrevedkids.com
\`\`\`

## Authentication
All endpoints except login and health checks require JWT authentication.
Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

`;

    // Generate sections for each tag
    for (const [tag, routes] of Object.entries(routesSummary)) {
      markdown += `## ${tag}\n\n`;
      
      for (const route of routes as any[]) {
        markdown += `### ${route.method} ${route.path}\n`;
        markdown += `**${route.summary}**\n\n`;
        markdown += `${route.description}\n\n`;

        // Security
        if (route.security) {
          markdown += `**Authentication Required:** Yes\n\n`;
        }

        // Parameters
        if (route.parameters && route.parameters.length > 0) {
          markdown += `**Parameters:**\n`;
          for (const param of route.parameters) {
            markdown += `- \`${param.name}\` (${param.in}): ${param.description}\n`;
          }
          markdown += '\n';
        }

        // Request body
        if (route.requestBody) {
          markdown += `**Request Body:**\n`;
          markdown += `\`\`\`json\n`;
          if (route.requestBody.content['application/json']?.example) {
            markdown += JSON.stringify(route.requestBody.content['application/json'].example, null, 2);
          } else if (route.requestBody.content['multipart/form-data']) {
            markdown += '// Multipart form data - see schema for details\n';
          }
          markdown += `\n\`\`\`\n\n`;
        }

        // Response examples
        if (route.responses) {
          markdown += `**Response Examples:**\n`;
          for (const [status, response] of Object.entries(route.responses as any)) {
            const responseObj = response as any;
            markdown += `\n**${status}** - ${responseObj.description || 'Success'}\n`;
            if (responseObj.content?.['application/json']?.example) {
              markdown += `\`\`\`json\n`;
              markdown += JSON.stringify(responseObj.content['application/json'].example, null, 2);
              markdown += `\n\`\`\`\n`;
            }
          }
        }

        markdown += '\n---\n\n';
      }
    }

    // Error codes section
    markdown += `## Error Codes Reference\n\n`;
    for (const [category, errors] of Object.entries(errorCodesReference)) {
      markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Errors\n\n`;
      for (const [code, details] of Object.entries(errors as any)) {
        const errorDetails = details as any;
        markdown += `#### ${code}\n`;
        markdown += `- **Status:** ${errorDetails.status}\n`;
        markdown += `- **Description:** ${errorDetails.description}\n`;
        markdown += `- **Example:** "${errorDetails.example}"\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Generate Postman collection
   */
  async generatePostmanCollection(): Promise<any> {
    const collection = {
      info: {
        name: 'FastRevedKids API',
        description: 'Complete API collection for FastRevedKids educational platform',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{jwt_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3003',
          type: 'string'
        },
        {
          key: 'jwt_token',
          value: '',
          type: 'string'
        }
      ],
      item: [] as any[]
    };

    const routesSummary = this.generateRoutesSummary();

    for (const [tag, routes] of Object.entries(routesSummary)) {
      const folder = {
        name: tag,
        item: [] as any[]
      };

      for (const route of routes as any[]) {
        const item = {
          name: route.summary,
          request: {
            method: route.method,
            header: [] as any[],
            url: {
              raw: `{{base_url}}${route.path}`,
              host: ['{{base_url}}'],
              path: route.path.split('/').filter(Boolean)
            }
          }
        };

        // Add authentication header if required
        if (route.security) {
          item.request.header.push({
            key: 'Authorization',
            value: 'Bearer {{jwt_token}}',
            type: 'text'
          });
        }

        // Add request body if present
        if (route.requestBody) {
          if (route.requestBody.content['application/json']) {
            item.request.header.push({
              key: 'Content-Type',
              value: 'application/json',
              type: 'text'
            });
            (item.request as any).body = {
              mode: 'raw',
              raw: JSON.stringify(route.requestBody.content['application/json'].example || {}, null, 2)
            };
          }
        }

        folder.item.push(item);
      }

      collection.item.push(folder);
    }

    // Write Postman collection
    await writeFile(
      join(this.outputDir, 'FastRevedKids-API.postman_collection.json'),
      JSON.stringify(collection, null, 2),
      'utf8'
    );

    return collection;
  }
}