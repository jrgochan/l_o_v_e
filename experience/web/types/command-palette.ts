/**
 * Command Palette Type Definitions
 *
 * Types for the CMD+L keyboard-driven emotion navigation system.
 */

import type { Emotion } from "./visualization";

/**
 * Keyboard modifier keys
 */
export interface KeyModifiers {
  command: boolean; // ⌘ on Mac, Ctrl on Windows/Linux
  option: boolean; // ⌥ on Mac, Alt on Windows/Linux
  shift: boolean; // ⇧
}

/**
 * Command palette action types
 */
export type CommandAction =
  | "select" // Replace selection with this emotion
  | "add" // Add to selection (multi-select)
  | "toggle" // Toggle in/out of selection
  | "focus" // Focus camera on emotion
  | "isolate" // Hide all others
  | "navigate" // Smooth camera fly-to
  | "compute-paths"; // Compute paths from this emotion

/**
 * Journey command types
 */
export type JourneyCommand =
  | "start" // Start journey from current path
  | "pause" // Pause active journey
  | "resume" // Resume paused journey
  | "complete" // Mark journey as complete
  | "abandon"; // Abandon current journey

/**
 * Waypoint command types
 */
export type WaypointCommand =
  | "next" // Move to next waypoint
  | "previous" // Return to previous waypoint
  | "goto" // Jump to specific waypoint (requires index)
  | "list" // View all waypoints
  | "current"; // Show current waypoint details

/**
 * Command item types
 */
export type CommandItemType =
  "emotion" | "category" | "action" | "quick-action" | "journey-action" | "waypoint";

/**
 * Base command item
 */
export interface CommandItem {
  id: string;
  type: CommandItemType;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[]; // For search
}

/**
 * Emotion command item
 */
export interface EmotionCommandItem extends CommandItem {
  type: "emotion";
  emotion: Emotion;
  category: string;
}

/**
 * Category command item
 */
export interface CategoryCommandItem extends CommandItem {
  type: "category";
  categoryName: string;
  emotionCount: number;
  emotions: Emotion[];
}

/**
 * Action command item
 */
export interface ActionCommandItem extends CommandItem {
  type: "action";
  action: () => void;
  requiresSelection?: boolean;
}

/**
 * Quick action command item (slash commands)
 */
export interface QuickActionCommandItem extends CommandItem {
  type: "quick-action";
  command: string; // e.g., "/clear", "/bridge"
  action: () => void;
}

/**
 * Journey action command item
 */
export interface JourneyActionCommandItem extends CommandItem {
  type: "journey-action";
  command: string; // e.g., "/journey start", "/journey pause"
  journeyCommand: JourneyCommand;
  requiresActiveJourney?: boolean;
  requiresPath?: boolean;
}

/**
 * Waypoint command item
 */
export interface WaypointCommandItem extends CommandItem {
  type: "waypoint";
  waypointIndex: number;
  waypointName: string;
  isReached: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

/**
 * Union type of all command items
 */
export type AnyCommandItem =
  | EmotionCommandItem
  | CategoryCommandItem
  | ActionCommandItem
  | QuickActionCommandItem
  | JourneyActionCommandItem
  | WaypointCommandItem;

/**
 * Command palette page/view
 */
export type CommandPage = "home" | "category" | "search" | "journey" | "waypoints" | "help";

/**
 * Command palette state
 */
export interface CommandPaletteState {
  isOpen: boolean;
  currentPage: CommandPage;
  selectedCategory: string | null;
  search: string;
  recentEmotions: string[]; // Emotion IDs
  favoriteEmotions: string[]; // Emotion IDs
}

/**
 * Command palette action result
 */
export interface CommandActionResult {
  success: boolean;
  action: CommandAction;
  emotionId?: string;
  message?: string;
}
