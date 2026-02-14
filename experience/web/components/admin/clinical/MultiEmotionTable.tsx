/**
 * Multi-Emotion Clinical Table Component
 *
 * Professional clinical table for detailed multi-emotion analysis.
 * Features:
 * - Sortable columns (emotion, confidence, VAC, voice match, prominence)
 * - Prominence filtering (all, primary, secondary, underlying)
 * - CSV export for clinical records
 * - Expandable rows for detailed view
 * - Clinical styling (professional, scannable, dense)
 */

"use client";

import React, { useState, useMemo } from "react";
import { EmotionMappingBadge } from "../emotion-display/EmotionMappingBadge";
import type { DetectedEmotion } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface MultiEmotionTableProps {
  emotions: DetectedEmotion[];
  showFilters?: boolean;
  showExport?: boolean;
  onEmotionClick?: (emotion: DetectedEmotion) => void;
  className?: string;
}

type SortKey = "emotion" | "confidence" | "valence" | "voice_alignment" | "prominence";
type SortDirection = "asc" | "desc";
type ProminenceFilter = "all" | "primary" | "secondary" | "underlying";

export function MultiEmotionTable({
  emotions,
  showFilters = true,
  showExport = true,
  onEmotionClick,
  className = "",
}: MultiEmotionTableProps) {
  const theme = useAdminTheme();
  const [sortKey, setSortKey] = useState<SortKey>("prominence");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [prominenceFilter, setProminenceFilter] = useState<ProminenceFilter>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter emotions by prominence
  const filteredEmotions = useMemo(() => {
    if (prominenceFilter === "all") return emotions;
    return emotions.filter((e) => e.prominence === prominenceFilter);
  }, [emotions, prominenceFilter]);

  // Sort emotions
  const sortedEmotions = useMemo(() => {
    const sorted = [...filteredEmotions].sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;

      switch (sortKey) {
        case "emotion":
          aValue = a.emotion_name.toLowerCase();
          bValue = b.emotion_name.toLowerCase();
          break;
        case "confidence":
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case "valence":
          aValue = a.vac.valence;
          bValue = b.vac.valence;
          break;
        case "voice_alignment":
          aValue = a.voice_alignment ?? -1;
          bValue = b.voice_alignment ?? -1;
          break;
        case "prominence": {
          const order = { primary: 0, secondary: 1, underlying: 2 };
          aValue = order[a.prominence as keyof typeof order];
          bValue = order[b.prominence as keyof typeof order];
          break;
        }
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      /* istanbul ignore next */
      return 0;
    });

    return sorted;
  }, [filteredEmotions, sortKey, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Toggle row expansion
  const toggleExpand = (emotionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(emotionId)) {
      newExpanded.delete(emotionId);
    } else {
      newExpanded.add(emotionId);
    }
    setExpandedRows(newExpanded);
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Emotion",
      "Confidence",
      "Valence",
      "Arousal",
      "Connection",
      "Voice Match",
      "Prominence",
      "Mapping Method",
      "Original Name",
    ];
    const rows = sortedEmotions.map((e) => [
      e.emotion_name,
      (e.confidence * 100).toFixed(1) + "%",
      e.vac.valence.toFixed(3),
      e.vac.arousal.toFixed(3),
      e.vac.connection.toFixed(3),
      e.voice_alignment ? (e.voice_alignment * 100).toFixed(1) + "%" : "N/A",
      e.prominence,
      e.match_method || "exact",
      e.original_name || e.emotion_name,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `multi-emotion-analysis-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get prominence badge color
  const getProminenceBadge = (prominence: string) => {
    const styles = {
      primary: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      secondary: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      underlying: "bg-gray-500/20 text-gray-400 border-gray-500/40",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded border text-xs font-medium ${styles[prominence as keyof typeof styles] || styles.underlying}`}
      >
        {prominence.toUpperCase()}
      </span>
    );
  };

  // Get voice alignment indicator
  const getVoiceAlignmentIndicator = (score?: number) => {
    if (score === undefined || score === null) {
      return <span className={`text-sm ${theme.colors.text.muted}`}>N/A</span>;
    }

    let color = "text-red-400";
    let icon = "⚠️";
    if (score >= 0.8) {
      color = "text-green-400";
      icon = "✓";
    } else if (score >= 0.6) {
      color = "text-yellow-400";
      icon = "~";
    }

    return (
      <span className={`flex items-center gap-1 ${color}`}>
        <span>{icon}</span>
        <span className="font-mono text-sm">{(score * 100).toFixed(0)}%</span>
      </span>
    );
  };

  // Render sort indicator
  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span className={theme.colors.text.muted}>⇅</span>;
    return sortDirection === "asc" ? (
      <span className="text-cyan-400">▲</span>
    ) : (
      <span className="text-cyan-400">▼</span>
    );
  };

  if (emotions.length === 0) {
    return (
      <div
        className={`rounded-lg p-8 text-center border ${theme.colors.border} ${theme.colors.background} ${className}`}
      >
        <p className={theme.colors.text.muted}>No multi-emotion data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with filters and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-semibold ${theme.colors.text.primary}`}>Multi-Emotion Analysis</h3>
          <span className={`text-sm ${theme.colors.text.muted}`}>({sortedEmotions.length} emotions)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominence Filter */}
          {showFilters && (
            <select
              value={prominenceFilter}
              onChange={(e) => setProminenceFilter(e.target.value as ProminenceFilter)}
              className={`px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${theme.colors.background} ${theme.colors.border} ${theme.colors.text.secondary}`}
            >
              <option value="all">All Emotions</option>
              <option value="primary">Primary Only</option>
              <option value="secondary">Secondary Only</option>
              <option value="underlying">Underlying Only</option>
            </select>
          )}

          {/* Export Button */}
          {showExport && (
            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`overflow-x-auto border rounded-lg ${theme.colors.border}`}>
        <table className="w-full text-sm">
          <thead className={`border-b ${theme.colors.background} ${theme.colors.border}`}>
            <tr>
              <th
                className="px-4 py-3 text-left font-semibold cursor-pointer transition ${theme.colors.text.secondary} ${theme.colors.hover}"
                onClick={() => handleSort("emotion")}
              >
                <div className="flex items-center gap-2">
                  <span>Emotion</span>
                  {renderSortIndicator("emotion")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center font-semibold cursor-pointer transition ${theme.colors.text.secondary} ${theme.colors.hover}"
                onClick={() => handleSort("confidence")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Confidence</span>
                  {renderSortIndicator("confidence")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center font-semibold cursor-pointer transition ${theme.colors.text.secondary} ${theme.colors.hover}"
                onClick={() => handleSort("valence")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>VAC Coordinates</span>
                  <span className={`text-xs ${theme.colors.text.muted}`}>(V, A, C)</span>
                  {renderSortIndicator("valence")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center font-semibold cursor-pointer transition ${theme.colors.text.secondary} ${theme.colors.hover}"
                onClick={() => handleSort("voice_alignment")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Voice Match</span>
                  {renderSortIndicator("voice_alignment")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center font-semibold cursor-pointer transition ${theme.colors.text.secondary} ${theme.colors.hover}"
                onClick={() => handleSort("prominence")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Prominence</span>
                  {renderSortIndicator("prominence")}
                </div>
              </th>
              <th className="px-4 py-3 text-center font-semibold ${theme.colors.text.secondary}">
                <span>Mapping</span>
              </th>
              <th className="px-4 py-3 text-center font-semibold ${theme.colors.text.secondary}">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEmotions.map((emotion, index) => {
              const isExpanded = expandedRows.has(emotion.id);
              const isEven = index % 2 === 0;

              return (
                <React.Fragment key={emotion.id}>
                  <tr
                    className={`border-b transition cursor-pointer ${theme.colors.border} ${theme.colors.hover} ${
                      isEven ? theme.colors.background : ""
                    }`}
                    onClick={() => onEmotionClick?.(emotion)}
                  >
                    {/* Emotion Name */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className={`font-medium ${theme.colors.text.primary}`}>{emotion.emotion_name}</div>
                        {emotion.category && (
                          <div className={`text-xs ${theme.colors.text.muted}`}>{emotion.category}</div>
                        )}
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-mono font-semibold ${theme.colors.text.primary}`}>
                          {(emotion.confidence * 100).toFixed(0)}%
                        </span>
                        <div className={`w-16 h-1.5 rounded-full overflow-hidden ${theme.colors.background}`}>
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400"
                            style={{ width: `${emotion.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* VAC Coordinates */}
                    <td className="px-4 py-3">
                      <div className={`font-mono text-xs space-y-0.5 ${theme.colors.text.secondary}`}>
                        <div className="flex justify-between gap-2">
                          <span className="${theme.colors.text.muted}">V:</span>
                          <span
                            className={emotion.vac.valence >= 0 ? "text-green-400" : "text-red-400"}
                          >
                            {emotion.vac.valence >= 0 ? "+" : ""}
                            {emotion.vac.valence.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="${theme.colors.text.muted}">A:</span>
                          <span className="${theme.colors.text.secondary}">
                            {emotion.vac.arousal >= 0 ? "+" : ""}
                            {emotion.vac.arousal.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="${theme.colors.text.muted}">C:</span>
                          <span className="${theme.colors.text.secondary}">
                            {emotion.vac.connection >= 0 ? "+" : ""}
                            {emotion.vac.connection.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Voice Alignment */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {getVoiceAlignmentIndicator(emotion.voice_alignment)}
                      </div>
                    </td>

                    {/* Prominence */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {getProminenceBadge(emotion.prominence)}
                      </div>
                    </td>

                    {/* Mapping Method */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {emotion.original_name ? (
                          <EmotionMappingBadge
                            originalName={emotion.original_name}
                            atlasName={emotion.emotion_name}
                            matchMethod={emotion.match_method}
                            matchConfidence={emotion.match_confidence}
                          />
                        ) : (
                          <span className={`text-xs ${theme.colors.text.muted}`}>Exact</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(emotion.id);
                          }}
                          className={`px-2 py-1 text-cyan-400 hover:text-cyan-300 rounded transition text-xs ${theme.colors.hover}`}
                        >
                          {isExpanded ? "⊖ Collapse" : "⊕ Expand"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr
                      key={`${emotion.id}-details`}
                      className={`${isEven ? theme.colors.background : ""} border-b ${theme.colors.border}`}
                    >
                      <td colSpan={7} className="px-4 py-4">
                        <div className={`space-y-3 p-4 rounded border ${theme.colors.background} ${theme.colors.border}`}>
                          <h4 className={`text-sm font-semibold mb-2 ${theme.colors.text.secondary}`}>
                            Detailed Analysis
                          </h4>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* Left Column */}
                            <div className="space-y-2">
                              <div>
                                <span className="${theme.colors.text.muted}">Emotion ID:</span>
                                <span className="ml-2 ${theme.colors.text.secondary} font-mono text-xs">
                                  {emotion.id}
                                </span>
                              </div>
                              {emotion.original_name && (
                                <div>
                                  <span className="${theme.colors.text.muted}">Original Name:</span>
                                  <span className="ml-2 ${theme.colors.text.secondary}">
                                    {emotion.original_name}
                                  </span>
                                </div>
                              )}
                              {emotion.match_method && (
                                <div>
                                  <span className="${theme.colors.text.muted}">Match Method:</span>
                                  <span className="ml-2 ${theme.colors.text.secondary}">{emotion.match_method}</span>
                                </div>
                              )}
                              {emotion.match_confidence !== undefined && (
                                <div>
                                  <span className="${theme.colors.text.muted}">Match Confidence:</span>
                                  <span className="ml-2 ${theme.colors.text.secondary} font-mono">
                                    {(emotion.match_confidence * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                              {emotion.voice_alignment !== undefined && (
                                <div>
                                  <span className="${theme.colors.text.muted}">Voice-Content Alignment:</span>
                                  <span className="ml-2 ${theme.colors.text.secondary} font-mono">
                                    {(emotion.voice_alignment * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="${theme.colors.text.muted}">Detection Confidence:</span>
                                <span className="ml-2 ${theme.colors.text.secondary} font-mono">
                                  {(emotion.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="${theme.colors.text.muted}">Prominence Level:</span>
                                <span className="ml-2 ${theme.colors.text.secondary} capitalize">
                                  {emotion.prominence}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* VAC Analysis */}
                          <div className={`pt-3 border-t ${theme.colors.border}`}>
                            <div className="text-xs text-gray-400 mb-2">VAC Interpretation:</div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className={`p-2 rounded ${theme.colors.background}`}>
                                <div className="mb-1 ${theme.colors.text.muted}">Valence</div>
                                <div className="text-gray-200">
                                  {emotion.vac.valence > 0.5
                                    ? "Very positive"
                                    : emotion.vac.valence > 0.1
                                      ? "Somewhat positive"
                                      : emotion.vac.valence > -0.1
                                        ? "Neutral"
                                        : emotion.vac.valence > -0.5
                                          ? "Somewhat negative"
                                          : "Very negative"}
                                </div>
                              </div>
                              <div className={`p-2 rounded ${theme.colors.background}`}>
                                <div className="mb-1 ${theme.colors.text.muted}">Arousal</div>
                                <div className="text-gray-200">
                                  {emotion.vac.arousal > 0.5
                                    ? "Very high energy"
                                    : emotion.vac.arousal > 0.1
                                      ? "High energy"
                                      : emotion.vac.arousal > -0.1
                                        ? "Moderate"
                                        : emotion.vac.arousal > -0.5
                                          ? "Low energy"
                                          : "Very low energy"}
                                </div>
                              </div>
                              <div className={`p-2 rounded ${theme.colors.background}`}>
                                <div className="mb-1 ${theme.colors.text.muted}">Connection</div>
                                <div className="text-gray-200">
                                  {emotion.vac.connection > 0.5
                                    ? "Strong connection"
                                    : emotion.vac.connection > 0.1
                                      ? "Connected"
                                      : emotion.vac.connection > -0.1
                                        ? "Neutral"
                                        : emotion.vac.connection > -0.5
                                          ? "Disconnected"
                                          : "Strongly disconnected"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className={`flex items-center justify-between text-xs px-2 ${theme.colors.text.muted}`}>
        <div>
          Displaying {sortedEmotions.length} of {emotions.length} emotions
          {prominenceFilter !== "all" && ` (filtered by ${prominenceFilter})`}
        </div>
        <div>Click column headers to sort • Click rows to view details</div>
      </div>
    </div>
  );
}
