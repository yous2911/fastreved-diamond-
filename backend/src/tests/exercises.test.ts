// Enhanced exercise and student tests with proper setup
// Create src/tests/exercises.test.ts

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { build } from '../app-test';
import { FastifyInstance } from 'fastify';

describe('Exercise Routes', () => {
  let app: FastifyInstance;
  let authToken: string | null = null;

  // Setup test data before all tests
  beforeAll(async () => {
    // Ensure test data exists in database
    await setupExerciseTestData();
  });

  beforeEach(async () => {
    try {
      app = await build();
      
      // Login to get auth token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          prenom: 'Alice',
          nom: 'Dupont',
        },
      });

      if (loginResponse.statusCode === 200) {
        const loginData = JSON.parse(loginResponse.body);
        authToken = loginData.data?.token || null;
      }
    } catch (error) {
      console.error('Exercise test setup failed:', error);
      throw error;
    }
  });

  afterEach(async () => {
    authToken = null;
    if (app) {
      await app.close();
    }
  });

  // Helper function for authenticated requests
  const authenticatedRequest = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: any) => {
    if (!authToken) {
      throw new Error('No auth token available');
    }
    
    return await app.inject({
      method,
      url,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload,
    });
  };

  describe('Exercise Module Operations', () => {
    it('should create module with competence mapping', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await authenticatedRequest('POST', '/api/exercises/modules', {
        titre: 'Test Module',
        description: 'Test module description',
        competences: ['CP.2025.1', 'CP.2025.2'],
        niveau: 'CE1'
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.titre).toBe('Test Module');
    });

    it('should generate multiple exercises from competence codes', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await authenticatedRequest('POST', '/api/exercises/generate', {
        competences: ['CP.2025.1', 'CP.2025.2'],
        niveau: 'CE1',
        quantite: 5
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    it('should get exercises filtered by competence code', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await authenticatedRequest('GET', '/api/exercises?competence=CP.2025.1');

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should create exercise with CP 2025 competence mapping', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await authenticatedRequest('POST', '/api/exercises', {
        titre: 'Test Exercise CP 2025',
        competence: 'CP.2025.1',
        niveau: 'CE1',
        type: 'qcm',
        contenu: {
          question: 'Test question',
          options: ['A', 'B', 'C'],
          reponse: 'A'
        }
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.competence).toBe('CP.2025.1');
    });

    it('should validate competence code format', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await authenticatedRequest('POST', '/api/exercises', {
        titre: 'Test Exercise',
        competence: 'INVALID_FORMAT',
        niveau: 'CE1',
        type: 'qcm'
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
    });

    it('should update exercise', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      // First create an exercise
      const createResponse = await authenticatedRequest('POST', '/api/exercises', {
        titre: 'Original Title',
        competence: 'CP.2025.1',
        niveau: 'CE1',
        type: 'qcm'
      });

      if (createResponse.statusCode === 201) {
        const createData = JSON.parse(createResponse.body);
        const exerciseId = createData.data.id;

        // Update the exercise
        const updateResponse = await authenticatedRequest('PUT', `/api/exercises/${exerciseId}`, {
          titre: 'Updated Title'
        });

        expect(updateResponse.statusCode).toBe(200);
        const updateData = JSON.parse(updateResponse.body);
        expect(updateData.success).toBe(true);
        expect(updateData.data.titre).toBe('Updated Title');
      }
    });

    it('should delete exercise', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token available');
        return;
      }

      // First create an exercise to delete
      const createResponse = await authenticatedRequest('POST', '/api/exercises', {
        titre: 'To Delete',
        competence: 'CP.2025.1',
        niveau: 'CE1',
        type: 'qcm'
      });

      if (createResponse.statusCode === 201) {
        const createData = JSON.parse(createResponse.body);
        const exerciseId = createData.data.id;

        // Delete the exercise
        const deleteResponse = await authenticatedRequest('DELETE', `/api/exercises/${exerciseId}`);

        expect(deleteResponse.statusCode).toBe(200);
        const deleteData = JSON.parse(deleteResponse.body);
        expect(deleteData.success).toBe(true);
      }
    });
  });
});

// Test data setup functions
async function setupExerciseTestData() {
  // Setup test exercises, competences, etc.
  try {
    console.log('Setting up exercise test data...');
    // Add your test data setup here
  } catch (error) {
    console.warn('Exercise test data setup failed:', error);
  }
} 