"use client";

/**
 * JournalStreamTab — NATS JetStream health monitor.
 *
 * Shows stream status card with connection info and recent event feed.
 */

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Wifi, WifiOff, Activity, Radio } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { adminJournalApi } from "@/services/adminJournalService";
import type { StreamStatus, AdminEvent } from "@/services/adminJournalService";
import { EventTypeIcon } from "@/components/journal/EventTypeIcon";

export function JournalStreamTab() {
  const theme = useAdminTheme();
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [recentEvents, setRecentEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [status, eventsData] = await Promise.all([
        adminJournalApi.getStreamStatus(),
        adminJournalApi.listEvents({ limit: 10 }),
      ]);
      setStreamStatus(status);
      setRecentEvents(eventsData.events);
    } catch (err) {
      console.error("Failed to fetch stream status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-poll every 10s when enabled
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [polling, fetchStatus]);

  if (loading && !streamStatus) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className={`w-5 h-5 animate-spin ${theme.colors.text.muted}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stream Status Card */}
      <div className={`p-6 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {streamStatus?.connected ? (
              <div className="relative">
                <Wifi className="w-6 h-6 text-green-400" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h3 className={`text-lg font-semibold ${theme.colors.text.primary}`}>
                NATS JetStream
              </h3>
              <p className={`text-sm ${theme.colors.text.muted}`}>
                {streamStatus?.message || "Unknown status"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-poll toggle */}
            <button
              onClick={() => setPolling(!polling)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                polling
                  ? "border-green-500/30 text-green-400 bg-green-500/10"
                  : `${theme.colors.border} ${theme.colors.text.muted}`
              }`}
            >
              <Radio className={`w-3 h-3 ${polling ? "animate-pulse" : ""}`} />
              {polling ? "Live" : "Poll"}
            </button>
            <button
              onClick={fetchStatus}
              className={`p-1.5 rounded-md ${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className={`text-xs ${theme.colors.text.muted}`}>NATS Enabled</p>
            <p className={`text-sm font-medium mt-0.5 ${streamStatus?.nats_enabled ? "text-green-400" : "text-red-400"}`}>
              {streamStatus?.nats_enabled ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className={`text-xs ${theme.colors.text.muted}`}>Connected</p>
            <p className={`text-sm font-medium mt-0.5 ${streamStatus?.connected ? "text-green-400" : "text-red-400"}`}>
              {streamStatus?.connected ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className={`text-xs ${theme.colors.text.muted}`}>Stream Name</p>
            <p className={`text-sm font-mono mt-0.5 ${theme.colors.text.secondary}`}>
              {streamStatus?.stream_name || "—"}
            </p>
          </div>
          <div>
            <p className={`text-xs ${theme.colors.text.muted}`}>Recent Events</p>
            <p className={`text-sm font-medium mt-0.5 ${theme.colors.text.primary}`}>
              {recentEvents.length}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Event Feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className={`w-4 h-4 ${theme.colors.text.muted}`} />
          <h3 className={`text-sm font-semibold ${theme.colors.text.secondary}`}>
            Recent Events Feed
          </h3>
          {polling && (
            <span className="text-[10px] text-green-400/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Auto-refreshing
            </span>
          )}
        </div>

        <div className={`rounded-lg border overflow-hidden ${theme.colors.border}`}>
          {recentEvents.length === 0 ? (
            <div className={`px-4 py-8 text-center ${theme.colors.text.muted}`}>
              No recent events
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <EventTypeIcon eventType={event.event_type} size={14} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${theme.colors.text.primary} truncate block`}>
                      {event.title}
                    </span>
                    <span className={`text-xs ${theme.colors.text.muted}`}>
                      {event.event_type} · {event.source}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs ${theme.colors.text.muted}`}>
                      {new Date(event.timestamp).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                    <p className={`text-[10px] font-mono ${theme.colors.text.muted}`}>
                      {event.user_id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
