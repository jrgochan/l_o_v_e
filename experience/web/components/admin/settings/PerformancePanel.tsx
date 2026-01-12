/**
 * Performance Panel Component
 *
 * Displays performance metrics for AI functions including latency,
 * usage statistics, and trends.
 */

"use client";

interface FunctionPerformance {
  avg_latency_ms: number | null;
  total_invocations: number;
  last_used?: string | null;
}

interface PerformancePanelProps {
  performance: Record<string, FunctionPerformance>;
  assignments: Record<string, string> | null;
}

export function PerformancePanel({ performance, assignments }: PerformancePanelProps) {
  const functionNames = Object.keys(performance).filter(
    (key) => performance[key].total_invocations > 0
  );

  if (functionNames.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400 text-sm">
          No performance data yet. Run some analyses to see metrics here.
        </p>
      </div>
    );
  }

  const getLatencyColor = (latencyMs: number) => {
    if (latencyMs < 2000) return "text-green-400";
    if (latencyMs < 5000) return "text-yellow-400";
    return "text-orange-400";
  };

  const getLatencyRating = (latencyMs: number) => {
    if (latencyMs < 2000) return "⚡⚡⚡";
    if (latencyMs < 5000) return "⚡⚡";
    return "⚡";
  };

  const formatFunctionName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-3">
      {functionNames.map((funcName) => {
        const perf = performance[funcName];
        const modelName = assignments?.[funcName] || "Unknown";
        const latencyMs = perf.avg_latency_ms || 0;
        const latencySeconds = (latencyMs / 1000).toFixed(1);

        return (
          <div
            key={funcName}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/30 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-white font-semibold text-sm mb-1">
                  {formatFunctionName(funcName)}
                </h4>
                <p className="text-xs text-gray-400 font-mono">{modelName}</p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getLatencyColor(latencyMs)}`}>
                  {latencySeconds}s
                </div>
                <div className="text-xs text-gray-500">avg latency</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Performance</div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{getLatencyRating(latencyMs)}</span>
                  <span className="text-xs text-gray-500">
                    {latencyMs < 2000 ? "Fast" : latencyMs < 5000 ? "Moderate" : "Slow"}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Usage</div>
                <div className="text-sm text-white font-semibold">
                  {perf.total_invocations.toLocaleString()}
                  <span className="text-xs text-gray-500 font-normal ml-1">
                    invocation{perf.total_invocations !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {perf.last_used && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  Last used: {new Date(perf.last_used).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
