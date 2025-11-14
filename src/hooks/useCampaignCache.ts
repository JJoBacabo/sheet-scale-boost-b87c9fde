import { useState, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useCampaignCache = <T>(key: string) => {
  const [cachedData, setCachedData] = useState<T | null>(null);

  const getCached = (): T | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed: CacheEntry<T> = JSON.parse(stored);
      const now = Date.now();

      // Check if cache is still valid
      if (now - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }

      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const setCache = (data: T) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(entry));
      setCachedData(data);
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(key);
      setCachedData(null);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  useEffect(() => {
    const cached = getCached();
    if (cached) {
      setCachedData(cached);
    }
  }, [key]);

  return { cachedData, getCached, setCache, clearCache };
};
