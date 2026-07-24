"use client";

/**
 * JournalPanel — Main slide-out panel for the Life Journal.
 *
 * Glassmorphic panel that slides in from the right, with four tabs:
 * Timeline, Insights, Integrations, and Log Event.
 *
 * Toggle with the `J` key or the header button.
 */

import { useEffect, useCallback } from "react";
import { useSpring, animated } from "@react-spring/web";
import {
  X,
  CalendarDays,
  Sparkles,
  Link2,
  PenLine,
  BookOpen,
} from "lucide-react";
import { useJournalStore } from "@/stores/useJournalStore";
import { TimelineView } from "@/components/journal/TimelineView";
import { CorrelationInsights } from "@/components/journal/CorrelationInsights";
import { IntegrationSettings } from "@/components/journal/IntegrationSettings";
import { QuickLogForm } from "@/components/journal/QuickLogForm";
import type { JournalTab } from "@/types/journal";

const TABS: { id: JournalTab; label: string; icon: typeof CalendarDays }[] = [
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "insights", label: "Insights", icon: Sparkles },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "log", label: "Log", icon: PenLine },
];

export function JournalPanel() {
  const isPanelOpen = useJournalStore((s) => s.isPanelOpen);
  const activeTab = useJournalStore((s) => s.activeTab);
  const closePanel = useJournalStore((s) => s.closePanel);
  const setActiveTab = useJournalStore((s) => s.setActiveTab);
  const error = useJournalStore((s) => s.error);

  // Slide animation
  const slideStyle = useSpring({
    transform: isPanelOpen ? "translateX(0%)" : "translateX(100%)",
    opacity: isPanelOpen ? 1 : 0,
    config: { tension: 300, friction: 30 },
  });

  // Backdrop animation
  const backdropStyle = useSpring({
    opacity: isPanelOpen ? 1 : 0,
    config: { tension: 200, friction: 25 },
  });

  // ESC to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPanelOpen) {
        closePanel();
      }
    },
    [isPanelOpen, closePanel]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Don't render when fully closed (for performance)
  if (!isPanelOpen && slideStyle.opacity.get() === 0) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <animated.div
        style={backdropStyle}
        onClick={closePanel}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <animated.div
        style={slideStyle}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md
          bg-slate-950/90 backdrop-blur-2xl border-l border-white/5
          flex flex-col shadow-2xl shadow-black/50"
      >
        {/* ──── Header ──── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white/90 tracking-wide">
              Life Journal
            </h2>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30
              hover:text-white/60 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* ──── Tabs ──── */}
        <div className="flex border-b border-white/5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5
                  py-2.5 text-xs font-medium transition-all duration-200
                  border-b-2
                  ${
                    isActive
                      ? "border-cyan-500 text-cyan-300"
                      : "border-transparent text-white/40 hover:text-white/60"
                  }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ──── Error Banner ──── */}
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* ──── Tab Content ──── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/5">
          {activeTab === "timeline" && <TimelineView />}
          {activeTab === "insights" && <CorrelationInsights />}
          {activeTab === "integrations" && <IntegrationSettings />}
          {activeTab === "log" && <QuickLogForm />}
        </div>

        {/* ──── Footer ──── */}
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-[10px] text-white/15 text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30">J</kbd> to toggle
            · <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/30">Esc</kbd> to close
          </p>
        </div>
      </animated.div>
    </>
  );
}
