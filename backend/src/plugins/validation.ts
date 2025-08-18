// src/plugins/validation.ts - Enhanced with Zod validation
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InputSanitizationService } from '../middleware/input-sanitization.middleware';
import { logger } from '../utils/logger';

// Create input sanitization service instance
const sanitizationService = new InputSanitizationService({
  skipRoutes: ['/api/health', '/api/metrics', '/docs'],
  skipMethods: ['GET', 'HEAD', 'OPTIONS'],
  allowHtml: false,
  maxLength: {
    string: 1000,
    email: 254,
    url: 2048,
    text: 10000
  }
});

const validationPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Add Zod validator compiler
  fastify.setValidatorCompiler(({ schema, method, url }) => {
    return (data) => {
      try {
        if (!schema) {
          return { value: data };
        }

        let zodSchema: z.ZodSchema<any>;

        // Convert JSON Schema to Zod if needed
        if (schema && typeof schema === 'object' && !('_def' in schema)) {
          zodSchema = convertJsonSchemaToZod(schema);
        } else if ('_def' in schema) {
          zodSchema = schema as z.ZodSchema<any>;
        } else {
          return { value: data };
        }

        // Validate with Zod
        const result = zodSchema.safeParse(data);
        
        if (result.success) {
          return { value: result.data };
        } else {
          // Enhanced error reporting
          const errorDetails = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: 'received' in err ? err.received : undefined
          }));

          logger.warn('Validation failed', {
            method,
            url,
            errors: errorDetails,
            data: process.env.NODE_ENV === 'development' ? data : '[REDACTED]'
          });

          return {
            error: {
              message: 'Validation failed',
              details: errorDetails,
              statusCode: 400
            }
          };
        }
      } catch (error) {
        logger.error('Validation error:', error);
        return {
          error: {
            message: 'Validation processing error',
            statusCode: 400
          }
        };
      }
    };
  });

  // Add input sanitization middleware globally
  fastify.addHook('preHandler', async (request, reply) => {
    await sanitizationService.sanitizationMiddleware(request, reply);
  });

  // Add validation error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    // Handle validation errors specifically
    if (error.validation) {
      logger.warn('Request validation failed', {
        method: request.method,
        url: request.url,
        errors: error.validation,
        userAgent: request.headers['user-agent'],
        ip: request.ip
      });

      return reply.status(400).send({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.validation.map((err: any) => ({
            field: err.instancePath || err.dataPath || 'unknown',
            message: err.message || 'Invalid value',
            value: err.data
          }))
        }
      });
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      });
    }

    // Re-throw other errors to be handled by main error handler
    throw error;
  });

  // Add request context with validated data
  fastify.decorateRequest('validated', null);
  
  // Add validation helper methods
  fastify.decorate('validateSchema', (schema: z.ZodSchema<any>, data: any) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const validationError = new Error('Schema validation failed');
      (validationError as any).validation = result.error.errors;
      throw validationError;
    }
    return result.data;
  });

  // Create common validation schemas
  const commonSchemas = {
    // ID validation
    id: z.string().uuid('Invalid ID format'),
    
    // Email validation
    email: z.string().email('Invalid email format').max(254),
    
    // Name validation (French names with accents)
    name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Invalid name format'),
    
    // Password validation
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    
    // Phone number validation
    phone: z.string()
      .regex(/^[\d+\-\s()]+$/, 'Invalid phone format')
      .optional(),
    
    // URL validation
    url: z.string().url('Invalid URL format').max(2048),
    
    // Date validation
    date: z.string().datetime('Invalid date format').or(z.date()),
    
    // Pagination
    pagination: z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('asc')
    }),

    // Search query
    search: z.object({
      q: z.string().min(1).max(100).optional(),
      filters: z.record(z.string()).optional()
    })
  };

  // Store common schemas for use in routes
  fastify.decorate('schemas', commonSchemas);

  fastify.log.info('✅ Enhanced validation plugin registered with Zod and sanitization');
};

// Helper function to convert JSON Schema to Zod (basic implementation)
function convertJsonSchemaToZod(schema: any): z.ZodSchema<any> {
  if (schema.type === 'string') {
    let zodString = z.string();
    
    if (schema.minLength) {
      zodString = zodString.min(schema.minLength);
    }
    if (schema.maxLength) {
      zodString = zodString.max(schema.maxLength);
    }
    if (schema.pattern) {
      zodString = zodString.regex(new RegExp(schema.pattern));
    }
    if (schema.format === 'email') {
      zodString = zodString.email();
    }
    if (schema.format === 'uri') {
      zodString = zodString.url();
    }
    
    return zodString;
  }
  
  if (schema.type === 'number') {
    let zodNumber = z.number();
    
    if (schema.minimum) {
      zodNumber = zodNumber.min(schema.minimum);
    }
    if (schema.maximum) {
      zodNumber = zodNumber.max(schema.maximum);
    }
    
    return zodNumber;
  }
  
  if (schema.type === 'integer') {
    let zodNumber = z.number().int();
    
    if (schema.minimum) {
      zodNumber = zodNumber.min(schema.minimum);
    }
    if (schema.maximum) {
      zodNumber = zodNumber.max(schema.maximum);
    }
    
    return zodNumber;
  }
  
  if (schema.type === 'boolean') {
    return z.boolean();
  }
  
  if (schema.type === 'array') {
    const itemSchema = schema.items ? convertJsonSchemaToZod(schema.items) : z.any();
    let zodArray = z.array(itemSchema);
    
    if (schema.minItems) {
      zodArray = zodArray.min(schema.minItems);
    }
    if (schema.maxItems) {
      zodArray = zodArray.max(schema.maxItems);
    }
    
    return zodArray;
  }
  
  if (schema.type === 'object') {
    const shape: Record<string, z.ZodSchema<any>> = {};
    
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        shape[key] = convertJsonSchemaToZod(value);
        
        if (!schema.required?.includes(key)) {
          shape[key] = shape[key].optional();
        }
      }
    }
    
    let zodObject = z.object(shape);
    
    if (schema.additionalProperties === false) {
      zodObject = zodObject.strict();
    }
    
    return zodObject;
  }
  
  // Fallback to any for unsupported types
  return z.any();
}

export default fp(validationPlugin, { name: 'validation' });
