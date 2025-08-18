import type { Config } from 'drizzle-kit';
import { config } from './src/config/config';

const dbConfig = config;

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: dbConfig.DB_HOST,
    port: dbConfig.DB_PORT,
    user: dbConfig.DB_USER,
    password: dbConfig.DB_PASSWORD,
    database: dbConfig.DB_NAME,
  },
} satisfies Config;
