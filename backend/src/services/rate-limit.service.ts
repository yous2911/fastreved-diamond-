/**
 * Smart Rate Limiting and Throttling Service
 * Implements multiple rate limiting algorithms with IP reputation and adaptive limits
 */

interface RateLimitRule {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
  onLimitReached?: (req: any) => void;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
  lastRequest: number;
  violations: number;
}

interface IPReputation {
  trustScore: number;      // 0-100, higher = more trusted
  successfulRequests: number;
  failedRequests: number;
  lastSeen: number;
  violations: number;
  isBlocked: boolean;
  blockUntil?: number;
}

export class SmartRateLimitService {
  private static instance: SmartRateLimitService;
  private limitStore = new Map<string, RateLimitEntry>();
  private reputationStore = new Map<string, IPReputation>();
  
  // Rate limiting rules for different endpoints
  private rules: Map<string, RateLimitRule> = new Map([
    // Authentication endpoints - strict limits
    ['auth:login', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      skipSuccessfulRequests: false,
      onLimitReached: (req) => this.handleAuthViolation(req)
    }],
    
    ['auth:register', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      skipSuccessfulRequests: false
    }],
    
    ['auth:password-reset', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      skipSuccessfulRequests: true
    }],
    
    // API endpoints - moderate limits
    ['api:general', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: true
    }],
    
    // Exercise submissions - adaptive limits
    ['exercises:submit', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      skipSuccessfulRequests: true
    }],
    
    // File uploads - strict limits
    ['uploads', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      skipSuccessfulRequests: false
    }],
    
    // Admin endpoints - very strict
    ['admin', {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 50,
      skipSuccessfulRequests: true
    }]
  ]);

  private constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  public static getInstance(): SmartRateLimitService {
    if (!SmartRateLimitService.instance) {
      SmartRateLimitService.instance = new SmartRateLimitService();
    }
    return SmartRateLimitService.instance;
  }

  /**
   * Check if request should be rate limited
   */
  public checkRateLimit(request: any, ruleKey: string = 'api:general'): {
    allowed: boolean;
    remainingRequests?: number;
    resetTime?: number;
    retryAfter?: number;
    reason?: string;
  } {
    const rule = this.rules.get(ruleKey);
    if (!rule) {
      return { allowed: true };
    }

    // Generate key for this request
    const key = this.generateKey(request, ruleKey, rule);
    const now = Date.now();

    // Check IP reputation first
    const ip = this.extractIP(request);
    const reputation = this.getIPReputation(ip);
    
    if (reputation.isBlocked) {
      return {
        allowed: false,
        reason: 'IP blocked due to repeated violations',
        retryAfter: reputation.blockUntil ? Math.ceil((reputation.blockUntil - now) / 1000) : 3600
      };
    }

    // Get or create rate limit entry
    let entry = this.limitStore.get(key);
    const resetTime = this.calculateResetTime(now, rule.windowMs);

    if (!entry || now >= entry.resetTime) {
      // First request or window expired
      entry = {
        count: 1,
        resetTime,
        firstRequest: now,
        lastRequest: now,
        violations: 0
      };
      this.limitStore.set(key, entry);

      return {
        allowed: true,
        remainingRequests: rule.maxRequests - 1,
        resetTime
      };
    }

    // Check if we should skip this request
    if (rule.skip && rule.skip(request)) {
      return { allowed: true };
    }

    // Apply adaptive limits based on IP reputation
    const adaptiveLimit = this.calculateAdaptiveLimit(rule.maxRequests, reputation);
    
    if (entry.count >= adaptiveLimit) {
      // Rate limit exceeded
      entry.violations++;
      this.updateIPReputation(ip, false); // Mark as failed request
      
      if (rule.onLimitReached) {
        rule.onLimitReached(request);
      }

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        reason: 'Rate limit exceeded'
      };
    }

    // Request allowed
    entry.count++;
    entry.lastRequest = now;
    this.updateIPReputation(ip, true); // Mark as successful request

    return {
      allowed: true,
      remainingRequests: adaptiveLimit - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get IP reputation information
   */
  private getIPReputation(ip: string): IPReputation {
    if (!this.reputationStore.has(ip)) {
      this.reputationStore.set(ip, {
        trustScore: 50, // Start neutral
        successfulRequests: 0,
        failedRequests: 0,
        lastSeen: Date.now(),
        violations: 0,
        isBlocked: false
      });
    }
    return this.reputationStore.get(ip)!;
  }

  /**
   * Update IP reputation based on request success/failure
   */
  private updateIPReputation(ip: string, success: boolean): void {
    const reputation = this.getIPReputation(ip);
    reputation.lastSeen = Date.now();

    if (success) {
      reputation.successfulRequests++;
      reputation.trustScore = Math.min(100, reputation.trustScore + 0.1);
    } else {
      reputation.failedRequests++;
      reputation.violations++;
      reputation.trustScore = Math.max(0, reputation.trustScore - 2);

      // Block IP if too many violations
      if (reputation.violations >= 10 || reputation.trustScore <= 10) {
        reputation.isBlocked = true;
        reputation.blockUntil = Date.now() + (60 * 60 * 1000); // Block for 1 hour
        console.warn(`🚨 IP blocked due to violations: ${ip} (violations: ${reputation.violations})`);
      }
    }
  }

  /**
   * Calculate adaptive rate limit based on IP reputation
   */
  private calculateAdaptiveLimit(baseLimit: number, reputation: IPReputation): number {
    if (reputation.trustScore >= 80) {
      // Trusted IPs get 50% more requests
      return Math.floor(baseLimit * 1.5);
    } else if (reputation.trustScore <= 30) {
      // Suspicious IPs get 50% fewer requests
      return Math.floor(baseLimit * 0.5);
    }
    return baseLimit;
  }

  /**
   * Generate unique key for rate limiting
   */
  private generateKey(request: any, ruleKey: string, rule: RateLimitRule): string {
    if (rule.keyGenerator) {
      return rule.keyGenerator(request);
    }

    const ip = this.extractIP(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const userAgentHash = this.simpleHash(userAgent);

    // For auth endpoints, also include user identifier if available
    if (ruleKey.startsWith('auth:')) {
      const userId = request.body?.email || request.body?.prenom || 'anonymous';
      return `${ruleKey}:${ip}:${userAgentHash}:${userId}`;
    }

    return `${ruleKey}:${ip}:${userAgentHash}`;
  }

  /**
   * Extract IP address from request
   */
  private extractIP(request: any): string {
    // Try various headers for IP extraction
    const possibleHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip'
    ];

    for (const header of possibleHeaders) {
      const ip = request.headers[header];
      if (ip) {
        // Take first IP if comma-separated
        return ip.split(',')[0].trim();
      }
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Calculate reset time for sliding window
   */
  private calculateResetTime(now: number, windowMs: number): number {
    return now + windowMs;
  }

  /**
   * Handle authentication violations
   */
  private handleAuthViolation(request: any): void {
    const ip = this.extractIP(request);
    console.warn(`🚨 Auth rate limit exceeded for IP: ${ip}`, {
      ip,
      userAgent: request.headers['user-agent'],
      endpoint: request.url,
      timestamp: new Date().toISOString()
    });

    // Update reputation more severely for auth violations
    const reputation = this.getIPReputation(ip);
    reputation.trustScore = Math.max(0, reputation.trustScore - 10);
    reputation.violations += 5; // Auth violations count as 5 regular violations
  }

  /**
   * Simple hash function for user agent
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean rate limit entries
    for (const [key, entry] of this.limitStore.entries()) {
      if (now >= entry.resetTime) {
        this.limitStore.delete(key);
        cleanedCount++;
      }
    }

    // Clean old reputation entries (older than 30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    for (const [ip, reputation] of this.reputationStore.entries()) {
      if (reputation.lastSeen < thirtyDaysAgo) {
        this.reputationStore.delete(ip);
        cleanedCount++;
      }
      
      // Unblock IPs whose block period has expired
      if (reputation.isBlocked && reputation.blockUntil && now >= reputation.blockUntil) {
        reputation.isBlocked = false;
        reputation.blockUntil = undefined;
        console.log(`✅ IP unblocked: ${ip}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Rate limit cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get current statistics
   */
  public getStats(): {
    activeLimits: number;
    trackedIPs: number;
    blockedIPs: number;
    averageTrustScore: number;
  } {
    const blockedIPs = Array.from(this.reputationStore.values())
      .filter(rep => rep.isBlocked).length;
    
    const trustScores = Array.from(this.reputationStore.values())
      .map(rep => rep.trustScore);
    
    const averageTrustScore = trustScores.length > 0
      ? trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length
      : 0;

    return {
      activeLimits: this.limitStore.size,
      trackedIPs: this.reputationStore.size,
      blockedIPs,
      averageTrustScore: Math.round(averageTrustScore)
    };
  }

  /**
   * Manually block/unblock an IP
   */
  public setIPBlock(ip: string, blocked: boolean, duration?: number): void {
    const reputation = this.getIPReputation(ip);
    reputation.isBlocked = blocked;
    
    if (blocked && duration) {
      reputation.blockUntil = Date.now() + duration;
    } else {
      reputation.blockUntil = undefined;
    }

    console.log(`${blocked ? '🚫' : '✅'} IP ${blocked ? 'blocked' : 'unblocked'}: ${ip}`);
  }

  /**
   * Reset rate limit for a specific key
   */
  public resetRateLimit(key: string): void {
    this.limitStore.delete(key);
  }

  /**
   * Add custom rate limit rule
   */
  public addRule(ruleKey: string, rule: RateLimitRule): void {
    this.rules.set(ruleKey, rule);
  }
}

// Middleware factory for Fastify
export function createRateLimitMiddleware(ruleKey: string = 'api:general') {
  const rateLimitService = SmartRateLimitService.getInstance();

  return async (request: any, reply: any) => {
    const result = rateLimitService.checkRateLimit(request, ruleKey);

    if (!result.allowed) {
      // Add rate limit headers
      reply.headers({
        'X-RateLimit-Limit': rateLimitService.rules.get(ruleKey)?.maxRequests || 0,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(result.resetTime || Date.now()).toISOString(),
        'Retry-After': result.retryAfter || 60
      });

      return reply.status(429).send({
        success: false,
        error: {
          message: result.reason || 'Trop de requêtes',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter
        }
      });
    }

    // Add rate limit info headers for successful requests
    if (result.remainingRequests !== undefined) {
      reply.headers({
        'X-RateLimit-Limit': rateLimitService.rules.get(ruleKey)?.maxRequests || 0,
        'X-RateLimit-Remaining': result.remainingRequests,
        'X-RateLimit-Reset': new Date(result.resetTime || Date.now()).toISOString()
      });
    }
  };
}

// Export singleton instance
export const smartRateLimit = SmartRateLimitService.getInstance();