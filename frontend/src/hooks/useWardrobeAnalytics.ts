import { useState, useCallback } from 'react';

interface WardrobeAnalytics {
  trackItemView: (itemId: string) => void;
  trackItemEquip: (itemId: string) => void;
  trackItemUnequip: (itemId: string) => void;
  trackCategoryChange: (category: string) => void;
  trackWardrobeOpen: () => void;
  trackWardrobeClose: () => void;
  getItemStats: (itemId: string) => ItemStats;
  getCategoryStats: () => CategoryStats;
}

interface ItemStats {
  views: number;
  equips: number;
  unequips: number;
  lastUsed: Date | null;
}

interface CategoryStats {
  [category: string]: {
    views: number;
    selections: number;
    timeSpent: number;
  };
}

export const useWardrobeAnalytics = (): WardrobeAnalytics => {
  const [itemStats, setItemStats] = useState<Record<string, ItemStats>>({});
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  const trackItemView = useCallback((itemId: string) => {
    setItemStats(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        views: (prev[itemId]?.views || 0) + 1,
        equips: prev[itemId]?.equips || 0,
        unequips: prev[itemId]?.unequips || 0,
        lastUsed: prev[itemId]?.lastUsed || null
      }
    }));
  }, []);

  const trackItemEquip = useCallback((itemId: string) => {
    setItemStats(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        views: prev[itemId]?.views || 0,
        equips: (prev[itemId]?.equips || 0) + 1,
        unequips: prev[itemId]?.unequips || 0,
        lastUsed: new Date()
      }
    }));
  }, []);

  const trackItemUnequip = useCallback((itemId: string) => {
    setItemStats(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        views: prev[itemId]?.views || 0,
        equips: prev[itemId]?.equips || 0,
        unequips: (prev[itemId]?.unequips || 0) + 1,
        lastUsed: new Date()
      }
    }));
  }, []);

  const trackCategoryChange = useCallback((category: string) => {
    setCategoryStats(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        views: (prev[category]?.views || 0) + 1,
        selections: (prev[category]?.selections || 0) + 1,
        timeSpent: prev[category]?.timeSpent || 0
      }
    }));
  }, []);

  const trackWardrobeOpen = useCallback(() => {
    setSessionStart(new Date());
  }, []);

  const trackWardrobeClose = useCallback(() => {
    if (sessionStart) {
      const sessionTime = Date.now() - sessionStart.getTime();
      console.log('Wardrobe session time:', sessionTime);
    }
  }, [sessionStart]);

  const getItemStats = useCallback((itemId: string): ItemStats => {
    return itemStats[itemId] || {
      views: 0,
      equips: 0,
      unequips: 0,
      lastUsed: null
    };
  }, [itemStats]);

  const getCategoryStats = useCallback((): CategoryStats => {
    return categoryStats;
  }, [categoryStats]);

  return {
    trackItemView,
    trackItemEquip,
    trackItemUnequip,
    trackCategoryChange,
    trackWardrobeOpen,
    trackWardrobeClose,
    getItemStats,
    getCategoryStats
  };
};