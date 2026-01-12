/**
 * useModelAssignments Hook
 *
 * Manages AI model assignments for functions:
 * - Get current assignments
 * - Assign models to functions
 * - Get recommendations
 * - Get performance statistics
 */

import { useState, useCallback } from "react";
import { aiService } from "@/services/aiService";
import type {
  ModelAssignments,
  FunctionInfo,
  Recommendation,
  PerformanceStats,
} from "@/services/aiService";

export function useModelAssignments() {
  const [assignments, setAssignments] = useState<ModelAssignments | null>(null);
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation>>({});
  const [performance, setPerformance] = useState<Record<string, PerformanceStats>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.getAssignments();
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  const assignModel = useCallback(
    async (functionName: string, modelName: string) => {
      setError(null);
      try {
        await aiService.assignModel(functionName, modelName);
        await fetchAssignments();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign model");
        return false;
      }
    },
    [fetchAssignments]
  );

  const fetchRecommendations = useCallback(async () => {
    try {
      const data = await aiService.getRecommendations();
      setRecommendations(data);
    } catch {
      // Error handled in service logger
    }
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const data = await aiService.getPerformance();
      setPerformance(data);
    } catch {
      // Error handled in service logger
    }
  }, []);

  const fetchFunctions = useCallback(async () => {
    try {
      const data = await aiService.getFunctions();
      setFunctions(data);
    } catch {
      // Error handled in service logger
    }
  }, []);

  return {
    assignments,
    functions,
    recommendations,
    performance,
    loading,
    error,
    fetchAssignments,
    assignModel,
    fetchRecommendations,
    fetchPerformance,
    fetchFunctions,
  };
}

// Re-export types
export type { ModelAssignments, FunctionInfo, Recommendation, PerformanceStats };
