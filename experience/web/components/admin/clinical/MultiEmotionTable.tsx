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

interface MultiEmotionTableProps {
  emotions: DetectedEmotion[];
  showFilters?: boolean;
  showExport?: boolean;
  onEmotionClick?: (emotion: DetectedEmotion) => void;
  className?: string;
}

type SortKey =
  | "emotion"
  | "confidence"
  | "valence"
  | "arousal"
  | "connection"
  | "voice_alignment"
  | "prominence";
type SortDirection = "asc" | "desc";
type ProminenceFilter = "all" | "primary" | "secondary" | "underlying";

export function MultiEmotionTable({
  emotions,
  showFilters = true,
  showExport = true,
  onEmotionClick,
  className = "",
}: MultiEmotionTableProps) {
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
      let aValue: string | number;
      let bValue: string | number;

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
        case "arousal":
          aValue = a.vac.arousal;
          bValue = b.vac.arousal;
          break;
        case "connection":
          aValue = a.vac.connection;
          bValue = b.vac.connection;
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
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

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
      return <span className="text-gray-500 text-sm">N/A</span>;
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
    if (sortKey !== key) return <span className="text-gray-600">⇅</span>;
    return sortDirection === "asc" ? (
      <span className="text-cyan-400">▲</span>
    ) : (
      <span className="text-cyan-400">▼</span>
    );
  };

  if (emotions.length === 0) {
    return (
      <div
        className={`bg-gray-800/50 rounded-lg p-8 text-center border border-gray-700 ${className}`}
      >
        <p className="text-gray-400">No multi-emotion data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with filters and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-100">Multi-Emotion Analysis</h3>
          <span className="text-sm text-gray-400">({sortedEmotions.length} emotions)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominence Filter */}
          {showFilters && (
            <select
              value={prominenceFilter}
              onChange={(e) => setProminenceFilter(e.target.value as ProminenceFilter)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
      <div className="overflow-x-auto border border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th
                className="px-4 py-3 text-left text-gray-300 font-semibold cursor-pointer hover:bg-gray-750 transition"
                onClick={() => handleSort("emotion")}
              >
                <div className="flex items-center gap-2">
                  <span>Emotion</span>
                  {renderSortIndicator("emotion")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center text-gray-300 font-semibold cursor-pointer hover:bg-gray-750 transition"
                onClick={() => handleSort("confidence")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Confidence</span>
                  {renderSortIndicator("confidence")}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-gray-300 font-semibold">
                <div className="flex items-center justify-center gap-2">
                  <span>VAC Coordinates</span>
                  <span className="text-gray-600 text-xs">(V, A, C)</span>
                </div>
              </th>
              <th
                className="px-4 py-3 text-center text-gray-300 font-semibold cursor-pointer hover:bg-gray-750 transition"
                onClick={() => handleSort("voice_alignment")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Voice Match</span>
                  {renderSortIndicator("voice_alignment")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center text-gray-300 font-semibold cursor-pointer hover:bg-gray-750 transition"
                onClick={() => handleSort("prominence")}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Prominence</span>
                  {renderSortIndicator("prominence")}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-gray-300 font-semibold">
                <span>Mapping</span>
              </th>
              <th className="px-4 py-3 text-center text-gray-300 font-semibold">
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
                    className={`border-b border-gray-700/50 hover:bg-gray-750 transition cursor-pointer ${
                      isEven ? "bg-gray-850" : "bg-gray-900"
                    }`}
                    onClick={() => onEmotionClick?.(emotion)}
                  >
                    {/* Emotion Name */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-100">{emotion.emotion_name}</div>
                        {emotion.category && (
                          <div className="text-xs text-gray-400">{emotion.category}</div>
                        )}
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono font-semibold text-gray-100">
                          {(emotion.confidence * 100).toFixed(0)}%
                        </span>
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400"
                            style={{ width: `${emotion.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* VAC Coordinates */}
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-300 space-y-0.5">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">V:</span>
                          <span
                            className={emotion.vac.valence >= 0 ? "text-green-400" : "text-red-400"}
                          >
                            {emotion.vac.valence >= 0 ? "+" : ""}
                            {emotion.vac.valence.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">A:</span>
                          <span className="text-gray-200">
                            {emotion.vac.arousal >= 0 ? "+" : ""}
                            {emotion.vac.arousal.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">C:</span>
                          <span className="text-gray-200">
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
                          <span className="text-xs text-gray-500">Exact</span>
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
                          className="px-2 py-1 text-cyan-400 hover:text-cyan-300 hover:bg-gray-700 rounded transition text-xs"
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
                      className={`${isEven ? "bg-gray-850" : "bg-gray-900"} border-b border-gray-700/50`}
                    >
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-3 bg-gray-800/50 p-4 rounded border border-gray-700">
                          <h4 className="text-sm font-semibold text-gray-300 mb-2">
                            Detailed Analysis
                          </h4>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* Left Column */}
                            <div className="space-y-2">
                              <div>
                                <span className="text-gray-400">Emotion ID:</span>
                                <span className="ml-2 text-gray-200 font-mono text-xs">
                                  {emotion.id}
                                </span>
                              </div>
                              {emotion.original_name && (
                                <div>
                                  <span className="text-gray-400">Original Name:</span>
                                  <span className="ml-2 text-gray-200">
                                    {emotion.original_name}
                                  </span>
                                </div>
                              )}
                              {emotion.match_method && (
                                <div>
                                  <span className="text-gray-400">Match Method:</span>
                                  <span className="ml-2 text-gray-200">{emotion.match_method}</span>
                                </div>
                              )}
                              {emotion.match_confidence !== undefined && (
                                <div>
                                  <span className="text-gray-400">Match Confidence:</span>
                                  <span className="ml-2 text-gray-200 font-mono">
                                    {(emotion.match_confidence * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                              {emotion.voice_alignment !== undefined && (
                                <div>
                                  <span className="text-gray-400">Voice-Content Alignment:</span>
                                  <span className="ml-2 text-gray-200 font-mono">
                                    {(emotion.voice_alignment * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400">Detection Confidence:</span>
                                <span className="ml-2 text-gray-200 font-mono">
                                  {(emotion.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Prominence Level:</span>
                                <span className="ml-2 text-gray-200 capitalize">
                                  {emotion.prominence}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* VAC Analysis */}
                          <div className="pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">VAC Interpretation:</div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="bg-gray-900 p-2 rounded">
                                <div className="text-gray-500 mb-1">Valence</div>
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
                              <div className="bg-gray-900 p-2 rounded">
                                <div className="text-gray-500 mb-1">Arousal</div>
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
                              <div className="bg-gray-900 p-2 rounded">
                                <div className="text-gray-500 mb-1">Connection</div>
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
      <div className="flex items-center justify-between text-xs text-gray-400 px-2">
        <div>
          Displaying {sortedEmotions.length} of {emotions.length} emotions
          {prominenceFilter !== "all" && ` (filtered by ${prominenceFilter})`}
        </div>
        <div>Click column headers to sort • Click rows to view details</div>
      </div>
    </div>
  );
}
