/**
 * Waypoint Tooltip Component
 *
 * Displays detailed information about a waypoint when hovering over it in 3D space.
 * Shows emotion name, reasoning, time estimate, difficulty, and available strategies.
 */

"use client";

interface WaypointTooltipProps {
  waypoint: {
    emotion: string;
    reasoning: string;
    estimated_time: string;
    difficulty: string;
    strategies?: Array<{
      name: string;
      time_required?: string;
    }>;
    vac: [number, number, number];
  };
  position: { x: number; y: number };
  waypointState: "start" | "goal" | "reached" | "current" | "locked" | "waypoint";
}

export function WaypointTooltip({ waypoint, position, waypointState }: WaypointTooltipProps) {
  // State color coding
  const stateConfig = {
    start: { icon: "🔵", label: "Starting Point", color: "blue" },
    goal: { icon: "🟢", label: "Goal", color: "green" },
    reached: { icon: "✅", label: "Completed", color: "green" },
    current: { icon: "🟣", label: "Current Step", color: "purple" },
    locked: { icon: "🔒", label: "Locked", color: "gray" },
    waypoint: { icon: "⭐", label: "Waypoint", color: "purple" },
  };

  const config = stateConfig[waypointState];

  return (
    <div
      className="fixed pointer-events-none z-50 animate-in fade-in zoom-in duration-200"
      style={{
        left: position.x + 20,
        top: position.y - 60,
        maxWidth: "300px",
      }}
    >
      <div className="bg-gray-900/98 border-2 border-purple-500/80 rounded-lg shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div
          className={`px-4 py-2 border-b border-${config.color}-500/30 bg-${config.color}-900/20`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <div className="flex-1">
              <div className="text-white font-bold text-lg">{waypoint.emotion}</div>
              <div className="text-xs text-gray-400">{config.label}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Reasoning */}
          <div>
            <div className="text-xs font-semibold text-purple-300 mb-1">Why this step:</div>
            <div className="text-sm text-gray-300 italic">{waypoint.reasoning}</div>
          </div>

          {/* Time & Difficulty */}
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span className="text-gray-300">{waypoint.estimated_time}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📊</span>
              <span
                className={`capitalize ${
                  waypoint.difficulty === "easy"
                    ? "text-green-400"
                    : waypoint.difficulty === "moderate"
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {waypoint.difficulty}
              </span>
            </div>
          </div>

          {/* VAC Coordinates */}
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs font-mono text-gray-500">
              VAC: [{waypoint.vac[0].toFixed(2)}, {waypoint.vac[1].toFixed(2)},{" "}
              {waypoint.vac[2].toFixed(2)}]
            </div>
          </div>

          {/* Strategies */}
          {waypoint.strategies && waypoint.strategies.length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-xs font-semibold text-purple-300 mb-1">
                💡 {waypoint.strategies.length}{" "}
                {waypoint.strategies.length === 1 ? "Strategy" : "Strategies"} Available
              </div>
              <div className="space-y-1">
                {waypoint.strategies.slice(0, 3).map((strategy, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="text-purple-400">•</span>
                    <span>{strategy.name}</span>
                    {strategy.time_required && (
                      <span className="text-gray-500">({strategy.time_required})</span>
                    )}
                  </div>
                ))}
                {waypoint.strategies.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{waypoint.strategies.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Arrow pointing to waypoint */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-500/80" />
      </div>
    </div>
  );
}
