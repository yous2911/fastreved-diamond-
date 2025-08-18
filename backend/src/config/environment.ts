import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from env.backend specifically
const envPath = path.join(process.cwd(), 'env.backend');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load env.backend:', result.error.message);
  console.log('Looking for environment file at:', envPath);
  process.exit(1);
} else {
  console.log('✅ Loaded environment from:', envPath);
}

// Define interfaces with proper optional handling
interface RedisConfig {
  host?: string;
  port?: number;
  password?: string | undefined;
  maxRetriesPerRequest?: number | undefined;
  retryDelayOnFailover?: number | undefined;
  db?: number;
}

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

// Environment schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3003'),
  
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('reved_kids'),
  DB_SSL: z.string().optional(),
  
  // Redis
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().transform(Number).optional(),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().default('your-default-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

const env = envSchema.parse(process.env);

// Export configurations
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

export const dbConfig: DatabaseConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL === 'true',
};

export const redisConfig: RedisConfig = {
  ...(env.REDIS_HOST && { host: env.REDIS_HOST }),
  ...(env.REDIS_PORT && { port: env.REDIS_PORT }),
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  db: 0,
};

export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
};

// Health check configuration
export const healthConfig = {
  database: {
    timeout: 5000,
    retries: 3,
  },
  redis: {
    timeout: 3000,
    retries: 2,
  },
};
