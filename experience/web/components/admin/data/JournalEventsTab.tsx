"use client";

/**
 * JournalEventsTab — Admin view of all life events across users.
 *
 * Filterable table with stats header, inline detail expansion,
 * and bulk event management.
 */

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Trash2, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { adminJournalApi } from "@/services/adminJournalService";
import type { AdminEvent, EventStats, EventFilters } from "@/services/adminJournalService";
import { EventTypeIcon } from "@/components/journal/EventTypeIcon";

export function JournalEventsTab() {
  const theme = useAdminTheme();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: EventFilters = { limit, offset };
      if (filterType) params.event_type = filterType;
      if (filterSource) params.source = filterSource;
      if (filterUser) params.user_id = filterUser;

      const [eventsData, statsData] = await Promise.all([
        adminJournalApi.listEvents(params),
        offset === 0 ? adminJournalApi.getEventStats() : Promise.resolve(null),
      ]);

      setEvents(eventsData.events);
      setTotal(eventsData.total);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSource, filterUser, offset]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await adminJournalApi.deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Events" value={stats.total_events} theme={theme} />
          <StatCard label="Today" value={stats.events_today} theme={theme} color="text-green-400" />
          <StatCard label="Users" value={stats.users_with_events} theme={theme} color="text-cyan-400" />
          <StatCard
            label="Sources"
            value={Object.keys(stats.by_source).length}
            theme={theme}
            color="text-purple-400"
          />
        </div>
      )}

      {/* Filters */}
      <div
        className={`flex flex-wrap gap-3 p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}
      >
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${theme.colors.text.muted}`} />
        </div>
        <input
          type="text"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setOffset(0); }}
          placeholder="Event type..."
          className={`px-3 py-1.5 rounded-md text-sm bg-transparent border ${theme.colors.border} ${theme.colors.text.primary} placeholder:${theme.colors.text.muted}`}
        />
        <input
          type="text"
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setOffset(0); }}
          placeholder="Source..."
          className={`px-3 py-1.5 rounded-md text-sm bg-transparent border ${theme.colors.border} ${theme.colors.text.primary} placeholder:${theme.colors.text.muted}`}
        />
        <input
          type="text"
          value={filterUser}
          onChange={(e) => { setFilterUser(e.target.value); setOffset(0); }}
          placeholder="User ID..."
          className={`px-3 py-1.5 rounded-md text-sm bg-transparent border ${theme.colors.border} ${theme.colors.text.primary} placeholder:${theme.colors.text.muted}`}
        />
        <button
          onClick={() => fetchEvents()}
          className={`p-1.5 rounded-md ${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Events Table */}
      <div
        className={`rounded-lg border overflow-hidden ${theme.colors.border}`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${theme.colors.border} ${theme.colors.background}`}>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}></th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Event</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Type</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Source</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>User</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}>Time</th>
              <th className={`px-4 py-3 text-left font-medium ${theme.colors.text.muted}`}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <RefreshCw className={`w-5 h-5 animate-spin mx-auto ${theme.colors.text.muted}`} />
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={7} className={`px-4 py-8 text-center ${theme.colors.text.muted}`}>
                  No events found
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isExpanded={expandedId === event.id}
                  onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                  onDelete={() => handleDelete(event.id)}
                  theme={theme}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className={`text-sm ${theme.colors.text.muted}`}>
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className={`px-3 py-1.5 rounded text-sm border ${theme.colors.border} ${theme.colors.text.secondary} disabled:opacity-30`}
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className={`px-3 py-1.5 rounded text-sm border ${theme.colors.border} ${theme.colors.text.secondary} disabled:opacity-30`}
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

function StatCard({
  label,
  value,
  color = "text-white",
  theme,
}: {
  label: string;
  value: number;
  color?: string;
  theme: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div className={`p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}>
      <p className={`text-xs ${theme.colors.text.muted}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function EventRow({
  event,
  isExpanded,
  onToggle,
  onDelete,
  theme,
}: {
  event: AdminEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  theme: ReturnType<typeof useAdminTheme>;
}) {
  return (
    <>
      <tr
        className={`border-b ${theme.colors.border} hover:bg-white/5 cursor-pointer transition-colors`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronDown className={`w-4 h-4 ${theme.colors.text.muted}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${theme.colors.text.muted}`} />
          )}
        </td>
        <td className={`px-4 py-3 ${theme.colors.text.primary}`}>
          <div className="flex items-center gap-2">
            <EventTypeIcon eventType={event.event_type} size={14} />
            <span className="truncate max-w-[200px]">{event.title}</span>
          </div>
        </td>
        <td className={`px-4 py-3 ${theme.colors.text.secondary}`}>
          <span className="px-2 py-0.5 rounded bg-white/5 text-xs">{event.event_type}</span>
        </td>
        <td className={`px-4 py-3 ${theme.colors.text.muted}`}>{event.source}</td>
        <td className={`px-4 py-3 font-mono text-xs ${theme.colors.text.muted}`}>
          {event.user_id.slice(0, 8)}…
        </td>
        <td className={`px-4 py-3 ${theme.colors.text.muted} text-xs`}>
          {new Date(event.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className={`border-b ${theme.colors.border}`}>
          <td colSpan={7} className="px-8 py-4 bg-white/[0.02]">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className={theme.colors.text.muted}>Description: </span>
                <span className={theme.colors.text.secondary}>{event.description || "—"}</span>
              </div>
              <div>
                <span className={theme.colors.text.muted}>Duration: </span>
                <span className={theme.colors.text.secondary}>
                  {event.duration_minutes ? `${event.duration_minutes} min` : "—"}
                </span>
              </div>
              <div>
                <span className={theme.colors.text.muted}>Tags: </span>
                <span className={theme.colors.text.secondary}>
                  {event.tags.length ? event.tags.join(", ") : "—"}
                </span>
              </div>
              <div>
                <span className={theme.colors.text.muted}>Impact: </span>
                <span className={theme.colors.text.secondary}>{event.impact ?? "—"}</span>
              </div>
              <div>
                <span className={theme.colors.text.muted}>Recurring: </span>
                <span className={theme.colors.text.secondary}>{event.is_recurring ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className={theme.colors.text.muted}>Full ID: </span>
                <span className={`font-mono ${theme.colors.text.muted}`}>{event.id}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
