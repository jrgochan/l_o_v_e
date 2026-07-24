"use client";

/**
 * EventTypeIcon — Maps life event types to lucide-react icons.
 *
 * Used throughout the journal UI to visually differentiate event categories.
 */

import {
  Heart,
  Dumbbell,
  Moon,
  UtensilsCrossed,
  Pill,
  Wine,
  Briefcase,
  Target,
  Trophy,
  Users,
  Swords,
  Brain,
  Sparkles,
  TrendingUp,
  BookOpen,
  Cloud,
  Sun,
  Thermometer,
  Plane,
  Calendar,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

/** Mapping from event_type prefix → icon + color */
const ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  // Wellness
  "wellness.exercise": { icon: Dumbbell, color: "#22c55e" },
  "wellness.sleep": { icon: Moon, color: "#818cf8" },
  "wellness.meal": { icon: UtensilsCrossed, color: "#f59e0b" },
  "wellness.medication": { icon: Pill, color: "#06b6d4" },
  "wellness.substance": { icon: Wine, color: "#ef4444" },
  "wellness.appointment": { icon: Heart, color: "#ec4899" },

  // Work
  "work.meeting": { icon: Users, color: "#3b82f6" },
  "work.deadline": { icon: Target, color: "#f97316" },
  "work.achievement": { icon: Trophy, color: "#eab308" },

  // Relationships
  "relationship.social_event": { icon: Users, color: "#a78bfa" },
  "relationship.conflict": { icon: Swords, color: "#ef4444" },

  // Mental
  "mental.therapy_session": { icon: Brain, color: "#14b8a6" },
  "mental.meditation": { icon: Sparkles, color: "#c084fc" },

  // Growth
  "growth.learning": { icon: BookOpen, color: "#22d3ee" },

  // Environment / Context
  "context.weather": { icon: Cloud, color: "#60a5fa" },
  "context.daylight": { icon: Sun, color: "#fbbf24" },
  "environment.travel": { icon: Plane, color: "#8b5cf6" },

  // Calendar
  "calendar.event": { icon: Calendar, color: "#94a3b8" },

  // Financial
  "financial.transaction": { icon: DollarSign, color: "#10b981" },
};

/** Domain fallbacks when exact event_type isn't in the map */
const DOMAIN_FALLBACK: Record<string, { icon: LucideIcon; color: string }> = {
  wellness: { icon: Heart, color: "#22c55e" },
  work: { icon: Briefcase, color: "#3b82f6" },
  relationship: { icon: Users, color: "#a78bfa" },
  mental: { icon: Brain, color: "#14b8a6" },
  growth: { icon: TrendingUp, color: "#22d3ee" },
  environment: { icon: Cloud, color: "#60a5fa" },
  context: { icon: Thermometer, color: "#f59e0b" },
  calendar: { icon: Calendar, color: "#94a3b8" },
  financial: { icon: DollarSign, color: "#10b981" },
};

interface EventTypeIconProps {
  eventType: string;
  size?: number;
  className?: string;
}

export function EventTypeIcon({
  eventType,
  size = 16,
  className = "",
}: EventTypeIconProps) {
  // Try exact match first
  let match = ICON_MAP[eventType];

  // Fallback to domain
  if (!match) {
    const domain = eventType.split(".")[0];
    match = DOMAIN_FALLBACK[domain] || { icon: Calendar, color: "#94a3b8" };
  }

  const Icon = match.icon;

  return (
    <Icon
      size={size}
      className={className}
      style={{ color: match.color }}
    />
  );
}

/** Get just the color for an event type (for bars, badges, etc.) */
export function getEventTypeColor(eventType: string): string {
  const match = ICON_MAP[eventType];
  if (match) return match.color;

  const domain = eventType.split(".")[0];
  return DOMAIN_FALLBACK[domain]?.color || "#94a3b8";
}
