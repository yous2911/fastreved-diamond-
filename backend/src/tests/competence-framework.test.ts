import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CompetenceFrameworkService } from '../services/CompetenceFrameworkService';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve())
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    })),
    studentProgress: {
      id: 'id',
      studentId: 'studentId',
      competenceCode: 'competenceCode',
      progressPercent: 'progressPercent',
      masteryLevel: 'masteryLevel',
      totalAttempts: 'totalAttempts',
      successfulAttempts: 'successfulAttempts',
      averageScore: 'averageScore',
      totalTimeSpent: 'totalTimeSpent',
      lastAttemptAt: 'lastAttemptAt',
      masteredAt: 'masteredAt',
      needsReview: 'needsReview',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    competencePrerequisites: {
      competenceCode: 'competenceCode',
      prerequisiteCode: 'prerequisiteCode',
      weight: 'weight'
    }
  }
}));

describe('CompetenceFrameworkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getCompetencesByLevel', () => {
    it('should return CP competences', () => {
      const competences = CompetenceFrameworkService.getCompetencesByLevel('CP');
      
      expect(competences).toBeDefined();
      expect(Array.isArray(competences)).toBe(true);
      expect(competences.length).toBeGreaterThan(0);
      
      // Check structure of first competence
      const firstCompetence = competences[0];
      expect(firstCompetence).toHaveProperty('code');
      expect(firstCompetence).toHaveProperty('titre');
      expect(firstCompetence).toHaveProperty('description');
      expect(firstCompetence).toHaveProperty('niveau');
      expect(firstCompetence.niveau).toBe('CP');
    });

    it('should return CE2 competences', () => {
      const competences = CompetenceFrameworkService.getCompetencesByLevel('CE2');
      
      expect(competences).toBeDefined();
      expect(Array.isArray(competences)).toBe(true);
      expect(competences.length).toBeGreaterThan(0);
      
      // Check structure of first competence
      const firstCompetence = competences[0];
      expect(firstCompetence).toHaveProperty('code');
      expect(firstCompetence).toHaveProperty('titre');
      expect(firstCompetence).toHaveProperty('description');
      expect(firstCompetence).toHaveProperty('niveau');
      expect(firstCompetence.niveau).toBe('CE2');
    });
  });

  describe('getCompetenceByCode', () => {
    it('should return CP competence by code', () => {
      const competence = CompetenceFrameworkService.getCompetenceByCode('CP.FR.L1.1');
      
      expect(competence).toBeDefined();
      expect(competence?.code).toBe('CP.FR.L1.1');
      expect(competence?.niveau).toBe('CP');
      expect(competence?.domaine).toBe('francais');
    });

    it('should return CE2 competence by code', () => {
      const competence = CompetenceFrameworkService.getCompetenceByCode('CE2.FR.L.1.1');
      
      expect(competence).toBeDefined();
      expect(competence?.code).toBe('CE2.FR.L.1.1');
      expect(competence?.niveau).toBe('CE2');
      expect(competence?.domaine).toBe('francais');
    });

    it('should return null for non-existent code', () => {
      const competence = CompetenceFrameworkService.getCompetenceByCode('INVALID.CODE');
      
      expect(competence).toBeNull();
    });
  });

  describe('getCompetencesByDomain', () => {
    it('should return competences by domain', () => {
      const francaisCompetences = CompetenceFrameworkService.getCompetencesByDomain('CP', 'francais');
      
      expect(francaisCompetences).toBeDefined();
      expect(Array.isArray(francaisCompetences)).toBe(true);
      expect(francaisCompetences.length).toBeGreaterThan(0);
      
      // All competences should be in the francais domain
      francaisCompetences.forEach(competence => {
        expect(competence.domaine).toBe('francais');
        expect(competence.niveau).toBe('CP');
      });
    });

    it('should return competences by domain and subdomain', () => {
      const lectureCompetences = CompetenceFrameworkService.getCompetencesByDomain('CP', 'francais', 'l1');
      
      expect(lectureCompetences).toBeDefined();
      expect(Array.isArray(lectureCompetences)).toBe(true);
      
      // All competences should be in the francais domain and l1 subdomain
      lectureCompetences.forEach(competence => {
        expect(competence.domaine).toBe('francais');
        expect(competence.sousDomaine).toBe('l1');
        expect(competence.niveau).toBe('CP');
      });
    });
  });

  describe('getCompetencesWithLeaps', () => {
    it('should return competences with leaps for CE2', () => {
      const leaps = CompetenceFrameworkService.getCompetencesWithLeaps('CE2');
      
      expect(leaps).toBeDefined();
      expect(Array.isArray(leaps)).toBe(true);
      
      // All competences should have qualitative leaps or be new
      leaps.forEach(competence => {
        expect(competence.saut_qualitatif || competence.nouveaute).toBeDefined();
      });
    });

    it('should return competences with prerequisites for CP', () => {
      const leaps = CompetenceFrameworkService.getCompetencesWithLeaps('CP');
      
      expect(leaps).toBeDefined();
      expect(Array.isArray(leaps)).toBe(true);
      
      // All competences should have prerequisites
      leaps.forEach(competence => {
        expect(competence.prerequis.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPrerequisites', () => {
    it('should return prerequisites for a competence', async () => {
      // Mock database response
      const mockDbPrerequisites = [
        { prerequisiteCode: 'CP.FR.L1.1' },
        { prerequisiteCode: 'CP.FR.L1.2' }
      ];
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDbPrerequisites)
        })
      } as any);

      const prerequisites = await CompetenceFrameworkService.getPrerequisites('CP.FR.L1.3');
      
      expect(prerequisites).toBeDefined();
      expect(Array.isArray(prerequisites)).toBe(true);
      expect(prerequisites.length).toBeGreaterThan(0);
    });
  });

  describe('isBlocked', () => {
    it('should return blocked status for a student', async () => {
      // Mock database responses
      const mockPrerequisites = ['CP.FR.L1.1', 'CP.FR.L1.2'];
      const mockProgress = [
        { 
          competenceCode: 'CP.FR.L1.1', 
          masteryLevel: 'mastered' 
        },
        { 
          competenceCode: 'CP.FR.L1.2', 
          masteryLevel: 'in_progress' 
        }
      ];
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockProgress)
        })
      } as any);

      const blocked = await CompetenceFrameworkService.isBlocked(1, 'CP.FR.L1.3');
      
      expect(blocked).toBeDefined();
      expect(blocked).toHaveProperty('isBlocked');
      expect(blocked).toHaveProperty('blockingPrerequisites');
      expect(blocked).toHaveProperty('missingPrerequisites');
      expect(typeof blocked.isBlocked).toBe('boolean');
      expect(Array.isArray(blocked.blockingPrerequisites)).toBe(true);
      expect(Array.isArray(blocked.missingPrerequisites)).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations for a student', async () => {
      // Mock database responses
      const mockProgress = [
        { 
          competenceCode: 'CP.FR.L1.1', 
          needsReview: true,
          masteryLevel: 'in_progress'
        }
      ];
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockProgress)
        })
      } as any);

      const recommendations = await CompetenceFrameworkService.getRecommendations(1, 'CP');
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        const firstRec = recommendations[0];
        expect(firstRec).toHaveProperty('priority');
        expect(firstRec).toHaveProperty('competenceCode');
        expect(firstRec).toHaveProperty('reason');
        expect(firstRec).toHaveProperty('type');
        expect(['high', 'medium', 'low']).toContain(firstRec.priority);
        expect(['review', 'new', 'remediation', 'prerequisite']).toContain(firstRec.type);
      }
    });
  });

  describe('getLearningPath', () => {
    it('should return learning path for a student', async () => {
      // Mock database responses
      const mockProgress = [
        { 
          competenceCode: 'CP.FR.L1.1', 
          progressPercent: 75,
          masteryLevel: 'in_progress',
          totalAttempts: 10,
          successfulAttempts: 7,
          averageScore: 3.5,
          needsReview: false,
          lastAttemptAt: new Date(),
          masteredAt: null
        }
      ];
      
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockProgress)
        })
      } as any);

      const learningPath = await CompetenceFrameworkService.getLearningPath(1, 'CP');
      
      expect(learningPath).toBeDefined();
      expect(learningPath).toHaveProperty('studentId');
      expect(learningPath).toHaveProperty('niveau');
      expect(learningPath).toHaveProperty('competences');
      expect(learningPath).toHaveProperty('recommendations');
      expect(learningPath).toHaveProperty('summary');
      
      expect(learningPath.studentId).toBe(1);
      expect(learningPath.niveau).toBe('CP');
      expect(Array.isArray(learningPath.competences)).toBe(true);
      expect(Array.isArray(learningPath.recommendations)).toBe(true);
      
      expect(learningPath.summary).toHaveProperty('totalCompetences');
      expect(learningPath.summary).toHaveProperty('mastered');
      expect(learningPath.summary).toHaveProperty('inProgress');
      expect(learningPath.summary).toHaveProperty('notStarted');
      expect(learningPath.summary).toHaveProperty('blocked');
      expect(learningPath.summary).toHaveProperty('overallProgress');
    });
  });

  describe('Private helper methods', () => {
    it('should correctly identify domains from codes', () => {
      // Test through public methods that use these helpers
      const cpCompetences = CompetenceFrameworkService.getCompetencesByLevel('CP');
      const francaisCompetences = cpCompetences.filter(c => c.domaine === 'francais');
      const mathematiquesCompetences = cpCompetences.filter(c => c.domaine === 'mathematiques');
      
      expect(francaisCompetences.length).toBeGreaterThan(0);
      expect(mathematiquesCompetences.length).toBeGreaterThan(0);
      
      // Verify all francais competences start with CP.FR.
      francaisCompetences.forEach(c => {
        expect(c.code).toMatch(/^CP\.FR\./);
      });
      
      // Verify all mathematiques competences start with CP.MA.
      mathematiquesCompetences.forEach(c => {
        expect(c.code).toMatch(/^CP\.MA\./);
      });
    });

    it('should correctly identify subdomains from codes', () => {
      const cpCompetences = CompetenceFrameworkService.getCompetencesByLevel('CP');
      
      // Check that subdomains are correctly extracted
      cpCompetences.forEach(competence => {
        expect(competence.sousDomaine).toBeDefined();
        expect(competence.sousDomaine).not.toBe('unknown');
      });
    });
  });
});
