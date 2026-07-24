"use client";

/**
 * JournalIntegrationsTab — Admin view of integration health.
 *
 * Adapter health summary cards + all active connections table
 * with force-disconnect capability.
 */

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Calendar,
  Sun,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { adminJournalApi } from "@/services/adminJournalService";
import type { AdminIntegration, AdapterHealth } from "@/services/adminJournalService";

/** Icon for adapter types. */
function adapterIcon(adapterId: string) {
  if (adapterId.includes("ical") || adapterId.includes("calendar"))
    return <Calendar className="w-5 h-5 text-blue-400" />;
  if (adapterId.includes("weather"))
    return <Cloud className="w-5 h-5 text-amber-400" />;
  if (adapterId.includes("daylight") || adapterId.includes("sun"))
    return <Sun className="w-5 h-5 text-yellow-400" />;
  return <Link2 className="w-5 h-5 text-gray-400" />;
}

export function JournalIntegrationsTab() {
  const theme = useAdminTheme();
  const [health, setHealth] = useState<AdapterHealth[]>([]);
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [healthData, integrationsData] = await Promise.all([
        adminJournalApi.getIntegrationHealth(),
        adminJournalApi.listIntegrations(),
      ]);
      setHealth(healthData.adapters);
      setIntegrations(integrationsData.integrations);
      setTotal(integrationsData.total);
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleForceDisconnect = async (id: string) => {
    if (!confirm("Force-disconnect this integration?")) return;
    try {
      await adminJournalApi.forceDisconnect(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => prev - 1);
      // Refresh health
      const healthData = await adminJournalApi.getIntegrationHealth();
      setHealth(healthData.adapters);
    } catch (err) {
      console.error("Force disconnect failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Adapter Health Cards */}
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>
          Adapter Health
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className={`w-5 h-5 animate-spin ${theme.colors.text.muted}`} />
          </div>
        ) : health.length === 0 ? (
          <div className={`text-center py-8 ${theme.colors.text.muted}`}>
            No adapters connected by any user yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {health.map((adapter) => (
              <div
                key={adapter.adapter_id}
                className={`p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {adapterIcon(adapter.adapter_id)}
                  <div>
                    <p className={`font-medium ${theme.colors.text.primary}`}>
                      {adapter.adapter_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className={`text-xs ${theme.colors.text.muted}`}>
                      {adapter.total_connections} connection{adapter.total_connections !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Error rate bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={theme.colors.text.muted}>Health</span>
                    <span
                      className={
                        adapter.error_rate > 0.5
                          ? "text-red-400"
                          : adapter.error_rate > 0
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    >
                      {adapter.error_count === 0
                        ? "All healthy"
                        : `${adapter.error_count} error${adapter.error_count !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${(1 - adapter.error_rate) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Connections Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${theme.colors.text.secondary}`}>
            All Connections ({total})
          </h3>
          <button
            onClick={fetchData}
            className={`p-1.5 rounded-md ${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className={`rounded-lg border overflow-hidden ${theme.colors.border}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${theme.colors.border} ${theme.colors.background}`}>
                <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Adapter</th>
                <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>User</th>
                <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Status</th>
                <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Last Sync</th>
                <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Error</th>
                <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}></th>
              </tr>
            </thead>
            <tbody>
              {integrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center ${theme.colors.text.muted}`}>
                    No active integrations
                  </td>
                </tr>
              ) : (
                integrations.map((integration) => (
                  <tr
                    key={integration.id}
                    className={`border-b ${theme.colors.border} hover:bg-white/5 transition-colors`}
                  >
                    <td className={`px-4 py-3 ${theme.colors.text.primary}`}>
                      <div className="flex items-center gap-2">
                        {adapterIcon(integration.adapter_id)}
                        <span>{integration.adapter_id}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${theme.colors.text.muted}`}>
                      {integration.user_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      {integration.sync_status === "error" ? (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> {integration.sync_status}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${theme.colors.text.muted}`}>
                      {integration.last_sync_at
                        ? new Date(integration.last_sync_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </td>
                    <td className={`px-4 py-3 text-xs text-red-400/60 max-w-[200px] truncate`}>
                      {integration.sync_error || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleForceDisconnect(integration.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                        title="Force disconnect"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
