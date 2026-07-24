"use client";

/**
 * QuickLogForm — Fast event creation with type-ahead selection.
 *
 * Designed for minimal friction: type a title, pick a category, hit Enter.
 * Optional expansion for duration, tags, and mood (VAC mini-sliders).
 */

import { useState, useCallback, useRef } from "react";
import { Plus, Clock, Tag, ChevronDown, Loader2 } from "lucide-react";
import { useJournalStore } from "@/stores/useJournalStore";
import { EventTypeIcon } from "@/components/journal/EventTypeIcon";
import { COMMON_EVENT_TYPES } from "@/types/journal";
import type { CreateLifeEvent } from "@/types/journal";

export function QuickLogForm() {
  const createEvent = useJournalStore((s) => s.createEvent);
  const isLoading = useJournalStore((s) => s.isLoading);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("calendar.event");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [duration, setDuration] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || isLoading) return;

      const event: CreateLifeEvent = {
        event_type: eventType,
        title: title.trim(),
      };

      if (description.trim()) event.description = description.trim();
      if (duration && !isNaN(Number(duration)))
        event.duration_minutes = Number(duration);
      if (tags.trim())
        event.tags = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

      const created = await createEvent(event);
      if (created) {
        // Reset form
        setTitle("");
        setDescription("");
        setDuration("");
        setTags("");
        setShowExpanded(false);
        titleRef.current?.focus();
      }
    },
    [title, eventType, description, duration, tags, isLoading, createEvent]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Plus size={18} className="text-cyan-400" />
        <h3 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
          Log Event
        </h3>
      </div>

      {/* Type selector + Title */}
      <div className="flex gap-2">
        {/* Event type dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg
              bg-white/5 border border-white/10 hover:border-white/20
              transition-colors text-sm"
          >
            <EventTypeIcon eventType={eventType} size={14} />
            <ChevronDown size={12} className="text-white/40" />
          </button>

          {/* Dropdown menu */}
          {showTypeMenu && (
            <div
              className="absolute top-full left-0 mt-1 z-50 w-56
                bg-slate-900/95 backdrop-blur-xl border border-white/10
                rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto py-1">
                {COMMON_EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setEventType(type.value);
                      setShowTypeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                      transition-colors hover:bg-white/5
                      ${eventType === type.value ? "bg-cyan-500/10 text-cyan-300" : "text-white/70"}`}
                  >
                    <EventTypeIcon eventType={type.value} size={14} />
                    <span>{type.label}</span>
                    <span className="ml-auto text-xs text-white/30">
                      {type.domain}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title input */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What happened?"
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
            text-white placeholder-white/30 text-sm
            focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
            transition-all"
        />
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setShowExpanded(!showExpanded)}
        className="text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        {showExpanded ? "− Less" : "+ More details"}
      </button>

      {/* Expanded fields */}
      {showExpanded && (
        <div className="space-y-2 animate-in slide-in-from-top-2">
          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
              text-white placeholder-white/30 text-sm resize-none
              focus:outline-none focus:border-cyan-500/50 transition-all"
          />

          <div className="flex gap-2">
            {/* Duration */}
            <div className="flex items-center gap-1.5 flex-1">
              <Clock size={12} className="text-white/30" />
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Duration (min)"
                min="0"
                className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10
                  text-white placeholder-white/30 text-xs
                  focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-1">
              <Tag size={12} className="text-white/30" />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma sep)"
                className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10
                  text-white placeholder-white/30 text-xs
                  focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!title.trim() || isLoading}
        className="w-full py-2 rounded-lg text-sm font-medium
          bg-gradient-to-r from-cyan-500/20 to-purple-500/20
          border border-cyan-500/30 text-cyan-300
          hover:from-cyan-500/30 hover:to-purple-500/30
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-all duration-200"
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin mx-auto" />
        ) : (
          "Log Event"
        )}
      </button>
    </form>
  );
}
