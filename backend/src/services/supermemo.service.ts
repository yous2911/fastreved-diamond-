/**
 * SuperMemo-2 Spaced Repetition Algorithm Implementation
 * 
 * This implementation is based on the SuperMemo-2 algorithm developed by 
 * Piotr Wozniak for optimizing memory retention through spaced repetition.
 * 
 * Adapted for the FastRevEd Kids educational platform to optimize
 * learning intervals for elementary school students (CP/CE1/CE2).
 */

export interface SuperMemoCard {
  competenceId: number;
  studentId: number;
  easinessFactor: number; // E-Factor (1.3 - 2.5)
  repetitionNumber: number; // n (0, 1, 2, ...)
  interval: number; // Days until next review
  lastReview: Date;
  nextReview: Date;
  quality: number; // Last quality assessment (0-5)
}

export interface SuperMemoResult {
  easinessFactor: number;
  repetitionNumber: number;
  interval: number;
  nextReviewDate: Date;
  shouldReview: boolean;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'very_hard';
}

export interface ExerciseResponse {
  studentId: number;
  competenceId: number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  hintsUsed: number;
  difficulty: number; // 0-5 scale
  confidence?: number; // 0-5 scale (optional)
}

/**
 * SuperMemo-2 Algorithm Service
 * Optimized for young learners (6-11 years old)
 */
export class SuperMemoService {
  // Algorithm constants - adjusted for young learners
  private static readonly MIN_EASINESS_FACTOR = 1.3;
  private static readonly MAX_EASINESS_FACTOR = 2.5;
  private static readonly INITIAL_EASINESS_FACTOR = 2.5;
  private static readonly INITIAL_INTERVAL = 1; // Start with 1 day
  private static readonly SECOND_INTERVAL = 6; // Second review after 6 days

  /**
   * Calculate quality score based on student response
   * Adapted for elementary students with emphasis on engagement over perfection
   */
  static calculateQuality(response: ExerciseResponse): number {
    let quality = 0;

    // Base quality on correctness (0-3 points)
    if (response.isCorrect) {
      quality += 3;
    } else {
      // Partial credit for attempt and engagement
      quality += response.hintsUsed <= 1 ? 1 : 0.5;
    }

    // Time factor (0-1 points)
    // Reward appropriate pacing - not too fast (guessing) or too slow (struggling)
    const expectedTime = this.getExpectedTimeForDifficulty(response.difficulty);
    const timeRatio = response.timeSpent / expectedTime;
    
    if (timeRatio >= 0.5 && timeRatio <= 2.0) {
      quality += 1; // Good pacing
    } else if (timeRatio > 2.0 && timeRatio <= 3.0) {
      quality += 0.5; // Slower but still learning
    }

    // Hint usage factor (0-1 points)
    if (response.hintsUsed === 0) {
      quality += 1; // No hints needed
    } else if (response.hintsUsed <= 2) {
      quality += 0.5; // Reasonable hint usage
    }

    // Confidence bonus (if provided)
    if (response.confidence !== undefined) {
      quality += (response.confidence / 5) * 0.5; // Max 0.5 bonus
    }

    // Normalize to 0-5 scale and round to nearest 0.5
    const normalizedQuality = Math.min(5, Math.max(0, quality));
    return Math.round(normalizedQuality * 2) / 2; // Round to nearest 0.5
  }

  /**
   * Get expected time based on exercise difficulty
   */
  private static getExpectedTimeForDifficulty(difficulty: number): number {
    // Expected times in seconds for different difficulty levels
    const baseTimes = [30, 45, 60, 90, 120, 180]; // 0-5 difficulty scale
    return baseTimes[Math.min(5, Math.max(0, Math.floor(difficulty)))] || 60;
  }

  /**
   * Core SuperMemo-2 algorithm implementation
   * Modified for young learners with more forgiving intervals
   */
  static calculateNextReview(
    currentCard: Partial<SuperMemoCard>, 
    quality: number
  ): SuperMemoResult {
    // Initialize defaults for new cards
    const easinessFactor = currentCard.easinessFactor || this.INITIAL_EASINESS_FACTOR;
    const repetitionNumber = currentCard.repetitionNumber || 0;
    const lastInterval = currentCard.interval || 0;

    let newEasinessFactor = easinessFactor;
    let newRepetitionNumber = repetitionNumber;
    let newInterval = 0;

    // Quality threshold for successful review (adjusted for kids)
    const qualityThreshold = 2.5; // Lower threshold for young learners

    if (quality >= qualityThreshold) {
      // Successful review
      newRepetitionNumber++;

      // Calculate new interval based on repetition number
      if (newRepetitionNumber === 1) {
        newInterval = this.INITIAL_INTERVAL;
      } else if (newRepetitionNumber === 2) {
        newInterval = this.SECOND_INTERVAL;
      } else {
        // Standard SuperMemo formula for subsequent reviews
        newInterval = Math.round(lastInterval * newEasinessFactor);
      }

      // Update easiness factor
      newEasinessFactor = Math.max(
        this.MIN_EASINESS_FACTOR,
        Math.min(
          this.MAX_EASINESS_FACTOR,
          easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        )
      );

    } else {
      // Failed review - reset repetition number but keep some progress
      newRepetitionNumber = Math.max(0, repetitionNumber - 1); // More forgiving reset
      newInterval = 1; // Review again tomorrow
      
      // Reduce easiness factor more gently for kids
      newEasinessFactor = Math.max(
        this.MIN_EASINESS_FACTOR,
        easinessFactor - 0.15 // Smaller penalty than standard SM-2
      );
    }

    // Apply maximum interval limits for young learners
    newInterval = this.applyIntervalLimits(newInterval, newRepetitionNumber);

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    // Determine difficulty level
    const difficulty = this.getDifficultyLevel(newEasinessFactor, newRepetitionNumber);

    // Determine if review is needed now
    const shouldReview = currentCard.nextReview 
      ? new Date() >= currentCard.nextReview
      : true;

    return {
      easinessFactor: Math.round(newEasinessFactor * 100) / 100, // Round to 2 decimal places
      repetitionNumber: newRepetitionNumber,
      interval: newInterval,
      nextReviewDate,
      shouldReview,
      difficulty
    };
  }

  /**
   * Apply interval limits appropriate for young learners
   */
  private static applyIntervalLimits(interval: number, repetitionNumber: number): number {
    // Maximum intervals for different stages (in days)
    const maxIntervals = {
      beginner: 3,    // First few repetitions
      elementary: 7,  // Early learning stage
      intermediate: 14, // Developing mastery
      advanced: 30    // Well-learned content
    };

    if (repetitionNumber <= 2) {
      return Math.min(interval, maxIntervals.beginner);
    } else if (repetitionNumber <= 4) {
      return Math.min(interval, maxIntervals.elementary);
    } else if (repetitionNumber <= 8) {
      return Math.min(interval, maxIntervals.intermediate);
    } else {
      return Math.min(interval, maxIntervals.advanced);
    }
  }

  /**
   * Determine difficulty level based on easiness factor and repetition number
   */
  private static getDifficultyLevel(
    easinessFactor: number, 
    repetitionNumber: number
  ): 'beginner' | 'easy' | 'medium' | 'hard' | 'very_hard' {
    if (repetitionNumber <= 1) {
      return 'beginner';
    }
    
    if (easinessFactor >= 2.3) {
      return 'easy';
    } else if (easinessFactor >= 2.0) {
      return 'medium';
    } else if (easinessFactor >= 1.6) {
      return 'hard';
    } else {
      return 'very_hard';
    }
  }

  /**
   * Get recommended study schedule for a competence
   */
  static getStudySchedule(
    cards: SuperMemoCard[], 
    maxCardsPerDay: number = 10
  ): {
    due: SuperMemoCard[];
    upcoming: SuperMemoCard[];
    schedule: { date: string; cards: SuperMemoCard[] }[];
  } {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Filter cards due for review
    const due = cards.filter(card => 
      new Date(card.nextReview) <= now
    ).sort((a, b) => 
      new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
    );

    // Filter upcoming cards (next 7 days)
    const upcoming = cards.filter(card => {
      const reviewDate = new Date(card.nextReview);
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return reviewDate > now && reviewDate <= weekFromNow;
    }).sort((a, b) => 
      new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
    );

    // Create 7-day schedule
    const schedule = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      const cardsForDate = cards.filter(card => {
        const reviewDate = new Date(card.nextReview);
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate.getTime() === date.getTime();
      }).slice(0, maxCardsPerDay); // Limit cards per day
      
      schedule.push({
        date: date.toISOString().split('T')[0],
        cards: cardsForDate
      });
    }

    return {
      due: due.slice(0, maxCardsPerDay), // Limit due cards
      upcoming,
      schedule
    };
  }

  /**
   * Analyze learning progress for a student
   */
  static analyzeLearningProgress(cards: SuperMemoCard[]): {
    totalCards: number;
    mastered: number;
    learning: number;
    difficult: number;
    averageEasiness: number;
    averageInterval: number;
    successRate: number;
  } {
    if (cards.length === 0) {
      return {
        totalCards: 0,
        mastered: 0,
        learning: 0,
        difficult: 0,
        averageEasiness: this.INITIAL_EASINESS_FACTOR,
        averageInterval: 0,
        successRate: 0
      };
    }

    const mastered = cards.filter(card => 
      card.easinessFactor >= 2.2 && card.repetitionNumber >= 3
    ).length;

    const difficult = cards.filter(card => 
      card.easinessFactor <= 1.6
    ).length;

    const learning = cards.length - mastered - difficult;

    const averageEasiness = cards.reduce((sum, card) => 
      sum + card.easinessFactor, 0
    ) / cards.length;

    const averageInterval = cards.reduce((sum, card) => 
      sum + card.interval, 0
    ) / cards.length;

    // Success rate based on easiness factors and repetition numbers
    const successfulCards = cards.filter(card => 
      card.easinessFactor >= 2.0 && card.quality >= 3
    ).length;
    
    const successRate = successfulCards / cards.length;

    return {
      totalCards: cards.length,
      mastered,
      learning,
      difficult,
      averageEasiness: Math.round(averageEasiness * 100) / 100,
      averageInterval: Math.round(averageInterval * 10) / 10,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Get personalized recommendations for a student
   */
  static getPersonalizedRecommendations(
    cards: SuperMemoCard[]
  ): {
    action: string;
    reason: string;
    competences?: number[];
  }[] {
    const recommendations = [];
    const analysis = this.analyzeLearningProgress(cards);

    // Check for difficult competences
    const difficultCards = cards.filter(card => card.easinessFactor <= 1.6);
    if (difficultCards.length > 0) {
      recommendations.push({
        action: "Focus on difficult competences with extra practice",
        reason: `${difficultCards.length} competences need additional attention`,
        competences: difficultCards.map(card => card.competenceId)
      });
    }

    // Check for review overload
    const now = new Date();
    const dueCards = cards.filter(card => new Date(card.nextReview) <= now);
    if (dueCards.length > 15) {
      recommendations.push({
        action: "Prioritize reviews to avoid overload",
        reason: `${dueCards.length} competences are due for review`,
        competences: dueCards
          .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime())
          .slice(0, 10)
          .map(card => card.competenceId)
      });
    }

    // Check for learning plateau
    const recentlyPracticedCards = cards.filter(card => {
      const daysSinceLastReview = (now.getTime() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastReview <= 7;
    });

    if (recentlyPracticedCards.length < cards.length * 0.3) {
      recommendations.push({
        action: "Increase study frequency",
        reason: "Regular practice helps maintain learning progress"
      });
    }

    return recommendations;
  }
}