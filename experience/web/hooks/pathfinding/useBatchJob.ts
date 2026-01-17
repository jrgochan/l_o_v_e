import { useState, useRef, useEffect, useCallback } from "react";
import { logger } from "@/utils/logger";

const OBSERVER_API_URL = process.env.NEXT_PUBLIC_OBSERVER_API_URL || "http://localhost:8000";
const POLL_INTERVAL = 2000;

export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
}

export function useBatchJob(onComplete?: () => void, onFail?: (error: string) => void) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ current: 0, total: 0, percentage: 0 });
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>("");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startJob = useCallback((jobId: string, total: number) => {
    setCurrentJobId(jobId);
    setIsComputing(true);
    setProgress({ current: 0, total: total, percentage: 0 });
  }, []);

  const pollProgress = useCallback(async () => {
    // currentJobId is guaranteed by useEffect guard

    try {
      const response = await fetch(
        `${OBSERVER_API_URL}/observer/atlas/computation-status/${currentJobId}`
      );

      if (response.ok) {
        const status = await response.json();

        setProgress({
          current: status.completed_paths,
          total: status.total_paths,
          percentage: status.percentage,
        });

        setEstimatedTimeRemaining(status.estimated_time_remaining || "");

        if (status.status === "completed" || status.status === "failed") {
          setIsComputing(false);
          setCurrentJobId(null);

          if (status.status === "completed") {
            onComplete?.();
          } else {
            onFail?.(status.error_message);
          }
        }
      }
    } catch (err) {
      logger.error("api", "Error polling job status", err);
    }
  }, [currentJobId, onComplete, onFail]);

  useEffect(() => {
    if (!currentJobId || !isComputing) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    pollProgress();
    pollIntervalRef.current = setInterval(pollProgress, POLL_INTERVAL);

    return () => {
      /* istanbul ignore next */
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentJobId, isComputing, pollProgress]);

  return {
    startJob,
    isComputing,
    progress,
    estimatedTimeRemaining,
    setProgress, // Exposed for reset
  };
}
