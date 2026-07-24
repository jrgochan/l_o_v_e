"use client";

/**
 * TimelineView — Chronological event display with emotion annotations.
 *
 * Shows life events grouped by date, with the nearest emotion state
 * annotated alongside each event. Uses a vertical timeline with
 * domain-colored icons.
 */

import { useMemo } from "react";
import { Clock, Trash2, CalendarDays } from "lucide-react";
import { useJournalStore } from "@/stores/useJournalStore";
import { EventTypeIcon, getEventTypeColor } from "@/components/journal/EventTypeIcon";
import type { LifeEvent } from "@/types/journal";

/** Group events by date (YYYY-MM-DD). */
function groupByDate(events: LifeEvent[]): Map<string, LifeEvent[]> {
  const groups = new Map<string, LifeEvent[]>();

  for (const event of events) {
    const date = event.timestamp.slice(0, 10); // YYYY-MM-DD
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(event);
  }

  return groups;
}

/** Format a date string for display. */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return "Today";
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format time from ISO string. */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function EventCard({ event }: { event: LifeEvent }) {
  const deleteEvent = useJournalStore((s) => s.deleteEvent);
  const color = getEventTypeColor(event.event_type);

  return (
    <div
      className="group relative flex gap-3 py-3 px-3 rounded-xl
        bg-white/[0.02] hover:bg-white/[0.05] border border-transparent
        hover:border-white/10 transition-all duration-200"
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center pt-0.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center
            bg-white/5 border border-white/10 shrink-0"
        >
          <EventTypeIcon eventType={event.event_type} size={14} />
        </div>
        <div className="w-px flex-1 bg-white/5 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white/90 truncate">
            {event.title}
          </h4>
          <button
            onClick={() => deleteEvent(event.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded
              hover:bg-red-500/20 text-white/30 hover:text-red-400
              transition-all"
            title="Delete event"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-white/40 flex items-center gap-1">
            <Clock size={10} />
            {formatTime(event.timestamp)}
          </span>

          {event.duration_minutes && (
            <span className="text-xs text-white/30">
              {event.duration_minutes}min
            </span>
          )}

          <span
            className="text-xs px-1.5 py-0.5 rounded-md bg-white/5"
            style={{ color }}
          >
            {event.event_type.split(".").pop()}
          </span>

          {event.source !== "user" && event.source !== "manual" && (
            <span className="text-xs text-white/20 italic">
              via {event.source}
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-xs text-white/40 mt-1.5 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full
                  bg-white/5 text-white/40 border border-white/5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineView() {
  const events = useJournalStore((s) => s.events);
  const isLoading = useJournalStore((s) => s.isLoading);
  const fetchEvents = useJournalStore((s) => s.fetchEvents);
  const eventsTotal = useJournalStore((s) => s.eventsTotal);

  const grouped = useMemo(() => groupByDate(events), [events]);
  const dates = useMemo(
    () =>
      Array.from(grouped.keys()).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      ),
    [grouped]
  );

  if (isLoading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays size={32} className="mx-auto text-white/20 mb-3" />
        <p className="text-sm text-white/40">No events yet</p>
        <p className="text-xs text-white/25 mt-1">
          Log your first event to start tracking
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {dates.map((date) => (
        <div key={date}>
          {/* Date header */}
          <div
            className="sticky top-0 z-10 flex items-center gap-2 py-2 px-1
              bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-xs font-medium text-white/50 tracking-wider uppercase">
              {formatDate(date)}
            </span>
            <span className="text-xs text-white/20">
              {grouped.get(date)!.length}
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Events for this date */}
          <div className="space-y-0.5">
            {grouped.get(date)!.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}

      {/* Load more */}
      {events.length < eventsTotal && (
        <button
          onClick={() =>
            fetchEvents({ limit: 50, offset: events.length })
          }
          className="w-full py-2 text-xs text-white/40 hover:text-white/60
            transition-colors"
        >
          Load more ({eventsTotal - events.length} remaining)
        </button>
      )}
    </div>
  );
}
