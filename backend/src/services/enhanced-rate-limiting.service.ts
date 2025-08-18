import { FastifyRequest, FastifyReply } from 'fastify';
import geoip from 'geoip-lite';
import ipRangeCheck from 'ip-range-check';
import { logger } from '../utils/logger';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skipExemptRoutes?: string[];
  message?: string;
  headers?: boolean;
}

export interface UserRateLimit {
  windowMs: number;
  max: number;
  burst?: number;
  premium?: {
    max: number;
    burst?: number;
  };
}

export interface GeoRateLimit {
  [countryCode: string]: {
    windowMs: number;
    max: number;
    reason?: string;
  };
}

export interface RateLimitRule {
  id: string;
  name: string;
  condition: (request: FastifyRequest) => boolean;
  limit: RateLimitConfig;
  action: 'block' | 'delay' | 'captcha' | 'warn';
  priority: number;
  enabled: boolean;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  warnings: number;
}

export interface RateLimitOptions {
  // Basic limits
  global: RateLimitConfig;
  perUser: UserRateLimit;
  perIP: RateLimitConfig;
  
  // Geographic limits
  geoLimits?: GeoRateLimit;
  
  // Advanced features
  allowlist?: string[];
  blocklist?: string[];
  exemptUserRoles?: string[];
  exemptRoutes?: string[];
  
  // Custom rules
  customRules?: RateLimitRule[];
  
  // Behavioral analysis
  enableBehavioralAnalysis?: boolean;
  suspiciousThreshold?: number;
  
  // Storage
  useRedis?: boolean;
  redisPrefix?: string;
  
  // Response options
  headers?: boolean;
  message?: string;
  retryAfterHeader?: boolean;
  
  // Penalties
  enablePenalties?: boolean;
  penaltyMultiplier?: number;
  maxPenaltyTime?: number;
}

export class EnhancedRateLimitingService {
  private options: RateLimitOptions;
  private store: Map<string, RateLimitEntry> = new Map();
  private penalties: Map<string, number> = new Map(); // IP -> penalty end time
  private suspiciousIPs: Map<string, number> = new Map(); // IP -> suspicious score
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: RateLimitOptions) {
    this.options = {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000 // 1000 requests per 15 minutes globally
      },
      perUser: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        burst: 20
      },
      perIP: {
        windowMs: 15 * 60 * 1000,
        max: 100
      },
      allowlist: [],
      blocklist: [],
      exemptUserRoles: ['admin', 'system'],
      exemptRoutes: ['/api/health', '/api/metrics'],
      enableBehavioralAnalysis: true,
      suspiciousThreshold: 50,
      enablePenalties: true,
      penaltyMultiplier: 2,
      maxPenaltyTime: 24 * 60 * 60 * 1000, // 24 hours
      headers: true,
      retryAfterHeader: true,
      ...options
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Every minute
  }

  /**
   * Create enhanced rate limiting middleware
   */
  createMiddleware(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const ip = this.getClientIP(request);
        const userId = (request as any).user?.id;
        const userRole = (request as any).user?.role;
        const route = request.routeOptions?.url || request.url;

        // Check if should skip rate limiting
        if (this.shouldSkip(request, ip, userRole, route)) {
          return;
        }

        // Check penalties first
        if (this.isUnderPenalty(ip)) {
          const penaltyEnd = this.penalties.get(ip)!;
          const retryAfter = Math.ceil((penaltyEnd - Date.now()) / 1000);
          
          logger.warn('Request blocked due to penalty', {
            ip,
            userId,
            route,
            penaltyEnd: new Date(penaltyEnd),
            retryAfter
          });

          return this.sendRateLimitResponse(reply, {
            windowMs: retryAfter * 1000,
            max: 0,
            message: 'IP temporarily blocked due to suspicious activity'
          }, 0, retryAfter);
        }

        // Apply multiple rate limiting layers
        const limits = await Promise.all([
          this.checkGlobalLimit(request),
          this.checkIPLimit(request, ip),
          this.checkUserLimit(request, userId),
          this.checkGeoLimit(request, ip),
          this.checkCustomRules(request)
        ]);

        // Find the most restrictive limit that was exceeded
        const violatedLimit = limits.find(limit => limit.violated);
        
        if (violatedLimit) {
          await this.handleRateLimitViolation(request, ip, userId, violatedLimit);
          
          return this.sendRateLimitResponse(
            reply,
            violatedLimit.config,
            violatedLimit.remaining,
            violatedLimit.retryAfter
          );
        }

        // Update behavioral analysis
        if (this.options.enableBehavioralAnalysis) {
          this.updateBehavioralAnalysis(request, ip, userId);
        }

        // Add rate limit headers to successful requests
        if (this.options.headers) {
          const ipLimit = limits.find(l => l.type === 'ip');
          if (ipLimit) {
            reply.header('X-RateLimit-Limit', ipLimit.config.max);
            reply.header('X-RateLimit-Remaining', ipLimit.remaining);
            reply.header('X-RateLimit-Reset', Math.ceil(ipLimit.resetTime / 1000));
          }
        }

      } catch (error) {
        logger.error('Rate limiting error:', error);
        // Don't block requests on rate limiting errors
      }
      return; // Explicit return for all code paths
    };
  }

  /**
   * Check global rate limit
   */
  private async checkGlobalLimit(request: FastifyRequest): Promise<any> {
    const key = 'global';
    const config = this.options.global;
    const entry = this.getOrCreateEntry(key, config.windowMs);

    return this.evaluateLimit(key, entry, config, 'global');
  }

  /**
   * Check IP-based rate limit
   */
  private async checkIPLimit(request: FastifyRequest, ip: string) {
    const key = `ip:${ip}`;
    const config = this.options.perIP;
    const entry = this.getOrCreateEntry(key, config.windowMs);

    // Apply penalty multiplier if IP has penalties
    const penaltyMultiplier = this.getPenaltyMultiplier(ip);
    const adjustedConfig = {
      ...config,
      max: Math.floor(config.max / penaltyMultiplier)
    };

    return this.evaluateLimit(key, entry, adjustedConfig, 'ip');
  }

  /**
   * Check user-based rate limit
   */
  private async checkUserLimit(request: FastifyRequest, userId?: string) {
    if (!userId) {
      return { violated: false, type: 'user', remaining: 999, resetTime: Date.now(), retryAfter: 0, config: this.options.perUser };
    }

    const userRole = (request as any).user?.role;
    const isPremium = userRole === 'premium' || userRole === 'admin';
    
    const key = `user:${userId}`;
    const config = this.options.perUser;
    const maxRequests = isPremium && config.premium ? config.premium.max : config.max;
    
    const adjustedConfig = {
      ...config,
      max: maxRequests
    };

    const entry = this.getOrCreateEntry(key, config.windowMs);
    return this.evaluateLimit(key, entry, adjustedConfig, 'user');
  }

  /**
   * Check geographic rate limit
   */
  private async checkGeoLimit(request: FastifyRequest, ip: string) {
    if (!this.options.geoLimits) {
      return { violated: false, type: 'geo', remaining: 999, resetTime: Date.now(), retryAfter: 0, config: { windowMs: 0, max: 999 } };
    }

    const geo = geoip.lookup(ip);
    const countryCode = geo?.country;

    if (!countryCode || !this.options.geoLimits[countryCode]) {
      return { violated: false, type: 'geo', remaining: 999, resetTime: Date.now(), retryAfter: 0, config: { windowMs: 0, max: 999 } };
    }

    const geoConfig = this.options.geoLimits[countryCode];
    const key = `geo:${countryCode}:${ip}`;
    const entry = this.getOrCreateEntry(key, geoConfig.windowMs);

    return this.evaluateLimit(key, entry, geoConfig, 'geo');
  }

  /**
   * Check custom rules
   */
  private async checkCustomRules(request: FastifyRequest) {
    if (!this.options.customRules) {
      return { violated: false, type: 'custom', remaining: 999, resetTime: Date.now(), retryAfter: 0, config: { windowMs: 0, max: 999 } };
    }

    // Sort rules by priority
    const sortedRules = this.options.customRules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.condition(request)) {
        const key = `rule:${rule.id}:${this.getClientIP(request)}`;
        const entry = this.getOrCreateEntry(key, rule.limit.windowMs);
        const result = this.evaluateLimit(key, entry, rule.limit, 'custom');
        
        if (result.violated) {
          return {
            ...result,
            rule: rule
          };
        }
      }
    }

    return { violated: false, type: 'custom', remaining: 999, resetTime: Date.now(), retryAfter: 0, config: { windowMs: 0, max: 999 } };
  }

  /**
   * Evaluate if a limit is violated
   */
  private evaluateLimit(
    key: string, 
    entry: RateLimitEntry, 
    config: RateLimitConfig | GeoRateLimit[string], 
    type: string
  ) {
    const now = Date.now();
    const windowMs = 'windowMs' in config ? config.windowMs : 15 * 60 * 1000;
    const max = 'max' in config ? config.max : 100;

    // Check if window has expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
      entry.firstRequest = now;
    }

    // Increment counter
    entry.count++;
    entry.lastRequest = now;

    const remaining = Math.max(0, max - entry.count);
    const violated = entry.count > max;
    const retryAfter = violated ? Math.ceil((entry.resetTime - now) / 1000) : 0;

    // Update store
    this.store.set(key, entry);

    return {
      violated,
      type,
      remaining,
      resetTime: entry.resetTime,
      retryAfter,
      config,
      key
    };
  }

  /**
   * Get or create rate limit entry
   */
  private getOrCreateEntry(key: string, windowMs: number): RateLimitEntry {
    const existing = this.store.get(key);
    const now = Date.now();

    if (existing && now <= existing.resetTime) {
      return existing;
    }

    return {
      count: 0,
      resetTime: now + windowMs,
      firstRequest: now,
      lastRequest: now,
      blocked: false,
      warnings: 0
    };
  }

  /**
   * Handle rate limit violation
   */
  private async handleRateLimitViolation(
    request: FastifyRequest,
    ip: string,
    userId: string | undefined,
    limit: any
  ) {
    const route = request.routeOptions?.url || request.url;
    
    logger.warn('Rate limit exceeded', {
      type: limit.type,
      ip,
      userId,
      route,
      limit: limit.config.max,
      current: limit.remaining,
      userAgent: request.headers['user-agent']
    });

    // Update suspicious behavior score
    if (this.options.enableBehavioralAnalysis) {
      const currentScore = this.suspiciousIPs.get(ip) || 0;
      const newScore = currentScore + this.getRateLimitViolationScore(limit.type);
      this.suspiciousIPs.set(ip, newScore);

      // Apply penalty if score exceeds threshold
      if (newScore >= this.options.suspiciousThreshold! && this.options.enablePenalties) {
        this.applyPenalty(ip, newScore);
      }
    }

    // Handle custom rule actions
    if (limit.rule && limit.rule.action !== 'block') {
      await this.handleCustomAction(request, limit.rule);
    }
  }

  /**
   * Apply penalty to IP
   */
  private applyPenalty(ip: string, score: number) {
    const penaltyDuration = Math.min(
      score * this.options.penaltyMultiplier! * 60 * 1000, // Convert to milliseconds
      this.options.maxPenaltyTime!
    );
    
    const penaltyEnd = Date.now() + penaltyDuration;
    this.penalties.set(ip, penaltyEnd);

    logger.warn('IP penalty applied', {
      ip,
      score,
      penaltyDuration: penaltyDuration / 1000, // Log in seconds
      penaltyEnd: new Date(penaltyEnd)
    });
  }

  /**
   * Handle custom rule actions
   */
  private async handleCustomAction(request: FastifyRequest, rule: RateLimitRule) {
    switch (rule.action) {
      case 'delay':
        // Add artificial delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      case 'captcha':
        // Would integrate with CAPTCHA service
        logger.info('CAPTCHA challenge required', { ruleId: rule.id });
        break;
      case 'warn':
        // Just log warning
        logger.warn('Rate limit warning triggered', { ruleId: rule.id });
        break;
    }
  }

  /**
   * Send rate limit response
   */
  private sendRateLimitResponse(
    reply: FastifyReply,
    config: any,
    remaining: number,
    retryAfter: number
  ) {
    if (this.options.headers) {
      reply.header('X-RateLimit-Limit', config.max);
      reply.header('X-RateLimit-Remaining', remaining);
      reply.header('X-RateLimit-Reset', Math.ceil((Date.now() + config.windowMs) / 1000));
    }

    if (this.options.retryAfterHeader && retryAfter > 0) {
      reply.header('Retry-After', retryAfter);
    }

    return reply.status(429).send({
      error: 'Too Many Requests',
      message: config.message || this.options.message || 'Rate limit exceeded',
      retryAfter: retryAfter > 0 ? retryAfter : undefined
    });
  }

  /**
   * Check if request should skip rate limiting
   */
  private shouldSkip(
    request: FastifyRequest,
    ip: string,
    userRole?: string,
    route?: string
  ): boolean {
    // Check allowlist
    if (this.options.allowlist?.some(allowed => ipRangeCheck(ip, allowed))) {
      return true;
    }

    // Check exempt user roles
    if (userRole && this.options.exemptUserRoles?.includes(userRole)) {
      return true;
    }

    // Check exempt routes
    if (route && this.options.exemptRoutes?.some(exemptRoute => route.includes(exemptRoute))) {
      return true;
    }

    return false;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: FastifyRequest): string {
    return request.headers['x-forwarded-for'] as string || 
           request.headers['x-real-ip'] as string || 
           request.ip || 
           'unknown';
  }

  /**
   * Check if IP is under penalty
   */
  private isUnderPenalty(ip: string): boolean {
    const penaltyEnd = this.penalties.get(ip);
    if (!penaltyEnd) return false;
    
    if (Date.now() > penaltyEnd) {
      this.penalties.delete(ip);
      return false;
    }
    
    return true;
  }

  /**
   * Get penalty multiplier for IP
   */
  private getPenaltyMultiplier(ip: string): number {
    const suspiciousScore = this.suspiciousIPs.get(ip) || 0;
    return Math.max(1, Math.floor(suspiciousScore / 20));
  }

  /**
   * Get violation score based on limit type
   */
  private getRateLimitViolationScore(type: string): number {
    switch (type) {
      case 'global': return 10;
      case 'ip': return 15;
      case 'user': return 5;
      case 'geo': return 20;
      case 'custom': return 25;
      default: return 10;
    }
  }

  /**
   * Update behavioral analysis
   */
  private updateBehavioralAnalysis(
    request: FastifyRequest,
    ip: string,
    userId?: string
  ) {
    // This could be expanded with more sophisticated analysis
    const userAgent = request.headers['user-agent'] as string;
    const route = request.routeOptions?.url || request.url;

    // Detect potential bot behavior
    if (!userAgent || userAgent.length < 10) {
      const score = this.suspiciousIPs.get(ip) || 0;
      this.suspiciousIPs.set(ip, score + 5);
    }

    // Detect rapid requests to sensitive endpoints
    if (route.includes('/auth/') || route.includes('/admin/')) {
      const score = this.suspiciousIPs.get(ip) || 0;
      this.suspiciousIPs.set(ip, score + 3);
    }
  }

  /**
   * Cleanup expired entries and penalties
   */
  private cleanup() {
    const now = Date.now();
    let cleanedEntries = 0;
    let cleanedPenalties = 0;
    let cleanedSuspicious = 0;

    // Cleanup rate limit entries
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleanedEntries++;
      }
    }

    // Cleanup expired penalties
    for (const [ip, penaltyEnd] of this.penalties.entries()) {
      if (now > penaltyEnd) {
        this.penalties.delete(ip);
        cleanedPenalties++;
      }
    }

    // Cleanup old suspicious IPs (decay scores)
    for (const [ip, score] of this.suspiciousIPs.entries()) {
      const newScore = Math.max(0, score - 1); // Decay by 1 point per cleanup cycle
      if (newScore === 0) {
        this.suspiciousIPs.delete(ip);
        cleanedSuspicious++;
      } else {
        this.suspiciousIPs.set(ip, newScore);
      }
    }

    if (cleanedEntries > 0 || cleanedPenalties > 0 || cleanedSuspicious > 0) {
      logger.debug('Rate limiting cleanup completed', {
        cleanedEntries,
        cleanedPenalties,
        cleanedSuspicious,
        activeEntries: this.store.size,
        activePenalties: this.penalties.size,
        suspiciousIPs: this.suspiciousIPs.size
      });
    }
  }

  /**
   * Get rate limiting statistics
   */
  getStats() {
    const now = Date.now();
    const activeEntries = Array.from(this.store.values()).filter(entry => now <= entry.resetTime);
    const activePenalties = Array.from(this.penalties.values()).filter(end => now < end);

    return {
      activeEntries: activeEntries.length,
      totalEntries: this.store.size,
      activePenalties: activePenalties.length,
      suspiciousIPs: this.suspiciousIPs.size,
      topSuspiciousIPs: Array.from(this.suspiciousIPs.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  /**
   * Manually block IP
   */
  blockIP(ip: string, duration: number = 24 * 60 * 60 * 1000) {
    this.penalties.set(ip, Date.now() + duration);
    logger.info('IP manually blocked', { ip, duration: duration / 1000 });
  }

  /**
   * Manually unblock IP
   */
  unblockIP(ip: string) {
    this.penalties.delete(ip);
    this.suspiciousIPs.delete(ip);
    logger.info('IP manually unblocked', { ip });
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.penalties.clear();
    this.suspiciousIPs.clear();
    logger.info('Enhanced rate limiting service shutdown');
  }
}