/**
 * Waypoint Detail Modal Component
 *
 * Comprehensive modal showing why a waypoint was chosen,
 * how to transition to it, and how it relates to other steps.
 *
 * Styled to match the premium "Control Deck" aesthetic of HelpModal.
 */

"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";
import type { PathWaypoint, EmotionPath } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface JourneyStep {
  type: "start" | "end" | "waypoint";
  emotion: string;
  vac: [number, number, number];
  category: string;
  reasoning?: string;
  explanation?: {
    psychological_purpose: string;
    vac_analysis?: {
      valence_shift?: { psychological_meaning?: string };
      arousal_shift?: { psychological_meaning?: string };
      connection_shift?: { psychological_meaning?: string };
    };
    research_citations?: {
      author?: string;
      year?: string;
      work?: string;
      key_finding?: string;
      quote?: string;
    }[];
    readiness_signs?: string[];
    warning_signs?: string[];
  } | null;
  strategies?: {
    strategy_id?: string;
    name?: string;
    type?: string;
    evidence_level?: string;
    description?: string;
    time_required?: string;
    steps?: string[];
    difficulty_level?: number;
    effectiveness_rating?: number;
    times_successful_for_user?: number;
    match_reason?: string;
    // Legacy aliases
    id?: string;
    category?: string;
    time_commitment?: string;
  }[];
}

type TabType = "why" | "how" | "relations";

interface WaypointDetailModalProps {
  waypoint: PathWaypoint;
  waypointIndex: number;
  path: EmotionPath;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

// Helper for VAC Polarity Colors (consistent with Axis Labels)
// Helper for VAC Polarity Colors (consistent with Axis Labels)
function getVacColor(value: number, component: "V" | "A" | "C"): string {
  const colors = {
    V: { positive: "text-cyan-400", neutral: "text-gray-400", negative: "text-red-400" },
    A: { positive: "text-yellow-400", neutral: "text-gray-400", negative: "text-blue-400" },
    C: { positive: "text-purple-400", neutral: "text-gray-400", negative: "text-gray-400" }, // Negative C is Gray/Disconnected
  };
  if (value > 0.05) return colors[component].positive;
  if (value < -0.05) return colors[component].negative;
  return colors[component].neutral;
}

export function WaypointDetailModal({
  waypointIndex, // Now expects 0..totalLen-1 (where 0=Start, Last=End)
  path,
  onClose,
  onNavigate,
}: Omit<WaypointDetailModalProps, "waypoint"> & { waypoint?: PathWaypoint }) {
  const [activeTab, setActiveTab] = useState<TabType>("why");
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const theme = useAdminTheme();

  // On-demand strategy fetching for cached paths that lack strategy data
  const [fetchedStrategies, setFetchedStrategies] = useState<
    Record<number, JourneyStep["strategies"]>
  >({});
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(false);
  const [strategyFetchError, setStrategyFetchError] = useState<string | null>(null);
  const fetchedIndicesRef = useRef<Set<number>>(new Set());

  const setFocusedEmotion = useVisualizationStore((state) => state.setFocusedEmotion);

  // Construct unified steps array [Start, ...Waypoints, End]
  const allSteps = useMemo(() => {
    if (!path) return [];

    const startStep = {
      emotion: path.from.name,
      vac: path.from.vac,
      category: path.from.category,
      reasoning: "Emotional Origin",
      explanation: {
        psychological_purpose: "The starting point of your emotional journey.",
        vac_analysis: null,
        research_citations: [],
        readiness_signs: [],
        warning_signs: [],
      },
      strategies: [],
      type: "start",
    };

    const intermediateSteps = path.waypoints.map((wp) => ({ ...wp, type: "waypoint" }));

    const endStep = {
      emotion: path.to.name,
      vac: path.to.vac,
      category: path.to.category,
      reasoning: "Emotional Destination",
      explanation: {
        psychological_purpose: "The desired end state of this transition.",
        vac_analysis: null,
        research_citations: [],
        readiness_signs: [],
        warning_signs: [],
      },
      strategies: [],
      type: "end",
    };

    return [startStep, ...intermediateSteps, endStep] as JourneyStep[];
  }, [path]);

  // Fetch strategies on-demand when empty (cached path scenario)
  const fetchStrategiesForStep = useCallback(
    async (stepIndex: number) => {
      if (fetchedIndicesRef.current.has(stepIndex)) return;
      const step = allSteps[stepIndex];

      // Get previous step's VAC for the from_vac parameter
      const prevStep = allSteps[Math.max(0, stepIndex - 1)];
      if (!prevStep?.vac || !step.vac) return;

      fetchedIndicesRef.current.add(stepIndex);
      setIsLoadingStrategies(true);
      setStrategyFetchError(null);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_OBSERVER_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/observer/strategies/for-transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_vac: Array.from(prevStep.vac),
            to_vac: Array.from(step.vac),
            limit: 5,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.strategies && data.strategies.length > 0) {
          setFetchedStrategies((prev) => ({ ...prev, [stepIndex]: data.strategies }));
          logger.info(
            "api",
            `Fetched ${data.strategies.length} strategies for waypoint ${stepIndex}`
          );
        }
      } catch (err) {
        logger.error("api", "Failed to fetch strategies", err);
        setStrategyFetchError("Could not load strategies. The backend may be unavailable.");
        fetchedIndicesRef.current.delete(stepIndex); // Allow retry
      } finally {
        setIsLoadingStrategies(false);
      }
    },
    [allSteps]
  );

  // Trigger fetch when navigating to a waypoint with empty strategies
  useEffect(() => {
    const safeIndex = Math.max(0, Math.min(waypointIndex, allSteps.length - 1));
    const step = allSteps[safeIndex];
    if (step && (!step.strategies || step.strategies.length === 0) && step.type === "waypoint") {
      fetchStrategiesForStep(safeIndex);
    }
  }, [waypointIndex, allSteps, fetchStrategiesForStep]);

  // Safe current step retrieval
  const currentStep = allSteps[Math.max(0, Math.min(waypointIndex, allSteps.length - 1))];

  // Merge inline strategies with any fetched on-demand
  const displayStrategies = useMemo(() => {
    const safeIdx = Math.max(0, Math.min(waypointIndex, allSteps.length - 1));
    const inline = currentStep?.strategies;
    if (inline && inline.length > 0) return inline;
    return fetchedStrategies[safeIdx] || [];
  }, [waypointIndex, allSteps, currentStep, fetchedStrategies]);

  // Find and highlight the waypoint emotion in 3D when modal opens or navigates
  useEffect(() => {
    const emotionName = currentStep?.emotion;
    if (emotionName) {
      const emotionObj = allEmotions.find((e) => e.name === emotionName);
      if (emotionObj) {
        setFocusedEmotion(emotionObj.id);
      }
    }

    // Clear focus when modal closes
    return () => {
      setFocusedEmotion(null);
    };
  }, [currentStep, allEmotions, setFocusedEmotion]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Stop propagation so parent overlay (if active) doesn't hijack keys
      e.stopPropagation();

      if (e.key === "ArrowLeft") {
        if (waypointIndex > 0) {
          onNavigate?.(waypointIndex - 1);
        }
      } else if (e.key === "ArrowRight") {
        if (waypointIndex < allSteps.length - 1) {
          onNavigate?.(waypointIndex + 1);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [waypointIndex, allSteps.length, onNavigate, onClose]);

  // Get previous and next emotions in the path
  const previousEmotion = useMemo(() => {
    if (waypointIndex === 0) return null; // Start has no prev
    return allSteps[waypointIndex - 1];
  }, [waypointIndex, allSteps]);

  const nextEmotion = useMemo(() => {
    if (waypointIndex === allSteps.length - 1) return null; // End has no next
    return allSteps[waypointIndex + 1];
  }, [waypointIndex, allSteps]);

  // Calculate VAC shifts (relative to previous, or neutral if start)
  const vacShifts = useMemo(() => {
    if (!previousEmotion || !currentStep) {
      // No shifts for start or invalid state
      return {
        valence: { change: "0.000", rawDelta: 0, direction: "Origin Point" },
        arousal: { change: "0.000", rawDelta: 0, direction: "Origin Point" },
        connection: { change: "0.000", rawDelta: 0, direction: "Origin Point" },
      };
    }
    const prev = previousEmotion.vac;
    const current = currentStep.vac;

    if (!prev || !current) {
      return {
        valence: { change: "0.000", rawDelta: 0, direction: "Data Unavailable" },
        arousal: { change: "0.000", rawDelta: 0, direction: "Data Unavailable" },
        connection: { change: "0.000", rawDelta: 0, direction: "Data Unavailable" },
      };
    }

    return {
      valence: {
        change: (current[0] - prev[0]).toFixed(3),
        rawDelta: current[0] - prev[0],
        direction:
          current[0] > prev[0]
            ? "↑ More Positive"
            : current[0] < prev[0]
              ? "↓ More Negative"
              : "→ No Change",
      },
      arousal: {
        change: (current[1] - prev[1]).toFixed(3),
        rawDelta: current[1] - prev[1],
        direction:
          current[1] > prev[1]
            ? "↑ Higher Arousal"
            : current[1] < prev[1]
              ? "↓ Lower Arousal"
              : "→ No Change",
      },
      connection: {
        change: (current[2] - prev[2]).toFixed(3),
        rawDelta: current[2] - prev[2],
        direction:
          current[2] > prev[2]
            ? "↑ More Connected"
            : current[2] < prev[2]
              ? "↓ Less Connected"
              : "→ No Change",
      },
    };
  }, [previousEmotion, currentStep]);

  if (!currentStep) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`${theme.colors.background} ${theme.layout.borderRadius} shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 ${theme.colors.border} transition-colors duration-500`}
      >
        {/* Header - Matches HelpModal Style */}
        <div
          className={`flex items-center justify-between p-6 border-b ${theme.colors.border} bg-black/30`}
        >
          <div>
            <div className="flex items-center gap-3">
              <h2 className={`text-2xl font-bold max-w-2xl truncate ${theme.colors.text.primary}`}>
                {currentStep.emotion}
              </h2>
              {currentStep.type === "start" && (
                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                  ORIGIN
                </span>
              )}
              {currentStep.type === "end" && (
                <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded border border-green-500/30">
                  GOAL
                </span>
              )}
            </div>

            <p className={`text-sm mt-1 ${theme.colors.text.secondary}`}>
              Step {waypointIndex + 1} of {allSteps.length} in journey from{" "}
              <span className={theme.colors.text.primary}>{path.from.name}</span> →{" "}
              <span className={theme.colors.text.primary}>{path.to.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 bg-black/30 border ${theme.colors.border} ${theme.colors.hover} ${theme.colors.text.primary} ${theme.layout.borderRadius} transition`}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b ${theme.colors.border}`} role="tablist">
          <button
            onClick={() => setActiveTab("why")}
            role="tab"
            aria-selected={activeTab === "why"}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === "why"
                ? `${theme.colors.text.primary} bg-black/20 border-b-2 ${theme.colors.primary.replace("text-", "border-")}`
                : `${theme.colors.text.secondary} ${theme.colors.hover}`
            }`}
          >
            💡 Why This Step
          </button>
          <button
            onClick={() => setActiveTab("how")}
            role="tab"
            aria-selected={activeTab === "how"}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === "how"
                ? `${theme.colors.text.primary} bg-black/20 border-b-2 ${theme.colors.primary.replace("text-", "border-")}`
                : `${theme.colors.text.secondary} ${theme.colors.hover}`
            }`}
          >
            🛤️ How to Transition
          </button>
          <button
            onClick={() => setActiveTab("relations")}
            role="tab"
            aria-selected={activeTab === "relations"}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === "relations"
                ? `${theme.colors.text.primary} bg-black/20 border-b-2 ${theme.colors.primary.replace("text-", "border-")}`
                : `${theme.colors.text.secondary} ${theme.colors.hover}`
            }`}
          >
            🔗 Relation to Others
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "why" && (
            <div className="space-y-6">
              {/* Psychological Purpose */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${theme.colors.text.primary}`}>
                  Psychological Purpose
                </h3>
                <div
                  className={`bg-black/20 ${theme.layout.borderRadius} p-4 border ${theme.colors.border} transition-colors duration-500`}
                >
                  <p
                    className={`leading-relaxed font-serif text-lg ${theme.colors.text.secondary}`}
                  >
                    {/* Handle explanation access safely since Start/End use different struct or mocks */}
                    {currentStep.explanation?.psychological_purpose ||
                      currentStep.reasoning ||
                      `${currentStep.emotion} is a key state in this journey.`}
                  </p>
                </div>
              </section>

              {/* VAC Dimensional Analysis - Skip if Start (no shifts) */}
              {currentStep.type !== "start" && (
                <section>
                  <h3 className={`text-lg font-semibold mb-3 ${theme.colors.text.primary}`}>
                    VAC Dimensional Shifts
                  </h3>
                  <div
                    className={`bg-black/20 ${theme.layout.borderRadius} p-4 space-y-4 border ${theme.colors.border} transition-colors duration-500`}
                  >
                    {/* Using custom colors for V, A, C */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Valence */}
                      <div
                        className={`bg-black/30 p-3 ${theme.layout.borderRadius} border ${theme.colors.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs uppercase tracking-wider ${theme.colors.text.muted}`}
                          >
                            Valence
                          </span>
                          <span
                            className={`font-mono font-bold ${getVacColor(vacShifts.valence.rawDelta, "V")}`}
                          >
                            {vacShifts.valence.change}
                          </span>
                        </div>
                        <p className={`text-sm ${getVacColor(vacShifts.valence.rawDelta, "V")}`}>
                          {vacShifts.valence.direction}
                        </p>
                        {/* Safely access explanation */}
                        {currentStep.explanation?.vac_analysis && (
                          <p className={`text-xs mt-2 italic ${theme.colors.text.muted}`}>
                            &quot;
                            {
                              currentStep.explanation?.vac_analysis?.valence_shift
                                ?.psychological_meaning
                            }
                            &quot;
                          </p>
                        )}
                      </div>

                      {/* Arousal */}
                      <div
                        className={`bg-black/30 p-3 ${theme.layout.borderRadius} border ${theme.colors.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs uppercase tracking-wider ${theme.colors.text.muted}`}
                          >
                            Arousal
                          </span>
                          <span
                            className={`font-mono font-bold ${getVacColor(vacShifts.arousal.rawDelta, "A")}`}
                          >
                            {vacShifts.arousal.change}
                          </span>
                        </div>
                        <p className={`text-sm ${getVacColor(vacShifts.arousal.rawDelta, "A")}`}>
                          {vacShifts.arousal.direction}
                        </p>
                        {currentStep.explanation?.vac_analysis && (
                          <p className={`text-xs mt-2 italic ${theme.colors.text.muted}`}>
                            &quot;
                            {
                              currentStep.explanation?.vac_analysis?.arousal_shift
                                ?.psychological_meaning
                            }
                            &quot;
                          </p>
                        )}
                      </div>

                      {/* Connection */}
                      <div
                        className={`bg-black/30 p-3 ${theme.layout.borderRadius} border ${theme.colors.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs uppercase tracking-wider ${theme.colors.text.muted}`}
                          >
                            Connection
                          </span>
                          <span
                            className={`font-mono font-bold ${getVacColor(vacShifts.connection.rawDelta, "C")}`}
                          >
                            {vacShifts.connection.change}
                          </span>
                        </div>
                        <p className={`text-sm ${getVacColor(vacShifts.connection.rawDelta, "C")}`}>
                          {vacShifts.connection.direction}
                        </p>
                        {currentStep.explanation?.vac_analysis && (
                          <p className={`text-xs mt-2 italic ${theme.colors.text.muted}`}>
                            &quot;
                            {
                              currentStep.explanation?.vac_analysis?.connection_shift
                                ?.psychological_meaning
                            }
                            &quot;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Research Citations */}
              {currentStep.explanation?.research_citations &&
                currentStep.explanation.research_citations.length > 0 && (
                  <section>
                    <h3 className={`text-lg font-semibold mb-3 ${theme.colors.text.primary}`}>
                      Research Foundation
                    </h3>
                    <div className="space-y-3">
                      {currentStep.explanation.research_citations.map((citation, idx: number) => (
                        <div
                          key={idx}
                          className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4"
                        >
                          <p className="text-sm font-semibold text-blue-300">
                            {citation.author} ({citation.year})
                          </p>
                          <p className={`text-xs italic mt-0.5 ${theme.colors.text.muted}`}>
                            {citation.work}
                          </p>
                          <p className={`text-sm mt-2 ${theme.colors.text.secondary}`}>
                            {citation.key_finding}
                          </p>
                          {citation.quote && (
                            <p
                              className={`text-xs mt-3 pl-3 border-l-2 border-blue-500/50 italic ${theme.colors.text.muted}`}
                            >
                              &quot;{citation.quote}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* Position in Journey */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${theme.colors.text.primary}`}>
                  Position in Journey
                </h3>
                <div
                  className={`bg-black/20 ${theme.layout.borderRadius} p-4 space-y-2 text-sm border ${theme.colors.border} transition-colors duration-500`}
                >
                  <div className={`flex justify-between border-b ${theme.colors.border} pb-2`}>
                    <span className={theme.colors.text.secondary}>Progress</span>
                    <span className={`font-mono ${theme.colors.text.primary}`}>
                      {Math.round((waypointIndex / (allSteps.length - 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className={theme.colors.text.secondary}>Step</span>
                    <span className={theme.colors.text.primary}>
                      {waypointIndex + 1} / {allSteps.length}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "how" && (
            <div className="space-y-6">
              {/* Recommended Strategies */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${theme.colors.text.primary}`}>
                  Recommended Strategies
                  {displayStrategies.length > 0 && (
                    <span className={`ml-2 text-sm ${theme.colors.text.muted}`}>
                      ({displayStrategies.length})
                    </span>
                  )}
                </h3>
                {isLoadingStrategies && displayStrategies.length === 0 ? (
                  <div
                    className={`bg-black/20 ${theme.layout.borderRadius} p-6 border ${theme.colors.border} text-center`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className={`w-5 h-5 border-2 ${theme.colors.primary.replace("text-", "border-")} border-t-transparent rounded-full animate-spin`}
                      />
                      <p className={theme.colors.text.secondary}>Loading strategies...</p>
                    </div>
                  </div>
                ) : strategyFetchError && displayStrategies.length === 0 ? (
                  <div
                    className={`bg-black/20 ${theme.layout.borderRadius} p-6 border border-red-900/30 text-center`}
                  >
                    <p className="text-red-400 text-sm">{strategyFetchError}</p>
                    <button
                      className={`mt-3 text-xs underline ${theme.colors.primary}`}
                      onClick={() => {
                        const safeIdx = Math.max(0, Math.min(waypointIndex, allSteps.length - 1));
                        fetchStrategiesForStep(safeIdx);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : displayStrategies.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {displayStrategies.map((strategy, index: number) => (
                      <details
                        key={index}
                        className={`group bg-black/20 ${theme.layout.borderRadius} border ${theme.colors.border} ${theme.colors.hover} transition-colors duration-300`}
                      >
                        <summary className="p-5 cursor-pointer list-none">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className={`font-bold text-lg ${theme.colors.text.primary}`}>
                                {strategy.name}
                              </h4>
                              {/* Match reason badge */}
                              {strategy.match_reason && strategy.match_reason !== "universal" && (
                                <span
                                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold border ${
                                    strategy.match_reason === "pattern"
                                      ? "bg-purple-900/30 text-purple-300 border-purple-500/30"
                                      : "bg-sky-900/30 text-sky-300 border-sky-500/30"
                                  }`}
                                >
                                  {strategy.match_reason === "pattern"
                                    ? "Pattern Match"
                                    : "VAC Profile"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {strategy.evidence_level && (
                                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/20">
                                  {strategy.evidence_level}
                                </span>
                              )}
                              <span
                                className={`text-xs group-open:rotate-180 transition-transform ${theme.colors.text.muted}`}
                              >
                                ▼
                              </span>
                            </div>
                          </div>

                          <p
                            className={`text-sm mb-3 leading-relaxed ${theme.colors.text.secondary}`}
                          >
                            {strategy.description}
                          </p>

                          {/* Metadata row */}
                          <div
                            className={`flex flex-wrap items-center gap-3 text-xs ${theme.colors.text.muted}`}
                          >
                            {(strategy.time_required || strategy.time_commitment) && (
                              <span>⏱️ {strategy.time_required || strategy.time_commitment}</span>
                            )}
                            {(strategy.type || strategy.category) && (
                              <span>📂 {strategy.type || strategy.category}</span>
                            )}
                            {typeof strategy.difficulty_level === "number" && (
                              <span className="flex items-center gap-1">
                                <span>Difficulty:</span>
                                <span className="flex gap-px">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <span
                                      key={level}
                                      className={`w-3 h-1.5 rounded-sm ${
                                        level <= (strategy.difficulty_level as number)
                                          ? level <= 2
                                            ? "bg-green-500"
                                            : level <= 3
                                              ? "bg-yellow-500"
                                              : "bg-red-400"
                                          : "bg-gray-700"
                                      }`}
                                    />
                                  ))}
                                </span>
                              </span>
                            )}
                            {typeof strategy.effectiveness_rating === "number" && (
                              <span>⭐ {strategy.effectiveness_rating.toFixed(1)}/5</span>
                            )}
                            {typeof strategy.times_successful_for_user === "number" &&
                              strategy.times_successful_for_user > 0 && (
                                <span className={theme.colors.primary}>
                                  ✓ Used {strategy.times_successful_for_user}× by you
                                </span>
                              )}
                          </div>
                        </summary>

                        {/* Expandable step-by-step instructions */}
                        {strategy.steps && strategy.steps.length > 0 && (
                          <div className={`px-5 pb-5 pt-2 border-t ${theme.colors.border}`}>
                            <h5
                              className={`text-sm font-semibold mb-3 uppercase tracking-wider ${theme.colors.primary}`}
                            >
                              Step-by-Step Guide
                            </h5>
                            <ol className="space-y-2">
                              {strategy.steps.map((step: string, stepIdx: number) => (
                                <li
                                  key={stepIdx}
                                  className={`flex items-start gap-3 text-sm ${theme.colors.text.secondary}`}
                                >
                                  <span
                                    className={`shrink-0 w-6 h-6 rounded-full bg-black/30 border ${theme.colors.border} flex items-center justify-center text-xs font-bold ${theme.colors.primary}`}
                                  >
                                    {stepIdx + 1}
                                  </span>
                                  <span className="pt-0.5">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </details>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`bg-black/20 ${theme.layout.borderRadius} p-6 border ${theme.colors.border} text-center`}
                  >
                    <p className={theme.colors.text.secondary}>
                      {currentStep.type === "start"
                        ? "Begin by acknowledging your current emotional state."
                        : currentStep.type === "end"
                          ? "You have reached your destination. Reflect on the journey."
                          : "No specific strategies provided for this waypoint."}
                    </p>
                  </div>
                )}
              </section>

              {/* Readiness Signs */}
              {currentStep.explanation?.readiness_signs &&
                currentStep.explanation.readiness_signs.length > 0 && (
                  <section>
                    <h3 className={`text-lg font-semibold mb-3 ${theme.colors.text.primary}`}>
                      ✅ Signs of Readiness
                    </h3>
                    <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4">
                      <ul className="space-y-3">
                        {currentStep.explanation.readiness_signs.map(
                          (sign: string, idx: number) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-3 text-sm ${theme.colors.text.secondary}`}
                            >
                              <span className="text-green-400 mt-0.5 bg-green-900/50 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                ✓
                              </span>
                              <span>{sign}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </section>
                )}
            </div>
          )}

          {activeTab === "relations" && (
            <div className="space-y-6">
              {/* Previous Step */}
              {previousEmotion && (
                <section className={`relative pl-6 border-l-2 ${theme.colors.border}`}>
                  <div
                    className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-black/50 border-2 ${theme.colors.border}`}
                  />
                  <h3 className={`text-lg font-semibold mb-2 ${theme.colors.text.secondary}`}>
                    From:{" "}
                    <span className={theme.colors.text.primary}>{previousEmotion.emotion}</span>
                  </h3>
                  <div
                    className={`bg-black/20 ${theme.layout.borderRadius} p-4 space-y-3 border ${theme.colors.border} transition-colors duration-500`}
                  >
                    <h4
                      className={`text-sm font-semibold uppercase tracking-wide ${theme.colors.primary}`}
                    >
                      What Changed
                    </h4>
                    <ul
                      className={`list-disc list-inside space-y-1 text-sm ${theme.colors.text.secondary}`}
                    >
                      {Math.abs(parseFloat(vacShifts.valence.change)) > 0.1 && (
                        <li>Emotional tone: {vacShifts.valence.direction}</li>
                      )}
                      {Math.abs(parseFloat(vacShifts.arousal.change)) > 0.1 && (
                        <li>Energy/activation: {vacShifts.arousal.direction}</li>
                      )}
                      {Math.abs(parseFloat(vacShifts.connection.change)) > 0.1 && (
                        <li>Connection to others: {vacShifts.connection.direction}</li>
                      )}
                    </ul>

                    <div className={`mt-4 pt-3 border-t ${theme.colors.border}`}>
                      <p className={`text-sm italic ${theme.colors.text.muted}`}>
                        &quot;{currentStep.reasoning}&quot;
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Current Step (Visual Spacer) */}
              <div
                className={`pl-6 border-l-2 py-4 ${theme.colors.primary.replace("text-", "border-")}`}
              >
                <div
                  className={`${theme.effects.glass} p-3 ${theme.layout.borderRadius} text-sm font-bold text-center ${theme.colors.primary}`}
                >
                  Current: {currentStep.emotion}
                </div>
              </div>

              {/* Next Step */}
              {nextEmotion && (
                <section className={`relative pl-6 border-l-2 ${theme.colors.border}`}>
                  <div
                    className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-black/50 border-2 ${theme.colors.border}`}
                  />
                  <div
                    className={`absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-black/30`}
                  />
                  <h3 className={`text-lg font-semibold mb-2 ${theme.colors.text.secondary}`}>
                    To: <span className={theme.colors.text.primary}>{nextEmotion.emotion}</span>
                  </h3>
                  <div
                    className={`bg-black/20 ${theme.layout.borderRadius} p-4 space-y-3 border ${theme.colors.border} transition-colors duration-500`}
                  >
                    <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                      Enables Transition
                    </h4>
                    <p className={`text-sm leading-relaxed ${theme.colors.text.secondary}`}>
                      Looking forward to {nextEmotion.emotion}.
                    </p>
                  </div>
                </section>
              )}

              {/* Full Path Context - Enhanced with Labels */}
              <section>
                <div
                  className={`bg-black/30 rounded-xl p-6 border ${theme.colors.border} transition-colors duration-500`}
                >
                  {/* Centered Path Viz */}
                  <div className="flex flex-wrap items-center gap-2 text-sm justify-center">
                    {/* Render ALL steps using allSteps array */}
                    {allSteps.map((step, i) => (
                      <div key={i} className="contents">
                        {/* Render Step Node */}
                        <div className="flex flex-col items-center group relative">
                          {/* Label above active/hover */}
                          <span
                            className={`absolute -top-6 text-[10px] uppercase font-bold tracking-wider transition-opacity whitespace-nowrap
                                    ${i === waypointIndex ? `opacity-100 ${theme.colors.primary}` : `opacity-0 group-hover:opacity-100 ${theme.colors.text.muted}`}
                                `}
                          >
                            {step.type === "start"
                              ? "Origin"
                              : step.type === "end"
                                ? "Goal"
                                : `Step ${i}`}
                          </span>

                          <button
                            onClick={() => onNavigate?.(i)}
                            className={`
                                    px-3 py-1 rounded-full border transition-all relative
                                    ${
                                      i === waypointIndex
                                        ? `${theme.effects.glass} ${theme.colors.primary} ${theme.effects.glow} scale-110 z-10`
                                        : `bg-black/20 ${theme.colors.text.muted} border ${theme.colors.border} ${theme.colors.hover}`
                                    }
                                    ${step.type === "start" ? "ring-1 ring-blue-500/30" : ""}
                                    ${step.type === "end" ? "ring-1 ring-green-500/30" : ""}
                                `}
                          >
                            {step.emotion}
                          </button>
                        </div>

                        {/* Arrow if not last */}
                        {i < allSteps.length - 1 && (
                          <span className={`mx-1 ${theme.colors.text.muted}`}>→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div
          className={`flex items-center justify-between p-4 border-t ${theme.colors.border} bg-black/50 ${theme.effects.backdropBlur}`}
        >
          <>
            <button
              onClick={() => onNavigate?.(waypointIndex - 1)}
              disabled={waypointIndex === 0}
              className={`px-4 py-2 bg-black/30 ${theme.colors.hover} disabled:opacity-50 disabled:cursor-not-allowed ${theme.colors.text.primary} ${theme.layout.borderRadius} transition border ${theme.colors.border}`}
            >
              ← Previous
            </button>
            <div className="flex flex-col items-center">
              <span className={`text-xs uppercase tracking-widest ${theme.colors.text.muted}`}>
                Navigation
              </span>
              <div className="flex gap-1 mt-1">
                {allSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onNavigate?.(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === waypointIndex ? `${theme.colors.primary.replace("text-", "bg-")} scale-125` : `bg-black/30 ${theme.colors.hover}`}`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => onNavigate?.(waypointIndex + 1)}
              disabled={waypointIndex === allSteps.length - 1}
              className={`px-4 py-2 bg-black/30 ${theme.colors.hover} disabled:opacity-50 disabled:cursor-not-allowed ${theme.colors.text.primary} ${theme.layout.borderRadius} transition border ${theme.colors.border}`}
            >
              Next →
            </button>
          </>
        </div>
      </div>
    </div>
  );
}
