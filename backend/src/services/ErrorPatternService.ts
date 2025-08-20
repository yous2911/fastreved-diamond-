import { and, desc, eq } from 'drizzle-orm';
import { db, exerciseOutcomes, errorPatterns } from '../db';

export class ErrorPatternService {
  static async recordOutcome({
    studentId,
    exerciseId,
    competenceCode,
    isCorrect,
    hintsUsed,
    timeSpentSec,
    quality,
    errorTags = [],
  }: {
    studentId: number;
    exerciseId: number;
    competenceCode: string;
    isCorrect: boolean;
    hintsUsed: number;
    timeSpentSec: number;
    quality: number;
    errorTags?: string[];
  }) {
    const [outcome] = await db
      .insert(exerciseOutcomes)
      .values({
        studentId,
        exerciseId,
        competenceCode,
        isCorrect,
        hintsUsed,
        timeSpentSec,
        quality,
        errorTags,
      })
      .returning();

    if (errorTags && errorTags.length > 0) {
      for (const tag of errorTags) {
        const existing = await db
          .select()
          .from(errorPatterns)
          .where(
            and(
              eq(errorPatterns.studentId, studentId),
              eq(errorPatterns.competenceCode, competenceCode),
              eq(errorPatterns.tag, tag)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(errorPatterns)
            .set({
              occurrences: (existing[0].occurrences || 0) + 1,
              lastSeenAt: new Date(),
            })
            .where(eq(errorPatterns.id, existing[0].id));
        } else {
          await db.insert(errorPatterns).values({
            studentId,
            competenceCode,
            tag,
            occurrences: 1,
            lastSeenAt: new Date(),
          });
        }
      }
    }

    return outcome;
  }

  static async getTopErrorPatterns(studentId: number, limit = 5) {
    return db
      .select()
      .from(errorPatterns)
      .where(eq(errorPatterns.studentId, studentId))
      .orderBy(desc(errorPatterns.occurrences))
      .limit(limit);
  }

  static async suggestRemediation(studentId: number) {
    const patterns = await this.getTopErrorPatterns(studentId, 5);
    return patterns.map((p) => ({
      action: 'Remedial practice',
      reason: `Frequent error: ${p.tag}`,
      competenceCode: p.competenceCode,
    }));
  }
}


