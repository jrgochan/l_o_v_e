import React, { useEffect, useState } from "react";
import { ClinicalAlert } from "@/types/admin";
import { adminApi } from "@/utils/api";
import { RefreshCw, AlertTriangle, Activity, Filter } from "lucide-react";

export default function ClinicalAlertsTab() {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<ClinicalAlert | null>(null);

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterLevel]);

  const fetchAlerts = async () => {
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
  };

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
      <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg border border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            Clinical Risk Alerts
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Review automated risk detections from recent sessions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded px-3 py-1.5 border border-gray-700">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-transparent text-sm text-white outline-none border-none"
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
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Refresh"
            aria-label="Refresh Alerts"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          {loading && alerts.length === 0 ? (
            <div className="text-center p-8 text-gray-500" role="status">
              Loading alerts...
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`
                                    p-4 rounded-lg border cursor-pointer transition-all
                                    ${selectedAlert?.id === alert.id ? "bg-gray-800 ring-1 ring-white/20" : "bg-gray-900 hover:bg-gray-800"}
                                    border-gray-800
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
                    <span className="text-sm font-mono text-gray-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">v{alert.version}</span>
                </div>
                <h3 className="text-white font-medium">{alert.message}</h3>
                <p className="text-sm text-gray-400 mt-1">{alert.suggestion}</p>
              </div>
            ))
          )}
          {alerts.length === 0 && !loading && (
            <div className="text-center p-8 text-gray-500 border border-gray-800 rounded-lg dashed">
              No alerts found matching filter.
            </div>
          )}
        </div>

        {/* Detail View */}
        <div className="lg:col-span-1">
          {selectedAlert ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Alert Details
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase text-gray-500 font-bold">Session ID</label>
                  <div className="text-sm font-mono text-cyan-400 truncate">
                    {selectedAlert.session_id}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase text-gray-500 font-bold">
                    Trigger Values
                  </label>
                  <pre className="mt-1 bg-black/50 p-3 rounded text-xs text-green-400 font-mono overflow-auto">
                    {JSON.stringify(selectedAlert.triggered_by, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-xs uppercase text-gray-500 font-bold">
                    Thresholds Used
                  </label>
                  <pre className="mt-1 bg-black/50 p-3 rounded text-xs text-gray-400 font-mono overflow-auto">
                    {JSON.stringify(selectedAlert.threshold_used, null, 2)}
                  </pre>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition"
                    aria-label="Close Details"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center text-gray-500">
              Select an alert to view full trigger details and thresholds.
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {total > 50 && (
        <div className="flex justify-center gap-2 pt-4 border-t border-gray-800">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-800 text-gray-400 rounded disabled:opacity-50 hover:text-white"
            aria-label="Previous Page"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-gray-500">
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * 50 >= total}
            className="px-3 py-1 bg-gray-800 text-gray-400 rounded disabled:opacity-50 hover:text-white"
            aria-label="Next Page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
