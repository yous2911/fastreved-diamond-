/**
 * Database Connection Resilience Service for RevEd Kids
 * Provides advanced connection timeout handling, retry logic, and connection recovery
 */

import { connection, testConnection, reconnectDatabase, getPoolStats } from '../db/connection';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import cron from 'node-cron';

interface ConnectionConfig {
  timeouts: {
    connection: number; // Connection timeout in ms
    query: number; // Query timeout in ms
    idle: number; // Idle connection timeout in ms
    acquire: number; // Pool acquire timeout in ms
  };
  retryPolicy: {
    maxRetries: number;
    baseDelay: number; // Base delay in ms
    maxDelay: number; // Maximum delay in ms
    backoffMultiplier: number;
    jitter: boolean; // Add random jitter to prevent thundering herd
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number; // Number of failures to trip breaker
    resetTimeout: number; // Time to wait before attempting reset (ms)
    monitoringWindow: number; // Window to count failures (ms)
  };
  healthCheck: {
    enabled: boolean;
    interval: number; // Health check interval in ms
    timeout: number; // Health check timeout in ms
    failureThreshold: number; // Consecutive failures before marking unhealthy
  };
  recovery: {
    enabled: boolean;
    maxRecoveryAttempts: number;
    recoveryBackoffMs: number;
    warmupQueries: string[]; // Queries to run after recovery
  };
}

interface ConnectionMetrics {
  timestamp: Date;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  failedConnections: number;
  successfulRetries: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  avgResponseTime: number;
  connectionErrors: number;
  timeoutErrors: number;
}

interface RetryOperation<T> {
  id: string;
  operation: () => Promise<T>;
  attempts: number;
  maxAttempts: number;
  lastError?: Error;
  startTime: Date;
  delays: number[];
}

class ConnectionResilienceService extends EventEmitter {
  private config: ConnectionConfig;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private consecutiveHealthFailures = 0;
  private isHealthy = true;
  private metrics: ConnectionMetrics[] = [];
  private activeOperations = new Map<string, RetryOperation<any>>();
  private responseTimes: number[] = [];
  private connectionErrors = 0;
  private timeoutErrors = 0;

  constructor() {
    super();

    this.config = {
      timeouts: {
        connection: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'), // 30s
        query: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'), // 60s
        idle: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5min
        acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // 60s
      },
      retryPolicy: {
        maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3'),
        baseDelay: parseInt(process.env.DB_BASE_DELAY || '1000'), // 1s
        maxDelay: parseInt(process.env.DB_MAX_DELAY || '30000'), // 30s
        backoffMultiplier: parseFloat(process.env.DB_BACKOFF_MULTIPLIER || '2'),
        jitter: process.env.DB_RETRY_JITTER !== 'false'
      },
      circuitBreaker: {
        enabled: process.env.DB_CIRCUIT_BREAKER_ENABLED !== 'false',
        failureThreshold: parseInt(process.env.DB_CIRCUIT_BREAKER_THRESHOLD || '5'),
        resetTimeout: parseInt(process.env.DB_CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'), // 1min
        monitoringWindow: parseInt(process.env.DB_CIRCUIT_BREAKER_WINDOW || '60000') // 1min
      },
      healthCheck: {
        enabled: process.env.DB_HEALTH_CHECK_ENABLED !== 'false',
        interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'), // 30s
        timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000'), // 5s
        failureThreshold: parseInt(process.env.DB_HEALTH_CHECK_FAILURE_THRESHOLD || '3')
      },
      recovery: {
        enabled: process.env.DB_RECOVERY_ENABLED !== 'false',
        maxRecoveryAttempts: parseInt(process.env.DB_MAX_RECOVERY_ATTEMPTS || '5'),
        recoveryBackoffMs: parseInt(process.env.DB_RECOVERY_BACKOFF || '5000'), // 5s
        warmupQueries: [
          'SELECT 1 as warmup_test',
          'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()'
        ]
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing connection resilience service...', {
        circuitBreakerEnabled: this.config.circuitBreaker.enabled,
        healthCheckEnabled: this.config.healthCheck.enabled,
        maxRetries: this.config.retryPolicy.maxRetries
      });

      // Setup health monitoring
      if (this.config.healthCheck.enabled) {
        this.setupHealthCheck();
      }

      // Setup metrics collection
      this.setupMetricsCollection();

      logger.info('Connection resilience service initialized successfully');
      this.emit('initialized');

    } catch (error) {
      logger.error('Failed to initialize connection resilience service', { error });
      throw error;
    }
  }

  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.debug('Health check interval error', { error });
      }
    }, this.config.healthCheck.interval);

    logger.info('Database health monitoring started', {
      interval: this.config.healthCheck.interval,
      timeout: this.config.healthCheck.timeout
    });
  }

  private setupMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      // Use the existing testConnection with timeout
      const healthCheckPromise = testConnection(1);
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), this.config.healthCheck.timeout);
      });

      const isHealthy = await Promise.race([healthCheckPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        this.recordSuccessfulHealthCheck(responseTime);
      } else {
        this.recordFailedHealthCheck(new Error('Health check returned false'));
      }

    } catch (error) {
      this.recordFailedHealthCheck(error);
    }
  }

  private recordSuccessfulHealthCheck(responseTime: number): void {
    this.consecutiveHealthFailures = 0;
    
    if (!this.isHealthy) {
      this.isHealthy = true;
      logger.info('Database health restored');
      this.emit('healthRestored');
    }

    // Update response time tracking
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50); // Keep last 50
    }

    // Reset circuit breaker on successful health check if applicable
    if (this.circuitBreakerState === 'half-open') {
      this.circuitBreakerState = 'closed';
      this.failureCount = 0;
      logger.info('Circuit breaker closed - service recovered');
      this.emit('circuitBreakerClosed');
    }
  }

  private recordFailedHealthCheck(error: any): void {
    this.consecutiveHealthFailures++;
    
    if (this.isHealthy && this.consecutiveHealthFailures >= this.config.healthCheck.failureThreshold) {
      this.isHealthy = false;
      logger.error('Database marked as unhealthy', {
        consecutiveFailures: this.consecutiveHealthFailures,
        threshold: this.config.healthCheck.failureThreshold,
        error: error.message
      });
      this.emit('healthDegraded', error);
    }

    // Update circuit breaker
    this.recordFailure();
  }

  private recordFailure(): void {
    if (!this.config.circuitBreaker.enabled) return;

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitBreakerState === 'closed' && 
        this.failureCount >= this.config.circuitBreaker.failureThreshold) {
      
      this.circuitBreakerState = 'open';
      logger.error('Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold
      });
      
      this.emit('circuitBreakerOpened');
      this.scheduleCircuitBreakerReset();
    }
  }

  private scheduleCircuitBreakerReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.circuitBreakerState === 'open') {
        this.circuitBreakerState = 'half-open';
        logger.info('Circuit breaker half-opened - testing service');
        this.emit('circuitBreakerHalfOpened');
      }
    }, this.config.circuitBreaker.resetTimeout);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string;
      timeout?: number;
      maxRetries?: number;
      customRetryCondition?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    // Check circuit breaker
    if (this.config.circuitBreaker.enabled && this.circuitBreakerState === 'open') {
      throw new Error('Circuit breaker is open - service unavailable');
    }

    const operationId = this.generateOperationId();
    const maxRetries = options.maxRetries ?? this.config.retryPolicy.maxRetries;
    const timeout = options.timeout ?? this.config.timeouts.query;
    
    const retryOperation: RetryOperation<T> = {
      id: operationId,
      operation,
      attempts: 0,
      maxAttempts: maxRetries + 1, // +1 for initial attempt
      startTime: new Date(),
      delays: []
    };

    this.activeOperations.set(operationId, retryOperation);

    try {
      const result = await this.executeOperationWithRetries(retryOperation, options, timeout);
      
      // Record success
      this.recordOperationSuccess(Date.now() - retryOperation.startTime.getTime());
      
      return result;

    } catch (error) {
      // Record failure
      this.recordOperationFailure(error);
      throw error;
      
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  private async executeOperationWithRetries<T>(
    retryOperation: RetryOperation<T>,
    options: any,
    timeout: number
  ): Promise<T> {
    while (retryOperation.attempts < retryOperation.maxAttempts) {
      try {
        retryOperation.attempts++;

        // Create timeout promise
        const timeoutPromise = new Promise<T>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timeout after ${timeout}ms`));
          }, timeout);
        });

        // Execute operation with timeout
        const result = await Promise.race([
          retryOperation.operation(),
          timeoutPromise
        ]);

        // Success - reset circuit breaker failure count if in half-open state
        if (this.circuitBreakerState === 'half-open') {
          this.circuitBreakerState = 'closed';
          this.failureCount = 0;
          logger.info('Circuit breaker closed after successful operation');
          this.emit('circuitBreakerClosed');
        }

        return result;

      } catch (error) {
        retryOperation.lastError = error;

        // Check if error is timeout
        if (error.message.includes('timeout')) {
          this.timeoutErrors++;
        } else {
          this.connectionErrors++;
        }

        // Check if we should retry
        if (!this.shouldRetry(error, retryOperation, options.customRetryCondition)) {
          throw error;
        }

        // Calculate delay for next retry
        if (retryOperation.attempts < retryOperation.maxAttempts) {
          const delay = this.calculateRetryDelay(retryOperation.attempts - 1);
          retryOperation.delays.push(delay);

          logger.warn('Operation failed, retrying...', {
            operationId: retryOperation.id,
            attempt: retryOperation.attempts,
            maxAttempts: retryOperation.maxAttempts,
            error: error.message,
            retryDelay: delay
          });

          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    const error = retryOperation.lastError || new Error('Max retries exceeded');
    logger.error('Operation failed after all retries', {
      operationId: retryOperation.id,
      attempts: retryOperation.attempts,
      totalTime: Date.now() - retryOperation.startTime.getTime(),
      delays: retryOperation.delays,
      finalError: error.message
    });

    throw error;
  }

  private shouldRetry(
    error: any, 
    retryOperation: RetryOperation<any>, 
    customRetryCondition?: (error: Error) => boolean
  ): boolean {
    // Don't retry if max attempts reached
    if (retryOperation.attempts >= retryOperation.maxAttempts) {
      return false;
    }

    // Use custom retry condition if provided
    if (customRetryCondition) {
      return customRetryCondition(error);
    }

    // Default retry conditions
    const retryableErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EPIPE',
      'timeout',
      'Connection lost',
      'Connection refused'
    ];

    const errorMessage = error.message || error.code || '';
    return retryableErrors.some(retryableError => 
      errorMessage.toLowerCase().includes(retryableError.toLowerCase())
    );
  }

  private calculateRetryDelay(attemptNumber: number): number {
    let delay = this.config.retryPolicy.baseDelay * 
                Math.pow(this.config.retryPolicy.backoffMultiplier, attemptNumber);

    // Apply maximum delay cap
    delay = Math.min(delay, this.config.retryPolicy.maxDelay);

    // Add jitter if enabled
    if (this.config.retryPolicy.jitter) {
      const jitter = Math.random() * 0.1 * delay; // 10% jitter
      delay = delay + (Math.random() > 0.5 ? jitter : -jitter);
    }

    return Math.max(delay, 0);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordOperationSuccess(duration: number): void {
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50);
    }
  }

  private recordOperationFailure(error: any): void {
    this.recordFailure();
    
    if (error.message.includes('timeout')) {
      this.timeoutErrors++;
    } else {
      this.connectionErrors++;
    }
  }

  private collectMetrics(): void {
    const poolStats = getPoolStats();
    const now = Date.now();
    
    // Calculate average response time
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    // Determine health status
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!this.isHealthy) {
      healthStatus = 'unhealthy';
    } else if (this.circuitBreakerState !== 'closed' || avgResponseTime > 5000) {
      healthStatus = 'degraded';
    }

    const metrics: ConnectionMetrics = {
      timestamp: new Date(),
      totalConnections: poolStats.totalConnections,
      activeConnections: poolStats.activeConnections,
      idleConnections: poolStats.idleConnections,
      queuedRequests: poolStats.queuedRequests,
      failedConnections: this.failureCount,
      successfulRetries: 0, // Would need to track this separately
      circuitBreakerState: this.circuitBreakerState,
      healthStatus,
      avgResponseTime,
      connectionErrors: this.connectionErrors,
      timeoutErrors: this.timeoutErrors
    };

    this.metrics.push(metrics);

    // Keep only last 24 hours of metrics
    const cutoff = new Date(now - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

    // Reset error counters periodically
    if (this.metrics.length % 60 === 0) { // Every hour (assuming 1-minute intervals)
      this.connectionErrors = Math.max(0, this.connectionErrors - 1);
      this.timeoutErrors = Math.max(0, this.timeoutErrors - 1);
    }

    this.emit('metricsCollected', metrics);
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  // Recovery methods
  async attemptConnectionRecovery(): Promise<boolean> {
    if (!this.config.recovery.enabled) {
      return false;
    }

    logger.info('Attempting connection recovery...');

    for (let attempt = 1; attempt <= this.config.recovery.maxRecoveryAttempts; attempt++) {
      try {
        logger.info('Recovery attempt', { attempt });

        // Try to reconnect
        const reconnected = await reconnectDatabase();
        
        if (reconnected) {
          // Run warmup queries
          await this.runWarmupQueries();
          
          logger.info('Connection recovery successful');
          this.emit('connectionRecovered');
          return true;
        }

      } catch (error) {
        logger.warn('Recovery attempt failed', {
          attempt,
          error: error.message
        });
      }

      if (attempt < this.config.recovery.maxRecoveryAttempts) {
        await this.delay(this.config.recovery.recoveryBackoffMs);
      }
    }

    logger.error('Connection recovery failed after all attempts');
    return false;
  }

  private async runWarmupQueries(): Promise<void> {
    for (const query of this.config.recovery.warmupQueries) {
      try {
        await connection.execute(query);
        logger.debug('Warmup query successful', { query });
      } catch (error) {
        logger.warn('Warmup query failed', { query, error: error.message });
      }
    }
  }

  // Public API methods
  getConnectionStatus(): {
    isHealthy: boolean;
    circuitBreakerState: string;
    consecutiveFailures: number;
    avgResponseTime: number;
    activeOperations: number;
  } {
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      isHealthy: this.isHealthy,
      circuitBreakerState: this.circuitBreakerState,
      consecutiveFailures: this.consecutiveHealthFailures,
      avgResponseTime,
      activeOperations: this.activeOperations.size
    };
  }

  getMetrics(): ConnectionMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): ConnectionMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  forceCircuitBreakerOpen(): void {
    this.circuitBreakerState = 'open';
    this.emit('circuitBreakerOpened');
    this.scheduleCircuitBreakerReset();
    logger.warn('Circuit breaker manually opened');
  }

  forceCircuitBreakerClose(): void {
    this.circuitBreakerState = 'closed';
    this.failureCount = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.emit('circuitBreakerClosed');
    logger.info('Circuit breaker manually closed');
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down connection resilience service...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    // Cancel active operations
    for (const [operationId, operation] of this.activeOperations.entries()) {
      logger.debug('Cancelling active operation', { operationId });
    }
    this.activeOperations.clear();

    logger.info('Connection resilience service shutdown completed');
  }
}

// Create and export singleton instance
export const connectionResilienceService = new ConnectionResilienceService();

// Export types
export {
  ConnectionConfig,
  ConnectionMetrics,
  RetryOperation
};

export default connectionResilienceService;