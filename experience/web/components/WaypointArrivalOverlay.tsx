"use client";

import { useEffect, useState } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { CATEGORY_COLORS } from "@/types";

export function WaypointArrivalOverlay() {
    const isFlying = useExperienceStore((state) => state.isFlying);
    const flyoverCurrentWaypointIndex = useExperienceStore(
        (state) => state.flyoverCurrentWaypointIndex
    );
    const transitionPath = useExperienceStore((state) => state.transitionPath);

    const [visible, setVisible] = useState(false);
    const [currentData, setCurrentData] = useState<{
        title: string;
        subtitle: string;
        description: string;
        color: string;
        strategies?: Array<{ name: string; time_required?: string }>;
    } | null>(null);

    useEffect(() => {
        if (!isFlying || !transitionPath) {
            setVisible(false);
            return;
        }

        // Index 0 is Start, Last Index is Goal.
        // Middle indices are Waypoints (index 1 to length).
        // flyoverCurrentWaypointIndex maps to [Start (0), ...Waypoints, Goal]

        // We only want to show overlay for Waypoints and Goal, effectively. 
        // Maybe also Start if we want to say "Departing: Fear"? 
        // User request was "upon approaching... display... what emotion they are transiting through".
        // Let's show for all valid indices, but handle text differently.

        if (flyoverCurrentWaypointIndex === -1) {
            setVisible(false);
            return;
        }

        let data = null;
        const waypoints = transitionPath.waypoints;
        const totalPoints = waypoints.length + 2; // Start + Waypoints + Goal

        if (flyoverCurrentWaypointIndex === 0) {
            // Start
            const startInfo = transitionPath.current_state;
            data = {
                title: startInfo.emotion,
                subtitle: "Starting Point",
                description: `Leaving ${startInfo.category}...`,
                color: CATEGORY_COLORS[startInfo.category] || "#ffffff",
            };
        } else if (flyoverCurrentWaypointIndex === totalPoints - 1) {
            // Goal
            const goalInfo = transitionPath.goal_state;
            data = {
                title: goalInfo.emotion,
                subtitle: "Destination Reached",
                description: `Welcome to ${goalInfo.category}`,
                color: CATEGORY_COLORS[goalInfo.category] || "#ffffff",
            };
        } else {
            // Waypoint
            // Waypoint index in array is flyoverIndex - 1
            const waypoint = waypoints[flyoverCurrentWaypointIndex - 1];
            if (waypoint) {
                data = {
                    title: waypoint.emotion,
                    subtitle: `Waypoint ${flyoverCurrentWaypointIndex} / ${waypoints.length}`,
                    description: waypoint.reasoning,
                    color: CATEGORY_COLORS[waypoint.category] || "#ffffff",
                    strategies: waypoint.strategies,
                };
            }
        }

        if (data) {
            setCurrentData(data);
            // Show overlay
            setVisible(true);

            // Hide after a duration (optional, but keep it sticky while passing through? 
            // The index updates automatically. 
            // Actually, since the flyover is continuous, the index will stay valid for a segment.
            // We might want to just keep it visible as long as the index is stable? 
            // Or fade out if we want to see the scenery?
            // Let's keep it visible, but maybe add a slight delay logic if needed.
            // For now: Visible while index is active.
        }

    }, [isFlying, flyoverCurrentWaypointIndex, transitionPath]);

    if (!visible || !currentData) return null;

    return (
        <div
            key={flyoverCurrentWaypointIndex}
            className="absolute top-24 left-0 right-0 z-50 pointer-events-none flex flex-col items-center justify-start pt-8 animate-in fade-in slide-in-from-top-4 duration-700"
        >
            <div className="relative">
                {/* Dark Scrim for readability and "darker" look */}
                <div
                    className="absolute inset-[-100%] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0)_70%)] pointer-events-none"
                    style={{ transform: 'scale(1.5)' }}
                />

                {/* Glow backdrop */}
                <div
                    className="absolute inset-0 blur-3xl opacity-30 transform scale-150 mix-blend-screen"
                    style={{ backgroundColor: currentData.color }}
                />

                <div className="relative text-center space-y-2">
                    {/* Subtitle / Category */}
                    <div className="text-white/60 text-xs uppercase tracking-[0.3em] font-light">
                        {currentData.subtitle}
                    </div>

                    {/* Main Title (Emotion) */}
                    <h2
                        className="text-5xl md:text-6xl font-thin text-white tracking-widest uppercase drop-shadow-2xl"
                        style={{ textShadow: `0 0 30px ${currentData.color}80` }}
                    >
                        {currentData.title}
                    </h2>

                    {/* Separator */}
                    <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto my-4" />

                    {/* Description / Reasoning */}
                    <p className="max-w-md mx-auto text-cyan-100/80 font-light text-lg italic leading-relaxed px-4">
                        &quot;{currentData.description}&quot;
                    </p>

                    {/* Strategies (if any) */}
                    {currentData.strategies && currentData.strategies.length > 0 && (
                        <div className="mt-6 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
                            <div className="text-[10px] uppercase tracking-widest text-purple-300/70 mb-2">
                                Suggested Integration
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                                {currentData.strategies.slice(0, 2).map((s, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 rounded-full border border-white/10 bg-black/20 backdrop-blur-sm text-xs text-white/70"
                                    >
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
