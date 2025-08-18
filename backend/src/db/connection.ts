import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config, dbConfig, isProduction } from '../config/config';
import { logger } from '../utils/logger';

// Re-export config for other modules
export { config } from '../config/config';

// Enhanced MySQL connection pool configuration
const poolConfig = {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  
  // Connection pool settings
  connectionLimit: dbConfig.connectionLimit,
  acquireTimeout: 60000,        // 60 seconds to get connection
  timeout: 60000,               // 60 seconds query timeout
  reconnect: true,              // Auto-reconnect
  
  // Performance optimizations
  multipleStatements: false,    // Security: prevent SQL injection via multiple statements
  dateStrings: true,           // Return dates as strings for better handling
  supportBigNumbers: true,      // Support for big integers
  bigNumberStrings: true,      // Return big numbers as strings
  
  // Production optimizations
  ...(isProduction && {
    ssl: dbConfig.ssl ? {
      rejectUnauthorized: false, // Allow self-signed certificates in production
      ca: process.env.DB_SSL_CA,
      key: process.env.DB_SSL_KEY,
      cert: process.env.DB_SSL_CERT
    } : undefined,
    
    // Connection management
    idleTimeout: 300000,        // 5 minutes idle timeout
    maxIdle: 10,                // Maximum idle connections
    
    // Retry configuration
    maxReconnects: 3,
    reconnectDelay: 2000,       // 2 seconds between reconnect attempts
    
    // Query optimizations
    trace: false,               // Disable tracing in production
    debug: false,               // Disable debug in production
  }),
  
  // Development settings
  ...(!isProduction && {
    debug: ['ComQueryPacket', 'RowDataPacket'],
    trace: true,
    idleTimeout: 60000,         // 1 minute idle timeout for dev
    maxIdle: 2,                 // Fewer idle connections for dev
  }),
  
  // Charset and timezone
  charset: 'utf8mb4',
  timezone: '+00:00',          // UTC timezone
  
  // Type casting for better data handling
  typeCast: function (field: any, next: any) {
    if (field.type === 'TINY' && field.length === 1) {
      return (field.string() === '1'); // Convert TINYINT(1) to boolean
    }
    if (field.type === 'JSON') {
      try {
        return JSON.parse(field.string());
      } catch (error) {
        return field.string();
      }
    }
    return next();
  }
};

// Create MySQL connection pool
const connection = mysql.createPool(poolConfig);

// Create Drizzle instance
export const db = drizzle(connection);

// Connection pool monitoring
interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  acquiredConnections: number;
  releasedConnections: number;
  createdConnections: number;
  destroyedConnections: number;
}

// Connection pool event listeners for monitoring
connection.on('connection', (conn) => {
  logger.info('New database connection established', { 
    connectionId: conn.threadId,
    totalConnections: (connection as any)._allConnections?.length || 0
  });
});

connection.on('error', (error) => {
  logger.error('Database connection error', { error: error.message });
});

connection.on('release', (conn) => {
  logger.debug('Database connection released', { 
    connectionId: conn.threadId
  });
});

// Get connection pool statistics
export function getPoolStats(): PoolStats {
  const pool = connection as any;
  return {
    totalConnections: pool._allConnections?.length || 0,
    activeConnections: pool._activeConnections?.length || 0,
    idleConnections: pool._freeConnections?.length || 0,
    queuedRequests: pool._connectionQueue?.length || 0,
    acquiredConnections: pool._acquiredConnections || 0,
    releasedConnections: pool._releasedConnections || 0,
    createdConnections: pool._createdConnections || 0,
    destroyedConnections: pool._destroyedConnections || 0
  };
}

// Test connection function with retry logic
export async function testConnection(retries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();
      const [result] = await connection.execute('SELECT 1 as test');
      const responseTime = Date.now() - startTime;
      
      logger.info('Database connection test successful', {
        attempt,
        responseTime,
        poolStats: getPoolStats()
      });
      
      return result !== null;
    } catch (error) {
      logger.warn('Database connection test failed', {
        attempt,
        retries,
        error: error instanceof Error ? error.message : 'Unknown error',
        poolStats: getPoolStats()
      });
      
      if (attempt === retries) {
        logger.error('Database connection failed after all retries', { 
          attempts: retries,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return false;
}

// Enhanced health check function with detailed metrics
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  poolStats?: PoolStats;
  checks?: {
    connection: boolean;
    query: boolean;
    poolUtilization: number;
  };
  error?: string;
  lastChecked: string;
}> {
  const start = Date.now();
  const poolStats = getPoolStats();
  const lastChecked = new Date().toISOString();
  
  try {
    // Test basic connectivity
    const [connectionResult] = await Promise.allSettled([
      connection.execute('SELECT 1 as connection_test'),
      connection.execute('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?', [dbConfig.database])
    ]);
    
    const responseTime = Date.now() - start;
    const poolUtilization = poolStats.totalConnections > 0 
      ? (poolStats.activeConnections / poolStats.totalConnections) * 100
      : 0;
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (connectionResult.status === 'rejected') {
      status = 'unhealthy';
    } else if (responseTime > 5000 || poolUtilization > 90) {
      status = 'degraded';
    }
    
    const checks = {
      connection: connectionResult.status === 'fulfilled',
      query: connectionResult.status === 'fulfilled',
      poolUtilization
    };
    
    logger.debug('Database health check completed', {
      status,
      responseTime,
      poolStats,
      checks
    });
    
    return {
      status,
      responseTime,
      poolStats,
      checks,
      lastChecked
    };
    
  } catch (error) {
    const responseTime = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Database health check failed', {
      error: errorMessage,
      responseTime,
      poolStats
    });
    
    return {
      status: 'unhealthy',
      responseTime,
      poolStats,
      checks: {
        connection: false,
        query: false,
        poolUtilization: poolStats.totalConnections > 0 
          ? (poolStats.activeConnections / poolStats.totalConnections) * 100
          : 0
      },
      error: errorMessage,
      lastChecked
    };
  }
}

// Enhanced connection management
let connectionInitialized = false;
let shutdownInProgress = false;

export async function connectDatabase(): Promise<void> {
  if (connectionInitialized) {
    logger.info('Database already connected');
    return;
  }

  try {
    logger.info('Initializing database connection...', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      connectionLimit: dbConfig.connectionLimit,
      environment: config.NODE_ENV
    });

    // Test initial connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to establish database connection');
    }

    // Set up connection pool monitoring interval
    const monitoringInterval = setInterval(() => {
      if (shutdownInProgress) {
        clearInterval(monitoringInterval);
        return;
      }
      
      const stats = getPoolStats();
      const utilizationPercent = stats.totalConnections > 0 
        ? (stats.activeConnections / stats.totalConnections) * 100 
        : 0;

      // Log warning if pool utilization is high
      if (utilizationPercent > 80) {
        logger.warn('High database connection pool utilization', {
          utilizationPercent: Math.round(utilizationPercent),
          poolStats: stats
        });
      }

      // Log pool stats periodically (debug level)
      logger.debug('Database connection pool stats', { poolStats: stats });
    }, 30000); // Every 30 seconds

    connectionInitialized = true;
    logger.info('Database connection established successfully', {
      poolStats: getPoolStats()
    });

  } catch (error) {
    logger.error('Failed to connect to database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database
      }
    });
    throw error;
  }
}

export function getDatabase() {
  if (!connectionInitialized) {
    logger.warn('Database not yet initialized, returning uninitialized instance');
  }
  return db;
}

export async function disconnectDatabase(): Promise<void> {
  if (!connectionInitialized || shutdownInProgress) {
    return;
  }

  shutdownInProgress = true;
  logger.info('Starting graceful database disconnect...');

  try {
    // Wait for active connections to finish (max 30 seconds)
    const maxWaitTime = 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const stats = getPoolStats();
      
      if (stats.activeConnections === 0) {
        logger.info('All active connections closed');
        break;
      }
      
      logger.info(`Waiting for ${stats.activeConnections} active connections to close...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Force close the connection pool
    await connection.end();
    connectionInitialized = false;
    
    logger.info('Database connection closed successfully');
    
  } catch (error) {
    logger.error('Error during database disconnect:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    shutdownInProgress = false;
  }
}

// Function to handle database reconnection
export async function reconnectDatabase(): Promise<boolean> {
  logger.info('Attempting database reconnection...');
  
  try {
    await disconnectDatabase();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await connectDatabase();
    return true;
  } catch (error) {
    logger.error('Database reconnection failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

// Database transaction helper with retry logic
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>,
  options: { retries?: number; timeout?: number } = {}
): Promise<T> {
  const { retries = 3, timeout = 30000 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const conn = await connection.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // Set transaction timeout
      await conn.execute(`SET SESSION innodb_lock_wait_timeout = ${Math.floor(timeout / 1000)}`);
      
      const result = await callback(conn);
      await conn.commit();
      
      logger.debug('Transaction completed successfully', { attempt });
      return result;
      
    } catch (error) {
      await conn.rollback();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Transaction failed', {
        attempt,
        retries,
        error: errorMessage
      });
      
      if (attempt === retries) {
        logger.error('Transaction failed after all retries', {
          attempts: retries,
          error: errorMessage
        });
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      
    } finally {
      conn.release();
    }
  }
  
  throw new Error('Transaction failed unexpectedly');
}

// Export connection for advanced usage
export { connection };

// Cleanup on process exit
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await disconnectDatabase();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await disconnectDatabase();
});
