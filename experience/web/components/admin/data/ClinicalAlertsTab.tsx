import React, { useEffect, useState, useCallback } from "react";
import { ClinicalAlert } from "@/types/admin";
import { adminApi } from "@/utils/api";
import { RefreshCw, AlertTriangle, Activity, Filter } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export default function ClinicalAlertsTab() {
  const theme = useAdminTheme();
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<ClinicalAlert | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getClinicalAlerts(page, 50, filterLevel);
      setAlerts(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  }, [page, filterLevel]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const getSeverityColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-400 bg-red-900/20 border-red-800";
      case "warning":
        return "text-orange-400 bg-orange-900/20 border-orange-800";
      case "attention":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-800";
      default:
        return "text-gray-400 bg-gray-800 border-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`flex justify-between items-center p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}
      >
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${theme.colors.text.primary}`}>
            <Activity className="w-5 h-5 text-red-400" />
            Clinical Risk Alerts
          </h2>
          <p className={`text-sm mt-1 ${theme.colors.text.muted}`}>
            Review automated risk detections from recent sessions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 rounded px-3 py-1.5 ${theme.colors.background} border ${theme.colors.border}`}
          >
            <Filter className={`w-4 h-4 ${theme.colors.text.muted}`} />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className={`bg-transparent text-sm outline-none border-none ${theme.colors.text.primary}`}
              aria-label="Filter by Severity"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="attention">Attention</option>
            </select>
          </div>
          <button
            onClick={fetchAlerts}
            className={`p-2 rounded-full transition-colors ${theme.colors.hover}`}
            title="Refresh"
            aria-label="Refresh Alerts"
          >
            <RefreshCw className={`w-5 h-5 ${theme.colors.text.muted}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          {loading && alerts.length === 0 ? (
            <div className={`text-center p-8 ${theme.colors.text.muted}`} role="status">
              Loading alerts...
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`
                                    p-4 rounded-lg border cursor-pointer transition-all
                                    ${selectedAlert?.id === alert.id ? `${theme.colors.background} ring-1 ring-white/20` : `${theme.colors.background} ${theme.colors.hover}`}
                                    ${theme.colors.border}
                                `}
                role="button"
                tabIndex={0}
                aria-label={`View alert details: ${alert.message}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedAlert(alert);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border uppercase font-bold ${getSeverityColor(alert.level)}`}
                    >
                      {alert.level}
                    </span>
                    <span className={`text-sm font-mono ${theme.colors.text.muted}`}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className={`text-xs ${theme.colors.text.muted}`}>v{alert.version}</span>
                </div>
                <h3 className={`font-medium ${theme.colors.text.primary}`}>{alert.message}</h3>
                <p className={`text-sm mt-1 ${theme.colors.text.muted}`}>{alert.suggestion}</p>
              </div>
            ))
          )}
          {alerts.length === 0 && !loading && (
            <div
              className={`text-center p-8 border rounded-lg dashed ${theme.colors.text.muted} ${theme.colors.border}`}
            >
              No alerts found matching filter.
            </div>
          )}
        </div>

        {/* Detail View */}
        <div className="lg:col-span-1">
          {selectedAlert ? (
            <div
              className={`rounded-lg p-6 sticky top-6 ${theme.colors.background} border ${theme.colors.border}`}
            >
              <h3
                className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme.colors.text.primary}`}
              >
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Alert Details
              </h3>

              <div className="space-y-6">
                <div>
                  <label className={`text-xs uppercase font-bold ${theme.colors.text.muted}`}>
                    Session ID
                  </label>
                  <div className="text-sm font-mono text-cyan-400 truncate">
                    {selectedAlert.session_id}
                  </div>
                </div>

                <div>
                  <label className={`text-xs uppercase font-bold ${theme.colors.text.muted}`}>
                    Trigger Values
                  </label>
                  <pre
                    className={`mt-1 p-3 rounded text-xs text-green-400 font-mono overflow-auto ${theme.colors.background}`}
                  >
                    {JSON.stringify(selectedAlert.triggered_by, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className={`text-xs uppercase font-bold ${theme.colors.text.muted}`}>
                    Thresholds Used
                  </label>
                  <pre
                    className={`mt-1 p-3 rounded text-xs font-mono overflow-auto ${theme.colors.background} ${theme.colors.text.muted}`}
                  >
                    {JSON.stringify(selectedAlert.threshold_used, null, 2)}
                  </pre>
                </div>

                <div className={`pt-4 border-t ${theme.colors.border}`}>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className={`w-full py-2 rounded text-sm transition ${theme.colors.background} ${theme.colors.hover} ${theme.colors.text.secondary}`}
                    aria-label="Close Details"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-lg p-8 text-center ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.muted}`}
            >
              Select an alert to view full trigger details and thresholds.
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {total > 50 && (
        <div className={`flex justify-center gap-2 pt-4 border-t ${theme.colors.border}`}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded disabled:opacity-50 hover:${theme.colors.text.primary} ${theme.colors.background} ${theme.colors.text.muted}`}
            aria-label="Previous Page"
          >
            Previous
          </button>
          <span className={`px-3 py-1 ${theme.colors.text.muted}`}>
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * 50 >= total}
            className={`px-3 py-1 rounded disabled:opacity-50 hover:${theme.colors.text.primary} ${theme.colors.background} ${theme.colors.text.muted}`}
            aria-label="Next Page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
