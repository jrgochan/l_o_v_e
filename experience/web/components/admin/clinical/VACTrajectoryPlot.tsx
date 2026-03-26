/**
 * VAC Trajectory Plot Component
 *
 * Shows the historical movement of emotional states through VAC space
 * Helps clinicians identify patterns and trends
 * Enhanced with hover tooltips, directional arrows, and pattern detection
 */

"use client";

import { useState } from "react";
import type { VACHistoryPoint } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface VACTrajectoryPlotProps {
  vacHistory: VACHistoryPoint[];
}

export function VACTrajectoryPlot({ vacHistory }: VACTrajectoryPlotProps) {
  const theme = useAdminTheme();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (vacHistory.length < 2) return null;

  // Normalize VAC values from [-1, 1] to [0, 100] for positioning
  const normalizeToPercent = (value: number) => ((value + 1) / 2) * 100;

  // Get points for the path
  const points = vacHistory.map((point) => ({
    x: normalizeToPercent(point.vac.valence),
    y: 100 - normalizeToPercent(point.vac.arousal), // Invert Y
    emotion: point.emotion,
    confidence: point.confidence,
    timestamp: point.timestamp,
    connection: point.vac.connection,
    extended: point.extended,
  }));

  // Create SVG path string
  const pathString = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  // Get current (latest) point
  const currentPoint = points[points.length - 1];
  const startPoint = points[0];

  // Calculate movement vectors for arrows
  const getArrowPoints = () => {
    const arrows = [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      // Calculate angle for arrow rotation
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      arrows.push({ x: midX, y: midY, angle });
    }
    return arrows;
  };

  const arrows = getArrowPoints();

  // Detect clinical patterns
  const detectPatterns = () => {
    const patterns = [];

    // Check for rapid movements (emotional instability)
    let rapidMovements = 0;
    for (let i = 0; i < vacHistory.length - 1; i++) {
      const dist = Math.sqrt(
        Math.pow(vacHistory[i + 1].vac.valence - vacHistory[i].vac.valence, 2) +
          Math.pow(vacHistory[i + 1].vac.arousal - vacHistory[i].vac.arousal, 2)
      );
      if (dist > 0.5) rapidMovements++;
    }

    if (rapidMovements >= Math.floor(vacHistory.length / 2)) {
      patterns.push({
        type: "rapid_shifts",
        icon: "⚡",
        color: "text-orange-400",
        message: "Rapid emotional shifts detected",
      });
    }

    // Check for negative quadrant clustering
    const negativeCount = vacHistory.filter((p) => p.vac.valence < -0.2).length;
    if (negativeCount >= Math.ceil(vacHistory.length * 0.7)) {
      patterns.push({
        type: "negative_bias",
        icon: "🔵",
        color: "text-blue-400",
        message: "Persistent negative emotional state",
      });
    }

    // Check for overall positive trend
    const valenceChange = vacHistory[vacHistory.length - 1].vac.valence - vacHistory[0].vac.valence;
    if (valenceChange > 0.3 && vacHistory.length >= 3) {
      patterns.push({
        type: "positive_trend",
        icon: "📈",
        color: "text-green-400",
        message: "Positive emotional progression",
      });
    }

    // Check for arousal escalation
    const arousalChange = vacHistory[vacHistory.length - 1].vac.arousal - vacHistory[0].vac.arousal;
    if (arousalChange > 0.4) {
      patterns.push({
        type: "escalation",
        icon: "⚠️",
        color: "text-yellow-400",
        message: "Arousal escalation detected",
      });
    }

    // ========== OCTONION-BASED PATTERNS ==========
    const hasExtended = vacHistory.some((p) => p.extended);
    if (hasExtended) {
      // 🛡️ Coping Collapse — sudden drop in agency
      for (let i = 0; i < vacHistory.length - 1; i++) {
        const curr = vacHistory[i].extended?.coping ?? 0;
        const next = vacHistory[i + 1].extended?.coping ?? 0;
        if (curr - next > 0.5) {
          patterns.push({
            type: "coping_collapse",
            icon: "🛡️",
            color: "text-rose-400",
            message: "Coping collapse: sudden loss of agency detected",
          });
          break;
        }
      }

      // 🧊 Emotional Freezing — stuck/frozen velocity
      const frozenCount = vacHistory.filter(
        (p) => (p.extended?.velocity ?? 0) < -0.5
      ).length;
      if (frozenCount >= 3) {
        patterns.push({
          type: "emotional_freezing",
          icon: "🧊",
          color: "text-indigo-400",
          message: "Emotional freezing: stuck pattern for " + frozenCount + " points",
        });
      }

      // 🆕 Novel Distress — first-time difficult emotion
      const novelDistress = vacHistory.some(
        (p) => (p.extended?.novelty ?? 0) > 0.6 && p.vac.valence < -0.3
      );
      if (novelDistress) {
        patterns.push({
          type: "novel_distress",
          icon: "🆕",
          color: "text-amber-400",
          message: "Novel distress: unfamiliar negative emotion detected",
        });
      }

      // 🔄 Habitual Loop — familiar negative spiral
      const habitualCount = vacHistory.filter(
        (p) => (p.extended?.novelty ?? 0) < -0.5 && p.vac.valence < -0.2
      ).length;
      if (habitualCount >= 3) {
        patterns.push({
          type: "habitual_loop",
          icon: "🔄",
          color: "text-orange-400",
          message: "Habitual loop: familiar negative pattern repeating",
        });
      }
    }

    return patterns;
  };

  const patterns = detectPatterns();

  return (
    <div className={`rounded-lg p-4 border border-purple-500/30 ${theme.colors.background}`}>
      <div className="text-sm text-purple-300 mb-2 font-semibold flex items-center justify-between">
        <span>📈 Emotional Journey</span>
        <span className={`text-xs ${theme.colors.text.muted}`}>{vacHistory.length} points</span>
      </div>

      {/* Trajectory Plot */}
      <div
        className={`relative w-full aspect-square rounded border ${theme.colors.background} ${theme.colors.border}`}
      >
        {/* Quadrant backgrounds */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-gray-600 bg-purple-500/5"></div>
          <div className="border-b border-gray-600 bg-green-500/5"></div>
          <div className="border-r border-gray-600 bg-blue-500/5"></div>
          <div className="bg-red-500/5"></div>
        </div>

        {/* Axis labels */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute top-1 left-1/2 -translate-x-1/2 text-xs font-semibold ${theme.colors.text.muted}`}
          >
            High Energy (A+)
          </div>
          <div
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold ${theme.colors.text.muted}`}
          >
            Low Energy (A-)
          </div>
          <div
            className={`absolute left-1 top-1/2 -translate-y-1/2 text-xs font-semibold ${theme.colors.text.muted} writing-mode-vertical`}
          >
            Negative (V-)
          </div>
          <div
            className={`absolute right-1 top-1/2 -translate-y-1/2 text-xs font-semibold ${theme.colors.text.muted} writing-mode-vertical`}
          >
            Positive (V+)
          </div>
        </div>

        {/* Quadrant labels */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top-left: Quadrant I - Calm/Content */}
          <div className="absolute top-2 left-2 text-xs text-purple-400/60 font-semibold">
            I: Calm
          </div>

          {/* Top-right: Quadrant IV - Excited/Joyful */}
          <div className="absolute top-2 right-2 text-xs text-green-400/60 font-semibold">
            IV: Joyful
          </div>

          {/* Bottom-left: Quadrant II - Sad/Depressed */}
          <div className="absolute bottom-2 left-2 text-xs text-blue-400/60 font-semibold">
            II: Sad
          </div>

          {/* Bottom-right: Quadrant III - Anxious/Angry */}
          <div className="absolute bottom-2 right-2 text-xs text-red-400/60 font-semibold">
            III: Distressed
          </div>
        </div>

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-600"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600"></div>

        {/* SVG for path */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="vac-trajectory-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
            </linearGradient>

            {/* Arrow marker */}
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#A78BFA" opacity="0.7" />
            </marker>
          </defs>

          {/* Trail path — width encodes coping (if available) */}
          {(() => {
            const hasExtended = points.some(p => p.extended);
            if (hasExtended) {
              // Draw coping-width ribbon using polyline segments
              return points.slice(0, -1).map((from, i) => {
                const to = points[i + 1];
                const copingFrom = from.extended?.coping ?? 0;
                const copingTo = to.extended?.coping ?? 0;
                const avgCoping = (copingFrom + copingTo) / 2;
                // Width: 0.3 (helpless) to 2.0 (empowered)
                const strokeWidth = 0.3 + ((avgCoping + 1) / 2) * 1.7;
                const opacity = 0.4 + ((avgCoping + 1) / 2) * 0.4;
                return (
                  <line
                    key={`ribbon-${i}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#8B5CF6"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    opacity={opacity}
                  />
                );
              });
            }
            // Fallback: original single path
            return (
              <path
                d={pathString}
                fill="none"
                stroke="url(#vac-trajectory-gradient)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            );
          })()}

          {/* Directional arrows */}
          {arrows.map((arrow, index) => (
            <g key={`arrow-${index}`} transform={`translate(${arrow.x}, ${arrow.y})`}>
              <line
                x1="0"
                y1="0"
                x2="3"
                y2="0"
                stroke="#A78BFA"
                strokeWidth="0.5"
                markerEnd="url(#arrowhead)"
                transform={`rotate(${arrow.angle})`}
                opacity="0.5"
              />
            </g>
          ))}

          {/* Start point */}
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r="1.2"
            fill="#6B7280"
            stroke="#9CA3AF"
            strokeWidth="0.3"
          />

          {/* Historical points with hover */}
          {points.slice(1, -1).map((point, index) => {
            const actualIndex = index + 1; // Account for slicing
            const connectionSize = 0.8 + Math.abs(point.connection) * 0.8; // 0.8-1.6 range

            return (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={connectionSize}
                  fill="#8B5CF6"
                  opacity={hoveredPoint === actualIndex ? "1" : "0.5"}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={() => setHoveredPoint(actualIndex)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover tooltips for historical points */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <div
            className="absolute z-10 bg-gray-900 border border-purple-500 rounded px-2 py-1.5 text-xs text-white shadow-lg pointer-events-none"
            style={{
              left: `${points[hoveredPoint].x}%`,
              top: `${points[hoveredPoint].y}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <div className="font-semibold">{points[hoveredPoint].emotion}</div>
            <div className={`text-xs mt-0.5 ${theme.colors.text.muted}`}>
              {points[hoveredPoint].timestamp.toLocaleTimeString()}
            </div>
            <div className={`text-xs ${theme.colors.text.muted}`}>
              V: {vacHistory[hoveredPoint].vac.valence.toFixed(2)}, A:{" "}
              {vacHistory[hoveredPoint].vac.arousal.toFixed(2)}
            </div>
            <div className="text-cyan-300 text-xs">
              C: {vacHistory[hoveredPoint].vac.connection.toFixed(2)}
            </div>
            {vacHistory[hoveredPoint].extended && (
              <div className="text-violet-300 text-xs border-t border-gray-700 pt-1 mt-1 space-y-0.5">
                <div className="flex gap-2">
                  <span>D: {vacHistory[hoveredPoint].extended!.depth.toFixed(2)}</span>
                  <span>P: {vacHistory[hoveredPoint].extended!.coping.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <span>Ė: {vacHistory[hoveredPoint].extended!.velocity.toFixed(2)}</span>
                  <span>N: {vacHistory[hoveredPoint].extended!.novelty.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start point tooltip (outside SVG) */}
        <div
          className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full cursor-pointer"
          style={{
            left: `${startPoint.x}%`,
            top: `${startPoint.y}%`,
          }}
          onMouseEnter={() => setHoveredPoint(0)}
          onMouseLeave={() => setHoveredPoint(null)}
        />

        {/* Current point (outside SVG for better control) */}
        <div
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-purple-500 border-2 border-white shadow-lg shadow-purple-500/50 animate-pulse cursor-pointer"
          style={{
            left: `${currentPoint.x}%`,
            top: `${currentPoint.y}%`,
          }}
          onMouseEnter={() => setHoveredPoint(points.length - 1)}
          onMouseLeave={() => setHoveredPoint(null)}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span className={theme.colors.text.muted}>Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className={theme.colors.text.muted}>Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500 border border-white animate-pulse"></div>
            <span className={theme.colors.text.muted}>Current</span>
          </div>
        </div>
        <div className={theme.colors.text.muted}>{currentPoint.emotion}</div>
      </div>

      {/* Pattern Detection */}
      {patterns.length > 0 && (
        <div
          className={`mt-3 p-2 rounded border ${theme.colors.background} ${theme.colors.border}`}
        >
          <div className={`text-xs mb-1.5 font-semibold ${theme.colors.text.muted}`}>
            Clinical Patterns
          </div>
          <div className="space-y-1">
            {patterns.map((pattern, index) => (
              <div key={index} className="flex items-center gap-2">
                <span>{pattern.icon}</span>
                <span className={`text-xs ${pattern.color}`}>{pattern.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className={`mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs ${theme.colors.border}`}>
        <div>
          <span className={theme.colors.text.muted}>Valence Change:</span>
          <span
            className={`ml-2 font-mono ${
              vacHistory[vacHistory.length - 1].vac.valence > vacHistory[0].vac.valence
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {vacHistory[vacHistory.length - 1].vac.valence - vacHistory[0].vac.valence > 0
              ? "+"
              : ""}
            {(vacHistory[vacHistory.length - 1].vac.valence - vacHistory[0].vac.valence).toFixed(2)}
          </span>
        </div>
        <div>
          <span className={theme.colors.text.muted}>Arousal Change:</span>
          <span
            className={`ml-2 font-mono ${
              vacHistory[vacHistory.length - 1].vac.arousal > vacHistory[0].vac.arousal
                ? "text-orange-400"
                : "text-blue-400"
            }`}
          >
            {vacHistory[vacHistory.length - 1].vac.arousal - vacHistory[0].vac.arousal > 0
              ? "+"
              : ""}
            {(vacHistory[vacHistory.length - 1].vac.arousal - vacHistory[0].vac.arousal).toFixed(2)}
          </span>
        </div>
        {/* Extended dimension changes (if data available) */}
        {vacHistory[0].extended && vacHistory[vacHistory.length - 1].extended && (
          <>
            <div>
              <span className={theme.colors.text.muted}>Coping Change:</span>
              <span
                className={`ml-2 font-mono ${
                  (vacHistory[vacHistory.length - 1].extended!.coping - vacHistory[0].extended!.coping) > 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {(vacHistory[vacHistory.length - 1].extended!.coping - vacHistory[0].extended!.coping) > 0 ? "+" : ""}
                {(vacHistory[vacHistory.length - 1].extended!.coping - vacHistory[0].extended!.coping).toFixed(2)}
              </span>
            </div>
            <div>
              <span className={theme.colors.text.muted}>Depth Change:</span>
              <span
                className={`ml-2 font-mono ${
                  (vacHistory[vacHistory.length - 1].extended!.depth - vacHistory[0].extended!.depth) > 0
                    ? "text-amber-400"
                    : "text-gray-400"
                }`}
              >
                {(vacHistory[vacHistory.length - 1].extended!.depth - vacHistory[0].extended!.depth) > 0 ? "+" : ""}
                {(vacHistory[vacHistory.length - 1].extended!.depth - vacHistory[0].extended!.depth).toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Hover instructions */}
      <div className={`mt-2 text-xs text-center italic ${theme.colors.text.muted}`}>
        Hover over points to see emotion details • Larger points = stronger connection
      </div>
    </div>
  );
}
