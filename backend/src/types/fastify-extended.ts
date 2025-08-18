import 'fastify';
import { FastifyRequest as OriginalFastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    // Cache service
    cache: any;
    
    // WebSocket broadcast function
    broadcast?: (message: any) => void;
    
    // Authentication decorator
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    
    // Monitoring service
    monitoring: any;
    
    // Metrics for monitoring
    metrics: any;
  }

  interface FastifyRequest {
    startTime?: number;
  }
}

export interface AuthenticatedRequest extends OriginalFastifyRequest {
  user: {
    studentId: number;
    email: string;
    type: string;
  };
} 