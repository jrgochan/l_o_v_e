/**
 * Waypoint Detail Modal Component
 *
 * Comprehensive modal showing why a waypoint was chosen,
 * how to transition to it, and how it relates to other steps.
 *
 * Styled to match the premium "Control Deck" aesthetic of HelpModal.
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { PathWaypoint, EmotionPath } from "@/types/atlas-admin";

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
    name?: string;
    evidence_level?: string;
    description?: string;
    time_commitment?: string;
    category?: string;
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
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const setFocusedEmotion = useAtlasAdminStore((state) => state.setFocusedEmotion);

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

  // Safe current step retrieval
  const currentStep = allSteps[Math.max(0, Math.min(waypointIndex, allSteps.length - 1))];

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
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-cyan-500/50">
        {/* Header - Matches HelpModal Style */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white max-w-2xl truncate">
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

            <p className="text-sm text-gray-400 mt-1">
              Step {waypointIndex + 1} of {allSteps.length} in journey from{" "}
              <span className="text-gray-300">{path.from.name}</span> →{" "}
              <span className="text-gray-300">{path.to.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700" role="tablist">
          <button
            onClick={() => setActiveTab("why")}
            role="tab"
            aria-selected={activeTab === "why"}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === "why"
                ? "text-white bg-gray-800 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
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
                ? "text-white bg-gray-800 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
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
                ? "text-white bg-gray-800 border-b-2 border-cyan-500"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
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
                <h3 className="text-lg font-semibold text-white mb-3">Psychological Purpose</h3>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-300 leading-relaxed font-serif text-lg">
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
                  <h3 className="text-lg font-semibold text-white mb-3">VAC Dimensional Shifts</h3>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
                    {/* Using custom colors for V, A, C */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Valence */}
                      <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">
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
                          <p className="text-xs text-gray-500 mt-2 italic">
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
                      <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">
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
                          <p className="text-xs text-gray-500 mt-2 italic">
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
                      <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 uppercase tracking-wider">
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
                          <p className="text-xs text-gray-500 mt-2 italic">
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
                    <h3 className="text-lg font-semibold text-white mb-3">Research Foundation</h3>
                    <div className="space-y-3">
                      {currentStep.explanation.research_citations.map((citation, idx: number) => (
                        <div
                          key={idx}
                          className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4"
                        >
                          <p className="text-sm font-semibold text-blue-300">
                            {citation.author} ({citation.year})
                          </p>
                          <p className="text-xs text-gray-500 italic mt-0.5">{citation.work}</p>
                          <p className="text-sm text-gray-300 mt-2">{citation.key_finding}</p>
                          {citation.quote && (
                            <p className="text-xs text-gray-400 mt-3 pl-3 border-l-2 border-blue-500/50 italic">
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
                <h3 className="text-lg font-semibold text-white mb-3">Position in Journey</h3>
                <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm border border-gray-700/50">
                  <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-mono">
                      {Math.round((waypointIndex / (allSteps.length - 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-400">Step</span>
                    <span className="text-white">
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
                <h3 className="text-lg font-semibold text-white mb-3">
                  Recommended Strategies
                  {currentStep.strategies && (
                    <span className="ml-2 text-sm text-gray-400">
                      ({currentStep.strategies.length})
                    </span>
                  )}
                </h3>
                {currentStep.strategies && currentStep.strategies.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {currentStep.strategies.map((strategy, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500/30 transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-white font-bold text-lg">{strategy.name}</h4>
                          {strategy.evidence_level && (
                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/20">
                              {strategy.evidence_level}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                          {strategy.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400 bg-gray-900/50 p-2 rounded">
                          {strategy.time_commitment && <span>⏱️ {strategy.time_commitment}</span>}
                          {strategy.category && <span>📂 {strategy.category}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                    <p className="text-gray-400">
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
                    <h3 className="text-lg font-semibold text-white mb-3">✅ Signs of Readiness</h3>
                    <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4">
                      <ul className="space-y-3">
                        {currentStep.explanation.readiness_signs.map(
                          (sign: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
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
                <section className="relative pl-6 border-l-2 border-gray-700">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-700 border-2 border-gray-900" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">
                    From: <span className="text-white">{previousEmotion.emotion}</span>
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
                    <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
                      What Changed
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
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

                    <div className="mt-4 pt-3 border-t border-gray-700/50">
                      <p className="text-sm text-gray-400 italic">
                        &quot;{currentStep.reasoning}&quot;
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Current Step (Visual Spacer) */}
              <div className="pl-6 border-l-2 border-cyan-500 py-4">
                <div className="bg-cyan-900/20 border border-cyan-500/30 p-3 rounded text-cyan-200 text-sm font-bold text-center">
                  Current: {currentStep.emotion}
                </div>
              </div>

              {/* Next Step */}
              {nextEmotion && (
                <section className="relative pl-6 border-l-2 border-gray-700">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-700 border-2 border-gray-900" />
                  <div className="absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-gray-800" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">
                    To: <span className="text-white">{nextEmotion.emotion}</span>
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
                    <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                      Enables Transition
                    </h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Looking forward to {nextEmotion.emotion}.
                    </p>
                  </div>
                </section>
              )}

              {/* Full Path Context - Enhanced with Labels */}
              <section>
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
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
                                    ${i === waypointIndex ? "opacity-100 text-cyan-400" : "opacity-0 group-hover:opacity-100 text-gray-500"}
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
                                        ? "bg-cyan-900/40 text-cyan-200 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-110 z-10"
                                        : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
                                    }
                                    ${step.type === "start" ? "ring-1 ring-blue-500/30" : ""}
                                    ${step.type === "end" ? "ring-1 ring-green-500/30" : ""}
                                `}
                          >
                            {step.emotion}
                          </button>
                        </div>

                        {/* Arrow if not last */}
                        {i < allSteps.length - 1 && <span className="text-gray-700 mx-1">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur">
          <>
            <button
              onClick={() => onNavigate?.(waypointIndex - 1)}
              disabled={waypointIndex === 0}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition border border-gray-700"
            >
              ← Previous
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Navigation</span>
              <div className="flex gap-1 mt-1">
                {allSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onNavigate?.(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === waypointIndex ? "bg-cyan-500 scale-125" : "bg-gray-700 hover:bg-gray-500"}`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => onNavigate?.(waypointIndex + 1)}
              disabled={waypointIndex === allSteps.length - 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition border border-gray-700"
            >
              Next →
            </button>
          </>
        </div>
      </div>
    </div>
  );
}
