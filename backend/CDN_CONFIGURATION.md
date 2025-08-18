# CDN Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [CloudFront Setup (AWS)](#cloudfront-setup-aws)
3. [Cloudflare Setup](#cloudflare-setup)
4. [Application Integration](#application-integration)
5. [Static Asset Optimization](#static-asset-optimization)
6. [Cache Management](#cache-management)
7. [Security Configuration](#security-configuration)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Troubleshooting](#troubleshooting)

## Overview

A Content Delivery Network (CDN) improves your application's performance by:
- Reducing latency for users worldwide
- Offloading static asset serving from your servers
- Providing DDoS protection
- Improving SEO through faster page loads
- Reducing bandwidth costs

## CloudFront Setup (AWS)

### 1. Create CloudFront Distribution

#### Step 1: Access CloudFront Console
1. Log into AWS Console
2. Navigate to CloudFront service
3. Click "Create Distribution"

#### Step 2: Configure Origin
```yaml
Origin Domain: your-domain.com
Origin Path: /static
Origin ID: reved-kids-static
Protocol: HTTPS Only
Minimum Origin SSL Protocol: TLSv1.2
```

#### Step 3: Configure Default Cache Behavior
```yaml
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS
Cached HTTP Methods: GET, HEAD
Cache Policy: CachingOptimized
Origin Request Policy: CORS-S3Origin
Response Headers Policy: CORS-CustomOrigin
Compress Objects Automatically: Yes
```

#### Step 4: Configure Cache Behaviors

**Static Assets (Images, CSS, JS)**
```yaml
Path Pattern: /static/*
Cache Policy: CachingOptimized
TTL: 1 year (31536000 seconds)
Headers to Cache: Accept-Encoding, Origin
```

**API Responses**
```yaml
Path Pattern: /api/*
Cache Policy: CachingDisabled
TTL: 0 seconds
Headers to Cache: Authorization, Content-Type
```

**Health Checks**
```yaml
Path Pattern: /health
Cache Policy: CachingDisabled
TTL: 0 seconds
```

### 2. CloudFront Functions

#### Security Headers Function
```javascript
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    // Security headers
    headers['strict-transport-security'] = {value: 'max-age=31536000; includeSubDomains; preload'};
    headers['x-frame-options'] = {value: 'DENY'};
    headers['x-content-type-options'] = {value: 'nosniff'};
    headers['x-xss-protection'] = {value: '1; mode=block'};
    headers['referrer-policy'] = {value: 'strict-origin-when-cross-origin'};
    headers['permissions-policy'] = {value: 'geolocation=(), microphone=(), camera=()'};
    
    // CORS headers for static assets
    if (event.request.uri.startsWith('/static/')) {
        headers['access-control-allow-origin'] = {value: '*'};
        headers['access-control-allow-methods'] = {value: 'GET, HEAD, OPTIONS'};
        headers['access-control-allow-headers'] = {value: 'Content-Type'};
        headers['access-control-max-age'] = {value: '86400'};
    }
    
    return response;
}
```

#### Cache Key Function
```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Add version parameter to cache key for static assets
    if (uri.startsWith('/static/')) {
        var querystring = request.querystring;
        querystring['v'] = {value: '1.0.0'}; // Version from your build
        request.querystring = querystring;
    }
    
    return request;
}
```

### 3. CloudFront Settings

#### General Settings
```yaml
Price Class: Use All Edge Locations
Alternate Domain Names (CNAMEs):
  - cdn.your-domain.com
  - static.your-domain.com
SSL Certificate: Request or Import Certificate
Default Root Object: index.html
Error Pages:
  404: /404.html
  500, 502, 503, 504: /50x.html
```

#### Security Settings
```yaml
WAF: Enable AWS WAF
Geo Restrictions: None (or restrict as needed)
Field-Level Encryption: Disabled
```

## Cloudflare Setup

### 1. Add Domain to Cloudflare

#### Step 1: Add Site
1. Log into Cloudflare
2. Click "Add a Site"
3. Enter your domain: `your-domain.com`
4. Select plan (Free plan works for basic needs)

#### Step 2: Configure DNS
```yaml
Type: A
Name: @
Content: YOUR_SERVER_IP
Proxy Status: Proxied

Type: CNAME
Name: cdn
Content: your-domain.com
Proxy Status: Proxied

Type: CNAME
Name: static
Content: your-domain.com
Proxy Status: Proxied
```

### 2. Configure Page Rules

#### Static Assets Rule
```yaml
URL Pattern: your-domain.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
  - Always Online: On
```

#### API Rule
```yaml
URL Pattern: your-domain.com/api/*
Settings:
  - Cache Level: Bypass
  - Security Level: High
  - Rate Limiting: On
```

### 3. Cloudflare Workers (Optional)

#### Static Asset Worker
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle static assets
  if (url.pathname.startsWith('/static/')) {
    // Add security headers
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    newResponse.headers.set('X-Content-Type-Options', 'nosniff')
    newResponse.headers.set('X-Frame-Options', 'DENY')
    
    return newResponse
  }
  
  return fetch(request)
}
```

## Application Integration

### 1. Environment Configuration

#### Update Environment Variables
```bash
# Add to your .env.production
CDN_URL=https://cdn.your-domain.com
STATIC_ASSETS_URL=https://static.your-domain.com
CDN_ENABLED=true
CDN_VERSION=1.0.0
```

### 2. Fastify Configuration

#### Static Asset Middleware
```javascript
// In your Fastify app
app.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/static/',
  decorateReply: false,
  setHeaders: (res, path) => {
    // Set cache headers for static assets
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Add version parameter for cache busting
    if (process.env.CDN_VERSION) {
      res.setHeader('X-Asset-Version', process.env.CDN_VERSION);
    }
  }
});
```

#### CDN URL Helper
```javascript
// Utility function to generate CDN URLs
export const getCdnUrl = (path: string): string => {
  if (!process.env.CDN_ENABLED || process.env.CDN_ENABLED !== 'true') {
    return path;
  }
  
  const cdnUrl = process.env.CDN_URL || process.env.STATIC_ASSETS_URL;
  if (!cdnUrl) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Add version parameter for cache busting
  const version = process.env.CDN_VERSION || '1.0.0';
  const separator = cleanPath.includes('?') ? '&' : '?';
  
  return `${cdnUrl}/${cleanPath}${separator}v=${version}`;
};
```

### 3. Frontend Integration

#### React Component for CDN Assets
```typescript
// components/CdnImage.tsx
import React from 'react';

interface CdnImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export const CdnImage: React.FC<CdnImageProps> = ({ 
  src, 
  alt, 
  className, 
  width, 
  height 
}) => {
  const getCdnUrl = (path: string): string => {
    const cdnUrl = process.env.REACT_APP_CDN_URL;
    if (!cdnUrl) return path;
    
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const version = process.env.REACT_APP_CDN_VERSION || '1.0.0';
    const separator = cleanPath.includes('?') ? '&' : '?';
    
    return `${cdnUrl}/${cleanPath}${separator}v=${version}`;
  };

  return (
    <img
      src={getCdnUrl(src)}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
    />
  );
};
```

#### Webpack Configuration
```javascript
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  // ... other config
  plugins: [
    new webpack.DefinePlugin({
      'process.env.REACT_APP_CDN_URL': JSON.stringify(process.env.REACT_APP_CDN_URL),
      'process.env.REACT_APP_CDN_VERSION': JSON.stringify(process.env.REACT_APP_CDN_VERSION),
    }),
  ],
  output: {
    // ... other output config
    publicPath: process.env.NODE_ENV === 'production' 
      ? (process.env.REACT_APP_CDN_URL || '/') 
      : '/',
  },
};
```

## Static Asset Optimization

### 1. Asset Versioning Strategy

#### Build-time Versioning
```javascript
// scripts/build-assets.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const generateAssetVersion = (filePath) => {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return hash.substring(0, 8);
};

const updateAssetReferences = () => {
  // Update CSS/JS files with versioned asset references
  const cssFiles = glob.sync('dist/static/css/*.css');
  const jsFiles = glob.sync('dist/static/js/*.js');
  
  // Add version parameters to asset URLs
  // Implementation details...
};
```

#### Runtime Versioning
```javascript
// In your application
const getAssetVersion = () => {
  return process.env.CDN_VERSION || 
         process.env.BUILD_VERSION || 
         new Date().getTime().toString();
};
```

### 2. Image Optimization

#### WebP Support
```javascript
// Middleware to serve WebP images when supported
app.addHook('onRequest', async (request, reply) => {
  const accept = request.headers.accept || '';
  const supportsWebP = accept.includes('image/webp');
  
  if (supportsWebP && request.url.includes('/static/images/')) {
    const webpPath = request.url.replace(/\.(jpg|jpeg|png)$/, '.webp');
    // Check if WebP version exists and serve it
  }
});
```

#### Responsive Images
```html
<!-- In your HTML templates -->
<picture>
  <source srcset="https://cdn.your-domain.com/static/images/hero.webp" type="image/webp">
  <source srcset="https://cdn.your-domain.com/static/images/hero.jpg" type="image/jpeg">
  <img src="https://cdn.your-domain.com/static/images/hero.jpg" alt="Hero image">
</picture>
```

### 3. Font Optimization

#### Font Loading Strategy
```css
/* In your CSS */
@font-face {
  font-family: 'YourFont';
  src: url('https://cdn.your-domain.com/static/fonts/your-font.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
  font-style: normal;
}
```

## Cache Management

### 1. Cache Invalidation Strategies

#### CloudFront Invalidation
```bash
#!/bin/bash
# scripts/invalidate-cdn.sh

CDN_DISTRIBUTION_ID="your-distribution-id"
PATHS="/static/css/* /static/js/* /static/images/*"

aws cloudfront create-invalidation \
  --distribution-id $CDN_DISTRIBUTION_ID \
  --paths $PATHS
```

#### Cloudflare Cache Purge
```bash
#!/bin/bash
# scripts/purge-cloudflare.sh

ZONE_ID="your-zone-id"
API_TOKEN="your-api-token"

curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 2. Cache Headers

#### Static Assets
```javascript
// Set appropriate cache headers
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
res.setHeader('ETag', generateETag(content));
res.setHeader('Last-Modified', lastModified);
```

#### API Responses
```javascript
// Cache API responses appropriately
res.setHeader('Cache-Control', 'private, max-age=300');
res.setHeader('Vary', 'Authorization, Accept-Encoding');
```

## Security Configuration

### 1. CORS Configuration

#### CloudFront CORS
```json
{
  "AllowedOrigins": ["https://your-domain.com", "https://www.your-domain.com"],
  "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 86400
}
```

#### Application CORS
```javascript
// In your Fastify app
app.register(require('@fastify/cors'), {
  origin: [
    'https://your-domain.com',
    'https://www.your-domain.com',
    'https://cdn.your-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['ETag'],
  maxAge: 86400
});
```

### 2. Security Headers

#### CloudFront Security Headers
```javascript
// CloudFront Function
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  
  // Security headers
  headers['strict-transport-security'] = {value: 'max-age=31536000; includeSubDomains; preload'};
  headers['x-frame-options'] = {value: 'DENY'};
  headers['x-content-type-options'] = {value: 'nosniff'};
  headers['x-xss-protection'] = {value: '1; mode=block'};
  headers['referrer-policy'] = {value: 'strict-origin-when-cross-origin'};
  headers['content-security-policy'] = {value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:;"};
  
  return response;
}
```

## Monitoring & Analytics

### 1. CloudFront Monitoring

#### CloudWatch Metrics
```yaml
Key Metrics to Monitor:
  - Requests: Total number of requests
  - Data Transfer: Bytes transferred
  - Error Rate: 4xx and 5xx errors
  - Cache Hit Ratio: Percentage of cache hits
  - Origin Latency: Time to fetch from origin
```

#### CloudWatch Alarms
```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "CDN-High-Error-Rate" \
  --alarm-description "High error rate in CloudFront distribution" \
  --metric-name "5xxError" \
  --namespace "AWS/CloudFront" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2
```

### 2. Real User Monitoring (RUM)

#### CloudFront RUM
```javascript
// Add RUM to your application
<script>
  (function(n,e,o,s,a,c,i){n[a]=n[a]||function(){(n[a].q=n[a].q||[]).push(arguments)};
  c=e.createElement(o),i=e.getElementsByTagName(o)[0];c.async=1;c.src=s;
  i.parentNode.insertBefore(c,i)})(window,document,"script",
  "https://your-rum-endpoint.com/rum.js","rum");
  
  rum("init", {
    applicationId: "your-application-id",
    applicationVersion: "1.0.0",
    applicationRegion: "us-east-1",
    guestRoleArn: "arn:aws:iam::123456789012:role/RUM-Monitoring-123456789012-123456789012-123456789012-Unauthorized",
    identityPoolId: "us-east-1:12345678-1234-1234-1234-123456789012",
    endpoint: "https://dataplane.rumregion.amazonaws.com",
    telemetries: ["errors", "performance", "http"]
  });
</script>
```

## Troubleshooting

### 1. Common Issues

#### Cache Not Working
```bash
# Check cache headers
curl -I https://cdn.your-domain.com/static/css/main.css

# Expected response:
# Cache-Control: public, max-age=31536000, immutable
# ETag: "abc123"
# Last-Modified: Wed, 21 Oct 2023 07:28:00 GMT
```

#### CORS Errors
```bash
# Test CORS preflight
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://cdn.your-domain.com/static/js/app.js
```

#### SSL Certificate Issues
```bash
# Check SSL certificate
openssl s_client -connect cdn.your-domain.com:443 -servername cdn.your-domain.com

# Verify certificate chain
openssl x509 -in /path/to/certificate.pem -text -noout
```

### 2. Debugging Tools

#### CloudFront Debug Headers
```bash
# Add debug headers to see cache behavior
curl -H "X-Amz-Cf-Id: debug" https://cdn.your-domain.com/static/css/main.css
```

#### Cloudflare Debug
```bash
# Check Cloudflare cache status
curl -I https://your-domain.com/static/css/main.css

# Look for headers:
# CF-Cache-Status: HIT
# CF-Ray: 1234567890abcdef
```

### 3. Performance Testing

#### Load Testing
```bash
# Test CDN performance
ab -n 1000 -c 10 https://cdn.your-domain.com/static/css/main.css

# Test origin vs CDN
ab -n 100 -c 10 https://your-domain.com/static/css/main.css
ab -n 100 -c 10 https://cdn.your-domain.com/static/css/main.css
```

#### Geographic Testing
```bash
# Test from different locations
curl -w "@curl-format.txt" -o /dev/null -s https://cdn.your-domain.com/static/css/main.css
```

---

## Best Practices

1. **Always use HTTPS** for CDN endpoints
2. **Implement proper cache headers** for different content types
3. **Use versioning** for cache busting instead of cache invalidation
4. **Monitor performance** and error rates regularly
5. **Test from multiple locations** to ensure global performance
6. **Implement fallbacks** for when CDN is unavailable
7. **Use appropriate compression** for different file types
8. **Regularly update SSL certificates** and security configurations
9. **Monitor costs** and optimize usage patterns
10. **Document your CDN configuration** for team reference

---

## Cost Optimization

1. **Choose appropriate price class** for your user base
2. **Use compression** to reduce bandwidth costs
3. **Implement proper caching** to reduce origin requests
4. **Monitor usage patterns** and adjust accordingly
5. **Consider regional restrictions** if not serving globally
6. **Use appropriate storage classes** for different content types
7. **Regularly review and clean up** unused distributions
8. **Implement cost alerts** to monitor spending 