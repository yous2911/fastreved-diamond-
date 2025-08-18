import { FastifyRequest, FastifyReply } from 'fastify';

// Conditional Sentry import
let Sentry: any;
try {
  Sentry = require('@sentry/node');
  console.log('Sentry initialized for error tracking');
} catch (error) {
  console.warn('Sentry not installed, using console logging for errors');
  Sentry = {
    captureException: (err: any) => console.error('Error captured:', err),
    captureMessage: (msg: string) => console.warn('Message captured:', msg),
    addBreadcrumb: () => {},
    setUser: () => {},
    setTag: () => {},
  };
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string | undefined;
  details?: any | undefined;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  code?: string | undefined;
  details?: any | undefined;

  constructor(message: string, statusCode = 500, code?: string | undefined, details?: any | undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function createError(
  message: string,
  statusCode = 500,
  code?: string,
  details?: any
): AppError {
  return new AppError(message, statusCode, code, details);
}

export async function errorHandler(
  error: Error | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiError = error as ApiError;
  const statusCode = apiError.statusCode || 500;
  
  // Log error
  request.log.error({
    error: {
      message: error.message,
      stack: error.stack,
      statusCode,
      code: apiError.code,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
    },
  });

  // Capture with Sentry
  Sentry.captureException(error, {
    tags: {
      method: request.method,
      url: request.url,
      statusCode,
    },
  });

  // Send response
  await reply.status(statusCode).send({
    success: false,
    error: {
      message: statusCode >= 500 ? 'Internal Server Error' : error.message,
      code: apiError.code,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        details: apiError.details,
        stack: error.stack,
      }),
    },
    timestamp: new Date().toISOString(),
  });
} 