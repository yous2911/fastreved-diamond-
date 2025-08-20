import { and, desc, eq } from 'drizzle-orm';
import { db, competencePrerequisites, exerciseOutcomes } from '../db';

export class PrerequisiteService {
  static async getPrerequisites(competenceCode: string) {
    return db
      .select()
      .from(competencePrerequisites)
      .where(eq(competencePrerequisites.competenceCode, competenceCode))
      .orderBy(desc(competencePrerequisites.weight));
  }

  static async isBlocked(studentId: number, competenceCode: string): Promise<boolean> {
    const outcomes = await db
      .select()
      .from(exerciseOutcomes)
      .where(
        and(
          eq(exerciseOutcomes.studentId, studentId),
          eq(exerciseOutcomes.competenceCode, competenceCode)
        )
      )
      .orderBy(desc(exerciseOutcomes.attemptedAt))
      .limit(5);

    const fails = outcomes.filter((o) => !o.isCorrect).length;
    return fails >= 3;
  }

  static async getRemediation(studentId: number, competenceCode: string) {
    const blocked = await this.isBlocked(studentId, competenceCode);
    if (!blocked) return null;

    const prereqs = await this.getPrerequisites(competenceCode);
    return prereqs.map((p) => ({
      action: 'Review prerequisite',
      prerequisiteCode: p.prerequisiteCode,
      weight: p.weight,
      reason: `Student blocked on ${competenceCode}, needs ${p.prerequisiteCode}`,
    }));
  }
}


