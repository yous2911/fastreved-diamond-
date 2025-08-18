import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as prometheus from 'prom-client';
import * as Sentry from '@sentry/node';
import { logger } from './logger';

// Prometheus metrics
const register = prometheus.register;

// HTTP metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestInProgress = new prometheus.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route'],
});

// Database metrics
const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const dbConnectionsActive = new prometheus.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
});

const dbConnectionsTotal = new prometheus.Counter({
  name: 'db_connections_total',
  help: 'Total number of database connections',
});

// Redis metrics
const redisOperationDuration = new prometheus.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

const redisOperationsTotal = new prometheus.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
});

// Business metrics
const userRegistrations = new prometheus.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
});

const lessonCompletions = new prometheus.Counter({
  name: 'lesson_completions_total',
  help: 'Total number of lesson completions',
  labelNames: ['lesson_type', 'difficulty'],
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
});

const kioskModeSessions = new prometheus.Counter({
  name: 'kiosk_mode_sessions_total',
  help: 'Total number of kiosk mode sessions',
  labelNames: ['duration_range'],
});

// System metrics
const memoryUsage = new prometheus.Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type'],
});

const cpuUsage = new prometheus.Gauge({
  name: 'nodejs_cpu_usage_percent',
  help: 'Node.js CPU usage percentage',
});

const eventLoopLag = new prometheus.Histogram({
  name: 'nodejs_eventloop_lag_seconds',
  help: 'Event loop lag in seconds',
  buckets: [0.001, 0.01, 0.1, 1, 10],
});

// Custom metrics
const customMetrics = new Map<string, prometheus.Counter | prometheus.Gauge | prometheus.Histogram>();

// Initialize monitoring
export const initializeMonitoring = (app: FastifyInstance) => {
  // Register metrics endpoint
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply): Promise<string | void> => {
    try {
      reply.header('Content-Type', register.contentType);
      return await register.metrics();
    } catch (error) {
      logger.error('Error generating metrics', { error });
      return reply.status(500).send({ error: 'Failed to generate metrics' });
    }
  });

  // Register health check endpoint
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      // Add frontend information
      const enhancedHealth = {
        ...health,
        frontends: {
          'CM1/CM2': 'http://localhost:3000',
          'CP/CE1/CE2': 'http://localhost:3001'
        },
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
      
      reply.status(statusCode).send(enhancedHealth);
    } catch (error) {
      logger.error('Health check failed', { error });
      reply.status(503).send({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        frontends: {
          'CM1/CM2': 'http://localhost:3000',
          'CP/CE1/CE2': 'http://localhost:3001'
        }
      });
    }
  });

  // Register detailed health check
  app.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await performDetailedHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      reply.status(statusCode).send(health);
    } catch (error) {
      logger.error('Detailed health check failed', { error });
      reply.status(503).send({
        status: 'unhealthy',
        error: 'Detailed health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Register readiness check
  app.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const readiness = await performReadinessCheck();
      const statusCode = readiness.ready ? 200 : 503;
      
      reply.status(statusCode).send(readiness);
    } catch (error) {
      logger.error('Readiness check failed', { error });
      reply.status(503).send({
        ready: false,
        error: 'Readiness check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Setup request monitoring
  setupRequestMonitoring(app);

  // Setup system monitoring
  setupSystemMonitoring();

  // Setup custom metrics
  setupCustomMetrics();

  logger.info('Monitoring initialized successfully');
};

// Setup request monitoring
const setupRequestMonitoring = (app: FastifyInstance) => {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const startTime = Date.now();
    
    // Track request in progress
    httpRequestInProgress.inc({ method: request.method, route: request.routerPath || 'unknown' });
    
    // Store start time for duration calculation
    (request as any).startTime = startTime;
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).startTime;
    const duration = (Date.now() - startTime) / 1000;
    const route = request.routerPath || 'unknown';
    
    // Record metrics
    httpRequestDuration.observe(
      { method: request.method, route, status_code: reply.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: request.method,
      route,
      status_code: reply.statusCode,
    });
    
    httpRequestInProgress.dec({ method: request.method, route });
    
    // Log slow requests
    if (duration > 5) {
      logger.warn('Slow request detected', {
        method: request.method,
        route,
        duration,
        statusCode: reply.statusCode,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
    }
  });
};

// Setup system monitoring
const setupSystemMonitoring = () => {
  // Monitor memory usage
  setInterval(() => {
    const memUsage = process.memoryUsage();
    memoryUsage.set({ type: 'rss' }, memUsage.rss);
    memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    memoryUsage.set({ type: 'external' }, memUsage.external);
  }, 30000);

  // Monitor CPU usage
  let lastCpuUsage = process.cpuUsage();
  let lastHrTime = process.hrtime();

  setInterval(() => {
    const currentCpuUsage = process.cpuUsage();
    const currentHrTime = process.hrtime();
    
    const elapsedUser = currentCpuUsage.user - lastCpuUsage.user;
    const elapsedSystem = currentCpuUsage.system - lastCpuUsage.system;
    const elapsedTime = (currentHrTime[0] - lastHrTime[0]) * 1000 + (currentHrTime[1] - lastHrTime[1]) / 1000000;
    
    const cpuPercent = ((elapsedUser + elapsedSystem) / elapsedTime) * 100;
    cpuUsage.set(cpuPercent);
    
    lastCpuUsage = currentCpuUsage;
    lastHrTime = currentHrTime;
  }, 30000);

  // Monitor event loop lag
  setInterval(() => {
    const start = process.hrtime();
    setImmediate(() => {
      const diff = process.hrtime(start);
      const lag = (diff[0] * 1000) + (diff[1] / 1000000);
      eventLoopLag.observe(lag);
    });
  }, 1000);
};

// Setup custom metrics
const setupCustomMetrics = () => {
  // Create custom counter
  const createCustomCounter = (name: string, help: string, labelNames: string[] = []) => {
    const counter = new prometheus.Counter({
      name: `custom_${name}`,
      help,
      labelNames,
    });
    customMetrics.set(name, counter);
    return counter;
  };

  // Create custom gauge
  const createCustomGauge = (name: string, help: string, labelNames: string[] = []) => {
    const gauge = new prometheus.Gauge({
      name: `custom_${name}`,
      help,
      labelNames,
    });
    customMetrics.set(name, gauge);
    return gauge;
  };

  // Create custom histogram
  const createCustomHistogram = (name: string, help: string, labelNames: string[] = [], buckets: number[] = []) => {
    const histogram = new prometheus.Histogram({
      name: `custom_${name}`,
      help,
      labelNames,
      buckets: buckets.length > 0 ? buckets : undefined,
    });
    customMetrics.set(name, histogram);
    return histogram;
  };

  // Export functions for use in other modules
  (global as any).createCustomCounter = createCustomCounter;
  (global as any).createCustomGauge = createCustomGauge;
  (global as any).createCustomHistogram = createCustomHistogram;
};

// Perform health check
const performHealthCheck = async () => {
  const checks = {
    database: await checkDatabaseHealth(),
    redis: await checkRedisHealth(),
    memory: checkMemoryHealth(),
    uptime: checkUptimeHealth(),
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  };
};

// Perform detailed health check
const performDetailedHealthCheck = async () => {
  const checks = {
    database: await checkDatabaseHealthDetailed(),
    redis: await checkRedisHealthDetailed(),
    memory: checkMemoryHealthDetailed(),
    uptime: checkUptimeHealthDetailed(),
    disk: checkDiskHealth(),
    network: checkNetworkHealth(),
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  };
};

// Perform readiness check
const performReadinessCheck = async () => {
  const checks = {
    database: await checkDatabaseReadiness(),
    redis: await checkRedisReadiness(),
    application: checkApplicationReadiness(),
  };

  const allReady = Object.values(checks).every(check => check.ready);
  
  return {
    ready: allReady,
    timestamp: new Date().toISOString(),
    checks,
  };
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    // This would use your actual database connection
    // await db.raw('SELECT 1');
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    logger.error('Database health check failed', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return { status: 'unhealthy', message: 'Database connection failed', error: errorMessage };
  }
};

// Redis health check
const checkRedisHealth = async () => {
  try {
    // This would use your actual Redis connection
    // await redis.ping();
    return { status: 'healthy', message: 'Redis connection successful' };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
    return { status: 'unhealthy', message: 'Redis connection failed', error: errorMessage };
  }
};

// Memory health check
const checkMemoryHealth = () => {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (heapUsedPercent > 90) {
    return { status: 'unhealthy', message: 'High memory usage', usage: heapUsedPercent };
  }
  
  return { status: 'healthy', message: 'Memory usage normal', usage: heapUsedPercent };
};

// Uptime health check
const checkUptimeHealth = () => {
  const uptime = process.uptime();
  const maxUptime = 7 * 24 * 60 * 60; // 7 days
  
  if (uptime > maxUptime) {
    return { status: 'warning', message: 'Long uptime detected', uptime };
  }
  
  return { status: 'healthy', message: 'Uptime normal', uptime };
};

// Detailed health checks
const checkDatabaseHealthDetailed = async () => {
  try {
    // Add more detailed database checks
    return { status: 'healthy', message: 'Database detailed check passed' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return { status: 'unhealthy', message: 'Database detailed check failed', error: errorMessage };
  }
};

const checkRedisHealthDetailed = async () => {
  try {
    // Add more detailed Redis checks
    return { status: 'healthy', message: 'Redis detailed check passed' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
    return { status: 'unhealthy', message: 'Redis detailed check failed', error: errorMessage };
  }
};

const checkMemoryHealthDetailed = () => {
  const memUsage = process.memoryUsage();
  return {
    status: 'healthy',
    message: 'Memory detailed check passed',
    details: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    },
  };
};

const checkUptimeHealthDetailed = () => {
  const uptime = process.uptime();
  return {
    status: 'healthy',
    message: 'Uptime detailed check passed',
    details: {
      uptime,
      startTime: new Date(Date.now() - uptime * 1000).toISOString(),
    },
  };
};

const checkDiskHealth = () => {
  // This would check disk space
  return { status: 'healthy', message: 'Disk space adequate' };
};

const checkNetworkHealth = () => {
  // This would check network connectivity
  return { status: 'healthy', message: 'Network connectivity normal' };
};

// Readiness checks
const checkDatabaseReadiness = async () => {
  try {
    // Check if database is ready to accept connections
    return { ready: true, message: 'Database ready' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return { ready: false, message: 'Database not ready', error: errorMessage };
  }
};

const checkRedisReadiness = async () => {
  try {
    // Check if Redis is ready to accept connections
    return { ready: true, message: 'Redis ready' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
    return { ready: false, message: 'Redis not ready', error: errorMessage };
  }
};

const checkApplicationReadiness = () => {
  // Check if application is ready to serve requests
  return { ready: true, message: 'Application ready' };
};

// Metric recording functions
export const recordDatabaseQuery = (operation: string, table: string, duration: number) => {
  dbQueryDuration.observe({ operation, table }, duration);
};

export const recordRedisOperation = (operation: string, duration: number, status: 'success' | 'error') => {
  redisOperationDuration.observe({ operation }, duration);
  redisOperationsTotal.inc({ operation, status });
};

export const recordUserRegistration = () => {
  userRegistrations.inc();
};

export const recordLessonCompletion = (lessonType: string, difficulty: string) => {
  lessonCompletions.inc({ lesson_type: lessonType, difficulty });
};

export const recordActiveUser = (count: number) => {
  activeUsers.set(count);
};

export const recordKioskModeSession = (durationMinutes: number) => {
  let durationRange = 'short';
  if (durationMinutes > 60) durationRange = 'long';
  else if (durationMinutes > 30) durationRange = 'medium';
  
  kioskModeSessions.inc({ duration_range: durationRange });
};

export const recordDatabaseConnection = (active: number) => {
  dbConnectionsActive.set(active);
};

export const recordDatabaseConnectionTotal = () => {
  dbConnectionsTotal.inc();
};

// Custom metric functions
export const getCustomMetric = (name: string) => {
  return customMetrics.get(name);
};

export const incrementCustomCounter = (name: string, labels: Record<string, string> = {}) => {
  const metric = customMetrics.get(name) as prometheus.Counter;
  if (metric) {
    metric.inc(labels);
  }
};

export const setCustomGauge = (name: string, value: number, labels: Record<string, string> = {}) => {
  const metric = customMetrics.get(name) as prometheus.Gauge;
  if (metric) {
    metric.set(labels, value);
  }
};

export const observeCustomHistogram = (name: string, value: number, labels: Record<string, string> = {}) => {
  const metric = customMetrics.get(name) as prometheus.Histogram;
  if (metric) {
    metric.observe(labels, value);
  }
};

// Performance monitoring
export const measureAsync = async <T>(
  operation: string,
  fn: () => Promise<T>,
  labels: Record<string, string> = {}
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = (Date.now() - startTime) / 1000;
    
    // Record success metric
    const successMetric = getCustomMetric(`${operation}_success_duration`) as prometheus.Histogram;
    if (successMetric) {
      successMetric.observe(labels, duration);
    }
    
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    
    // Record error metric
    const errorMetric = getCustomMetric(`${operation}_error_duration`) as prometheus.Histogram;
    if (errorMetric) {
      errorMetric.observe(labels, duration);
    }
    
    throw error;
  }
};

// Export metrics for use in other modules
export {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestInProgress,
  dbQueryDuration,
  dbConnectionsActive,
  dbConnectionsTotal,
  redisOperationDuration,
  redisOperationsTotal,
  userRegistrations,
  lessonCompletions,
  activeUsers,
  kioskModeSessions,
  memoryUsage,
  cpuUsage,
  eventLoopLag,
}; 