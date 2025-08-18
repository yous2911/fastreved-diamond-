// src/tests/setup.ts - Test setup and configuration
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../app-test';
import { setupDatabase } from '../db/setup';
import type { FastifyInstance } from 'fastify';

export let app: FastifyInstance;

beforeAll(async () => {
  // Initialize test database first
  await setupDatabase();
  
  // Then build the app
  app = await build();
  await app.ready();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});
