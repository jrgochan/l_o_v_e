import { useState, useEffect, useRef } from "react";
import type { SessionMetrics, VACHistoryPoint, EmotionTimelineEvent } from "@/types/chat";

export function useChatSessionState() {
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>(() => ({
    startTime: new Date(),
    elapsedSeconds: 0,
    emotionCount: 0,
    averageConfidence: 0,
    dominantCategory: null,
    alertCount: {
      critical: 0,
      warning: 0,
      attention: 0,
    },
  }));
  const [vacHistory, setVacHistory] = useState<VACHistoryPoint[]>([]);
  const [emotionTimeline, setEmotionTimeline] = useState<EmotionTimelineEvent[]>([]);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Initialize session start time lazily
  if (sessionStartTimeRef.current === null) {
    sessionStartTimeRef.current = new Date();
  }

  // Update session metrics timer
  useEffect(() => {
    const interval = setInterval(() => {
      // Ref is guaranteed initialized in render body
      const startTime = sessionStartTimeRef.current!;
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setSessionMetrics((prev) => ({
        ...prev,
        elapsedSeconds: elapsed,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    sessionMetrics,
    setSessionMetrics,
    vacHistory,
    setVacHistory,
    emotionTimeline,
    setEmotionTimeline,
  };
}
