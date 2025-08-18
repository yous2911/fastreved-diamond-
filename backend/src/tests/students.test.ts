// src/tests/students.test.ts - Complete student route testing
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from './setup';

describe('Students Routes', () => {
  let authToken: string;
  const studentId = 1;

  beforeEach(async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        prenom: 'Alice',
        nom: 'Dupont'
      }
    });
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.data.token;
  });

  describe('GET /api/students/:id', () => {
    it('should get student data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.prenom).toBe('Alice');
      expect(data.data.id).toBe(studentId);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should prevent access to other students', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/students/999',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });

    it('should validate student ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/students/invalid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/students/:id/recommendations', () => {
    it('should get exercise recommendations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}/recommendations?limit=5`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    it('should handle limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}/recommendations?limit=3`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBeLessThanOrEqual(3);
    });

    it('should validate limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}/recommendations?limit=invalid`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/students/:id/attempts', () => {
    it('should submit exercise attempt', async () => {
      const attempt = {
        exerciseId: 1,
        attempt: {
          reponse: 'Test answer',
          reussi: true,
          tempsSecondes: 30,
          aidesUtilisees: 0
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/students/${studentId}/attempts`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: attempt
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.pointsGagnes).toBeGreaterThanOrEqual(0);
    });

    it('should validate attempt data', async () => {
      const invalidAttempt = {
        exerciseId: 1,
        attempt: {
          reponse: '',
          reussi: 'invalid',
          tempsSecondes: -1
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/students/${studentId}/attempts`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: invalidAttempt
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/students/${studentId}/attempts`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/students/:id/progress', () => {
    it('should get student progress', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}/progress`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter by exercise IDs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/students/${studentId}/progress?exercices=1,2,3`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });
});
