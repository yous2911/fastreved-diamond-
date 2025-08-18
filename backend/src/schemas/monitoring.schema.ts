import { FastifySchema } from 'fastify';

export const monitoringSchemas = {
  health: {
    description: 'System health check',
    tags: ['monitoring'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              version: { type: 'string' },
              database: { type: 'object' },
              cache: { type: 'object' },
              metrics: { type: 'object' },
              memory: { type: 'object' },
            },
          },
          message: { type: 'string' },
        },
      },
    },
  } as FastifySchema,

  metrics: {
    description: 'Performance metrics',
    tags: ['monitoring'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              performance: { type: 'object' },
              system: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          message: { type: 'string' },
        },
      },
    },
  } as FastifySchema,

  cache: {
    description: 'Cache statistics',
    tags: ['monitoring'],
  } as FastifySchema,

  clearCache: {
    description: 'Clear cache',
    tags: ['monitoring'],
    querystring: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
      },
    },
  } as FastifySchema,

  reset: {
    description: 'Reset monitoring metrics',
    tags: ['monitoring'],
  } as FastifySchema,
};
