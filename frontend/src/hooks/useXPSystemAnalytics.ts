import { useState, useCallback, useEffect } from 'react';

interface XPAnalytics {
  trackXPGain: (amount: number, source: string) => void;
  trackLevelUp: (newLevel: number) => void;
  trackStreakChange: (newStreak: number) => void;
  trackAchievementUnlock: (achievementId: string) => void;
  getXPStats: () => XPStats;
  getLevelingStats: () => LevelingStats;
}

interface XPStats {
  totalXPGained: number;
  averageXPPerSession: number;
  xpSources: Record<string, number>;
  sessionCount: number;
}

interface LevelingStats {
  currentLevel: number;
  levelUps: number;
  timeToLevelUp: number[];
  achievementsUnlocked: number;
  currentStreak: number;
  maxStreak: number;
}

export const useXPSystemAnalytics = (): XPAnalytics => {
  const [xpStats, setXPStats] = useState<XPStats>({
    totalXPGained: 0,
    averageXPPerSession: 0,
    xpSources: {},
    sessionCount: 0
  });

  const [levelingStats, setLevelingStats] = useState<LevelingStats>({
    currentLevel: 1,
    levelUps: 0,
    timeToLevelUp: [],
    achievementsUnlocked: 0,
    currentStreak: 0,
    maxStreak: 0
  });

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [lastLevelUpTime, setLastLevelUpTime] = useState<Date | null>(null);

  const trackXPGain = useCallback((amount: number, source: string) => {
    setXPStats(prev => ({
      ...prev,
      totalXPGained: prev.totalXPGained + amount,
      xpSources: {
        ...prev.xpSources,
        [source]: (prev.xpSources[source] || 0) + amount
      }
    }));
  }, []);

  const trackLevelUp = useCallback((newLevel: number) => {
    const now = new Date();
    const timeToLevel = lastLevelUpTime ? now.getTime() - lastLevelUpTime.getTime() : 0;
    
    setLevelingStats(prev => ({
      ...prev,
      currentLevel: newLevel,
      levelUps: prev.levelUps + 1,
      timeToLevelUp: [...prev.timeToLevelUp, timeToLevel]
    }));

    setLastLevelUpTime(now);
  }, [lastLevelUpTime]);

  const trackStreakChange = useCallback((newStreak: number) => {
    setLevelingStats(prev => ({
      ...prev,
      currentStreak: newStreak,
      maxStreak: Math.max(prev.maxStreak, newStreak)
    }));
  }, []);

  const trackAchievementUnlock = useCallback((achievementId: string) => {
    setLevelingStats(prev => ({
      ...prev,
      achievementsUnlocked: prev.achievementsUnlocked + 1
    }));
  }, []);

  const getXPStats = useCallback((): XPStats => {
    return xpStats;
  }, [xpStats]);

  const getLevelingStats = useCallback((): LevelingStats => {
    return levelingStats;
  }, [levelingStats]);

  useEffect(() => {
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
      setXPStats(prev => ({
        ...prev,
        sessionCount: prev.sessionCount + 1
      }));
    }
  }, [sessionStartTime]);

  return {
    trackXPGain,
    trackLevelUp,
    trackStreakChange,
    trackAchievementUnlock,
    getXPStats,
    getLevelingStats
  };
};