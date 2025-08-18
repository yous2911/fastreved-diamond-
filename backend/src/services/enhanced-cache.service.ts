/**
 * Enhanced Redis Caching Service for RevEd Kids Backend
 * Provides intelligent caching with fallback, TTL management, and optimization
 */

import Redis from 'ioredis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compressed?: boolean;
  version?: string;
  tags?: string[]; // For cache invalidation
}

interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  totalKeys: number;
  memoryUsage: string;
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
}

class EnhancedCacheService {
  private redis: Redis | null = null;
  private fallbackCache = new Map<string, { data: any; expiry: number }>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalKeys: 0,
    memoryUsage: '0MB',
    connectionStatus: 'disconnected'
  };
  private isEnabled = false;
  private readonly keyPrefix = 'revedkids:';
  private readonly maxFallbackSize = 1000;
  private compressionThreshold = 1024; // Compress data larger than 1KB

  constructor() {
    this.initialize();
    this.setupCleanupInterval();
  }

  private async initialize(): Promise<void> {
    try {
      if (!config.REDIS_ENABLED) {
        logger.info('Redis caching disabled in configuration');
        return;
      }

      logger.info('Initializing Redis cache service...', {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        database: config.REDIS_DB
      });

      this.redis = new Redis({
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Connection pool settings
        family: 4,
        // Reconnection settings
        retryDelayOnClusterDown: 300,
        maxRetriesPerRequest: 3,
      });

      this.setupEventListeners();
      await this.redis.connect();
      
      this.isEnabled = true;
      logger.info('Redis cache service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Redis cache service', { error });
      this.isEnabled = false;
      this.fallbackToMemoryCache();
    }
  }

  private setupEventListeners(): void {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      this.stats.connectionStatus = 'connected';
      logger.info('Redis connected');
    });

    this.redis.on('reconnecting', () => {
      this.stats.connectionStatus = 'reconnecting';
      logger.warn('Redis reconnecting...');
    });

    this.redis.on('error', (error) => {
      this.stats.connectionStatus = 'disconnected';
      this.stats.errors++;
      logger.error('Redis connection error', { error });
      this.fallbackToMemoryCache();
    });

    this.redis.on('close', () => {
      this.stats.connectionStatus = 'disconnected';
      logger.warn('Redis connection closed');
    });
  }

  private fallbackToMemoryCache(): void {
    if (this.isEnabled) {
      logger.warn('Falling back to in-memory cache');
      this.isEnabled = false;
    }
  }

  private setupCleanupInterval(): void {
    // Clean expired entries from fallback cache every 5 minutes
    setInterval(() => {
      this.cleanupFallbackCache();
      this.updateStats();
    }, 5 * 60 * 1000);
  }

  private cleanupFallbackCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.fallbackCache.entries()) {
      if (value.expiry < now) {
        this.fallbackCache.delete(key);
        cleanedCount++;
      }
    }

    // Limit fallback cache size
    if (this.fallbackCache.size > this.maxFallbackSize) {
      const keysToRemove = Array.from(this.fallbackCache.keys())
        .slice(0, this.fallbackCache.size - this.maxFallbackSize);
      
      keysToRemove.forEach(key => this.fallbackCache.delete(key));
      cleanedCount += keysToRemove.length;
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up fallback cache', { removedEntries: cleanedCount });
    }
  }

  private async updateStats(): Promise<void> {
    try {
      if (this.redis && this.isEnabled) {
        const info = await this.redis.info('memory');
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          this.stats.memoryUsage = memoryMatch[1].trim();
        }

        this.stats.totalKeys = await this.redis.dbsize();
      }
    } catch (error) {
      logger.debug('Failed to update cache stats', { error });
    }
  }

  private generateKey(key: string, version?: string): string {
    const versionSuffix = version ? `:v${version}` : '';
    return `${this.keyPrefix}${key}${versionSuffix}`;
  }

  private compressData(data: any): string | Buffer {
    const serialized = JSON.stringify(data);
    
    if (serialized.length > this.compressionThreshold) {
      // In a real implementation, you'd use a compression library like zlib
      // For now, we'll just use base64 encoding as a placeholder
      return Buffer.from(serialized).toString('base64');
    }
    
    return serialized;
  }

  private decompressData(data: string | Buffer): any {
    try {
      if (Buffer.isBuffer(data)) {
        // Decompress if it's a buffer
        const decompressed = Buffer.from(data.toString(), 'base64').toString();
        return JSON.parse(decompressed);
      } else {
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to decompress cache data', { error });
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.generateKey(key, options.version);

    try {
      let result: T | null = null;

      if (this.redis && this.isEnabled) {
        const cached = await this.redis.get(fullKey);
        if (cached !== null) {
          result = this.decompressData(cached);
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      } else {
        // Fallback to memory cache
        const cached = this.fallbackCache.get(fullKey);
        if (cached && cached.expiry > Date.now()) {
          result = cached.data;
          this.stats.hits++;
        } else {
          this.fallbackCache.delete(fullKey);
          this.stats.misses++;
        }
      }

      const responseTime = Date.now() - startTime;
      logger.debug('Cache get operation', { 
        key: fullKey, 
        hit: result !== null, 
        responseTime 
      });

      return result;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get operation failed', { key: fullKey, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    const fullKey = this.generateKey(key, options.version);
    const ttl = options.ttl || config.CACHE_TTL || 3600; // Default 1 hour

    try {
      if (this.redis && this.isEnabled) {
        const compressed = options.compressed !== false ? 
          this.compressData(value) : JSON.stringify(value);
        
        await this.redis.setex(fullKey, ttl, compressed);
        
        // Set tags for invalidation if provided
        if (options.tags && options.tags.length > 0) {
          const tagPromises = options.tags.map(tag => 
            this.redis!.sadd(`${this.keyPrefix}tag:${tag}`, fullKey)
          );
          await Promise.all(tagPromises);
        }
        
      } else {
        // Fallback to memory cache
        const expiry = Date.now() + (ttl * 1000);
        this.fallbackCache.set(fullKey, { data: value, expiry });
      }

      const responseTime = Date.now() - startTime;
      logger.debug('Cache set operation', { 
        key: fullKey, 
        ttl, 
        responseTime,
        tags: options.tags 
      });

      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set operation failed', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, version?: string): Promise<boolean> {
    const fullKey = this.generateKey(key, version);

    try {
      if (this.redis && this.isEnabled) {
        const result = await this.redis.del(fullKey);
        return result > 0;
      } else {
        return this.fallbackCache.delete(fullKey);
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete operation failed', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.redis || !this.isEnabled) {
      logger.warn('Tag-based invalidation not available with fallback cache');
      return 0;
    }

    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = `${this.keyPrefix}tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
          
          // Clean up the tag set
          await this.redis.del(tagKey);
        }
      }

      logger.info('Cache invalidation by tags completed', { 
        tags, 
        keysDeleted: totalDeleted 
      });

      return totalDeleted;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache invalidation by tags failed', { tags, error });
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const startTime = Date.now();
    const data = await fetchFunction();
    const fetchTime = Date.now() - startTime;

    // Store in cache
    await this.set(key, data, options);

    logger.debug('Cache miss - fetched and stored', { 
      key: this.generateKey(key, options.version), 
      fetchTime 
    });

    return data;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.redis || !this.isEnabled) {
      // Fallback to individual gets
      return Promise.all(keys.map(key => this.get<T>(key, options)));
    }

    try {
      const fullKeys = keys.map(key => this.generateKey(key, options.version));
      const results = await this.redis.mget(...fullKeys);
      
      return results.map((result, index) => {
        if (result !== null) {
          this.stats.hits++;
          return this.decompressData(result);
        } else {
          this.stats.misses++;
          return null;
        }
      });

    } catch (error) {
      this.stats.errors++;
      logger.error('Batch cache get operation failed', { keys, error });
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.redis || !this.isEnabled) {
      // Fallback to individual sets
      const results = await Promise.all(
        entries.map(entry => 
          this.set(entry.key, entry.value, { ...options, ttl: entry.ttl })
        )
      );
      return results.every(result => result);
    }

    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(entry => {
        const fullKey = this.generateKey(entry.key, options.version);
        const ttl = entry.ttl || options.ttl || config.CACHE_TTL || 3600;
        const compressed = options.compressed !== false ? 
          this.compressData(entry.value) : JSON.stringify(entry.value);
        
        pipeline.setex(fullKey, ttl, compressed);
      });

      await pipeline.exec();
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('Batch cache set operation failed', { entries: entries.length, error });
      return false;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<boolean> {
    try {
      if (this.redis && this.isEnabled) {
        await this.redis.flushdb();
      } else {
        this.fallbackCache.clear();
      }

      logger.info('Cache cleared successfully');
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to clear cache', { error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics {
    const total = this.stats.hits + this.stats.misses;
    
    return {
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.stats.misses / total) * 100 : 0,
      errorRate: total > 0 ? (this.stats.errors / total) * 100 : 0,
      responseTime: 0, // Would need to track average response time
      memoryUsage: this.isEnabled ? this.stats.totalKeys : this.fallbackCache.size,
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.isEnabled) {
        return {
          status: 'degraded',
          details: {
            message: 'Using fallback memory cache',
            fallbackSize: this.fallbackCache.size,
            redis: false
          }
        };
      }

      if (!this.redis) {
        return {
          status: 'unhealthy',
          details: { message: 'Redis client not initialized' }
        };
      }

      // Test Redis connectivity
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      const metrics = this.getMetrics();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (responseTime > 1000 || metrics.errorRate > 5) {
        status = 'degraded';
      }
      
      if (this.stats.connectionStatus === 'disconnected' || responseTime > 5000) {
        status = 'unhealthy';
      }

      return {
        status,
        details: {
          responseTime,
          connectionStatus: this.stats.connectionStatus,
          metrics,
          redis: true
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          redis: false
        }
      };
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
      
      this.fallbackCache.clear();
      this.isEnabled = false;
      
      logger.info('Cache service disconnected');
    } catch (error) {
      logger.error('Error during cache service disconnect', { error });
    }
  }
}

// Create and export singleton instance
export const cacheService = new EnhancedCacheService();

// Export specific cache categories for different data types
export class SessionCache {
  private static readonly PREFIX = 'session:';
  private static readonly TTL = 24 * 60 * 60; // 24 hours

  static async get(sessionId: string) {
    return cacheService.get(`${this.PREFIX}${sessionId}`, { ttl: this.TTL });
  }

  static async set(sessionId: string, sessionData: any) {
    return cacheService.set(`${this.PREFIX}${sessionId}`, sessionData, { 
      ttl: this.TTL,
      tags: ['sessions']
    });
  }

  static async delete(sessionId: string) {
    return cacheService.delete(`${this.PREFIX}${sessionId}`);
  }

  static async invalidateAll() {
    return cacheService.invalidateByTags(['sessions']);
  }
}

export class StudentCache {
  private static readonly PREFIX = 'student:';
  private static readonly TTL = 30 * 60; // 30 minutes

  static async getProfile(studentId: number) {
    return cacheService.get(`${this.PREFIX}profile:${studentId}`, { 
      ttl: this.TTL,
      version: '1.0'
    });
  }

  static async setProfile(studentId: number, profile: any) {
    return cacheService.set(`${this.PREFIX}profile:${studentId}`, profile, { 
      ttl: this.TTL,
      tags: ['students', `student:${studentId}`],
      version: '1.0'
    });
  }

  static async getProgress(studentId: number) {
    return cacheService.get(`${this.PREFIX}progress:${studentId}`, { 
      ttl: 5 * 60, // 5 minutes for more frequently changing data
      version: '1.0'
    });
  }

  static async setProgress(studentId: number, progress: any) {
    return cacheService.set(`${this.PREFIX}progress:${studentId}`, progress, { 
      ttl: 5 * 60,
      tags: ['progress', `student:${studentId}`],
      version: '1.0'
    });
  }

  static async invalidateStudent(studentId: number) {
    return cacheService.invalidateByTags([`student:${studentId}`]);
  }
}

export class ExerciseCache {
  private static readonly PREFIX = 'exercise:';
  private static readonly TTL = 60 * 60; // 1 hour

  static async get(exerciseId: number) {
    return cacheService.get(`${this.PREFIX}${exerciseId}`, { 
      ttl: this.TTL,
      version: '1.0'
    });
  }

  static async set(exerciseId: number, exercise: any) {
    return cacheService.set(`${this.PREFIX}${exerciseId}`, exercise, { 
      ttl: this.TTL,
      tags: ['exercises'],
      version: '1.0'
    });
  }

  static async getList(filters: string) {
    return cacheService.get(`${this.PREFIX}list:${filters}`, { 
      ttl: 15 * 60, // 15 minutes
      version: '1.0'
    });
  }

  static async setList(filters: string, exercises: any) {
    return cacheService.set(`${this.PREFIX}list:${filters}`, exercises, { 
      ttl: 15 * 60,
      tags: ['exercises'],
      version: '1.0'
    });
  }

  static async invalidateAll() {
    return cacheService.invalidateByTags(['exercises']);
  }
}

// Export for monitoring and health checks
export { cacheService as default };