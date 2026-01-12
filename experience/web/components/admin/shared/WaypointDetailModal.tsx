/**
 * Waypoint Detail Modal Component
 *
 * Comprehensive modal showing why a waypoint was chosen,
 * how to transition to it, and how it relates to other steps.
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { PathWaypoint, EmotionPath } from "@/types/atlas-admin";

type TabType = "why" | "how" | "relations";

interface WaypointDetailModalProps {
  waypoint: PathWaypoint;
  waypointIndex: number;
  path: EmotionPath;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function WaypointDetailModal({
  waypoint,
  waypointIndex,
  path,
  onClose,
  onNavigate,
}: WaypointDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("why");
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const setFocusedEmotion = useAtlasAdminStore((state) => state.setFocusedEmotion);

  // Find and highlight the waypoint emotion in 3D when modal opens or navigates
  useEffect(() => {
    const waypointEmotion = allEmotions.find((e) => e.name === waypoint.emotion);
    if (waypointEmotion) {
      setFocusedEmotion(waypointEmotion.id);
    }

    // Clear focus when modal closes
    return () => {
      setFocusedEmotion(null);
    };
  }, [waypoint, allEmotions, setFocusedEmotion]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow standard Tab navigation, do not interfere

      // Arrow keys for Waypoint Navigation
      if (e.key === "ArrowLeft") {
        if (waypointIndex > 0) {
          onNavigate?.(waypointIndex - 1);
        }
      } else if (e.key === "ArrowRight") {
        if (waypointIndex < path.waypoints.length - 1) {
          onNavigate?.(waypointIndex + 1);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [waypointIndex, path.waypoints.length, onNavigate, onClose]);

  // Get previous and next emotions in the path
  const previousEmotion = useMemo(
    () =>
      waypointIndex === 0
        ? path.from
        : {
            name: path.waypoints[waypointIndex - 1].emotion,
            vac: path.waypoints[waypointIndex - 1].vac,
          },
    [waypointIndex, path.from, path.waypoints]
  );

  const nextEmotion = useMemo(
    () =>
      waypointIndex === path.waypoints.length - 1
        ? path.to
        : {
            name: path.waypoints[waypointIndex + 1].emotion,
            vac: path.waypoints[waypointIndex + 1].vac,
          },
    [waypointIndex, path.to, path.waypoints]
  );

  // Calculate VAC shifts
  const vacShifts = useMemo(() => {
    const prev = previousEmotion.vac;
    const current = waypoint.vac;

    return {
      valence: {
        change: (current[0] - prev[0]).toFixed(3),
        direction:
          current[0] > prev[0]
            ? "↑ More Positive"
            : current[0] < prev[0]
              ? "↓ More Negative"
              : "→ No Change",
      },
      arousal: {
        change: (current[1] - prev[1]).toFixed(3),
        direction:
          current[1] > prev[1]
            ? "↑ Higher Arousal"
            : current[1] < prev[1]
              ? "↓ Lower Arousal"
              : "→ No Change",
      },
      connection: {
        change: (current[2] - prev[2]).toFixed(3),
        direction:
          current[2] > prev[2]
            ? "↑ More Connected"
            : current[2] < prev[2]
              ? "↓ Less Connected"
              : "→ No Change",
      },
    };
  }, [previousEmotion, waypoint]);

  const hasNavigation = path.waypoints.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Waypoint: {waypoint.emotion}</h2>
            <p className="text-sm text-gray-400 mt-1">
              Step {waypointIndex + 2} of {path.waypoints.length + 2} in journey from{" "}
              {path.from.name} → {path.to.name}
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
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-300 leading-relaxed">
                    {waypoint.explanation?.psychological_purpose ||
                      waypoint.reasoning ||
                      `${waypoint.emotion} serves as an intermediate state in this emotional transition.`}
                  </p>
                </div>
              </section>

              {/* VAC Dimensional Analysis - Use backend data if available */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">VAC Dimensional Shifts</h3>
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  {waypoint.explanation?.vac_analysis ? (
                    // Use backend analysis
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">
                            Valence (Positive/Negative):
                          </span>
                          <span className="text-white font-mono">
                            {waypoint.explanation.vac_analysis.valence_shift.delta}
                          </span>
                        </div>
                        <p className="text-sm text-cyan-400">
                          {waypoint.explanation.vac_analysis.valence_shift.interpretation}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {waypoint.explanation.vac_analysis.valence_shift.psychological_meaning}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">Arousal (Energy Level):</span>
                          <span className="text-white font-mono">
                            {waypoint.explanation.vac_analysis.arousal_shift.delta}
                          </span>
                        </div>
                        <p className="text-sm text-cyan-400">
                          {waypoint.explanation.vac_analysis.arousal_shift.interpretation}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {waypoint.explanation.vac_analysis.arousal_shift.psychological_meaning}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">Connection (With Others):</span>
                          <span className="text-white font-mono">
                            {waypoint.explanation.vac_analysis.connection_shift.delta}
                          </span>
                        </div>
                        <p className="text-sm text-cyan-400">
                          {waypoint.explanation.vac_analysis.connection_shift.interpretation}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {waypoint.explanation.vac_analysis.connection_shift.psychological_meaning}
                        </p>
                      </div>
                    </>
                  ) : (
                    // Fallback to local calculation
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">
                            Valence (Positive/Negative):
                          </span>
                          <span className="text-white font-mono">{vacShifts.valence.change}</span>
                        </div>
                        <p className="text-sm text-cyan-400">{vacShifts.valence.direction}</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">Arousal (Energy Level):</span>
                          <span className="text-white font-mono">{vacShifts.arousal.change}</span>
                        </div>
                        <p className="text-sm text-cyan-400">{vacShifts.arousal.direction}</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">Connection (With Others):</span>
                          <span className="text-white font-mono">
                            {vacShifts.connection.change}
                          </span>
                        </div>
                        <p className="text-sm text-cyan-400">{vacShifts.connection.direction}</p>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Research Citations */}
              {waypoint.explanation?.research_citations &&
                waypoint.explanation.research_citations.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">Research Foundation</h3>
                    <div className="space-y-3">
                      {waypoint.explanation.research_citations.map((citation, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3"
                        >
                          <p className="text-sm font-semibold text-blue-300">
                            {citation.author} ({citation.year})
                          </p>
                          <p className="text-xs text-gray-400 italic mt-1">{citation.work}</p>
                          <p className="text-sm text-gray-300 mt-2">{citation.key_finding}</p>
                          {citation.quote && (
                            <p className="text-xs text-gray-400 mt-2 pl-3 border-l-2 border-blue-500">
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
                <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Progress:</span>
                    <span className="text-white">
                      {Math.round(((waypointIndex + 1) / (path.waypoints.length + 1)) * 100)}%
                      Complete
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Step:</span>
                    <span className="text-white">
                      {waypointIndex + 2} of {path.waypoints.length + 2}
                    </span>
                  </div>
                  {waypoint.estimated_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estimated Time:</span>
                      <span className="text-white">{waypoint.estimated_time}</span>
                    </div>
                  )}
                  {waypoint.difficulty && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Difficulty:</span>
                      <span className="text-white capitalize">{waypoint.difficulty}</span>
                    </div>
                  )}
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
                  {waypoint.strategies && (
                    <span className="ml-2 text-sm text-gray-400">
                      ({waypoint.strategies.length})
                    </span>
                  )}
                </h3>
                {waypoint.strategies && waypoint.strategies.length > 0 ? (
                  <div className="space-y-3">
                    {waypoint.strategies.map((strategy, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-semibold">{strategy.name}</h4>
                          {strategy.evidence_level && (
                            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                              {strategy.evidence_level}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{strategy.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {strategy.time_commitment && <span>⏱️ {strategy.time_commitment}</span>}
                          {strategy.category && <span>📂 {strategy.category}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">
                      No specific strategies provided for this waypoint. General emotional
                      regulation techniques may be helpful.
                    </p>
                  </div>
                )}
              </section>

              {/* Readiness Signs */}
              {waypoint.explanation?.readiness_signs &&
                waypoint.explanation.readiness_signs.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">✅ Signs of Readiness</h3>
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <ul className="space-y-2">
                        {waypoint.explanation.readiness_signs.map((sign, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-green-400 mt-0.5">✓</span>
                            <span>{sign}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

              {/* Warning Signs */}
              {waypoint.explanation?.warning_signs &&
                waypoint.explanation.warning_signs.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">⚠️ Important Warnings</h3>
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <ul className="space-y-2">
                        {waypoint.explanation.warning_signs.map((warning, idx) => (
                          <li key={idx} className="text-sm text-yellow-200">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
            </div>
          )}

          {activeTab === "relations" && (
            <div className="space-y-6">
              {/* Previous Step - Use backend context if available */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">
                  From: {previousEmotion.name}
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-cyan-400">What Changed:</h4>
                  {waypoint.explanation?.previous_context?.what_changed &&
                  waypoint.explanation.previous_context.what_changed.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      {waypoint.explanation.previous_context.what_changed.map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  ) : (
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
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-1">
                      Why This Order Matters:
                    </h4>
                    <p className="text-sm text-gray-300">
                      {waypoint.explanation?.previous_context?.why_necessary ||
                        waypoint.reasoning ||
                        `${waypoint.emotion} provides a necessary intermediate step, preparing you for ${nextEmotion.name}.`}
                    </p>
                    {waypoint.explanation?.previous_context?.research && (
                      <p className="text-xs text-blue-300 mt-2 italic">
                        — {waypoint.explanation.previous_context.research.author} (
                        {waypoint.explanation.previous_context.research.year})
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Next Step - Use backend context if available */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">To: {nextEmotion.name}</h3>
                <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-green-400">
                    What This Waypoint Enables:
                  </h4>
                  {waypoint.explanation?.next_context?.what_this_enables &&
                  waypoint.explanation.next_context.what_this_enables.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      {waypoint.explanation.next_context.what_this_enables.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      <li>
                        {waypoint.emotion} creates foundation for {nextEmotion.name}
                      </li>
                      {waypoint.vac[1] < 0.3 && (
                        <li>Regulated arousal allows for complex emotional processing</li>
                      )}
                      {waypoint.vac[2] > 0.5 && (
                        <li>Positive connection enables vulnerability and growth</li>
                      )}
                      {waypoint.vac[0] > 0 && (
                        <li>Positive valence makes next step more accessible</li>
                      )}
                    </ul>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="text-sm font-semibold text-green-400 mb-1">
                      How It Prepares You:
                    </h4>
                    <p className="text-sm text-gray-300">
                      {waypoint.explanation?.next_context?.preparation ||
                        `By reaching ${waypoint.emotion}, you develop the emotional capacity needed for ${nextEmotion.name}. This step is psychologically necessary for the transition to succeed.`}
                    </p>
                    {waypoint.explanation?.next_context?.research && (
                      <p className="text-xs text-blue-300 mt-2 italic">
                        — {waypoint.explanation.next_context.research.author} (
                        {waypoint.explanation.next_context.research.year})
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Full Path Context */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">Full Journey Context</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400">{path.from.name}</span>
                    <span className="text-gray-500">→</span>
                    {path.waypoints.map((wp, i) => (
                      <span
                        key={i}
                        className={`${i === waypointIndex ? "text-cyan-400 font-bold" : "text-gray-400"}`}
                      >
                        {wp.emotion}
                        {i < path.waypoints.length - 1 && (
                          <span className="text-gray-600 mx-1">→</span>
                        )}
                      </span>
                    ))}
                    <span className="text-gray-500">→</span>
                    <span className="text-green-400">{path.to.name}</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800/50">
          {hasNavigation ? (
            <>
              <button
                onClick={() => onNavigate?.(waypointIndex - 1)}
                disabled={waypointIndex === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition"
              >
                ← Previous Waypoint
              </button>
              <span className="text-sm text-gray-400">
                Waypoint {waypointIndex + 1} of {path.waypoints.length}
              </span>
              <button
                onClick={() => onNavigate?.(waypointIndex + 1)}
                disabled={waypointIndex === path.waypoints.length - 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition"
              >
                Next Waypoint →
              </button>
            </>
          ) : (
            <div className="text-sm text-gray-400 mx-auto">Only waypoint in this path</div>
          )}
        </div>
      </div>
    </div>
  );
}
