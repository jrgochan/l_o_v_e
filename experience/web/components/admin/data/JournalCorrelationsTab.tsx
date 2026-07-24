"use client";

/**
 * JournalCorrelationsTab — Admin view of all discovered correlations.
 *
 * Aggregate stats, sortable correlation table, and status filters.
 */

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Filter, Sparkles } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { adminJournalApi } from "@/services/adminJournalService";
import type {
  AdminCorrelation,
  CorrelationStats,
  CorrelationFilters,
} from "@/services/adminJournalService";
import { EventTypeIcon, getEventTypeColor } from "@/components/journal/EventTypeIcon";

export function JournalCorrelationsTab() {
  const theme = useAdminTheme();
  const [correlations, setCorrelations] = useState<AdminCorrelation[]>([]);
  const [stats, setStats] = useState<CorrelationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterMinStrength, setFilterMinStrength] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: CorrelationFilters = { limit, offset };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.event_type = filterType;
      if (filterMinStrength) params.min_strength = parseFloat(filterMinStrength);

      const [correlationsData, statsData] = await Promise.all([
        adminJournalApi.listCorrelations(params),
        offset === 0 ? adminJournalApi.getCorrelationStats() : Promise.resolve(null),
      ]);

      setCorrelations(correlationsData.correlations);
      setTotal(correlationsData.total);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error("Failed to load correlations:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterMinStrength, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard label="Total" value={stats.total} theme={theme} />
          <StatsCard label="Confirmed" value={stats.confirmed} theme={theme} color="text-green-400" />
          <StatsCard label="Dismissed" value={stats.dismissed} theme={theme} color="text-red-400" />
          <StatsCard
            label="Avg Strength"
            value={`${(stats.avg_strength * 100).toFixed(0)}%`}
            theme={theme}
            color="text-cyan-400"
          />
          <StatsCard
            label="Avg Confidence"
            value={`${(stats.avg_confidence * 100).toFixed(0)}%`}
            theme={theme}
            color="text-purple-400"
          />
        </div>
      )}

      {/* Filters */}
      <div
        className={`flex flex-wrap gap-3 p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}
      >
        <Filter className={`w-4 h-4 ${theme.colors.text.muted} mt-1`} />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setOffset(0); }}
          className={`px-3 py-1.5 rounded-md text-sm bg-transparent border ${theme.colors.border} ${theme.colors.text.primary}`}
        >
          <option value="">All statuses</option>
          <option value="discovered">Discovered</option>
          <option value="validated">Validated</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setOffset(0); }}
          placeholder="Event type..."
          className={`px-3 py-1.5 rounded-md text-sm bg-transparent border ${theme.colors.border} ${theme.colors.text.primary}`}
        />
        <input
          type="number"
          value={filterMinStrength}
          onChange={(e) => { setFilterMinStrength(e.target.value); setOffset(0); }}
          placeholder="Min strength (0-1)"
          min="0"
          max="1"
          step="0.1"
          className={`px-3 py-1.5 rounded-md text-sm bg-transparent border ${theme.colors.border} ${theme.colors.text.primary} w-36`}
        />
        <button
          onClick={() => fetchData()}
          className={`p-1.5 rounded-md ${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Correlations Table */}
      <div className={`rounded-lg border overflow-hidden ${theme.colors.border}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${theme.colors.border} ${theme.colors.background}`}>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Pattern</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Emotion</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Strength</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Confidence</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Samples</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Status</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>User</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <RefreshCw className={`w-5 h-5 animate-spin mx-auto ${theme.colors.text.muted}`} />
                </td>
              </tr>
            ) : correlations.length === 0 ? (
              <tr>
                <td colSpan={7} className={`px-4 py-8 text-center ${theme.colors.text.muted}`}>
                  <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No correlations found
                </td>
              </tr>
            ) : (
              correlations.map((c) => (
                <CorrelationRow key={c.id} correlation={c} theme={theme} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className={`text-sm ${theme.colors.text.muted}`}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className={`px-3 py-1.5 rounded text-sm border ${theme.colors.border} disabled:opacity-30`}
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className={`px-3 py-1.5 rounded text-sm border ${theme.colors.border} disabled:opacity-30`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsCard({
  label,
  value,
  color = "text-white",
  theme,
}: {
  label: string;
  value: number | string;
  color?: string;
  theme: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div className={`p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}>
      <p className={`text-xs ${theme.colors.text.muted}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function CorrelationRow({
  correlation,
  theme,
}: {
  correlation: AdminCorrelation;
  theme: ReturnType<typeof useAdminTheme>;
}) {
  const isPositive = correlation.direction === "positive";
  const color = getEventTypeColor(correlation.event_type);

  const statusColors: Record<string, string> = {
    discovered: "text-blue-400 bg-blue-900/20",
    validated: "text-green-400 bg-green-900/20",
    rejected: "text-red-400 bg-red-900/20",
  };

  const feedbackBadge = correlation.user_feedback === "confirmed"
    ? "text-green-400"
    : correlation.user_feedback === "dismissed"
    ? "text-red-400 line-through"
    : "";

  return (
    <tr className={`border-b ${theme.colors.border} hover:bg-white/5 transition-colors`}>
      <td className={`px-4 py-3 ${theme.colors.text.primary}`}>
        <div className="flex items-center gap-2">
          <EventTypeIcon eventType={correlation.event_type} size={14} />
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className={`truncate max-w-[180px] ${feedbackBadge}`}>
            {correlation.event_pattern}
          </span>
        </div>
      </td>
      <td className={`px-4 py-3 ${theme.colors.text.secondary}`}>{correlation.emotion_name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${correlation.strength * 100}%`,
                background: `linear-gradient(to right, ${color}40, ${color})`,
              }}
            />
          </div>
          <span className={`text-xs ${theme.colors.text.muted}`}>
            {(correlation.strength * 100).toFixed(0)}%
          </span>
        </div>
      </td>
      <td className={`px-4 py-3 text-xs ${theme.colors.text.muted}`}>
        {(correlation.confidence * 100).toFixed(0)}%
      </td>
      <td className={`px-4 py-3 text-xs ${theme.colors.text.muted}`}>
        n={correlation.sample_size}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded text-xs ${statusColors[correlation.status] || theme.colors.text.muted}`}
        >
          {correlation.status}
        </span>
      </td>
      <td className={`px-4 py-3 font-mono text-xs ${theme.colors.text.muted}`}>
        {correlation.user_id.slice(0, 8)}…
      </td>
    </tr>
  );
}
