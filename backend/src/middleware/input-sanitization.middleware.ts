import { FastifyRequest, FastifyReply } from 'fastify';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import validator from 'validator';
import xss from 'xss';
import { logger } from '../utils/logger';

// Initialize DOMPurify for server-side HTML sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// XSS filtering options
const xssOptions = {
  allowList: {
    a: ['href', 'title'],
    b: [],
    i: [],
    em: [],
    strong: [],
    p: [],
    br: [],
    span: ['class'],
    div: ['class'],
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    ul: [], ol: [], li: [],
    blockquote: [],
    code: [],
    pre: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  css: false // Disable CSS to prevent style-based attacks
};

export interface SanitizationOptions {
  skipRoutes?: string[];
  skipMethods?: string[];
  allowHtml?: boolean;
  maxLength?: {
    string: number;
    email: number;
    url: number;
    text: number;
  };
  customSanitizers?: {
    [key: string]: (value: any) => any;
  };
}

export interface SanitizedRequest extends FastifyRequest {
  sanitizedBody?: any;
  sanitizedQuery?: any;
  sanitizedParams?: any;
  sanitizationWarnings?: string[];
}

export class InputSanitizationService {
  private options: SanitizationOptions;

  constructor(options: SanitizationOptions = {}) {
    this.options = {
      skipRoutes: [],
      skipMethods: ['GET', 'HEAD', 'OPTIONS'],
      allowHtml: false,
      maxLength: {
        string: 1000,
        email: 254,
        url: 2048,
        text: 10000
      },
      ...options
    };
  }

  /**
   * Main sanitization middleware
   */
  async sanitizationMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const sanitizedReq = request as SanitizedRequest;
    sanitizedReq.sanitizationWarnings = [];

    try {
      // Skip if route is in skip list
      if (this.shouldSkipSanitization(request)) {
        return;
      }

      // Sanitize request body
      if (request.body) {
        sanitizedReq.sanitizedBody = await this.sanitizeObject(
          request.body,
          'body',
          sanitizedReq.sanitizationWarnings
        );
      }

      // Sanitize query parameters
      if (request.query) {
        sanitizedReq.sanitizedQuery = await this.sanitizeObject(
          request.query,
          'query',
          sanitizedReq.sanitizationWarnings
        );
      }

      // Sanitize route parameters
      if (request.params) {
        sanitizedReq.sanitizedParams = await this.sanitizeObject(
          request.params,
          'params',
          sanitizedReq.sanitizationWarnings
        );
      }

      // Log warnings if any
      if (sanitizedReq.sanitizationWarnings.length > 0) {
        logger.warn('Input sanitization warnings', {
          route: request.routeOptions?.url || request.url,
          method: request.method,
          warnings: sanitizedReq.sanitizationWarnings,
          userAgent: request.headers['user-agent'],
          ip: request.ip
        });
      }

    } catch (error) {
      logger.error('Input sanitization error:', error);
      
      // Log security incident
      logger.warn('Potential security threat detected', {
        route: request.routeOptions?.url || request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        error: error.message
      });

      return reply.status(400).send({
        error: 'Invalid input data',
        message: 'Request contains potentially harmful content'
      });
    }
  }

  /**
   * Check if sanitization should be skipped for this request
   */
  private shouldSkipSanitization(request: FastifyRequest): boolean {
    const route = request.routeOptions?.url || request.url;
    const method = request.method;

    // Skip certain methods
    if (this.options.skipMethods?.includes(method)) {
      return true;
    }

    // Skip certain routes
    if (this.options.skipRoutes?.some(skipRoute => route.includes(skipRoute))) {
      return true;
    }

    // Skip file upload routes (handled separately)
    if (route.includes('/upload') || route.includes('/files/')) {
      return true;
    }

    return false;
  }

  /**
   * Recursively sanitize an object
   */
  private async sanitizeObject(
    obj: any,
    context: string,
    warnings: string[]
  ): Promise<any> {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, context, warnings);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item, index) => 
          this.sanitizeObject(item, `${context}[${index}]`, warnings)
        )
      );
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, `${context}.key`, warnings);
        sanitized[sanitizedKey] = await this.sanitizeObject(
          value,
          `${context}.${key}`,
          warnings
        );
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string values with context-aware rules
   */
  private sanitizeString(
    value: string,
    context: string,
    warnings: string[]
  ): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    let sanitized = value;
    const originalValue = value;

    try {
      // 1. Length validation
      const maxLength = this.getMaxLengthForContext(context);
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
        warnings.push(`${context}: Truncated to ${maxLength} characters`);
      }

      // 2. Basic XSS protection
      if (this.containsHtmlOrScript(sanitized)) {
        if (this.options.allowHtml && this.isHtmlContext(context)) {
          sanitized = purify.sanitize(sanitized, {
            ALLOWED_TAGS: Object.keys(xssOptions.allowList),
            ALLOWED_ATTR: this.getAllowedAttributes()
          });
        } else {
          sanitized = xss(sanitized, xssOptions);
        }
        
        if (sanitized !== originalValue) {
          warnings.push(`${context}: HTML/Script content sanitized`);
        }
      }

      // 3. SQL injection protection
      if (this.containsSqlInjection(sanitized)) {
        sanitized = this.sanitizeSqlInjection(sanitized);
        warnings.push(`${context}: Potential SQL injection patterns removed`);
      }

      // 4. NoSQL injection protection
      if (this.containsNoSqlInjection(sanitized)) {
        sanitized = this.sanitizeNoSqlInjection(sanitized);
        warnings.push(`${context}: Potential NoSQL injection patterns removed`);
      }

      // 5. Command injection protection
      if (this.containsCommandInjection(sanitized)) {
        sanitized = this.sanitizeCommandInjection(sanitized);
        warnings.push(`${context}: Potential command injection patterns removed`);
      }

      // 6. Path traversal protection
      if (this.containsPathTraversal(sanitized)) {
        sanitized = this.sanitizePathTraversal(sanitized);
        warnings.push(`${context}: Path traversal patterns removed`);
      }

      // 7. Context-specific validation
      sanitized = this.applyContextSpecificSanitization(sanitized, context, warnings);

      // 8. Custom sanitizers
      if (this.options.customSanitizers) {
        for (const [pattern, sanitizer] of Object.entries(this.options.customSanitizers)) {
          if (context.includes(pattern)) {
            sanitized = sanitizer(sanitized);
          }
        }
      }

      // 9. Final validation
      sanitized = this.finalValidation(sanitized, context, warnings);

    } catch (error) {
      logger.error('String sanitization error:', { error, context, value: originalValue });
      warnings.push(`${context}: Sanitization error occurred`);
      // Return empty string as fallback for security
      return '';
    }

    return sanitized;
  }

  /**
   * Get maximum length based on context
   */
  private getMaxLengthForContext(context: string): number {
    if (context.toLowerCase().includes('email')) {
      return this.options.maxLength!.email;
    }
    if (context.toLowerCase().includes('url') || context.toLowerCase().includes('link')) {
      return this.options.maxLength!.url;
    }
    if (context.toLowerCase().includes('text') || context.toLowerCase().includes('description')) {
      return this.options.maxLength!.text;
    }
    return this.options.maxLength!.string;
  }

  /**
   * Check if content contains HTML or script tags
   */
  private containsHtmlOrScript(value: string): boolean {
    const htmlRegex = /<[^>]*>/;
    const scriptRegex = /<script[^>]*>.*?<\/script>/gi;
    const eventRegex = /on\w+\s*=/i;
    const jsRegex = /javascript:/i;
    
    return htmlRegex.test(value) || 
           scriptRegex.test(value) || 
           eventRegex.test(value) || 
           jsRegex.test(value);
  }

  /**
   * Check if context allows HTML
   */
  private isHtmlContext(context: string): boolean {
    const htmlContexts = ['description', 'content', 'message', 'html'];
    return htmlContexts.some(ctx => context.toLowerCase().includes(ctx));
  }

  /**
   * Get allowed HTML attributes
   */
  private getAllowedAttributes(): string[] {
    return Object.values(xssOptions.allowList).flat();
  }

  /**
   * Check for SQL injection patterns
   */
  private containsSqlInjection(value: string): boolean {
    const sqlPatterns = [
      /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b|\balter\b)/i,
      /(\bor\b|\band\b)\s+[\w\s]*\s*=\s*[\w\s]*/i,
      /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/i,
      /'[^']*'(\s*;\s*|\s+or\s+|\s+and\s+)/i,
      /(\bexec\b|\bexecute\b)\s*\(/i,
      /\bconcat\s*\(/i,
      /\bchar\s*\(/i,
      /0x[0-9a-f]+/i,
      /\bdeclare\s+@/i,
      /\bcast\s*\(/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Sanitize SQL injection patterns
   */
  private sanitizeSqlInjection(value: string): string {
    // Remove common SQL injection patterns
    return value
      .replace(/(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b|\balter\b)/gi, '')
      .replace(/(\bor\b|\band\b)\s+[\w\s]*\s*=\s*[\w\s]*/gi, '')
      .replace(/(\bor\b|\band\b)\s+\d+\s*=\s*\d+/gi, '')
      .replace(/'[^']*'(\s*;\s*|\s+or\s+|\s+and\s+)/gi, '')
      .replace(/(\bexec\b|\bexecute\b)\s*\(/gi, '')
      .replace(/\bconcat\s*\(/gi, '')
      .replace(/\bchar\s*\(/gi, '')
      .replace(/0x[0-9a-f]+/gi, '')
      .replace(/\bdeclare\s+@/gi, '')
      .replace(/\bcast\s*\(/gi, '');
  }

  /**
   * Check for NoSQL injection patterns
   */
  private containsNoSqlInjection(value: string): boolean {
    const noSqlPatterns = [
      /\$where\s*:/i,
      /\$regex\s*:/i,
      /\$ne\s*:/i,
      /\$gt\s*:/i,
      /\$lt\s*:/i,
      /\$in\s*:/i,
      /\$nin\s*:/i,
      /\$exists\s*:/i,
      /\$or\s*:/i,
      /\$and\s*:/i,
      /\$not\s*:/i,
      /\$nor\s*:/i,
      /\$all\s*:/i,
      /\$elemMatch\s*:/i
    ];
    
    return noSqlPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Sanitize NoSQL injection patterns
   */
  private sanitizeNoSqlInjection(value: string): string {
    return value
      .replace(/\$where\s*:/gi, '')
      .replace(/\$regex\s*:/gi, '')
      .replace(/\$ne\s*:/gi, '')
      .replace(/\$gt\s*:/gi, '')
      .replace(/\$lt\s*:/gi, '')
      .replace(/\$in\s*:/gi, '')
      .replace(/\$nin\s*:/gi, '')
      .replace(/\$exists\s*:/gi, '')
      .replace(/\$or\s*:/gi, '')
      .replace(/\$and\s*:/gi, '')
      .replace(/\$not\s*:/gi, '')
      .replace(/\$nor\s*:/gi, '')
      .replace(/\$all\s*:/gi, '')
      .replace(/\$elemMatch\s*:/gi, '');
  }

  /**
   * Check for command injection patterns
   */
  private containsCommandInjection(value: string): boolean {
    const cmdPatterns = [
      /(\||&|;|`|\$\(|\$\{)/,
      /(\bcat\b|\bls\b|\bps\b|\bwhoami\b|\bpwd\b|\becho\b)/i,
      /(\brm\b|\bmv\b|\bcp\b|\bchmod\b|\bchown\b)/i,
      /(\bcurl\b|\bwget\b|\bnc\b|\bnetcat\b)/i,
      /(\beval\b|\bexec\b|\bsystem\b|\bshell_exec\b)/i,
      /(\bpassthru\b|\bpopen\b|\bproc_open\b)/i
    ];
    
    return cmdPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Sanitize command injection patterns
   */
  private sanitizeCommandInjection(value: string): string {
    return value
      .replace(/(\||&|;|`|\$\(|\$\{)/g, '')
      .replace(/(\bcat\b|\bls\b|\bps\b|\bwhoami\b|\bpwd\b|\becho\b)/gi, '')
      .replace(/(\brm\b|\bmv\b|\bcp\b|\bchmod\b|\bchown\b)/gi, '')
      .replace(/(\bcurl\b|\bwget\b|\bnc\b|\bnetcat\b)/gi, '')
      .replace(/(\beval\b|\bexec\b|\bsystem\b|\bshell_exec\b)/gi, '')
      .replace(/(\bpassthru\b|\bpopen\b|\bproc_open\b)/gi, '');
  }

  /**
   * Check for path traversal patterns
   */
  private containsPathTraversal(value: string): boolean {
    const pathPatterns = [
      /\.\.[\/\\]/,
      /[\/\\]\.\.[\/\\]/,
      /%2e%2e[\/\\]/i,
      /%252e%252e/i,
      /\.\.\x2f/,
      /\.\.\x5c/
    ];
    
    return pathPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Sanitize path traversal patterns
   */
  private sanitizePathTraversal(value: string): string {
    return value
      .replace(/\.\.[/\\]/g, '')
      .replace(/[/\\]\.\.[/\\]/g, '')
      .replace(/%2e%2e[/\\]/gi, '')
      .replace(/%252e%252e/gi, '')
      .replace(/\.\.\x2f/g, '')
      .replace(/\.\.\x5c/g, '');
  }

  /**
   * Apply context-specific sanitization
   */
  private applyContextSpecificSanitization(
    value: string,
    context: string,
    warnings: string[]
  ): string {
    const lowerContext = context.toLowerCase();

    // Email validation
    if (lowerContext.includes('email')) {
      if (!validator.isEmail(value)) {
        warnings.push(`${context}: Invalid email format`);
        // Return sanitized version if possible
        const emailParts = value.split('@');
        if (emailParts.length === 2) {
          return `${validator.escape(emailParts[0])}@${validator.escape(emailParts[1])}`;
        }
        return '';
      }
      return validator.normalizeEmail(value) || value;
    }

    // URL validation
    if (lowerContext.includes('url') || lowerContext.includes('link')) {
      if (value && !validator.isURL(value, { protocols: ['http', 'https'] })) {
        warnings.push(`${context}: Invalid URL format`);
        return '';
      }
      return value;
    }

    // Phone number validation
    if (lowerContext.includes('phone') || lowerContext.includes('tel')) {
      return value.replace(/[^\d+\-\s()]/g, '');
    }

    // ID validation (numeric only)
    if (lowerContext.includes('id') && lowerContext !== 'studentId') {
      if (!validator.isAlphanumeric(value)) {
        return value.replace(/[^a-zA-Z0-9\-_]/g, '');
      }
    }

    // Name validation (letters, spaces, hyphens only)
    if (lowerContext.includes('name') || lowerContext.includes('nom') || lowerContext.includes('prenom')) {
      return value.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '');
    }

    return value;
  }

  /**
   * Final validation step
   */
  private finalValidation(
    value: string,
    context: string,
    warnings: string[]
  ): string {
    // Remove null bytes
    if (value.includes('\0')) {
      value = value.replace(/\0/g, '');
      warnings.push(`${context}: Null bytes removed`);
    }

    // Remove control characters except newlines and tabs
    const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    if (controlCharsRegex.test(value)) {
      value = value.replace(controlCharsRegex, '');
      warnings.push(`${context}: Control characters removed`);
    }

    // Normalize Unicode
    value = value.normalize('NFC');

    // Trim whitespace
    value = value.trim();

    return value;
  }

  /**
   * Get sanitized values from request
   */
  static getSanitizedData(request: FastifyRequest): {
    body?: any;
    query?: any;
    params?: any;
  } {
    const sanitizedReq = request as SanitizedRequest;
    return {
      body: sanitizedReq.sanitizedBody || request.body,
      query: sanitizedReq.sanitizedQuery || request.query,
      params: sanitizedReq.sanitizedParams || request.params
    };
  }

  /**
   * Check if request has sanitization warnings
   */
  static hasWarnings(request: FastifyRequest): boolean {
    const sanitizedReq = request as SanitizedRequest;
    return (sanitizedReq.sanitizationWarnings?.length || 0) > 0;
  }

  /**
   * Get sanitization warnings
   */
  static getWarnings(request: FastifyRequest): string[] {
    const sanitizedReq = request as SanitizedRequest;
    return sanitizedReq.sanitizationWarnings || [];
  }
}