/**
 * Command Palette Component
 *
 * Beautiful keyboard-driven command palette for emotion navigation.
 * Opens with CMD+K and provides instant access to all emotions.
 */

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Command } from "cmdk";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useCommandPaletteFilter } from "@/hooks/command-palette/useCommandPaletteFilter";
import type { Emotion } from "@/types/visualization";
import type { CommandAction, KeyModifiers } from "@/types/command-palette";
import { JOURNEY_TEMPLATES } from "@/data/journey-templates";

import { ActiveJourneyStatus } from "./command-palette/ActiveJourneyStatus";
import { PaletteHelp } from "./command-palette/PaletteHelp";
import { PaletteResults } from "./command-palette/PaletteResults";

// Extend Window interface for command palette global state
declare global {
  interface Window {
    openCommandPalette?: () => void;
    __commandPaletteOpen?: boolean;
  }
}

export function CommandPalette() {
  const palette = useCommandPalette();

  const selectedEmotionIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const inputRef = useRef<HTMLInputElement>(null);
  const setSelectedPath = useVisualizationStore((state) => state.setSelectedPath);
  const setFocusedEmotion = useVisualizationStore((state) => state.setFocusedEmotion);

  // Journey and session state from experience store
  const activeJourney = useExperienceStore((state) => state.activeJourney);
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const activeSession = useExperienceStore((state) => state.activeSession);

  // Use the extracted filter hook
  const {
    filteredEmotions,
    filteredPaths,
    recentEmotionsList,
    favoriteEmotionsList,
    emotionsByCategory,
  } = useCommandPaletteFilter({
    search: palette.search,
    selectedCategory: palette.selectedCategory,
    favoriteEmotions: palette.favoriteEmotions,
    recentEmotions: palette.recentEmotions,
    selectedEmotionIds,
  });

  const [modifiers, setModifiers] = useState<KeyModifiers>({
    command: false,
    option: false,
    shift: false,
  });

  // Auto-focus input when palette opens
  useEffect(() => {
    if (palette.isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [palette.isOpen]);

  // Track modifier keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifiers({
        command: e.metaKey || e.ctrlKey,
        option: e.altKey,
        shift: e.shiftKey,
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifiers({
        command: e.metaKey || e.ctrlKey,
        option: e.altKey,
        shift: e.shiftKey,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Get action based on modifiers
  const getAction = (modifiers: KeyModifiers): CommandAction => {
    if (modifiers.command && modifiers.shift) return "toggle";
    if (modifiers.command) return "add";
    if (modifiers.option && modifiers.shift) return "isolate";
    if (modifiers.option) return "focus";

    if (modifiers.shift) return "navigate";
    return "select";
  };

  // Get action label for footer
  const getActionLabel = (modifiers: KeyModifiers): string => {
    if (modifiers.command && modifiers.shift) return "⌘⇧ Toggle";
    if (modifiers.command) return "⌘ Add";
    if (modifiers.option && modifiers.shift) return "⌥⇧ Isolate";
    if (modifiers.option) return "⌥ Focus";
    if (modifiers.shift) return "⇧ Navigate";
    return "Select";
  };

  // Handle emotion selection
  const handleEmotionSelect = (emotion: Emotion) => {
    const action = getAction(modifiers);
    palette.executeAction(emotion, action, modifiers);
  };

  // Handle path selection
  const handlePathSelect = (pathId: string) => {
    setFocusedEmotion(null); // Clear emotion focus to see path
    setSelectedPath(pathId);
    palette.close();
  };

  // Quick actions list definition
  const quickActions = useMemo(() => {
    const actions = [
      { command: "/clear", description: "Clear all selections" },
      { command: "/bridge", description: "Select bridge emotions" },
      { command: "/reset", description: "Reset experience to initial state", icon: "🔄" },
      { command: "/debug", description: "Toggle data visualization mode", icon: "🐞" },
      { command: "/performance", description: "Toggle animations for performance", icon: "⚡" },
      { command: "/toggle legend", description: "Show/hide legend", icon: "🗺️" },
      { command: "/toggle labels", description: "Show/hide emotion labels", icon: "🏷️" },
      { command: "/toggle paths", description: "Show/hide transition paths", icon: "〰️" },
      { command: "/help", description: "Show keyboard shortcuts" },
    ];

    // Journey commands
    if (!transitionPath) {
      actions.push({
        command: "/journey start",
        description: "⚠️ Begin journey (compute a path first)",
      });
    } else if (activeJourney && activeJourney.status === "in_progress") {
      actions.push({ command: "/journey pause", description: "Pause active journey" });
      actions.push({ command: "/journey complete", description: "Mark journey as complete" });
      actions.push({ command: "/journey abandon", description: "Abandon current journey" });
    } else if (activeJourney && activeJourney.status === "paused") {
      actions.push({ command: "/journey resume", description: "Resume paused journey" });
      actions.push({ command: "/journey abandon", description: "Abandon paused journey" });
    } else {
      actions.push({ command: "/journey start", description: "Begin journey from current path" });
    }

    // Waypoint commands
    if (activeJourney && transitionPath) {
      actions.push({ command: "/next", description: "Move to next waypoint" });
      actions.push({ command: "/previous", description: "Go to previous waypoint" });
      actions.push({ command: "/waypoint list", description: "View all waypoints" });
      actions.push({ command: "/waypoint current", description: "Show current waypoint" });
    } else {
      actions.push({ command: "/next", description: "⚠️ Next waypoint (start journey first)" });
      actions.push({
        command: "/previous",
        description: "⚠️ Previous waypoint (start journey first)",
      });
    }

    // Template commands
    actions.push({ command: "/template list", description: "View all journey templates" });
    JOURNEY_TEMPLATES.forEach((template) => {
      actions.push({
        command: `/template ${template.id}`,
        description: `${template.icon} ${template.name} (${template.difficulty}, ${template.estimated_duration})`,
      });
    });

    // Session commands
    if (!activeSession) {
      actions.push({ command: "/session start", description: "📝 Start therapeutic session" });
    } else if (activeSession.status === "active") {
      actions.push({ command: "/session pause", description: "⏸️ Pause session" });
      actions.push({ command: "/session end", description: "🏁 End session" });
      actions.push({ command: "/session notes", description: "📝 Add session note" });
    } else if (activeSession.status === "paused") {
      actions.push({ command: "/session resume", description: "▶️ Resume session" });
      actions.push({ command: "/session end", description: "🏁 End session" });
    }

    return actions;
  }, [transitionPath, activeJourney, activeSession]);

  // Global listeners
  useEffect(() => {
    window.openCommandPalette = () => palette.open();
    return () => {
      delete window.openCommandPalette;
    };
  }, [palette]);

  useEffect(() => {
    window.__commandPaletteOpen = palette.isOpen;
  }, [palette]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        palette.toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [palette]);

  if (!palette.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999]" role="dialog" aria-label="Emotion Command Palette">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={palette.close}
        aria-hidden="true"
      />

      {/* Centered container */}
      <div className="flex items-start justify-center pt-[15vh] px-4 fixed inset-0 pointer-events-none">
        <Command
          shouldFilter={
            !palette.search.match(/^[~!>@]/) &&
            !palette.search.match(/^(valence|arousal|connection)/i)
          }
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (palette.currentPage === "category") {
                palette.goHome();
              } else {
                palette.close();
              }
            }

            if (e.key === "Backspace" && !palette.search) {
              e.preventDefault();
              if (palette.currentPage === "category" || palette.currentPage === "help") {
                palette.goHome();
              }
            }
          }}
          className="relative w-full max-w-2xl bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-4 duration-200 pointer-events-auto"
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-700 px-4">
            <span className="text-gray-400 text-lg mr-3">🔍</span>
            <Command.Input
              ref={inputRef}
              value={palette.search}
              onValueChange={palette.setSearch}
              placeholder="Search emotions or actions..."
              className="flex-1 bg-transparent border-0 outline-none py-4 text-white placeholder-gray-400 text-sm"
            />
            {(palette.currentPage === "category" || palette.currentPage === "help") && (
              <button
                onClick={palette.goHome}
                className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition"
              >
                ← Back
              </button>
            )}
          </div>

          <ActiveJourneyStatus onAction={palette.executeQuickAction} />

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {palette.currentPage === "help" ? (
              <PaletteHelp />
            ) : (
              <PaletteResults
                search={palette.search}
                currentPage={palette.currentPage}
                selectedCategory={palette.selectedCategory}
                selectedEmotionIds={selectedEmotionIds}
                filteredEmotions={filteredEmotions}
                filteredPaths={filteredPaths}
                recentEmotionsList={recentEmotionsList}
                favoriteEmotionsList={favoriteEmotionsList}
                emotionsByCategory={emotionsByCategory}
                quickActions={quickActions}
                onSelectEmotion={handleEmotionSelect}
                onSelectPath={handlePathSelect}
                onSelectCategory={palette.viewCategory}
                onQuickAction={palette.executeQuickAction}
                isFavorite={palette.isFavorite}
              />
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-gray-700 px-4 py-2 bg-gray-800/50 text-xs text-gray-400 flex items-center justify-between rounded-b-xl">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span className="border-l border-gray-600 pl-4">{getActionLabel(modifiers)}</span>
              {modifiers.command && <span className="text-cyan-400">Multi-select mode</span>}
              {modifiers.option && <span className="text-purple-400">Focus mode</span>}
              {modifiers.shift && <span className="text-orange-400">Navigate mode</span>}
              {activeSession && (
                <span className="border-l border-gray-600 pl-4 text-green-400">
                  {activeSession.status === "active"
                    ? "🟢 Session Active"
                    : activeSession.status === "paused"
                      ? "⏸️ Session Paused"
                      : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {palette.search && !palette.search.startsWith("/") && (
                <span className="text-gray-500">
                  {palette.search.startsWith("~")
                    ? "Similarity"
                    : palette.search.startsWith("!")
                      ? "Opposite"
                      : palette.search.startsWith(">")
                        ? "Category"
                        : palette.search.startsWith("@")
                          ? "Favorites"
                          : palette.search.match(/^(valence|arousal|connection)/i)
                            ? "VAC Filter"
                            : "Search"}
                </span>
              )}
              <span>Esc Close</span>
            </div>
          </div>
        </Command>
      </div>

      <style jsx global>{`
        [cmdk-root] {
          background: transparent;
        }

        [cmdk-group-heading] {
          color: rgb(156, 163, 175);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem 0.75rem;
          margin-top: 0.5rem;
        }

        [cmdk-group-heading]:first-child {
          margin-top: 0;
        }

        [cmdk-item][data-selected="true"] {
          background: rgba(6, 182, 212, 0.2);
          color: rgb(165, 243, 252);
        }

        [cmdk-separator] {
          height: 1px;
          background: rgb(55, 65, 81);
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
