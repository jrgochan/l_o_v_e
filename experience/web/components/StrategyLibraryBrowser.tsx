"use client";

import React, { useEffect } from "react";
import { useStrategyBrowserStore } from "../stores/useStrategyBrowserStore";
import { StrategyDetailsModal } from "./StrategyDetailsModal";

// Assuming shared components or icons are available, using simple HTML for now to minimize deps.
// Filter icons could be Lucide React if available.

export const StrategyLibraryBrowser = () => {
  const {
    strategies,
    filters,
    setFilters,
    isLoading,
    fetchStrategies,
    selectedStrategy,
    selectStrategy,
  } = useStrategyBrowserStore();

  // Fetch strategies when filters change
  // Using a simple debounce for search input would be ideal here if not handled by store
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStrategies();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [filters, fetchStrategies]);

  return (
    <div className="w-full h-full bg-slate-950 text-white p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-thin tracking-tight mb-4 text-white">Strategy Library</h1>
          <p className="text-white/60 text-lg font-light max-w-2xl">
            Explore 107 evidence-based therapeutic interventions from ACT, DBT, CBT, and more.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 sticky top-0 bg-slate-950/80 backdrop-blur-md py-4 z-10 border-b border-white/5">
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search strategies (e.g. 'breathing', 'anxiety')..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-light"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
            <div className="absolute right-3 top-3.5 text-white/20">🔍</div>
          </div>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/80 focus:outline-none focus:border-white/30 cursor-pointer hover:bg-white/10 transition-colors"
            value={filters.type || ""}
            onChange={(e) => setFilters({ type: e.target.value || null })}
          >
            <option value="">All Categories</option>
            <option value="situation_selection">Situation Selection</option>
            <option value="situation_modification">Situation Modification</option>
            <option value="attentional_deployment">Attentional Deployment</option>
            <option value="cognitive_reappraisal">Cognitive Reappraisal</option>
            <option value="response_modulation">Response Modulation</option>
          </select>

          <select
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/80 focus:outline-none focus:border-white/30 cursor-pointer hover:bg-white/10 transition-colors"
            value={filters.evidence || ""}
            onChange={(e) => setFilters({ evidence: e.target.value || null })}
          >
            <option value="">All Evidence Levels</option>
            <option value="meta_analysis">Meta-Analysis (Highest)</option>
            <option value="rct">RCT (High)</option>
            <option value="clinical">Clinical Consensus</option>
          </select>
        </div>

        {/* Grid */}
        {strategies.length === 0 && !isLoading ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
            <p className="text-white/40 font-light">No strategies found matching your filters.</p>
            <button
              onClick={() => setFilters({ type: null, evidence: null, search: "" })}
              className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {strategies.map((strategy) => (
              <div
                key={strategy.strategy_id}
                onClick={() => selectStrategy(strategy)}
                className="group bg-white/[0.03] rounded-2xl p-6 hover:bg-white/[0.07] transition-all duration-300 border border-white/5 hover:border-white/10 cursor-pointer flex flex-col h-full hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-xs font-mono text-white/30 uppercase tracking-wider">
                    {strategy.type?.replace(/_/g, " ")}
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full border ${getEvidenceColor(strategy.evidence_level)}`}
                  >
                    {strategy.evidence_level === "meta_analysis"
                      ? "META"
                      : strategy.evidence_level?.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-xl font-light text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {strategy.name}
                </h3>

                <p className="text-white/60 text-sm mb-6 line-clamp-3 font-light leading-relaxed flex-grow">
                  {strategy.description}
                </p>

                <div className="border-t border-white/5 pt-4 flex justify-between items-center text-xs text-white/40">
                  <div className="flex items-center gap-1">
                    <span>Diff:</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-3 rounded-full mx-0.5 ${i < strategy.difficulty_level ? "bg-white/40" : "bg-white/5"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {strategy.time_required && <span>⏱ {strategy.time_required}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <StrategyDetailsModal strategy={selectedStrategy} onClose={() => selectStrategy(null)} />
      )}
    </div>
  );
};

const getEvidenceColor = (level: string) => {
  switch (level) {
    case "meta_analysis":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "rct":
      return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    case "clinical":
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    default:
      return "bg-white/5 border-white/10 text-white/40";
  }
};
