/**
 * Data Visualization Overlay Component ('X' Mode)
 *
 * A comprehensive "Emotional Analytics Dashboard" providing deep insights
 * into the emotional landscape via VAC dimensions and categorical analysis.
 */

"use client";

import { useState, useMemo } from "react";
import { MiniSoulSphere } from "../spheres/MiniSoulSphere";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface DataVisualizationOverlayProps {
  onClose: () => void;
}

// Simple Radar Chart SVG
const VacRadarChart = ({ vac, color }: { vac: [number, number, number]; color: string }) => {
  // Normalize -1..1 to 0..100
  const v = ((vac[0] + 1) / 2) * 100;
  const a = ((vac[1] + 1) / 2) * 100;
  const c = ((vac[2] + 1) / 2) * 100;

  // Triangle points (Top, Bottom Right, Bottom Left)
  // V (Top), A (Right), C (Left)
  const center = 50;
  const radius = 40;

  // Top (Valence)
  const vY = center - radius * (v / 100);
  const vX = center;

  // Right (Arousal)
  const aX = center + radius * Math.cos(Math.PI / 6) * (a / 100);
  const aY = center + radius * Math.sin(Math.PI / 6) * (a / 100);

  // Left (Connection)
  const cX = center - radius * Math.cos(Math.PI / 6) * (c / 100);
  const cY = center + radius * Math.sin(Math.PI / 6) * (c / 100);

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="overflow-visible">
      {/* Background Triangle */}
      <polygon
        points={`50,10 ${50 + 40 * 0.866},${50 + 40 * 0.5} ${50 - 40 * 0.866},${50 + 40 * 0.5}`}
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
      {/* Axis Lines */}
      <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.1)" />
      <line x1="50" y1="50" x2={50 + 40 * 0.866} y2={50 + 40 * 0.5} stroke="rgba(255,255,255,0.1)" />
      <line x1="50" y1="50" x2={50 - 40 * 0.866} y2={50 + 40 * 0.5} stroke="rgba(255,255,255,0.1)" />

      {/* Data Polygon */}
      <polygon
        points={`${vX},${vY} ${aX},${aY} ${cX},${cY}`}
        fill={color}
        fillOpacity="0.4"
        stroke={color}
        strokeWidth="2"
      />
      {/* Labels */}
      <text x="50" y="5" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">V</text>
      <text x="90" y="80" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">A</text>
      <text x="10" y="80" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">C</text>
    </svg>
  );
};

export function DataVisualizationOverlay({ onClose }: DataVisualizationOverlayProps) {
  const theme = useAdminTheme();
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const colorScheme = useAtlasAdminStore((state) => state.settings.colorScheme);
  const selectEmotion = useAtlasAdminStore((state) => state.selectEmotion);
  const setFocusedEmotion = useAtlasAdminStore((state) => state.setFocusedEmotion);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- Calculations ---

  // 1. Group by Category & Counts
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; emotions: AtlasEmotion[] }>();
    let maxCount = 0;

    allEmotions.forEach((e) => {
      if (!stats.has(e.category)) {
        stats.set(e.category, { count: 0, emotions: [] });
      }
      const entry = stats.get(e.category)!;
      entry.count++;
      entry.emotions.push(e);
      if (entry.count > maxCount) maxCount = entry.count;
    });

    // Sort categories alphabetically
    return {
      stats: new Map([...stats.entries()].sort()),
      maxCount,
    };
  }, [allEmotions]);

  // 2. Filter Displayed Emotions
  const displayedEmotions = useMemo(() => {
    if (!selectedCategory) return allEmotions;
    return allEmotions.filter((e) => e.category === selectedCategory);
  }, [allEmotions, selectedCategory]);

  // 3. Aggregate Stats (Average VAC)
  const aggregateStats = useMemo(() => {
    if (displayedEmotions.length === 0) return { v: 0, a: 0, c: 0 };
    const sums = displayedEmotions.reduce(
      (acc, e) => {
        acc.v += e.vac[0];
        acc.a += e.vac[1];
        acc.c += e.vac[2];
        return acc;
      },
      { v: 0, a: 0, c: 0 }
    );
    return {
      v: sums.v / displayedEmotions.length,
      a: sums.a / displayedEmotions.length,
      c: sums.c / displayedEmotions.length,
    };
  }, [displayedEmotions]);

  // 4. Insights (Extremes)
  const insights = useMemo(() => {
    if (displayedEmotions.length === 0) return null;
    // Sort by metrics
    const sortedV = [...displayedEmotions].sort((a, b) => b.vac[0] - a.vac[0]);
    const sortedA = [...displayedEmotions].sort((a, b) => b.vac[1] - a.vac[1]);
    const sortedC = [...displayedEmotions].sort((a, b) => b.vac[2] - a.vac[2]);

    return {
      mostPositive: sortedV[0],
      mostNegative: sortedV[sortedV.length - 1],
      maxHighEnergy: sortedA[0],
      maxLowEnergy: sortedA[sortedA.length - 1],
      mostConnected: sortedC[0],
      mostWithdrawn: sortedC[sortedC.length - 1],
    };
  }, [displayedEmotions]);

  const handleEmotionClick = (emotion: AtlasEmotion) => {
    selectEmotion(emotion.id);
    setFocusedEmotion(emotion.id);
    onClose();
  };

  const hoveredEmotion = hoveredId ? allEmotions.find((e) => e.id === hoveredId) : null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${theme.colors.background} bg-opacity-95 backdrop-blur-md`}>

      {/* --- Top Bar: Headlines & Stats --- */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.colors.border}`}>
        {/* Title */}
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme.colors.text.primary} tracking-tight`}>Data Sense</h2>
            <p className={`text-xs ${theme.colors.text.secondary}`}>
              Analysing {displayedEmotions.length} emotions {selectedCategory ? `in ${selectedCategory}` : "across entire atlas"}
            </p>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-8">
          {[
            { label: "AVG VALENCE", value: aggregateStats.v, color: "#22d3ee" }, // cyan
            { label: "AVG AROUSAL", value: aggregateStats.a, color: "#fcd34d" }, // amber
            { label: "AVG CONNECTION", value: aggregateStats.c, color: "#a78bfa" }, // violet
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-white/40 tracking-wider">{stat.label}</span>
              <span className="text-xl font-mono font-medium" style={{ color: stat.color }}>
                {stat.value > 0 ? "+" : ""}{stat.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`px-4 py-2 rounded-lg border ${theme.colors.border} hover:bg-white/10 ${theme.colors.text.secondary} hover:${theme.colors.text.primary} transition-colors flex items-center gap-2`}
        >
          <span>Exit Visualization</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">X</span>
        </button>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex overflow-hidden">

        {/* --- LEFT SIDEBAR: Frequency Bars --- */}
        <div className={`w-80 flex-shrink-0 border-r ${theme.colors.border} flex flex-col bg-black/20`}>
          <div className={`p-4 border-b ${theme.colors.border} bg-white/5`}>
            <h3 className={`text-xs font-bold ${theme.colors.text.secondary} uppercase tracking-wider`}>
              Semantic Categories
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* 'All' Toggle */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`nav-item w-full flex items-center justify-between p-2 rounded transition-all mb-4 ${!selectedCategory
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "hover:bg-white/5 text-white/50 hover:text-white"
                }`}
            >
              <span className="text-sm font-medium">Whole Atlas</span>
              <span className="font-mono text-xs opacity-70">{allEmotions.length}</span>
            </button>

            {/* Bars */}
            {Array.from(categoryStats.stats.entries()).map(([cat, data]) => {
              const isSelected = selectedCategory === cat;
              const percent = (data.count / categoryStats.maxCount) * 100;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className="group w-full relative h-9 flex items-center px-2 rounded overflow-hidden transition-all text-left"
                >
                  {/* Bar Background */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 opacity-20 group-hover:opacity-30 ${isSelected ? "bg-cyan-500 !opacity-40" : "bg-white"}`}
                    style={{ width: `${percent}%` }}
                  />

                  {/* Label */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className={`text-xs font-medium transition-colors ${isSelected ? "text-cyan-200" : "text-white/70 group-hover:text-white"}`}>
                      {cat}
                    </span>
                    <span className={`text-[10px] font-mono transition-colors ${isSelected ? "text-cyan-300" : "text-white/30 group-hover:text-white/50"}`}>
                      {data.count}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* --- CENTER: Emotion Grid --- */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-6 lg:grid-cols-6 xl:grid-cols-10 2xl:grid-cols-12 gap-6">
            {displayedEmotions.sort((a, b) => a.name.localeCompare(b.name)).map((emotion) => (
              <div
                key={emotion.id}
                className="group flex flex-col items-center gap-3 cursor-pointer"
                onMouseEnter={() => setHoveredId(emotion.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleEmotionClick(emotion)}
              >
                <div className="relative transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  <MiniSoulSphere
                    emotion={emotion}
                    colorMode={colorScheme}
                    size={60}
                    isHovered={hoveredId === emotion.id}
                  />
                  {/* Ring when hovered */}
                  {hoveredId === emotion.id && (
                    <div className="absolute inset-[-10px] border border-white/50 rounded-full animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] text-center font-medium tracking-wide transition-colors ${hoveredId === emotion.id ? "text-white" : "text-white/40"}`}>
                  {emotion.name}
                </span>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {displayedEmotions.length === 0 && (
            <div className="flex h-full items-center justify-center opacity-30">
              <div className="text-center">
                <h3 className="text-2xl font-bold">No Data</h3>
                <p>No emotions match this query.</p>
              </div>
            </div>
          )}
        </div>

        {/* --- RIGHT SIDEBAR: Insight Panel --- */}
        <div className={`w-80 flex-shrink-0 border-l ${theme.colors.border} bg-black/20 flex flex-col overflow-y-auto`}>

          {/* Hover Details Card */}
          <div className={`p-6 border-b ${theme.colors.border} min-h-[320px] bg-gradient-to-b from-white/5 to-transparent`}>
            <h3 className={`text-xs font-bold ${theme.colors.text.secondary} uppercase tracking-wider mb-4`}>
              Active Emotion
            </h3>

            {hoveredEmotion ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Title & Radar */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{hoveredEmotion.name}</h2>
                    <p className="text-xs text-cyan-400 font-medium bg-cyan-900/30 px-2 py-0.5 rounded w-fit border border-cyan-800">
                      {hoveredEmotion.category.toUpperCase()}
                    </p>
                  </div>
                  <div className="opacity-80">
                    <VacRadarChart vac={hoveredEmotion.vac} color="#22d3ee" />
                  </div>
                </div>

                {/* Def */}
                <p className="text-sm text-white/70 italic leading-relaxed mb-6 border-l-2 border-white/20 pl-3">
                  "{hoveredEmotion.definition}"
                </p>

                {/* Stats Grid */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Valence</span>
                      <span className="text-white font-mono">{hoveredEmotion.vac[0].toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${((hoveredEmotion.vac[0] + 1) / 2) * 100}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Arousal</span>
                      <span className="text-white font-mono">{hoveredEmotion.vac[1].toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${((hoveredEmotion.vac[1] + 1) / 2) * 100}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Connection</span>
                      <span className="text-white font-mono">{hoveredEmotion.vac[2].toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400" style={{ width: `${((hoveredEmotion.vac[2] + 1) / 2) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 text-center text-sm p-4 border border-dashed border-white/10 rounded-xl">
                Hover over a sphere to analyze its VAC signature.
              </div>
            )}
          </div>

          {/* Selected Set Insights */}
          {insights && (
            <div className="p-6 space-y-6">
              <h3 className={`text-xs font-bold ${theme.colors.text.secondary} uppercase tracking-wider`}>
                Dataset Highlights
              </h3>

              {/* Most Connected */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase text-violet-300 font-bold tracking-widest">Most Connected</div>
                <div className="bg-violet-900/20 border border-violet-500/20 p-3 rounded flex justify-between items-center group cursor-pointer hover:bg-violet-900/30 transition-colors" onClick={() => handleEmotionClick(insights.mostConnected)}>
                  <span className="text-sm font-medium text-violet-100">{insights.mostConnected.name}</span>
                  <span className="text-xs font-mono text-violet-400">{insights.mostConnected.vac[2].toFixed(2)}</span>
                </div>
              </div>

              {/* High Energy */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase text-amber-300 font-bold tracking-widest">Highest Energy</div>
                <div className="bg-amber-900/20 border border-amber-500/20 p-3 rounded flex justify-between items-center group cursor-pointer hover:bg-amber-900/30 transition-colors" onClick={() => handleEmotionClick(insights.maxHighEnergy)}>
                  <span className="text-sm font-medium text-amber-100">{insights.maxHighEnergy.name}</span>
                  <span className="text-xs font-mono text-amber-400">{insights.maxHighEnergy.vac[1].toFixed(2)}</span>
                </div>
              </div>

              {/* Most Negative */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase text-red-300 font-bold tracking-widest">Most Negative</div>
                <div className="bg-red-900/20 border border-red-500/20 p-3 rounded flex justify-between items-center group cursor-pointer hover:bg-red-900/30 transition-colors" onClick={() => handleEmotionClick(insights.mostNegative)}>
                  <span className="text-sm font-medium text-red-100">{insights.mostNegative.name}</span>
                  <span className="text-xs font-mono text-red-400">{insights.mostNegative.vac[0].toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

