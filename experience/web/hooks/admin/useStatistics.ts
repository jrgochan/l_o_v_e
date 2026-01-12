/**
 * Statistics Hook
 *
 * Manages path statistics fetching and cache operations:
 * - Fetches statistics from backend API
 * - Auto-refreshes every 10 seconds
 * - Handles cache clearing
 * - Loading and error states
 */

import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";

const OBSERVER_API_URL = process.env.NEXT_PUBLIC_OBSERVER_API_URL || "http://localhost:8000";
const REFRESH_INTERVAL = 10000; // 10 seconds

interface PathStatistics {
  total_cached: number;
  total_possible: number;
  completion_percentage: number;
  difficulty_distribution: {
    easy: number;
    moderate: number;
    difficult: number;
  };
  distance_stats: {
    avg: string;
    min: string;
    max: string;
  };
  bridge_paths: number;
  avg_waypoints: string;
  last_computed: string | null;
}

interface UseStatisticsReturn {
  stats: PathStatistics | null;
  loading: boolean;
  error: string | null;
  isClearing: boolean;
  clearCache: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for path statistics and cache management
 */
export function useStatistics(): UseStatisticsReturn {
  const [stats, setStats] = useState<PathStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch statistics from backend API
  const fetchStats = async () => {
    try {
      const response = await fetch(`${OBSERVER_API_URL}/observer/atlas/statistics`);

      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const data = await response.json();
      setStats(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      logger.error("api", "Error fetching statistics", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  // Clear cache function
  const clearCache = async () => {
    if (!confirm("Are you sure you want to clear all cached paths? This cannot be undone.")) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(`${OBSERVER_API_URL}/observer/atlas/paths/cache`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear cache");
      }

      const data = await response.json();
      alert(`Successfully cleared ${data.deleted_count} cached paths`);

      // Refresh statistics
      await fetchStats();
    } catch (err) {
      logger.error("api", "Error clearing cache", err);
      alert("Error clearing cache. Check console.");
    } finally {
      setIsClearing(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchStats();

    // Refresh every 10 seconds while paths are computing
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    error,
    isClearing,
    clearCache,
    refresh: fetchStats,
  };
}
