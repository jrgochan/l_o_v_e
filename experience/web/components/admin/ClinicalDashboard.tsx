/**
 * Clinical Dashboard Component
 *
 * Priority clinical information display for therapists and psychiatrists
 * Shows at-a-glance metrics, alerts, and key analysis data
 */

"use client";

import type {
  VAC,
  InsightData,
  AnalysisExpandState,
  SessionMetrics,
  VACHistoryPoint,
  EmotionTimelineEvent,
  DetectedEmotion,
  EmotionRelationship,
  AggregateState,
  ThreeWayAnalysis,
  ProsodyData,
} from "@/types/chat";
import { AlertBadge } from "./clinical/AlertBadge";
import { SessionMetricsDisplay } from "./clinical/SessionMetrics";
import { VACQuadrantViz } from "./clinical/VACQuadrantViz";
import { VoiceContentCorrelation } from "./clinical/VoiceContentCorrelation";
import { SessionTimeline } from "./clinical/SessionTimeline";
import { VACTrajectoryPlot } from "./clinical/VACTrajectoryPlot";
import { ProsodyVisualization } from "./clinical/ProsodyVisualization";
import { MultiEmotionTable } from "./clinical/MultiEmotionTable";
import { VoiceContentThreeWay } from "./clinical/VoiceContentThreeWay";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface ClinicalDashboardProps {
  emotion: string | null;
  category: string | null;
  vac: VAC | null;
  confidence: number | null;
  prosody: ProsodyData | null;
  insights: InsightData | null;
  sessionMetrics: SessionMetrics;
  expandState: AnalysisExpandState;
  vacHistory: VACHistoryPoint[];
  emotionTimeline: EmotionTimelineEvent[];
  audioBlob: Blob | null;
  // Multi-emotion support
  multiEmotionData?: {
    emotions: DetectedEmotion[];
    relationships?: EmotionRelationship[];
    aggregate?: AggregateState;
  } | null;
  // 3-Way Analysis support
  threeWayAnalysis?: ThreeWayAnalysis | null;
  // Callbacks
  onEmotionClick?: (emotionName: string) => void;
}

export function ClinicalDashboard({
  emotion,
  category,
  vac,
  confidence,
  prosody,
  insights,
  sessionMetrics,
  expandState,
  vacHistory,
  emotionTimeline,
  audioBlob,
  multiEmotionData,
  threeWayAnalysis,
  onEmotionClick,
}: ClinicalDashboardProps) {
  const theme = useAdminTheme();
  const isExpanded = expandState !== "normal";

  // Get alerts from backend insights (no longer calculating in frontend)
  const alerts = insights?.clinical_alerts || [];
  const overallStatus = insights?.overall_status || "stable";

  return (
    <div className={`w-full rounded-lg border overflow-hidden ${theme.colors.background} ${theme.colors.border}`}>
      {/* Priority Alert Bar */}
      {alerts.length > 0 && (
        <div className={`border-b ${theme.colors.border}`}>
          <AlertBadge alerts={alerts} overallStatus={overallStatus} />
        </div>
      )}

      {/* Session Metrics Bar */}
      <div className={`border-b ${theme.colors.border}`}>
        <SessionMetricsDisplay sessionMetrics={sessionMetrics} isExpanded={isExpanded} />
      </div>

      {/* Main Dashboard Content */}
      {emotion && vac && (
        <div className={`p-4 ${isExpanded ? "space-y-4" : ""}`}>
          {/* Compact Layout (Normal State) */}
          {!isExpanded && (
            <div className="grid grid-cols-2 gap-3">
              {/* Emotion State Card */}
              <div className={`rounded-lg p-3 border border-pink-500/30 ${theme.colors.background}`}>
                <div className="text-xs text-pink-300 mb-1">Emotion</div>
                <div className="font-bold text-white text-sm">{emotion}</div>
                {category && <div className={`text-xs mt-1 ${theme.colors.text.muted}`}>{category}</div>}
                {confidence !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme.colors.background}`}>
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all"
                        style={{ width: `${confidence * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs ${theme.colors.text.secondary}`}>{(confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>

              {/* VAC Summary Card */}
              <div className={`rounded-lg p-3 border border-purple-500/30 ${theme.colors.background}`}>
                <div className="text-xs text-purple-300 mb-1">VAC Coordinates</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className={theme.colors.text.muted}>V:</span>
                    <span className="text-white font-mono">{vac.valence.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.colors.text.muted}>A:</span>
                    <span className="text-white font-mono">{vac.arousal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.colors.text.muted}>C:</span>
                    <span className="text-white font-mono">{vac.connection.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Voice Profile Card (if available) */}
              {prosody && (
                <div className={`rounded-lg p-3 border border-cyan-500/30 ${theme.colors.background}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-cyan-300">Voice</div>
                    {prosody.voice_quality && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          prosody.voice_quality === "good"
                            ? "bg-green-500/20 text-green-400"
                            : prosody.voice_quality === "moderate"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {prosody.voice_quality === "good"
                          ? "🟢"
                          : prosody.voice_quality === "moderate"
                            ? "🟡"
                            : "🔴"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    {prosody.energy && (
                      <div className="flex justify-between">
                        <span className={theme.colors.text.muted}>Energy:</span>
                        <span className="text-white font-mono">
                          {prosody.energy > 0.7 ? "High" : prosody.energy < 0.3 ? "Low" : "Med"}
                        </span>
                      </div>
                    )}
                    {prosody.pitch_mean && (
                      <div className="flex justify-between">
                        <span className={theme.colors.text.muted}>Pitch:</span>
                        <span className="text-white font-mono">
                          {prosody.pitch_mean.toFixed(0)}Hz
                        </span>
                      </div>
                    )}
                    {prosody.rate && (
                      <div className="flex justify-between">
                        <span className={theme.colors.text.muted}>Rate:</span>
                        <span className="text-white font-mono">{prosody.rate.toFixed(1)}</span>
                      </div>
                    )}
                    {prosody.hnr && (
                      <div className="flex justify-between">
                        <span className={theme.colors.text.muted}>HNR:</span>
                        <span
                          className={`font-mono ${
                            prosody.hnr > 15
                              ? "text-green-400"
                              : prosody.hnr > 10
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {prosody.hnr.toFixed(1)}dB
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Indicator Card */}
              <div
                className={`bg-gray-700/50 rounded-lg p-3 border ${
                  overallStatus === "critical"
                    ? "border-red-500/30"
                    : overallStatus === "warning"
                      ? "border-yellow-500/30"
                      : overallStatus === "attention"
                        ? "border-orange-500/30"
                        : "border-green-500/30"
                }`}
              >
                <div className={`text-xs mb-1 ${theme.colors.text.secondary}`}>Status</div>
                <div
                  className={`font-bold text-sm ${
                    overallStatus === "critical"
                      ? "text-red-400"
                      : overallStatus === "warning"
                        ? "text-yellow-400"
                        : overallStatus === "attention"
                          ? "text-orange-400"
                          : "text-green-400"
                  }`}
                >
                  {overallStatus === "critical" && "🔴 Critical"}
                  {overallStatus === "warning" && "⚠️ Warning"}
                  {overallStatus === "attention" && "🟡 Attention"}
                  {overallStatus === "stable" && "🟢 Stable"}
                </div>
                {alerts.length > 0 && (
                  <div className={`text-xs mt-1 ${theme.colors.text.muted}`}>
                    {alerts.length} alert{alerts.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expanded Layout */}
          {isExpanded && (
            <div className="space-y-4">
              {/* Top Row: Emotion + VAC Quadrant + Voice */}
              <div className="grid grid-cols-3 gap-4">
                {/* Emotion State */}
                <div className={`rounded-lg p-4 border border-pink-500/30 ${theme.colors.background}`}>
                  <div className="text-sm text-pink-300 mb-2 font-semibold">Emotional State</div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xl font-bold text-white">{emotion}</div>
                      {category && <div className={`text-sm mt-1 ${theme.colors.text.muted}`}>{category}</div>}
                    </div>

                    {confidence !== null && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Confidence</span>
                          <span>{(confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${theme.colors.background}`}>
                          <div
                            className={`h-full transition-all ${
                              confidence >= 0.8
                                ? "bg-green-500"
                                : confidence >= 0.6
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* VAC Quadrant Visualization */}
                <VACQuadrantViz vac={vac} />

                {/* Enhanced Voice Profile */}
                {prosody && (
                  <div className={`rounded-lg p-4 border border-cyan-500/30 ${theme.colors.background}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-cyan-300 font-semibold">Voice Profile</div>
                      {prosody.voice_quality && (
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            prosody.voice_quality === "good"
                              ? "bg-green-500/20 text-green-300"
                              : prosody.voice_quality === "moderate"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {prosody.voice_quality === "good"
                            ? "🟢 Good"
                            : prosody.voice_quality === "moderate"
                              ? "🟡 Moderate"
                              : "🔴 Poor"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Voice Quality Metrics */}
                      {(prosody.jitter || prosody.shimmer || prosody.hnr) && (
                        <div className="pb-3 border-b ${theme.colors.border}">
                          <div className="text-xs text-gray-400 mb-2 font-semibold">
                            Voice Quality
                          </div>
                          <div className="space-y-1.5">
                            {prosody.hnr && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-xs">HNR (Clarity)</span>
                                <span
                                  className={`text-xs font-mono ${
                                    prosody.hnr > 15
                                      ? "text-green-400"
                                      : prosody.hnr > 10
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }`}
                                >
                                  {prosody.hnr.toFixed(1)} dB
                                </span>
                              </div>
                            )}
                            {prosody.jitter && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-xs">Jitter</span>
                                <span
                                  className={`text-xs font-mono ${
                                    prosody.jitter < 1
                                      ? "text-green-400"
                                      : prosody.jitter < 3
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }`}
                                >
                                  {prosody.jitter.toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {prosody.shimmer && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-xs">Shimmer</span>
                                <span
                                  className={`text-xs font-mono ${
                                    prosody.shimmer < 3
                                      ? "text-green-400"
                                      : prosody.shimmer < 6
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                  }`}
                                >
                                  {prosody.shimmer.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pitch Analysis */}
                      {prosody.pitch_mean && (
                        <div className="pb-3 border-b ${theme.colors.border}">
                          <div className="text-xs text-gray-400 mb-2 font-semibold">Pitch</div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Mean</span>
                              <span className="text-white text-xs font-mono">
                                {prosody.pitch_mean.toFixed(1)} Hz
                              </span>
                            </div>
                            {prosody.pitch_range && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Range</span>
                                <span
                                  className={`text-xs font-mono ${
                                    prosody.pitch_range < 50
                                      ? "text-blue-400"
                                      : prosody.pitch_range > 150
                                        ? "text-orange-400"
                                        : "text-green-400"
                                  }`}
                                >
                                  {prosody.pitch_range.toFixed(0)} Hz
                                  {prosody.pitch_range < 50 && " (narrow)"}
                                  {prosody.pitch_range > 150 && " (wide)"}
                                </span>
                              </div>
                            )}
                            {prosody.pitch_std && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Variability</span>
                                <span className="text-white text-xs font-mono">
                                  ±{prosody.pitch_std.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {prosody.pitch_min && prosody.pitch_max && (
                              <div className="text-xs text-gray-500">
                                {prosody.pitch_min.toFixed(0)} - {prosody.pitch_max.toFixed(0)} Hz
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Energy Analysis */}
                      {prosody.energy && (
                        <div className="pb-3 border-b ${theme.colors.border}">
                          <div className="text-xs text-gray-400 mb-2 font-semibold">
                            Vocal Energy
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Average</span>
                                <span className="text-white font-mono">
                                  {prosody.energy.toFixed(3)}
                                </span>
                              </div>
                              <div className={`h-1.5 rounded-full overflow-hidden ${theme.colors.background}`}>
                                <div
                                  className={`h-full transition-all ${
                                    prosody.energy > 0.7
                                      ? "bg-gradient-to-r from-red-500 to-red-400"
                                      : prosody.energy > 0.4
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                        : "bg-gradient-to-r from-blue-600 to-blue-500"
                                  }`}
                                  style={{ width: `${Math.min(100, prosody.energy * 100)}%` }}
                                />
                              </div>
                            </div>
                            {prosody.energy_max && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Peak</span>
                                <span className="text-orange-300 font-mono">
                                  {prosody.energy_max.toFixed(3)}
                                </span>
                              </div>
                            )}
                            {prosody.energy_std && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Variability</span>
                                <span className={`font-mono ${theme.colors.text.secondary}`}>
                                  ±{prosody.energy_std.toFixed(3)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Temporal Analysis */}
                      <div>
                        <div className="text-xs text-gray-400 mb-2 font-semibold">
                          Speech Patterns
                        </div>
                        <div className="space-y-1.5">
                          {prosody.rate && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Rate</span>
                              <span
                                className={`text-xs font-mono ${
                                  prosody.rate > 5
                                    ? "text-orange-400"
                                    : prosody.rate < 3
                                      ? "text-blue-400"
                                      : "text-green-400"
                                }`}
                              >
                                {prosody.rate.toFixed(1)} syll/sec
                                {prosody.rate > 5 && " (fast)"}
                                {prosody.rate < 3 && " (slow)"}
                              </span>
                            </div>
                          )}
                          {prosody.duration && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Duration</span>
                              <span className="text-white font-mono">
                                {prosody.duration.toFixed(1)}s
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3-Way Voice-Content Analysis */}
              {threeWayAnalysis && (
                <div className={`rounded-lg p-4 border border-orange-500/30 ${theme.colors.background}`}>
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-orange-300 flex items-center gap-2">
                      <span>🔬</span>
                      <span>3-Way Voice-Content Analysis</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Comparing content-only, voice-only, and blended interpretations for clinical
                      insight
                    </p>
                  </div>
                  <VoiceContentThreeWay
                    analysis={threeWayAnalysis}
                    onEmotionClick={onEmotionClick}
                  />
                </div>
              )}

              {/* Multi-Emotion Clinical Table */}
              {multiEmotionData && multiEmotionData.emotions.length > 0 && (
                <div className={`rounded-lg p-4 border border-purple-500/30 ${theme.colors.background}`}>
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                      <span>🧠</span>
                      <span>Deep Feeling Mode: Multi-Emotion Analysis</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Detailed breakdown of {multiEmotionData.emotions.length} detected emotion
                      {multiEmotionData.emotions.length > 1 ? "s" : ""} with clinical metrics
                    </p>
                  </div>
                  <MultiEmotionTable
                    emotions={multiEmotionData.emotions}
                    showFilters={true}
                    showExport={true}
                  />
                </div>
              )}

              {/* Voice-Content Correlation */}
              {insights?.voice_content_correlation && (
                <VoiceContentCorrelation correlation={insights.voice_content_correlation} />
              )}

              {/* Prosody Waveform Visualization */}
              {prosody && <ProsodyVisualization prosody={prosody} audioBlob={audioBlob} />}

              {/* Phase 3 Visualizations - Only in expanded state */}
              {vacHistory.length > 1 && (
                <>
                  {/* VAC Trajectory Plot */}
                  <VACTrajectoryPlot vacHistory={vacHistory} />

                  {/* Session Timeline */}
                  <SessionTimeline emotionTimeline={emotionTimeline} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!emotion && (
        <div className={`p-6 text-center ${theme.colors.text.muted}`}>
          <p className="text-sm">Awaiting emotional analysis data...</p>
        </div>
      )}
    </div>
  );
}
