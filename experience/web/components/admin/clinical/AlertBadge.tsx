/**
 * Alert Badge Component
 *
 * Displays clinical alerts with priority levels
 */

"use client";

interface Alert {
  level: "critical" | "warning" | "attention" | "stable";
  type: "high_arousal" | "voice_mismatch" | "low_confidence" | "pattern_concern" | "voice_quality";
  message: string;
  suggestion?: string;
}

interface AlertBadgeProps {
  alerts: Alert[];
  overallStatus: "critical" | "warning" | "attention" | "stable";
}

export function AlertBadge({ alerts, overallStatus }: AlertBadgeProps) {
  const getStatusColor = () => {
    switch (overallStatus) {
      case "critical":
        return "bg-red-500/20 border-red-500/50 text-red-300";
      case "warning":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
      case "attention":
        return "bg-orange-500/20 border-orange-500/50 text-orange-300";
      default:
        return "bg-green-500/20 border-green-500/50 text-green-300";
    }
  };

  const getStatusIcon = () => {
    switch (overallStatus) {
      case "critical":
        return "🔴";
      case "warning":
        return "⚠️";
      case "attention":
        return "🟡";
      default:
        return "🟢";
    }
  };

  return (
    <div className={`p-3 border-b ${getStatusColor()}`}>
      <div className="flex items-start gap-3">
        <div className="text-xl">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1">
            {alerts.length > 0
              ? `${alerts.length} Alert${alerts.length > 1 ? "s" : ""}`
              : "All Clear"}
          </div>
          <div className="space-y-1">
            {alerts.map((alert, index) => (
              <div key={index} className="text-xs">
                <div className="font-medium">{alert.message}</div>
                {alert.suggestion && (
                  <div className="opacity-75 italic mt-0.5">{alert.suggestion}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
