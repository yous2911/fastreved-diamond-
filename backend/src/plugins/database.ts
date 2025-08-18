import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { connectDatabase, getDatabase, checkDatabaseHealth, disconnectDatabase, testConnection } from '../db/connection';
import { config } from '../config/config';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof getDatabase>;
    dbHealth: () => Promise<{ status: string; message: string; details?: any }>;
    dbReconnect: () => Promise<boolean>;
  }
}

// Database plugin with enhanced error handling and monitoring
const databasePlugin: FastifyPluginAsync = async (fastify) => {
  let isConnected = false;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 5;

  // Enhanced connection function with retry logic
  async function ensureConnection(attempt = 1): Promise<void> {
    try {
      fastify.log.info(`🔄 Database connection attempt ${attempt}/${maxConnectionAttempts}...`);
      
      await connectDatabase();
      const db = getDatabase();
      
      // Test the connection using the existing test function
      const isTestSuccessful = await testConnection();
      if (!isTestSuccessful) {
        throw new Error('Database connection test failed');
      }
      
      isConnected = true;
      connectionAttempts = attempt;
      
      fastify.log.info(`✅ Database connected successfully on attempt ${attempt}`);
      
      // Decorate fastify with database instance
      fastify.decorate('db', db);
      
    } catch (error) {
      fastify.log.error(`❌ Database connection attempt ${attempt} failed:`, error);
      
      if (attempt < maxConnectionAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        fastify.log.info(`⏳ Retrying database connection in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return ensureConnection(attempt + 1);
      } else {
        throw new Error(`Failed to connect to database after ${maxConnectionAttempts} attempts: ${error}`);
      }
    }
  }

  // Connect to database with retry logic
  await ensureConnection();

  // Enhanced health check with detailed diagnostics
  fastify.decorate('dbHealth', async () => {
    try {
      if (!isConnected) {
        return { 
          status: 'disconnected', 
          message: 'Database not connected',
          details: { connectionAttempts }
        };
      }

      const healthResult = await checkDatabaseHealth();
      
      if (healthResult.status === 'healthy') {
        return { 
          status: 'healthy', 
          message: 'Database connection OK',
          details: {
            responseTime: healthResult.responseTime,
            connections: healthResult.connections,
            config: {
              host: config.DB_HOST,
              port: config.DB_PORT,
              database: config.DB_NAME,
              connectionLimit: config.DB_CONNECTION_LIMIT,
            }
          }
        };
      } else {
        return { 
          status: 'unhealthy', 
          message: `Database connection failed: ${healthResult.error}`,
          details: { error: healthResult.error }
        };
      }
    } catch (error) {
      fastify.log.error('Database health check failed:', error);
      return { 
        status: 'error', 
        message: 'Health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  });

  // Database reconnection function
  fastify.decorate('dbReconnect', async (): Promise<boolean> => {
    try {
      fastify.log.info('🔄 Attempting database reconnection...');
      
      // Try to disconnect first
      try {
        await disconnectDatabase();
      } catch (error) {
        fastify.log.warn('Error during disconnect (continuing):', error);
      }
      
      isConnected = false;
      
      // Reconnect
      await ensureConnection();
      
      fastify.log.info('✅ Database reconnection successful');
      return true;
      
    } catch (error) {
      fastify.log.error('❌ Database reconnection failed:', error);
      isConnected = false;
      return false;
    }
  });

  // Connection monitoring - check connection every 30 seconds
  const connectionMonitor = setInterval(async () => {
    try {
      const health = await fastify.dbHealth();
      if (health.status !== 'healthy') {
        fastify.log.warn('Database health check failed, attempting reconnection...');
        await fastify.dbReconnect();
      }
    } catch (error) {
      fastify.log.error('Connection monitor error:', error);
    }
  }, 30000);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    try {
      // Clear connection monitor
      clearInterval(connectionMonitor);
      
      // Close database connections
      await disconnectDatabase();
      isConnected = false;
      
      fastify.log.info('✅ Database connections closed gracefully');
    } catch (error) {
      fastify.log.error('❌ Error closing database connections:', error);
    }
  });

  // Request hook to ensure connection before each request
  fastify.addHook('preHandler', async (request, reply): Promise<void> => {
    if (!isConnected) {
      fastify.log.warn('Database not connected, attempting reconnection...');
      
      try {
        await fastify.dbReconnect();
      } catch (error) {
        fastify.log.error('Failed to reconnect to database:', error);
        
        // Return 503 Service Unavailable if database is down
        return reply.status(503).send({
          success: false,
          error: {
            message: 'Service temporairement indisponible - Base de données inaccessible',
            code: 'DATABASE_UNAVAILABLE',
          },
        });
      }
    }
  });

  // Add database info to request context
  fastify.addHook('onRequest', async (request) => {
    (request as any).dbConnected = isConnected;
    (request as any).dbAttempts = connectionAttempts;
  });

  fastify.log.info('✅ Database plugin registered successfully');
};

export default fp(databasePlugin, {
  name: 'database',
  dependencies: [], // No dependencies
});
