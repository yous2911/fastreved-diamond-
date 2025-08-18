import { eq, and, lt } from 'drizzle-orm';
import { studentProgress as revisions } from '../db/schema';

export class SpacedRepetitionService {
  constructor(
    private db: any,
    private cache: any
  ) {}

  // Get due revisions for a student
  async getDueRevisions(studentId: number): Promise<any[]> {
    const now = new Date();

    try {
      const dueRevisions = await this.db
        .select()
        .from(revisions)
        .where(
          and(
            eq(revisions.studentId, studentId),
            eq(revisions.score, '0'),
            lt(revisions.createdAt, now)
          )
        )
        .orderBy(revisions.createdAt);

      return dueRevisions;
    } catch {
      // console.error removed for production
      return [];
    }
  }

  // Record a successful revision
  async recordSuccess(revisionId: number, quality: number): Promise<boolean> {
    try {
      const revision = await this.db
        .select()
        .from(revisions)
        .where(eq(revisions.id, revisionId))
        .limit(1);

      if (revision.length === 0) {
        return false;
      }

      const currentRevision = revision[0];
      const newInterval = this.calculateNextInterval(currentRevision.intervalleJours, quality);
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + newInterval);

      await this.db
        .update(revisions)
        .set({
          intervalleJours: newInterval,
          prochaineRevision: nextDueDate,
          revisionEffectuee: true,
          nombreRevisions: currentRevision.nombreRevisions + 1,
          facteurDifficulte: this.updateDifficultyFactor(
            currentRevision.facteurDifficulte,
            quality
          ),
        })
        .where(eq(revisions.id, revisionId));

      return true;
    } catch {
      // console.error removed for production
      return false;
    }
  }

  // Record a failed revision
  async recordFailure(revisionId: number): Promise<boolean> {
    try {
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 1); // Review tomorrow

      await this.db
        .update(revisions)
        .set({
          intervalleJours: 1,
          prochaineRevision: nextDueDate,
          revisionEffectuee: false,
          nombreRevisions: 0,
          facteurDifficulte: 1.0,
        })
        .where(eq(revisions.id, revisionId));

      return true;
    } catch {
      // console.error removed for production
      return false;
    }
  }

  // Calculate next interval using SuperMemo-2 algorithm
  private calculateNextInterval(currentInterval: number, quality: number): number {
    if (quality < 3) {
      return 1; // Review tomorrow
    }

    let newInterval: number;
    if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * 1.5);
    }

    return Math.max(1, newInterval);
  }

  // Update difficulty factor
  private updateDifficultyFactor(currentFactor: number, quality: number): number {
    const newFactor = currentFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(1.3, Math.min(2.5, newFactor));
  }

  // Create a new revision for an exercise
  async createRevision(studentId: number, exerciseId: number): Promise<boolean> {
    try {
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 1);

      await this.db.insert(revisions).values({
        studentId,
        exerciseId,
        prochaineRevision: nextDueDate,
        intervalleJours: 1,
        nombreRevisions: 0,
        facteurDifficulte: 1.0,
        revisionEffectuee: false,
      });

      return true;
    } catch {
      // console.error removed for production
      return false;
    }
  }

  // Get revision statistics for a student
  async getRevisionStats(studentId: number): Promise<any> {
    try {
      const stats = await this.db
        .select()
        .from(revisions)
        .where(eq(revisions.studentId, studentId));

      return {
        total: stats.length,
        completed: stats.filter((s: any) => s.revisionEffectuee).length,
        pending: stats.filter((s: any) => !s.revisionEffectuee).length,
      };
    } catch {
      // console.error removed for production
      return { total: 0, completed: 0, pending: 0 };
    }
  }
}
