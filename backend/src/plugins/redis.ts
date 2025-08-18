import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { redisConfig, config } from '../config/config';
import { logger } from '../utils/logger';

interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory?: {
    used: number;
    maxMemory: number;
    percentage: number;
  };
  operations: {
    gets: number;
    sets: number;
    dels: number;
    errors: number;
  };
}

interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(data: Record<string, string>, ttl?: number): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  incr(key: string, ttl?: number): Promise<number>;
  flush(): Promise<void>;
  stats(): Promise<CacheStats>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
  info(): Promise<any>;
  setJSON<T>(key: string, value: T, ttl?: number): Promise<void>;
  getJSON<T>(key: string): Promise<T | null>;
}

const redisPlugin = async (fastify: any) => {
  let redis: Redis | null = null;
  let isRedisAvailable = false;
  
  // Fallback memory cache
  const memoryCache = new Map<string, { value: string; expiry: number }>();
  const stats: CacheStats = { 
    hits: 0, 
    misses: 0, 
    keys: 0,
    operations: {
      gets: 0,
      sets: 0,
      dels: 0,
      errors: 0
    }
  };

  // Try to connect to Redis if enabled
  if (config.REDIS_ENABLED) {
    try {
      logger.info('Attempting Redis connection...', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });

      redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        retryDelayOnFailover: redisConfig.retryDelayOnFailover,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        lazyConnect: redisConfig.lazyConnect,
        showFriendlyErrorStack: redisConfig.showFriendlyErrorStack,
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        
        // Connection retry configuration
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries, falling back to memory cache');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis connection retry ${times} in ${delay}ms`);
          return delay;
        },
        
        // Event handlers
        onReady: () => {
          isRedisAvailable = true;
          logger.info('Redis connection established successfully');
        },
        
        onError: (error) => {
          isRedisAvailable = false;
          stats.operations.errors++;
          logger.warn('Redis connection error, falling back to memory cache:', { 
            error: error.message 
          });
        },
        
        onClose: () => {
          isRedisAvailable = false;
          logger.warn('Redis connection closed, using memory cache');
        }
      });

      // Test connection
      await redis.ping();
      isRedisAvailable = true;
      
      logger.info('✅ Redis connected successfully');

    } catch (error) {
      logger.warn('Redis connection failed, using memory cache fallback:', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      isRedisAvailable = false;
      redis = null;
    }
  } else {
    logger.info('Redis disabled - using memory cache only');
  }

  // Unified cache interface that works with Redis or memory
  const cache: CacheInterface = {
    async get(key: string): Promise<string | null> {
      stats.operations.gets++;
      
      try {
        if (redis && isRedisAvailable) {
          const value = await redis.get(key);
          if (value !== null) {
            stats.hits++;
            return value;
          }
          stats.misses++;
          return null;
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis get error, falling back to memory cache:', { 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Memory cache fallback
      const item = memoryCache.get(key);
      if (item && item.expiry > Date.now()) {
        stats.hits++;
        return item.value;
      } else if (item) {
        memoryCache.delete(key);
      }
      stats.misses++;
      return null;
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      stats.operations.sets++;
      const actualTtl = ttl || config.CACHE_TTL;
      
      try {
        if (redis && isRedisAvailable) {
          await redis.setex(key, actualTtl, value);
          return;
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis set error, falling back to memory cache:', { 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Memory cache fallback
      memoryCache.set(key, {
        value,
        expiry: Date.now() + actualTtl * 1000
      });
    },

    async mget(keys: string[]): Promise<(string | null)[]> {
      if (keys.length === 0) return [];
      
      try {
        if (redis && isRedisAvailable) {
          const values = await redis.mget(...keys);
          return values;
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis mget error:', error);
      }
      
      // Memory cache fallback
      return keys.map(key => {
        const item = memoryCache.get(key);
        return item && item.expiry > Date.now() ? item.value : null;
      });
    },

    async mset(data: Record<string, string>, ttl?: number): Promise<void> {
      const actualTtl = ttl || config.CACHE_TTL;
      
      try {
        if (redis && isRedisAvailable) {
          const pipeline = redis.pipeline();
          for (const [key, value] of Object.entries(data)) {
            pipeline.setex(key, actualTtl, value);
          }
          await pipeline.exec();
          return;
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis mset error:', error);
      }
      
      // Memory cache fallback
      const expiry = Date.now() + actualTtl * 1000;
      for (const [key, value] of Object.entries(data)) {
        memoryCache.set(key, { value, expiry });
      }
    },

    async del(key: string | string[]): Promise<number> {
      stats.operations.dels++;
      const keys = Array.isArray(key) ? key : [key];
      
      try {
        if (redis && isRedisAvailable) {
          return await redis.del(...keys);
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis del error:', error);
      }
      
      // Memory cache fallback
      let deletedCount = 0;
      for (const k of keys) {
        if (memoryCache.delete(k)) {
          deletedCount++;
        }
      }
      return deletedCount;
    },

    async exists(key: string): Promise<number> {
      try {
        if (redis && isRedisAvailable) {
          return await redis.exists(key);
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis exists error:', error);
      }
      
      // Memory cache fallback
      const item = memoryCache.get(key);
      return item && item.expiry > Date.now() ? 1 : 0;
    },

    async expire(key: string, ttl: number): Promise<number> {
      try {
        if (redis && isRedisAvailable) {
          return await redis.expire(key, ttl);
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis expire error:', error);
      }
      
      // Memory cache fallback
      const item = memoryCache.get(key);
      if (item) {
        item.expiry = Date.now() + ttl * 1000;
        return 1;
      }
      return 0;
    },

    async incr(key: string, ttl?: number): Promise<number> {
      try {
        if (redis && isRedisAvailable) {
          const value = await redis.incr(key);
          if (ttl && value === 1) {
            await redis.expire(key, ttl);
          }
          return value;
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis incr error:', error);
      }
      
      // Memory cache fallback
      const item = memoryCache.get(key);
      const currentValue = item ? parseInt(item.value, 10) || 0 : 0;
      const newValue = currentValue + 1;
      
      const expiry = ttl ? Date.now() + ttl * 1000 : (item ? item.expiry : Date.now() + config.CACHE_TTL * 1000);
      memoryCache.set(key, { value: newValue.toString(), expiry });
      
      return newValue;
    },

    async flush(): Promise<void> {
      try {
        if (redis && isRedisAvailable) {
          await redis.flushdb();
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis flush error:', error);
      }
      
      // Clear memory cache
      memoryCache.clear();
    },

    async keys(pattern: string): Promise<string[]> {
      try {
        if (redis && isRedisAvailable) {
          return await redis.keys(pattern);
        }
      } catch (error) {
        stats.operations.errors++;
        logger.warn('Redis keys error:', error);
      }
      
      // Memory cache fallback - simple pattern matching
      const keys = Array.from(memoryCache.keys());
      if (pattern === '*') return keys;
      
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return keys.filter(key => regex.test(key));
    },

    async ping(): Promise<string> {
      try {
        if (redis && isRedisAvailable) {
          return await redis.ping();
        }
      } catch (error) {
        logger.warn('Redis ping error:', error);
      }
      
      return 'PONG (memory cache)';
    },

    async info(): Promise<any> {
      try {
        if (redis && isRedisAvailable) {
          const info = await redis.info('memory');
          return { redis: true, info };
        }
      } catch (error) {
        logger.warn('Redis info error:', error);
      }
      
      return { 
        redis: false, 
        memoryCache: {
          size: memoryCache.size,
          type: 'in-memory'
        }
      };
    },

    async stats(): Promise<CacheStats> {
      const baseStats = { ...stats, keys: memoryCache.size };
      
      try {
        if (redis && isRedisAvailable) {
          const info = await redis.info('memory');
          const lines = info.split('\r\n');
          const memory: any = {};
          
          for (const line of lines) {
            const [key, value] = line.split(':');
            if (key && value) {
              memory[key] = value;
            }
          }
          
          baseStats.memory = {
            used: parseInt(memory.used_memory) || 0,
            maxMemory: parseInt(memory.maxmemory) || 0,
            percentage: memory.maxmemory 
              ? Math.round((parseInt(memory.used_memory) / parseInt(memory.maxmemory)) * 100)
              : 0
          };
          
          const keyCount = await redis.dbsize();
          baseStats.keys = keyCount;
        }
      } catch (error) {
        logger.warn('Redis stats error:', error);
      }
      
      return baseStats;
    },

    async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
      await this.set(key, JSON.stringify(value), ttl);
    },

    async getJSON<T>(key: string): Promise<T | null> {
      const value = await this.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch (error) {
        logger.warn('JSON parse error for cache key:', { key, error });
        return null;
      }
    }
  };

  // Cleanup expired memory cache entries periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of memoryCache.entries()) {
      if (item.expiry <= now) {
        memoryCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Cleaned up ${expiredCount} expired memory cache entries`);
    }
  }, 60000); // Every minute

  // Decorate fastify with cache interface
  fastify.decorate('cache', cache);
  fastify.decorate('redis', redis);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    clearInterval(cleanupInterval);
    if (redis && isRedisAvailable) {
      await redis.quit();
      logger.info('Redis connection closed');
    }
  });

  logger.info(`✅ Cache plugin registered successfully (Redis: ${isRedisAvailable ? 'enabled' : 'disabled'})`);
};

export default fp(redisPlugin, { name: 'cache' });
