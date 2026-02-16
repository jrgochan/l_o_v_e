import React from "react";
import { ConceptTooltip } from "@/components/ConceptTooltip";

interface PathfindingInsightsProps {
  metrics: {
    nodes_explored: number;
    max_queue_size: number;
    search_depth: number;
    pruned_paths: number;
    execution_time_ms: number;
  };
}

export const PathfindingInsights: React.FC<PathfindingInsightsProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-mono text-white/50 uppercase tracking-widest">
          Algorithm Insights
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Nodes Explored"
          termKey="NODES_EXPLORED"
          value={metrics.nodes_explored}
        />
        <MetricCard label="Search Depth" termKey="SEARCH_DEPTH" value={metrics.search_depth} />
        <MetricCard label="Pruned Paths" termKey="PRUNED_PATHS" value={metrics.pruned_paths} />
        <MetricCard label="Max Memory" value={`${metrics.max_queue_size} nodes`} />
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-xs">
        <span className="text-white/30">Total Execution Time</span>
        <span className="text-emerald-400 font-mono">{metrics.execution_time_ms}ms</span>
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  termKey,
}: {
  label: string;
  value: string | number;
  termKey?: string;
}) => (
  <div className="bg-black/20 rounded-lg p-2">
    <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
      {termKey ? <ConceptTooltip termKey={termKey}>{label}</ConceptTooltip> : label}
    </div>
    <div className="text-lg font-light text-white font-mono">{value}</div>
  </div>
);
