# Security Documentation

This document provides comprehensive information about the security features implemented in the FastRevedKids backend application.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Input Sanitization](#input-sanitization)
3. [CSRF Protection](#csrf-protection)
4. [Enhanced Rate Limiting](#enhanced-rate-limiting)
5. [CORS Configuration](#cors-configuration)
6. [Security Headers](#security-headers)
7. [Security Audit System](#security-audit-system)
8. [Security Testing](#security-testing)
9. [Best Practices](#best-practices)
10. [Configuration Examples](#configuration-examples)

## Security Overview

The FastRevedKids backend implements a comprehensive security framework designed to protect against common web application vulnerabilities and attacks. The security system includes multiple layers of protection:

- **Input Sanitization**: Protects against XSS, SQL injection, NoSQL injection, command injection, and path traversal attacks
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Rate Limiting**: Multi-layered rate limiting with behavioral analysis and penalty system
- **CORS Configuration**: Production-ready CORS configuration with dynamic origin validation
- **Security Headers**: Comprehensive security headers including CSP, HSTS, and frame protection
- **Security Audit**: Real-time security incident logging and monitoring

## Input Sanitization

### Overview

The Input Sanitization middleware provides comprehensive protection against various injection attacks by sanitizing all incoming request data.

### Features

- **XSS Protection**: Removes malicious scripts, event handlers, and javascript: URLs
- **SQL Injection Protection**: Detects and removes SQL injection patterns
- **NoSQL Injection Protection**: Protects against MongoDB operator injection
- **Command Injection Protection**: Removes shell command injection patterns
- **Path Traversal Protection**: Prevents directory traversal attacks
- **Context-Aware Validation**: Applies specific validation rules based on data context

### Configuration

```typescript
import { InputSanitizationService } from './middleware/input-sanitization.middleware';

const sanitizationService = new InputSanitizationService({
  skipRoutes: ['/api/upload', '/api/webhook'],
  skipMethods: ['GET', 'HEAD', 'OPTIONS'],
  allowHtml: false,
  maxLength: {
    string: 1000,
    email: 254,
    url: 2048,
    text: 10000
  },
  customSanitizers: {
    'password': (value) => value, // Skip sanitization for passwords
    'creditCard': (value) => value.replace(/[^0-9\s-]/g, '')
  }
});

// Register middleware
fastify.addHook('preHandler', sanitizationService.sanitizationMiddleware.bind(sanitizationService));
```

### Usage

```typescript
// Access sanitized data in route handlers
fastify.post('/api/users', async (request, reply) => {
  const { body, query, params } = InputSanitizationService.getSanitizedData(request);
  
  // Check for sanitization warnings
  if (InputSanitizationService.hasWarnings(request)) {
    const warnings = InputSanitizationService.getWarnings(request);
    request.log.warn('Input sanitization warnings', { warnings });
  }
  
  // Use sanitized data
  const user = await createUser(body);
  return user;
});
```

## CSRF Protection

### Overview

CSRF (Cross-Site Request Forgery) protection prevents unauthorized commands from being transmitted from a user that the application trusts.

### Features

- **Token-based Protection**: Cryptographically secure tokens with salt and HMAC
- **User Context Validation**: Tokens bound to specific users and sessions
- **Flexible Token Sources**: Tokens can be provided via headers, body, cookies, or query parameters
- **Automatic Cleanup**: Expired tokens are automatically removed
- **Route Exemptions**: Certain routes can be exempted from CSRF protection

### Configuration

```typescript
import { CSRFProtectionService } from './services/csrf-protection.service';

const csrfService = new CSRFProtectionService({
  secretLength: 32,
  tokenLength: 32,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  skipRoutes: ['/api/health', '/api/metrics'],
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Register middleware
fastify.addHook('preHandler', csrfService.createMiddleware());
```

### Usage

```typescript
// Get CSRF token endpoint
fastify.get('/api/csrf-token', csrfService.getTokenEndpoint.bind(csrfService));

// Frontend usage
const response = await fetch('/api/csrf-token');
const { token } = await response.json();

// Include token in subsequent requests
await fetch('/api/protected-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(data)
});
```

## Enhanced Rate Limiting

### Overview

The Enhanced Rate Limiting service provides multi-layered protection against abuse and DoS attacks with advanced features like behavioral analysis and penalty systems.

### Features

- **Multi-Layer Limiting**: Global, per-IP, per-user, and geographic rate limits
- **Behavioral Analysis**: Detects suspicious patterns and bot-like behavior
- **Penalty System**: Temporarily blocks IPs that exceed suspicious behavior thresholds
- **Custom Rules Engine**: Define custom rate limiting rules for specific conditions
- **Premium User Support**: Different limits for premium/admin users
- **Geographic Restrictions**: Country-specific rate limits

### Configuration

```typescript
import { EnhancedRateLimitingService } from './services/enhanced-rate-limiting.service';

const rateLimitService = new EnhancedRateLimitingService({
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // Global limit
  },
  perUser: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    premium: { max: 500 } // Higher limit for premium users
  },
  perIP: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  geoLimits: {
    'CN': { windowMs: 60000, max: 10, reason: 'High risk country' },
    'RU': { windowMs: 60000, max: 10, reason: 'High risk country' }
  },
  customRules: [{
    id: 'auth-strict',
    name: 'Authentication endpoint protection',
    condition: (request) => request.url.includes('/auth/'),
    limit: { windowMs: 60000, max: 5 },
    action: 'block',
    priority: 1,
    enabled: true
  }],
  allowlist: ['127.0.0.1', '10.0.0.0/8'],
  exemptUserRoles: ['admin', 'system'],
  enableBehavioralAnalysis: true,
  enablePenalties: true,
  suspiciousThreshold: 50
});

// Register middleware
fastify.addHook('preHandler', rateLimitService.createMiddleware());
```

### Usage

```typescript
// Monitor rate limiting statistics
fastify.get('/api/admin/rate-limit-stats', async (request, reply) => {
  const stats = rateLimitService.getStats();
  return stats;
});

// Manually block/unblock IPs
fastify.post('/api/admin/block-ip', async (request, reply) => {
  const { ip, duration } = request.body;
  rateLimitService.blockIP(ip, duration);
  return { success: true };
});

fastify.post('/api/admin/unblock-ip', async (request, reply) => {
  const { ip } = request.body;
  rateLimitService.unblockIP(ip);
  return { success: true };
});
```

## CORS Configuration

### Overview

The CORS configuration provides production-ready Cross-Origin Resource Sharing settings with dynamic origin validation and security features.

### Features

- **Dynamic Origin Validation**: Runtime validation with subdomain pattern support
- **Environment-Specific Configuration**: Different settings for development and production
- **Security Monitoring**: Origin/referer mismatch detection
- **Admin Endpoints**: Dynamic origin management for administrators
- **Preflight Rate Limiting**: Enhanced security for OPTIONS requests

### Configuration

```typescript
import corsPlugin from './plugins/cors';

// Register enhanced CORS plugin
await fastify.register(corsPlugin);

// The plugin automatically configures CORS based on environment variables:
// CORS_ORIGIN=https://myapp.com,https://api.myapp.com,*.myapp.com
```

### Environment Variables

```bash
# Production CORS configuration
CORS_ORIGIN=https://myapp.com,https://www.myapp.com,*.myapp.com
NODE_ENV=production

# Development CORS configuration (more permissive)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
NODE_ENV=development
```

## Security Headers

### Overview

The Security Headers middleware implements comprehensive HTTP security headers to protect against various client-side attacks.

### Features

- **Content Security Policy (CSP)**: Prevents XSS and data injection attacks
- **HTTP Strict Transport Security (HSTS)**: Enforces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type confusion
- **Referrer Policy**: Controls referrer information disclosure
- **Permissions Policy**: Controls browser feature access
- **Cross-Origin Policies**: Controls cross-origin resource sharing

### Configuration

```typescript
import { SecurityHeadersService } from './middleware/security-headers.middleware';

const securityHeadersService = new SecurityHeadersService({
  csp: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'strict-dynamic'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:"],
      'connect-src': ["'self'", "wss://websocket.myapp.com"]
    },
    useNonce: true,
    reportOnly: process.env.NODE_ENV === 'development'
  },
  hsts: {
    enabled: process.env.NODE_ENV === 'production',
    maxAge: 31536000, // 1 year
    includeSubdomains: true,
    preload: true
  },
  frameOptions: {
    enabled: true,
    policy: 'DENY'
  },
  routeOverrides: {
    '/api/embed': {
      frameOptions: { policy: 'SAMEORIGIN' }
    }
  }
});

// Register middleware
fastify.addHook('preHandler', securityHeadersService.createMiddleware());
```

### Development vs Production

```typescript
// Development configuration (more permissive)
const devConfig = SecurityHeadersService.createDevelopmentConfig();

// Production configuration (strict security)
const prodConfig = SecurityHeadersService.createProductionConfig();

const service = new SecurityHeadersService(
  process.env.NODE_ENV === 'production' ? prodConfig : devConfig
);
```

## Security Audit System

### Overview

The Security Audit System provides comprehensive logging, monitoring, and alerting for security incidents.

### Features

- **Incident Classification**: Categorizes incidents by type, severity, and component
- **Real-time Monitoring**: Tracks security events in real-time
- **Threat Intelligence**: IP reputation and behavioral analysis
- **Alerting System**: Configurable thresholds for automatic alerts
- **Reporting**: Generate security reports and metrics
- **Data Retention**: Configurable retention policies

### Configuration

```typescript
import { SecurityAuditService, SecurityIncidentType, SecuritySeverity, SecurityComponent } from './services/security-audit.service';

const auditService = new SecurityAuditService({
  logToFile: true,
  logDirectory: './logs/security',
  enableRealTimeAlerts: true,
  alertThresholds: {
    [SecurityIncidentType.XSS_ATTEMPT]: { count: 5, timeWindow: 5 * 60 * 1000 },
    [SecurityIncidentType.SQL_INJECTION]: { count: 3, timeWindow: 5 * 60 * 1000 },
    [SecurityIncidentType.BRUTE_FORCE]: { count: 10, timeWindow: 10 * 60 * 1000 }
  },
  retentionDays: 90,
  enableMetrics: true
});
```

### Usage

```typescript
// Log security incidents
await auditService.logIncident(
  SecurityIncidentType.XSS_ATTEMPT,
  SecuritySeverity.HIGH,
  SecurityComponent.INPUT_SANITIZATION,
  request,
  {
    description: 'XSS attempt detected in user input',
    payload: request.body,
    blocked: true
  }
);

// Generate security reports
fastify.get('/api/admin/security-report', async (request, reply) => {
  const timeRange = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  };
  
  const report = auditService.generateReport(timeRange);
  return report;
});

// Check if IP is suspicious
const isSuspicious = auditService.isIPSuspicious(request.ip);
if (isSuspicious) {
  // Apply additional security measures
}
```

## Security Testing

### Overview

Comprehensive test suites validate the security implementations and ensure proper protection against various attack vectors.

### Test Coverage

- **Input Sanitization Tests**: XSS, SQL injection, NoSQL injection, command injection, path traversal
- **CSRF Protection Tests**: Token generation, validation, middleware protection
- **Rate Limiting Tests**: Multiple layers, behavioral analysis, penalty system
- **Security Headers Tests**: All security headers, CSP nonces, route overrides
- **Security Audit Tests**: Incident logging, metrics, reporting, alerting

### Running Tests

```bash
# Run all security tests
npm test src/tests/security/

# Run specific security test suites
npm test src/tests/security/input-sanitization.test.ts
npm test src/tests/security/csrf-protection.test.ts
npm test src/tests/security/rate-limiting.test.ts
npm test src/tests/security/security-headers.test.ts
npm test src/tests/security/security-audit.test.ts

# Run tests with coverage
npm run test:coverage
```

## Best Practices

### 1. Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
JWT_SECRET=your-very-secure-jwt-secret-minimum-32-characters
ENCRYPTION_KEY=your-very-secure-encryption-key-minimum-32-characters
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Security Middleware Order

```typescript
// Register security middleware in correct order
fastify.addHook('preHandler', rateLimitService.createMiddleware());
fastify.addHook('preHandler', securityHeadersService.createMiddleware());
fastify.addHook('preHandler', sanitizationService.sanitizationMiddleware.bind(sanitizationService));
fastify.addHook('preHandler', csrfService.createMiddleware());
```

### 3. Security Monitoring

```typescript
// Set up security monitoring
fastify.addHook('onRequest', async (request, reply) => {
  // Log suspicious patterns
  if (request.headers['user-agent']?.includes('bot') && !request.url.includes('/robots.txt')) {
    await auditService.logIncident(
      SecurityIncidentType.BOT_DETECTED,
      SecuritySeverity.LOW,
      SecurityComponent.MONITORING,
      request,
      { description: 'Potential bot detected' }
    );
  }
});
```

### 4. Error Handling

```typescript
// Secure error handling
fastify.setErrorHandler(async (error, request, reply) => {
  // Log security-related errors
  if (error.statusCode === 403 || error.statusCode === 429) {
    await auditService.logIncident(
      SecurityIncidentType.SUSPICIOUS_REQUEST,
      SecuritySeverity.MEDIUM,
      SecurityComponent.FIREWALL,
      request,
      {
        description: `Request blocked: ${error.message}`,
        response: { status: error.statusCode, blocked: true }
      }
    );
  }
  
  // Don't expose internal errors
  if (error.statusCode >= 500) {
    reply.status(500).send({ error: 'Internal Server Error' });
  } else {
    reply.status(error.statusCode || 400).send({ error: error.message });
  }
});
```

## Configuration Examples

### Development Configuration

```typescript
// config/security.development.ts
export const developmentSecurityConfig = {
  inputSanitization: {
    skipRoutes: ['/api/dev'],
    allowHtml: true // More permissive for development
  },
  csrf: {
    cookieOptions: {
      secure: false, // HTTP allowed in development
      sameSite: 'lax'
    }
  },
  rateLimit: {
    global: { max: 10000 }, // Higher limits for development
    perIP: { max: 1000 }
  },
  securityHeaders: SecurityHeadersService.createDevelopmentConfig(),
  audit: {
    enableRealTimeAlerts: false, // Reduce noise in development
    logToFile: false
  }
};
```

### Production Configuration

```typescript
// config/security.production.ts
export const productionSecurityConfig = {
  inputSanitization: {
    allowHtml: false,
    maxLength: {
      string: 500, // Stricter limits
      text: 5000
    }
  },
  csrf: {
    cookieOptions: {
      secure: true, // HTTPS only
      sameSite: 'strict'
    }
  },
  rateLimit: {
    global: { max: 1000 },
    perIP: { max: 100 },
    enablePenalties: true,
    geoLimits: {
      'CN': { max: 10 },
      'RU': { max: 10 }
    }
  },
  securityHeaders: SecurityHeadersService.createProductionConfig(),
  audit: {
    enableRealTimeAlerts: true,
    logToFile: true,
    alertThresholds: {
      [SecurityIncidentType.XSS_ATTEMPT]: { count: 3, timeWindow: 300000 }
    }
  }
};
```

### High-Security Configuration

```typescript
// config/security.high-security.ts
export const highSecurityConfig = {
  inputSanitization: {
    allowHtml: false,
    maxLength: {
      string: 200, // Very strict limits
      text: 1000
    }
  },
  rateLimit: {
    global: { max: 500 },
    perIP: { max: 50 },
    perUser: { max: 25 },
    enablePenalties: true,
    penaltyMultiplier: 5, // Harsh penalties
    customRules: [{
      id: 'strict-auth',
      condition: (req) => req.url.includes('/auth/'),
      limit: { max: 3, windowMs: 300000 }, // Very strict auth limits
      action: 'block'
    }]
  },
  securityHeaders: {
    ...SecurityHeadersService.createProductionConfig(),
    csp: {
      enabled: true,
      reportOnly: false,
      directives: {
        'default-src': ["'none'"], // Very restrictive CSP
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"],
        'connect-src': ["'self'"]
      }
    }
  }
};
```

---

For more information or security concerns, please contact the development team or refer to the individual component documentation in their respective files.