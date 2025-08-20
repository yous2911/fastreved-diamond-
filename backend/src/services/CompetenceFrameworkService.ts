import { competenceReference } from '../data/cp2025-competences';
import { 
  CE2_COMPETENCES_2026, 
  CompetenceData, 
  CompetenceFramework,
  getAllCompetenceCodes,
  getCompetenceByCode,
  getPrerequisitesForCompetence,
  hasMajorQualitativeLeap,
  getCompetencesWithMajorLeaps
} from '../data/ce2-competences-2026';
import {
  CE1_COMPETENCES_2025,
  CE1CompetenceData,
  CE1CompetenceFramework,
  getAllCE1CompetenceCodes,
  getCE1CompetenceByCode,
  getCE1PrerequisitesForCompetence,
  hasCE1MajorQualitativeLeap,
  getCE1CompetencesWithMajorLeaps
} from '../data/ce1-competences-2025';
import { db, competencePrerequisites } from '../db';
import { eq, and } from 'drizzle-orm';

export interface UnifiedCompetenceData {
  code: string;
  titre: string;
  description: string;
  niveau: 'CP' | 'CE1' | 'CE2';
  domaine: string;
  sousDomaine: string;
  prerequis: string[];
  prerequis_details?: string[];
  saut_qualitatif?: string;
  nouveaute?: string;
  evaluation: string;
  donnees_chiffrees?: Record<string, any>;
  periode?: string;
  objectifs?: string[];
}

export interface CompetenceProgress {
  competenceCode: string;
  niveau: 'CP' | 'CE1' | 'CE2';
  progressPercent: number;
  masteryLevel: 'not_started' | 'in_progress' | 'mastered';
  totalAttempts: number;
  successfulAttempts: number;
  averageQuality: number;
  needsReview: boolean;
  lastAttemptAt: Date | null;
  masteredAt: Date | null;
  nextReviewAt?: Date;
  isBlocked: boolean;
  blockingPrerequisites?: string[];
}

export interface LearningPath {
  studentId: number;
  niveau: 'CP' | 'CE1' | 'CE2';
  competences: CompetenceProgress[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    competenceCode: string;
    reason: string;
    type: 'review' | 'new' | 'remediation' | 'prerequisite';
  }[];
  summary: {
    totalCompetences: number;
    mastered: number;
    inProgress: number;
    notStarted: number;
    blocked: number;
    overallProgress: number;
  };
}

export class CompetenceFrameworkService {
  private static cpCompetences: Record<string, any> = competenceReference;
  private static ce2Competences: CompetenceFramework = CE2_COMPETENCES_2026;
  private static ce1Competences: CE1CompetenceFramework = CE1_COMPETENCES_2025;

  /**
   * Get all competences for a specific level
   */
  static getCompetencesByLevel(niveau: 'CP' | 'CE1' | 'CE2'): UnifiedCompetenceData[] {
    const competences: UnifiedCompetenceData[] = [];

    if (niveau === 'CP') {
      Object.entries(this.cpCompetences).forEach(([code, data]) => {
        competences.push({
          code,
          titre: data.titre,
          description: data.description,
          niveau: 'CP',
          domaine: this.getDomainFromCode(code),
          sousDomaine: this.getSubDomainFromCode(code),
          prerequis: data.prerequis || [],
          evaluation: 'Évaluation continue et formative',
          periode: data.periode,
          objectifs: data.objectifs || [],
        });
      });
    } else if (niveau === 'CE1') {
      Object.entries(this.ce1Competences.competences.francais).forEach(([domainKey, domain]) => {
        Object.values(domain).forEach((competence) => {
          competences.push({
            code: competence.code,
            titre: competence.titre,
            description: competence.description,
            niveau: 'CE1',
            domaine: 'francais',
            sousDomaine: domainKey,
            prerequis: competence.prerequis_cp,
            prerequis_details: competence.prerequis_details,
            saut_qualitatif: competence.saut_qualitatif,
            nouveaute: competence.nouveaute,
            evaluation: competence.evaluation,
            donnees_chiffrees: competence.donnees_chiffrees,
          });
        });
      });

      Object.entries(this.ce1Competences.competences.mathematiques).forEach(([domainKey, domain]) => {
        Object.values(domain).forEach((competence) => {
          competences.push({
            code: competence.code,
            titre: competence.titre,
            description: competence.description,
            niveau: 'CE1',
            domaine: 'mathematiques',
            sousDomaine: domainKey,
            prerequis: competence.prerequis_cp,
            prerequis_details: competence.prerequis_details,
            saut_qualitatif: competence.saut_qualitatif,
            nouveaute: competence.nouveaute,
            evaluation: competence.evaluation,
            donnees_chiffrees: competence.donnees_chiffrees,
          });
        });
      });
    } else if (niveau === 'CE2') {
      Object.entries(this.ce2Competences.competences.francais).forEach(([domainKey, domain]) => {
        Object.values(domain).forEach((competence) => {
          competences.push({
            code: competence.code,
            titre: competence.titre,
            description: competence.description,
            niveau: 'CE2',
            domaine: 'francais',
            sousDomaine: domainKey,
            prerequis: competence.prerequis_ce1,
            prerequis_details: competence.prerequis_details,
            saut_qualitatif: competence.saut_qualitatif,
            nouveaute: competence.nouveaute,
            evaluation: competence.evaluation,
            donnees_chiffrees: competence.donnees_chiffrees,
          });
        });
      });

      Object.entries(this.ce2Competences.competences.mathematiques).forEach(([domainKey, domain]) => {
        Object.values(domain).forEach((competence) => {
          competences.push({
            code: competence.code,
            titre: competence.titre,
            description: competence.description,
            niveau: 'CE2',
            domaine: 'mathematiques',
            sousDomaine: domainKey,
            prerequis: competence.prerequis_ce1,
            prerequis_details: competence.prerequis_details,
            saut_qualitatif: competence.saut_qualitatif,
            nouveaute: competence.nouveaute,
            evaluation: competence.evaluation,
            donnees_chiffrees: competence.donnees_chiffrees,
          });
        });
      });
    }

    return competences;
  }

  /**
   * Get a specific competence by code
   */
  static getCompetenceByCode(code: string): UnifiedCompetenceData | null {
    // Check CP competences first
    if (this.cpCompetences[code]) {
      const data = this.cpCompetences[code];
      return {
        code,
        titre: data.titre,
        description: data.description,
        niveau: 'CP',
        domaine: this.getDomainFromCode(code),
        sousDomaine: this.getSubDomainFromCode(code),
        prerequis: data.prerequis || [],
        evaluation: 'Évaluation continue et formative',
        periode: data.periode,
        objectifs: data.objectifs || [],
      };
    }

    // Check CE1 competences
    const ce1Competence = getCE1CompetenceByCode(code);
    if (ce1Competence) {
      return {
        code: ce1Competence.code,
        titre: ce1Competence.titre,
        description: ce1Competence.description,
        niveau: 'CE1',
        domaine: this.getDomainFromCode(code),
        sousDomaine: this.getSubDomainFromCode(code),
        prerequis: ce1Competence.prerequis_cp,
        prerequis_details: ce1Competence.prerequis_details,
        saut_qualitatif: ce1Competence.saut_qualitatif,
        nouveaute: ce1Competence.nouveaute,
        evaluation: ce1Competence.evaluation,
        donnees_chiffrees: ce1Competence.donnees_chiffrees,
      };
    }

    // Check CE2 competences
    const ce2Competence = getCompetenceByCode(code);
    if (ce2Competence) {
      return {
        code: ce2Competence.code,
        titre: ce2Competence.titre,
        description: ce2Competence.description,
        niveau: 'CE2',
        domaine: this.getDomainFromCode(code),
        sousDomaine: this.getSubDomainFromCode(code),
        prerequis: ce2Competence.prerequis_ce1,
        prerequis_details: ce2Competence.prerequis_details,
        saut_qualitatif: ce2Competence.saut_qualitatif,
        nouveaute: ce2Competence.nouveaute,
        evaluation: ce2Competence.evaluation,
        donnees_chiffrees: ce2Competence.donnees_chiffrees,
      };
    }

    return null;
  }

  /**
   * Get all prerequisites for a competence
   */
  static async getPrerequisites(competenceCode: string): Promise<string[]> {
    // Check database first for explicit prerequisites
    const dbPrerequisites = await db
      .select()
      .from(competencePrerequisites)
      .where(eq(competencePrerequisites.competenceCode, competenceCode));

    const dbPrereqCodes = dbPrerequisites.map(p => p.prerequisiteCode);

    // Combine with framework prerequisites
    const competence = this.getCompetenceByCode(competenceCode);
    const frameworkPrereqs = competence?.prerequis || [];

    // Merge and deduplicate
    const allPrereqs = [...new Set([...dbPrereqCodes, ...frameworkPrereqs])];
    return allPrereqs;
  }

  /**
   * Check if a student is blocked on a competence due to missing prerequisites
   */
  static async isBlocked(studentId: number, competenceCode: string): Promise<{
    isBlocked: boolean;
    blockingPrerequisites: string[];
    missingPrerequisites: string[];
  }> {
    const prerequisites = await this.getPrerequisites(competenceCode);
    const blockingPrerequisites: string[] = [];
    const missingPrerequisites: string[] = [];

    for (const prereqCode of prerequisites) {
      const prereqProgress = await db
        .select()
        .from(db.studentProgress)
        .where(
          and(
            eq(db.studentProgress.studentId, studentId),
            eq(db.studentProgress.competenceCode, prereqCode)
          )
        );

      if (prereqProgress.length === 0 || prereqProgress[0].masteryLevel !== 'mastered') {
        blockingPrerequisites.push(prereqCode);
        missingPrerequisites.push(prereqCode);
      }
    }

    return {
      isBlocked: blockingPrerequisites.length > 0,
      blockingPrerequisites,
      missingPrerequisites,
    };
  }

  /**
   * Get recommended competences for a student
   */
  static async getRecommendations(studentId: number, niveau: 'CP' | 'CE1' | 'CE2'): Promise<{
    priority: 'high' | 'medium' | 'low';
    competenceCode: string;
    reason: string;
    type: 'review' | 'new' | 'remediation' | 'prerequisite';
  }[]> {
    const recommendations: {
      priority: 'high' | 'medium' | 'low';
      competenceCode: string;
      reason: string;
      type: 'review' | 'new' | 'remediation' | 'prerequisite';
    }[] = [];

    const competences = this.getCompetencesByLevel(niveau);
    const studentProgress = await db
      .select()
      .from(db.studentProgress)
      .where(eq(db.studentProgress.studentId, studentId));

    const progressMap = new Map(
      studentProgress.map(p => [p.competenceCode, p as any])
    );

    // Check for competences that need review
    for (const progress of studentProgress) {
      if ((progress as any).needsReview) {
        recommendations.push({
          priority: 'high',
          competenceCode: progress.competenceCode,
          reason: 'Besoin de révision - performance faible',
          type: 'review',
        });
      }
    }

    // Check for new competences that can be started
    for (const competence of competences) {
      const progress = progressMap.get(competence.code);
      
      if (!progress) {
        // Check if prerequisites are met
        const blocked = await this.isBlocked(studentId, competence.code);
        
        if (!blocked.isBlocked) {
          recommendations.push({
            priority: 'medium',
            competenceCode: competence.code,
            reason: 'Nouvelle compétence disponible',
            type: 'new',
          });
        } else {
          recommendations.push({
            priority: 'low',
            competenceCode: competence.code,
            reason: `Prérequis manquants: ${blocked.missingPrerequisites.join(', ')}`,
            type: 'prerequisite',
          });
        }
      }
    }

    // Check for competences with major qualitative leaps
    let leaps: any[] = [];
    if (niveau === 'CE1') {
      leaps = getCE1CompetencesWithMajorLeaps();
    } else if (niveau === 'CE2') {
      leaps = getCompetencesWithMajorLeaps();
    }
    
    for (const leap of leaps) {
      const progress = progressMap.get(leap.code) as any;
      if (progress && progress.masteryLevel === 'in_progress') {
        recommendations.push({
          priority: 'high',
          competenceCode: leap.code,
          reason: 'Saut qualitatif majeur - priorité élevée',
          type: 'remediation',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get complete learning path for a student
   */
  static async getLearningPath(studentId: number, niveau: 'CP' | 'CE1' | 'CE2'): Promise<LearningPath> {
    const competences = this.getCompetencesByLevel(niveau);
    const studentProgress = await db
      .select()
      .from(db.studentProgress)
      .where(eq(db.studentProgress.studentId, studentId));

    const progressMap = new Map(
      studentProgress.map(p => [p.competenceCode, p as any])
    );

    const competenceProgress: CompetenceProgress[] = [];

    for (const competence of competences) {
      const progress = progressMap.get(competence.code) as any;
      const blocked = await this.isBlocked(studentId, competence.code);

      competenceProgress.push({
        competenceCode: competence.code,
        niveau,
        progressPercent: progress?.progressPercent || 0,
        masteryLevel: progress?.masteryLevel || 'not_started',
        totalAttempts: progress?.totalAttempts || 0,
        successfulAttempts: progress?.successfulAttempts || 0,
        averageQuality: progress?.averageScore || 0,
        needsReview: progress?.needsReview || false,
        lastAttemptAt: progress?.lastAttemptAt || null,
        masteredAt: progress?.masteredAt || null,
        isBlocked: blocked.isBlocked,
        blockingPrerequisites: blocked.blockingPrerequisites,
      });
    }

    const recommendations = await this.getRecommendations(studentId, niveau);

    const mastered = competenceProgress.filter(c => c.masteryLevel === 'mastered').length;
    const inProgress = competenceProgress.filter(c => c.masteryLevel === 'in_progress').length;
    const notStarted = competenceProgress.filter(c => c.masteryLevel === 'not_started').length;
    const blocked = competenceProgress.filter(c => c.isBlocked).length;

    const overallProgress = (mastered / competences.length) * 100;

    return {
      studentId,
      niveau,
      competences: competenceProgress,
      recommendations,
      summary: {
        totalCompetences: competences.length,
        mastered,
        inProgress,
        notStarted,
        blocked,
        overallProgress: Math.round(overallProgress * 100) / 100,
      },
    };
  }

  /**
   * Get competences by domain and subdomain
   */
  static getCompetencesByDomain(niveau: 'CP' | 'CE1' | 'CE2', domaine: string, sousDomaine?: string): UnifiedCompetenceData[] {
    const competences = this.getCompetencesByLevel(niveau);
    
    return competences.filter(c => {
      if (sousDomaine) {
        return c.domaine === domaine && c.sousDomaine === sousDomaine;
      }
      return c.domaine === domaine;
    });
  }

  /**
   * Get competences with major qualitative leaps
   */
  static getCompetencesWithLeaps(niveau: 'CP' | 'CE1' | 'CE2'): UnifiedCompetenceData[] {
    const competences = this.getCompetencesByLevel(niveau);
    
    if (niveau === 'CE1') {
      return competences.filter(c => hasCE1MajorQualitativeLeap(c.code));
    } else if (niveau === 'CE2') {
      return competences.filter(c => hasMajorQualitativeLeap(c.code));
    }
    
    // For CP, return competences with significant prerequisites
    return competences.filter(c => c.prerequis.length > 0);
  }

  private static getDomainFromCode(code: string): string {
    if (code.startsWith('CP.FR.')) return 'francais';
    if (code.startsWith('CP.MA.')) return 'mathematiques';
    if (code.startsWith('CE1.FR.')) return 'francais';
    if (code.startsWith('CE1.MA.')) return 'mathematiques';
    if (code.startsWith('CE2.FR.')) return 'francais';
    if (code.startsWith('CE2.MA.')) return 'mathematiques';
    return 'unknown';
  }

  private static getSubDomainFromCode(code: string): string {
    const parts = code.split('.');
    if (parts.length >= 3) {
      return parts[2].toLowerCase();
    }
    return 'unknown';
  }
}
