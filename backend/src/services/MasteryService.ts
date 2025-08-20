import { and, desc, eq } from 'drizzle-orm';
import { db, exerciseOutcomes, spacedRepetitionCards, studentProgress } from '../db';
import { ErrorPatternService } from './ErrorPatternService';
import { PrerequisiteService } from './PrerequisiteService';
import { ReviewQueueRepo } from '../repositories/ReviewQueueRepo';
import { SuperMemoService } from '../services/supermemo.service';

export class MasteryService {
  static async updateMastery({
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
    await ErrorPatternService.recordOutcome({
      studentId,
      exerciseId,
      competenceCode,
      isCorrect,
      hintsUsed,
      timeSpentSec,
      quality,
      errorTags,
    });

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
      .limit(20);

    const totalAttempts = outcomes.length || 1;
    const successfulAttempts = outcomes.filter((o) => o.isCorrect).length;
    const averageQuality =
      outcomes.reduce((sum, o) => sum + Number(o.quality), 0) / totalAttempts;
    const totalTimeSpent = outcomes.reduce((sum, o) => sum + (o.timeSpentSec || 0), 0);

    let masteryPercent = (successfulAttempts / totalAttempts) * 100;
    masteryPercent -= Math.min(10, hintsUsed * 2);
    masteryPercent = Math.max(0, Math.min(100, masteryPercent));

    let masteryLevel: 'not_started' | 'in_progress' | 'mastered';
    if (masteryPercent >= 90 && averageQuality >= 3) masteryLevel = 'mastered';
    else if (masteryPercent >= 50) masteryLevel = 'in_progress';
    else masteryLevel = 'not_started';

    const now = new Date();
    const needsReview = masteryPercent < 80 || averageQuality < 2.5;

    const existing = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.competenceCode, competenceCode)
        )
      );

    if (existing.length > 0) {
      const prev = existing[0];
      await db
        .update(studentProgress)
        .set({
          exerciseId,
          progressPercent: masteryPercent,
          masteryLevel,
          totalAttempts,
          successfulAttempts,
          averageScore: Math.round(((successfulAttempts / totalAttempts) * 100) * 100) / 100,
          totalTimeSpent,
          lastAttemptAt: now,
          masteredAt: masteryLevel === 'mastered' ? (prev.masteredAt || now) : prev.masteredAt,
          needsReview,
          updatedAt: now,
        })
        .where(eq(studentProgress.id, prev.id));
    } else {
      await db.insert(studentProgress).values({
        studentId,
        exerciseId,
        competenceCode,
        progressPercent: masteryPercent,
        masteryLevel,
        totalAttempts,
        successfulAttempts,
        averageScore: Math.round(((successfulAttempts / totalAttempts) * 100) * 100) / 100,
        totalTimeSpent,
        lastAttemptAt: now,
        masteredAt: masteryLevel === 'mastered' ? now : null,
        needsReview,
        createdAt: now,
        updatedAt: now,
      });
    }

    let card = (
      await db
        .select()
        .from(spacedRepetitionCards)
        .where(
          and(
            eq(spacedRepetitionCards.studentId, studentId),
            eq(spacedRepetitionCards.competenceCode, competenceCode)
          )
        )
    )[0];

    if (!card) {
      card = await ReviewQueueRepo.createCard({ studentId, competenceCode });
    }

    const smResult = SuperMemoService.calculateNextReview(card, quality);
    await ReviewQueueRepo.updateCardSchedule(card.id, {
      nextReviewAt: smResult.nextReviewDate,
      intervalDays: smResult.interval,
      repetitionNumber: smResult.repetitionNumber,
      easinessFactor: smResult.easinessFactor,
      lastQuality: quality,
    });

    const blocked = await PrerequisiteService.isBlocked(studentId, competenceCode);
    const remediation = blocked
      ? await PrerequisiteService.getRemediation(studentId, competenceCode)
      : null;

    return {
      mastery: {
        percent: Math.round(masteryPercent * 100) / 100,
        level: masteryLevel,
        averageQuality: Math.round(averageQuality * 100) / 100,
        needsReview,
      },
      spacedRepetition: {
        nextReview: smResult.nextReviewDate,
        intervalDays: smResult.interval,
        repetitionNumber: smResult.repetitionNumber,
        difficulty: smResult.difficulty,
      },
      status: blocked ? 'blocked' : 'progressing',
      remediation,
    };
  }
}


