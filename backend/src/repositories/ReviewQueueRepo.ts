import { and, eq, lt } from 'drizzle-orm';
import { db, spacedRepetitionCards } from '../db';

export class ReviewQueueRepo {
  static async getDueCards(studentId: number, limit = 50) {
    const now = new Date();
    return db
      .select()
      .from(spacedRepetitionCards)
      .where(
        and(
          eq(spacedRepetitionCards.studentId, studentId),
          lt(spacedRepetitionCards.nextReviewAt, now)
        )
      )
      .orderBy(spacedRepetitionCards.nextReviewAt)
      .limit(limit);
  }

  static async updateCardSchedule(
    cardId: number,
    {
      nextReviewAt,
      intervalDays,
      repetitionNumber,
      easinessFactor,
      lastQuality,
    }: {
      nextReviewAt: Date;
      intervalDays: number;
      repetitionNumber: number;
      easinessFactor: number;
      lastQuality: number;
    }
  ) {
    await db
      .update(spacedRepetitionCards)
      .set({
        nextReviewAt,
        intervalDays,
        repetitionNumber,
        easinessFactor,
        lastQuality,
        lastReviewAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(spacedRepetitionCards.id, cardId));
  }

  static async createCard({
    studentId,
    competenceCode,
  }: {
    studentId: number;
    competenceCode: string;
  }) {
    const now = new Date();
    const tomorrow = new Date(now.getTime());
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [card] = await db
      .insert(spacedRepetitionCards)
      .values({
        studentId,
        competenceCode,
        easinessFactor: 2.5,
        repetitionNumber: 0,
        intervalDays: 1,
        lastReviewAt: now,
        nextReviewAt: tomorrow,
        lastQuality: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return card;
  }
}


