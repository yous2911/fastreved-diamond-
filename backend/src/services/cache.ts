// src/services/cache.ts
import { CacheService, CacheOptions } from '../types/index.js';

export class CacheServiceImpl implements CacheService {
  // FIXED: Line 5:27 - Replace any with CacheOptions
  private options: CacheOptions;
  private memoryCache: Map<string, { value: unknown; expiry: number }>;

  constructor(options: CacheOptions) {
    this.options = options;
    this.memoryCache = new Map();
  }

  // FIXED: Line 31:50 - Replace any with generic type T
  async get<T>(key: string): Promise<T | null> {
    const item = this.memoryCache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  // FIXED: Line 47:26 - Replace any with generic type T
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = Date.now() + (ttl || this.options.ttl) * 1000;
    
    this.memoryCache.set(key, { value, expiry });

    // Clean up expired entries if cache is getting full
    if (this.memoryCache.size > this.options.max) {
      this.cleanup();
    }
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.memoryCache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return false;
    }
    
    return true;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.memoryCache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (can be improved with regex)
    return allKeys.filter(key => key.includes(pattern));
  }

  async ttl(key: string): Promise<number> {
    const item = this.memoryCache.get(key);
    if (!item) return -1;
    
    const remaining = item.expiry - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : -1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.memoryCache.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
    }
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async getStats(): Promise<{ hits: number; misses: number; sets: number; deletes: number; memory?: { used: number; total: number } }> {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      memory: {
        used: this.memoryCache.size,
        total: -1, // Not applicable for memory cache
      },
    };
  }

  // FIXED: Line 95:33 - Replace any with proper cleanup logic
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.memoryCache.forEach((item, key) => {
      if (now > item.expiry) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.memoryCache.delete(key));
  }
}
