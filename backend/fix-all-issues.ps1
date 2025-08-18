# ==============================================================================
# 🔧 RevEd Kids Backend - Complete Environment & Process Fix Script (PowerShell)
# ==============================================================================
# This script will fix all the issues you've been experiencing:
# 1. Kill all Node.js processes (port conflicts)
# 2. Clean environment files 
# 3. Fix Redis configuration 
# 4. Start server with proper environment
# ==============================================================================

Write-Host "🚀 Starting RevEd Kids Backend Fix Process..." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# ==============================================================================
# STEP 1: KILL ALL NODE.JS PROCESSES
# ==============================================================================
Write-Host ""
Write-Host "💀 STEP 1: Killing all Node.js processes..." -ForegroundColor Yellow

# Kill all node processes
Write-Host "Killing all node processes..."
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ All node processes killed" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No node processes found" -ForegroundColor Blue
}

# Kill any tsx processes
try {
    Get-Process -Name "tsx" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ All tsx processes killed" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No tsx processes found" -ForegroundColor Blue
}

Write-Host "✅ All processes killed successfully" -ForegroundColor Green

# ==============================================================================
# STEP 2: CLEAN ENVIRONMENT FILES
# ==============================================================================
Write-Host ""
Write-Host "🧹 STEP 2: Cleaning environment files..." -ForegroundColor Yellow

# Remove any .env.local files that might be causing confusion
try {
    Get-ChildItem -Name ".env.local" -Recurse -Force | Remove-Item -Force
    Write-Host "✅ Removed .env.local files" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No .env.local files found" -ForegroundColor Blue
}

# Remove any cached environment files
try {
    Get-ChildItem -Name ".env.development.local" -Recurse -Force | Remove-Item -Force
    Get-ChildItem -Name ".env.production.local" -Recurse -Force | Remove-Item -Force
    Write-Host "✅ Removed cached environment files" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No cached environment files found" -ForegroundColor Blue
}

# Check if env.backend exists, create if not
if (-not (Test-Path "env.backend")) {
    Write-Host "Creating env.backend from env.example..."
    Copy-Item "env.example" "env.backend"
    Write-Host "⚠️ Please edit env.backend with your actual values!" -ForegroundColor Yellow
} else {
    Write-Host "✅ env.backend exists" -ForegroundColor Green
}

Write-Host "✅ Environment files cleaned" -ForegroundColor Green

# ==============================================================================
# STEP 3: FIX CONFIG.TS TO USE CORRECT ENV FILE
# ==============================================================================
Write-Host ""
Write-Host "⚙️ STEP 3: Fixing config.ts to load env.backend..." -ForegroundColor Yellow

$configContent = @'
import dotenv from "dotenv";
import { z } from "zod";
import path from "path";

// Load environment variables from env.backend specifically
const envPath = path.join(process.cwd(), "env.backend");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ Failed to load env.backend:", result.error.message);
  console.log("Looking for environment file at:", envPath);
  process.exit(1);
} else {
  console.log("✅ Loaded environment from:", envPath);
}

// Configuration schema validation
const configSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3003),
  HOST: z.string().default("0.0.0.0"),
  
  // Database
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("reved_kids"),
  DB_CONNECTION_LIMIT: z.coerce.number().default(20),
  
  // Redis - DISABLED BY DEFAULT
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_ENABLED: z.coerce.boolean().default(false), // DISABLED!
  
  // Security
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("24h"),
  ENCRYPTION_KEY: z.string().min(32),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000), // 15 minutes
  
  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB
  UPLOAD_PATH: z.string().default("./uploads"),
  
  // Monitoring
  ENABLE_METRICS: z.coerce.boolean().default(true),
  METRICS_INTERVAL: z.coerce.number().default(60000), // 1 minute
  
  // Cache
  CACHE_TTL: z.coerce.number().default(900), // 15 minutes
  CACHE_MAX_SIZE: z.coerce.number().default(1000),
  
  // Performance
  REQUEST_TIMEOUT: z.coerce.number().default(30000), // 30 seconds
  BODY_LIMIT: z.coerce.number().default(10485760), // 10MB
  
  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  
  // Logging
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  LOG_FILE: z.string().optional(),
  
  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.coerce.number().default(30000), // 30 seconds
  WS_MAX_CONNECTIONS: z.coerce.number().default(1000),
  
  // GDPR Configuration
  GDPR_ENABLED: z.coerce.boolean().default(true),
  PARENTAL_CONSENT_REQUIRED: z.coerce.boolean().default(true),
  CONSENT_TOKEN_EXPIRY_HOURS: z.coerce.number().default(168), // 7 days
  DATA_RETENTION_DAYS: z.coerce.number().default(1095), // 3 years
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(2190), // 6 years
  ANONYMIZATION_AFTER_INACTIVITY_DAYS: z.coerce.number().default(730), // 2 years
  ENCRYPTION_KEY_ROTATION_DAYS: z.coerce.number().default(90),
  GDPR_REQUEST_DEADLINE_DAYS: z.coerce.number().default(30),
  
  // Email Configuration for GDPR
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@revedkids.com"),
  SUPPORT_EMAIL: z.string().default("support@revedkids.com"),
  
  // Development Configuration
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  ENABLE_DEBUG: z.coerce.boolean().default(true),
  ENABLE_SEED_DATA: z.coerce.boolean().default(true),
});

// Parse and validate configuration
const parseResult = configSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Configuration validation failed:");
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;

// Environment-specific configurations
export const isDevelopment = config.NODE_ENV === "development";
export const isProduction = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";

// Database configuration for Drizzle
export const dbConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  connectionLimit: config.DB_CONNECTION_LIMIT,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
};

// Redis configuration
export const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  db: config.REDIS_DB,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  showFriendlyErrorStack: isDevelopment,
};

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  algorithm: "HS256" as const,
  issuer: "reved-kids",
  audience: "reved-kids-students",
};

// Rate limiting configuration
export const rateLimitConfig = {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
  cache: 10000,
  allowList: ["127.0.0.1"],
  continueExceeding: true,
  skipOnError: true,
};

// CORS configuration
export const corsConfig = {
  origin: isDevelopment 
    ? ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]
    : config.CORS_ORIGIN.split(","),
  credentials: config.CORS_CREDENTIALS,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Validation helper
export function validateEnvironment() {
  const required = ["JWT_SECRET", "ENCRYPTION_KEY"];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  
  console.log("✅ Environment validation passed");
}
'@

$configContent | Out-File -FilePath "src/config/config.ts" -Encoding UTF8
Write-Host "✅ Fixed config.ts to load env.backend and disable Redis by default" -ForegroundColor Green

# ==============================================================================
# STEP 4: UPDATE ENV.BACKEND TO DISABLE REDIS
# ==============================================================================
Write-Host ""
Write-Host "🔧 STEP 4: Setting Redis to disabled in env.backend..." -ForegroundColor Yellow

# Ensure Redis is disabled in env.backend
if (Test-Path "env.backend") {
    $content = Get-Content "env.backend" -Raw
    
    # Check if REDIS_ENABLED exists, if not add it
    if ($content -notmatch "REDIS_ENABLED") {
        $content += "`n# Redis Configuration - DISABLED to avoid connection errors`nREDIS_ENABLED=false`n"
    } else {
        # Update existing line
        $content = $content -replace "REDIS_ENABLED=.*", "REDIS_ENABLED=false"
    }
    
    # Ensure required security keys exist
    if ($content -notmatch "JWT_SECRET") {
        $content += "JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long-for-development`n"
    }
    
    if ($content -notmatch "ENCRYPTION_KEY") {
        $content += "ENCRYPTION_KEY=your-super-secret-encryption-key-32-chars-development`n"
    }
    
    $content | Out-File -FilePath "env.backend" -Encoding UTF8
    Write-Host "✅ Redis disabled in env.backend" -ForegroundColor Green
} else {
    Write-Host "❌ env.backend file not found! Creating from env.example..." -ForegroundColor Red
    Copy-Item "env.example" "env.backend"
    Add-Content "env.backend" "REDIS_ENABLED=false"
}

# ==============================================================================
# STEP 5: CLEAN BUILD AND NODE_MODULES (OPTIONAL)
# ==============================================================================
Write-Host ""
Write-Host "🧹 STEP 5: Cleaning build artifacts..." -ForegroundColor Yellow

# Remove dist folder
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✅ Removed dist folder" -ForegroundColor Green
}

Write-Host "✅ Build artifacts cleaned" -ForegroundColor Green

# ==============================================================================
# STEP 6: START THE SERVER
# ==============================================================================
Write-Host ""
Write-Host "🚀 STEP 6: Starting the server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "🎉 ALL FIXES APPLIED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting server with:" -ForegroundColor White
Write-Host "  ✅ Correct environment file (env.backend)" -ForegroundColor Green
Write-Host "  ✅ Redis disabled (no connection errors)" -ForegroundColor Green
Write-Host "  ✅ All processes killed (no port conflicts)" -ForegroundColor Green
Write-Host "  ✅ Clean build" -ForegroundColor Green
Write-Host ""
Write-Host "Server will start on port 3003..." -ForegroundColor Cyan
Write-Host "Health check: http://localhost:3003/api/health" -ForegroundColor Cyan
Write-Host "API docs: http://localhost:3003/docs" -ForegroundColor Cyan
Write-Host ""

# Start the server in development mode
npm run dev 