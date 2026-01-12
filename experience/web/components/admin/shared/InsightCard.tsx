/**
 * Insight Card Component
 *
 * Beautiful, structured display of therapeutic insights
 * Supports both warm and clinical modes with structured data
 */

"use client";

import { useState, useRef, useEffect } from "react";
import type { InsightData, ToneMode } from "@/types/chat";
import type { StructuredInsightData } from "@/types/insights";

interface InsightCardProps {
  insights: InsightData;
  toneMode: ToneMode;
  deepFeelingMode?: boolean;
  maxHeight?: number; // For "Read more" truncation in chat
  onEmotionClick?: (emotion: string) => void;
}

export function InsightCard({
  insights,
  toneMode,
  deepFeelingMode = false,
  maxHeight,
  onEmotionClick,
}: InsightCardProps) {
  // Check if insights are structured
  const structuredInsights = insights as StructuredInsightData;
  const isStructured = structuredInsights.structured === true;

  if (!isStructured) {
    // Fallback for legacy insights
    return <LegacyInsightDisplay insights={insights} toneMode={toneMode} />;
  }

  // Render mode-specific card
  if (toneMode === "warm") {
    return (
      <WarmInsightCard
        insights={insights}
        deepFeelingMode={deepFeelingMode}
        maxHeight={maxHeight}
        onEmotionClick={onEmotionClick}
      />
    );
  } else {
    // Clinical mode - structured card
    return (
      <ClinicalInsightCard
        insights={insights}
        deepFeelingMode={deepFeelingMode}
        maxHeight={maxHeight}
        onEmotionClick={onEmotionClick}
      />
    );
  }
}

/**
 * Warm Insight Card - Compassionate mirror for self-understanding
 */
function WarmInsightCard({
  insights,
  maxHeight,
  onEmotionClick,
}: {
  insights: StructuredInsightData;
  deepFeelingMode?: boolean;
  maxHeight?: number;
  onEmotionClick?: (emotion: string) => void;
}) {
  const [showFullContent, setShowFullContent] = useState(!maxHeight);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  useEffect(() => {
    if (maxHeight && contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [maxHeight]);

  return (
    <div
      ref={contentRef}
      className="bg-gradient-to-br from-amber-900/30 to-rose-900/30 border-l-4 border-amber-400 rounded-lg p-5 space-y-4 w-full"
      style={{
        maxHeight: maxHeight && !showFullContent ? `${maxHeight}px` : undefined,
        overflow: maxHeight && !showFullContent ? "hidden" : undefined,
      }}
    >
      {/* Opening - Validation */}
      {insights.opening && (
        <div className="text-amber-100 leading-relaxed animate-fade-in">{insights.opening}</div>
      )}

      {/* Voice Observations */}
      {insights.voice_observations && insights.voice_observations.length > 0 && (
        <div
          className="pl-4 border-l-2 border-amber-500/30 space-y-1 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <h5 className="text-xs font-semibold text-amber-400 flex items-center gap-1">
            🎵 What Your Voice Tells Me
          </h5>
          {insights.voice_observations.map((obs: string, i: number) => (
            <p key={i} className="text-sm text-amber-200">
              • {obs}
            </p>
          ))}
        </div>
      )}

      {/* Emotion Understanding */}
      {insights.emotion_understanding && (
        <div
          className="bg-amber-500/10 rounded-lg p-3 animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          <h5 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
            🧠 Understanding {insights.emotion}
          </h5>
          <p className="text-sm text-amber-100 italic leading-relaxed">
            {insights.emotion_understanding}
          </p>
        </div>
      )}

      {/* VAC Interpretation */}
      {insights.vac_interpretation && (
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <h5 className="text-xs font-semibold text-amber-400">💫 What This Might Mean</h5>
          <ul className="space-y-1 text-sm text-amber-200 leading-relaxed">
            {insights.vac_interpretation.energy_state && (
              <li>• {insights.vac_interpretation.energy_state}</li>
            )}
            {insights.vac_interpretation.emotional_tone && (
              <li>• {insights.vac_interpretation.emotional_tone}</li>
            )}
            {insights.vac_interpretation.connection_quality && (
              <li>• {insights.vac_interpretation.connection_quality}</li>
            )}
          </ul>
        </div>
      )}

      {/* Gentle Invitations */}
      {insights.gentle_invitations && insights.gentle_invitations.length > 0 && (
        <div
          className="bg-rose-500/10 rounded-lg p-3 space-y-2 animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <h5 className="text-xs font-semibold text-rose-400 flex items-center gap-1">
            🌱 Gentle Invitations
          </h5>
          {insights.gentle_invitations.map((invitation, i: number) => (
            <p key={i} className="text-sm text-rose-200 leading-relaxed">
              {invitation.type === "reflection" ? "? " : "• "}
              {invitation.text}
            </p>
          ))}
        </div>
      )}

      {/* Similar Emotions */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "500ms" }}>
          {insights.recommendations.map(
            (rec, i: number) =>
              rec.type === "similar_emotions" && (
                <div key={i}>
                  <h5 className="text-xs font-semibold text-amber-400 mb-2">🗺️ {rec.title}</h5>
                  <div className="flex flex-wrap gap-2">
                    {rec.items.map((item, j: number) => (
                      <button
                        key={j}
                        onClick={() => item.name && onEmotionClick?.(item.name)}
                        className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 rounded-full text-xs text-amber-200 transition"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {/* Read More Button */}
      {needsTruncation && !showFullContent && (
        <div className="pt-3 border-t border-amber-500/20">
          <button
            onClick={() => setShowFullContent(true)}
            className="w-full py-2 text-xs text-amber-400 hover:text-amber-300 transition"
          >
            Read more...
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Clinical Insight Card - Professional, data-driven clinical assessment
 */
function ClinicalInsightCard({
  insights,
  maxHeight,
  onEmotionClick,
}: {
  insights: StructuredInsightData;
  deepFeelingMode?: boolean;
  maxHeight?: number;
  onEmotionClick?: (emotion: string) => void;
}) {
  const [showFullContent, setShowFullContent] = useState(!maxHeight);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  useEffect(() => {
    if (maxHeight && contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [maxHeight]);

  // Helper to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "text-red-400 border-red-500";
      case "warning":
        return "text-orange-400 border-orange-500";
      case "attention":
        return "text-yellow-400 border-yellow-500";
      default:
        return "text-cyan-400 border-cyan-500";
    }
  };

  return (
    <div
      ref={contentRef}
      className="bg-gradient-to-br from-slate-900/40 to-blue-900/30 border-l-4 border-cyan-400 rounded-lg p-5 space-y-4 w-full"
      style={{
        maxHeight: maxHeight && !showFullContent ? `${maxHeight}px` : undefined,
        overflow: maxHeight && !showFullContent ? "hidden" : undefined,
      }}
    >
      {/* Opening - Professional Assessment */}
      {insights.opening && (
        <div className="text-cyan-100 leading-relaxed animate-fade-in font-medium">
          {insights.opening}
        </div>
      )}

      {/* Emotion Definition */}
      {insights.emotion_definition && (
        <div
          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <h5 className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wide">
            📋 Clinical Definition
          </h5>
          <p className="text-sm text-slate-200 leading-relaxed">{insights.emotion_definition}</p>
        </div>
      )}

      {/* VAC Assessment */}
      {insights.vac_assessment && (
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h5 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            📊 VAC Coordinate Assessment
          </h5>

          {/* Coordinates Grid */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(insights.vac_assessment.coordinates).map(([key, data]) => (
              <div key={key} className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
                <div className="text-xs text-slate-400 uppercase">{key}</div>
                <div className="text-lg font-bold text-cyan-300">{data.value.toFixed(2)}</div>
                <div className="text-xs text-slate-300">{data.label}</div>
              </div>
            ))}
          </div>

          {/* Quadrant Analysis */}
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30">
            <div className="text-sm font-semibold text-blue-300 mb-1">
              {insights.vac_assessment.quadrant}
            </div>
            <div className="text-xs text-blue-200">{insights.vac_assessment.clinical_note}</div>
          </div>

          {/* Risk Indicators */}
          {insights.vac_assessment.risk_indicators &&
            insights.vac_assessment.risk_indicators.length > 0 && (
              <div className="bg-red-900/20 rounded-lg p-3 border border-red-700/30">
                <h6 className="text-xs font-semibold text-red-400 mb-2 uppercase">
                  ⚠️ Risk Indicators
                </h6>
                <ul className="space-y-1">
                  {insights.vac_assessment.risk_indicators.map((indicator, i: number) => (
                    <li key={i} className="text-xs text-red-200">
                      • {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Voice Metrics */}
      {insights.voice_metrics && insights.voice_metrics.length > 0 && (
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <h5 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            🎤 Prosody Analysis
          </h5>
          <div className="space-y-2">
            {insights.voice_metrics.map((metric, i: number) => (
              <div
                key={i}
                className={`bg-slate-800/40 rounded-lg p-3 border-l-2 ${getStatusColor(metric.status)}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-slate-300">{metric.label}</span>
                  <span className={`text-xs font-mono ${getStatusColor(metric.status)}`}>
                    {metric.value}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{metric.interpretation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Recommendations */}
      {insights.clinical_recommendations && insights.clinical_recommendations.length > 0 && (
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <h5 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            💊 Clinical Recommendations
          </h5>
          {insights.clinical_recommendations.map((rec, i: number) => (
            <div
              key={i}
              className={`rounded-lg p-3 border ${
                rec.type === "intervention"
                  ? "bg-green-900/20 border-green-700/30"
                  : "bg-blue-900/20 border-blue-700/30"
              }`}
            >
              <div
                className={`text-sm font-semibold mb-1 ${
                  rec.type === "intervention" ? "text-green-300" : "text-blue-300"
                }`}
              >
                {rec.type === "intervention" ? "🔧" : "📝"} {rec.title}
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">{rec.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Analysis Reasoning */}
      {insights.analysis_reasoning && (
        <div
          className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 animate-fade-in"
          style={{ animationDelay: "500ms" }}
        >
          <h5 className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wide">
            🧪 Analysis Reasoning
          </h5>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            {insights.analysis_reasoning}
          </p>
        </div>
      )}

      {/* Similar Emotions */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "600ms" }}>
          {insights.recommendations.map(
            (rec, i: number) =>
              rec.type === "similar_emotions" && (
                <div key={i}>
                  <h5 className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wide">
                    🔗 {rec.title}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {rec.items.map((item, j: number) => (
                      <button
                        key={j}
                        onClick={() => item.name && onEmotionClick?.(item.name)}
                        className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded text-xs text-cyan-200 transition font-mono"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {/* Read More Button */}
      {needsTruncation && !showFullContent && (
        <div className="pt-3 border-t border-cyan-500/20">
          <button
            onClick={() => setShowFullContent(true)}
            className="w-full py-2 text-xs text-cyan-400 hover:text-cyan-300 transition uppercase tracking-wide"
          >
            View Full Assessment...
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Legacy Insight Display - Fallback for non-structured insights
 */
function LegacyInsightDisplay({
  insights,
  toneMode,
}: {
  insights: InsightData;
  toneMode: ToneMode;
}) {
  return (
    <div
      className={`
      rounded-lg p-4 border w-full
      ${toneMode === "warm" ? "bg-amber-900/20 border-amber-500/30" : "bg-gray-800 border-gray-600"}
    `}
    >
      <div
        className={`
        text-sm whitespace-pre-wrap leading-relaxed
        ${toneMode === "warm" ? "text-amber-100" : "text-gray-200"}
      `}
      >
        {insights.summary}
      </div>
      {insights.guidance && (
        <div
          className={`
          mt-3 pt-3 border-t text-xs italic
          ${toneMode === "warm" ? "border-amber-500/20 text-amber-300" : "border-gray-700 text-gray-400"}
        `}
        >
          {insights.guidance}
        </div>
      )}
    </div>
  );
}
