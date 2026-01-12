/**
 * Analysis Panel Component
 *
 * Right-side panel showing real-time analysis data
 * Updates progressively as data arrives from Listener/Observer
 */

"use client";

import type {
  VAC,
  InsightData,
  AnalysisExpandState,
  SessionMetrics,
  VACHistoryPoint,
  EmotionTimelineEvent,
  MultiEmotionAnalysis,
  ThreeWayAnalysis,
  ProsodyData,
} from "@/types/chat";
import { useEmotionNavigation } from "@/hooks/useEmotionNavigation";
import { ClinicalDashboard } from "../ClinicalDashboard";
import { MultiEmotionCard } from "../emotion-display/MultiEmotionCard";

interface AnalysisPanelProps {
  // Single emotion mode props
  transcription: string | null;
  prosody: ProsodyData | null;
  emotion: string | null;
  category: string | null;
  vac: VAC | null;
  confidence: number | null;
  insights: InsightData | null;

  // Multi-emotion mode props
  multiEmotionAnalysis: MultiEmotionAnalysis | null;
  deepFeelingMode: boolean;

  // 3-way analysis
  threeWayAnalysis?: ThreeWayAnalysis | null;

  // Common props
  expandState: AnalysisExpandState;
  onToggleExpansion: () => void;
  sessionMetrics: SessionMetrics;
  vacHistory: VACHistoryPoint[];
  emotionTimeline: EmotionTimelineEvent[];
  audioBlob: Blob | null;
}

export function AnalysisPanel({
  transcription,
  prosody,
  emotion,
  category,
  vac,
  confidence,
  insights,
  multiEmotionAnalysis,
  deepFeelingMode,
  threeWayAnalysis,
  expandState,
  onToggleExpansion,
  sessionMetrics,
  vacHistory,
  emotionTimeline,
  audioBlob,
}: AnalysisPanelProps) {
  const hasData = transcription || prosody || emotion || insights || multiEmotionAnalysis;
  const hasEmotionData = deepFeelingMode ? multiEmotionAnalysis : emotion && vac;

  // Navigation hooks for Soul Sphere integration
  const { viewInSphere, addToSelection } = useEmotionNavigation();

  // Get expansion icon based on state
  const getExpansionIcon = () => {
    if (expandState === "normal") return "⊡";
    if (expandState === "expanded") return "⛶";
    return "⊟"; // fullscreen
  };

  // Get expansion tooltip
  const getExpansionTooltip = () => {
    if (expandState === "normal") return "Expand analysis (Ctrl+Shift+A)";
    if (expandState === "expanded") return "Fullscreen mode (Ctrl+Shift+A)";
    return "Return to normal (Ctrl+Shift+A or Esc)";
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header with expansion control */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/80">
        <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
          📊 Clinical Analysis
          {expandState !== "normal" && (
            <span className="px-2 py-0.5 bg-cyan-600 rounded text-xs text-white">
              {expandState === "expanded" ? "Expanded" : "Fullscreen"}
            </span>
          )}
        </h4>
        <button
          onClick={onToggleExpansion}
          className="p-1.5 hover:bg-gray-700 rounded transition text-cyan-400 hover:text-cyan-300"
          title={getExpansionTooltip()}
          aria-label={getExpansionTooltip()}
        >
          <span className="text-lg">{getExpansionIcon()}</span>
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Clinical Dashboard - Always visible when there's data */}
        {hasData && (
          <div className="p-4 border-b border-gray-700">
            <ClinicalDashboard
              emotion={emotion}
              category={category}
              vac={vac}
              confidence={confidence}
              prosody={prosody}
              insights={insights}
              sessionMetrics={sessionMetrics}
              expandState={expandState}
              vacHistory={vacHistory}
              emotionTimeline={emotionTimeline}
              audioBlob={audioBlob}
              multiEmotionData={
                multiEmotionAnalysis
                  ? {
                      emotions: multiEmotionAnalysis.emotions,
                      relationships: multiEmotionAnalysis.relationships,
                      aggregate: multiEmotionAnalysis.aggregate,
                    }
                  : null
              }
              threeWayAnalysis={threeWayAnalysis}
              onEmotionClick={(emotionName) => viewInSphere(emotionName)}
            />
          </div>
        )}

        {!hasData && (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
            <div>
              <p className="text-lg mb-2">📊 Analysis Panel</p>
              <p className="text-sm">Send a message or voice recording to see analysis data here</p>
            </div>
          </div>
        )}

        {hasData && (
          <div className="p-4 space-y-4">
            {/* Transcription */}
            {transcription && (
              <div className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30 animate-fade-in">
                <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                  📝 Transcription
                  <span className="text-green-400">✓</span>
                </h4>
                <p className="text-sm text-gray-200">{transcription}</p>
              </div>
            )}

            {/* Prosody */}
            {prosody && (
              <div className="bg-gray-700/50 rounded-lg p-4 border border-purple-500/30 animate-fade-in">
                <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  🎵 Voice Characteristics
                  <span className="text-green-400">✓</span>
                </h4>
                <div className="space-y-2 text-xs">
                  {prosody.pitch_mean && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pitch:</span>
                      <span className="text-white font-mono">
                        {prosody.pitch_mean.toFixed(1)} Hz
                      </span>
                    </div>
                  )}
                  {prosody.energy && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Energy:</span>
                      <span className="text-white font-mono">{prosody.energy.toFixed(3)}</span>
                    </div>
                  )}
                  {prosody.rate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Speech Rate:</span>
                      <span className="text-white font-mono">
                        {prosody.rate.toFixed(1)} syll/sec
                      </span>
                    </div>
                  )}
                  {prosody.interpretation && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                      <p className="text-gray-300 text-xs italic">
                        {Object.values(prosody.interpretation).join(" • ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emotion Analysis - Single or Multi-Emotion Mode */}
            {hasEmotionData && (
              <div className="bg-gray-700/50 rounded-lg p-4 border border-pink-500/30 animate-fade-in">
                <h4 className="text-sm font-semibold text-pink-400 mb-3 flex items-center gap-2">
                  {deepFeelingMode ? "🌊 Deep Feeling Analysis" : "💜 Emotional Analysis"}
                  <span className="text-green-400">✓</span>
                  {deepFeelingMode && (
                    <span className="ml-auto text-xs bg-purple-600 px-2 py-0.5 rounded">
                      Multi-Emotion
                    </span>
                  )}
                </h4>

                {/* Multi-Emotion Mode */}
                {deepFeelingMode && multiEmotionAnalysis ? (
                  <MultiEmotionCard
                    emotions={multiEmotionAnalysis.emotions}
                    relationships={multiEmotionAnalysis.relationships}
                    aggregate={multiEmotionAnalysis.aggregate}
                    onEmotionClick={(emotionName) => viewInSphere(emotionName)}
                  />
                ) : (
                  /* Single Emotion Mode */
                  emotion &&
                  vac && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-bold text-white">{emotion}</p>
                        {category && <p className="text-xs text-gray-400 mt-1">{category}</p>}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-pink-300">Valence:</span>
                          <span className="font-mono text-white">{vac.valence.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-pink-300">Arousal:</span>
                          <span className="font-mono text-white">{vac.arousal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-pink-300">Connection:</span>
                          <span className="font-mono text-white">{vac.connection.toFixed(2)}</span>
                        </div>
                        {confidence !== null && (
                          <div className="flex justify-between pt-2 border-t border-pink-500/20">
                            <span className="text-pink-300">Confidence:</span>
                            <span className="font-mono text-white">
                              {(confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Navigation Actions */}
                      <div className="pt-3 border-t border-pink-500/20 flex flex-wrap gap-2">
                        <button
                          onClick={() => viewInSphere(emotion)}
                          className="flex-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs rounded transition font-medium"
                          title="View this emotion in the Soul Sphere"
                        >
                          🔍 View in Sphere
                        </button>
                        <button
                          onClick={() => addToSelection(emotion)}
                          className="flex-1 px-3 py-1.5 bg-pink-700 hover:bg-pink-600 text-white text-xs rounded transition"
                          title="Add to multi-selection (keeps chat open)"
                        >
                          ➕ Add
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Insights */}
            {insights && (
              <div className="bg-gray-700/50 rounded-lg p-4 border border-amber-500/30 animate-fade-in">
                <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                  🤖 AI Insights
                  <span className="text-green-400">✓</span>
                </h4>
                <div className="text-sm text-gray-200 whitespace-pre-wrap">{insights.summary}</div>
                {insights.guidance && (
                  <div className="mt-3 pt-3 border-t border-amber-500/20">
                    <p className="text-xs text-amber-300 italic">{insights.guidance}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
