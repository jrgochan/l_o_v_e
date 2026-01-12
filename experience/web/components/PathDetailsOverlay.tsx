"use client";

import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSpring, useTransition, animated, config } from "@react-spring/web";
import { useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Helper to get color from valence
function getEmotionColor(valence: number): string {
  if (valence > 0.5) return "#22c55e"; // green-500
  if (valence > 0.1) return "#a3e635"; // lime-400
  if (valence > -0.1) return "#fbbf24"; // amber-400
  if (valence > -0.5) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

export function PathDetailsOverlay() {
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const flyoverProgress = useExperienceStore((state) => state.flyoverProgress);
  const setFlyoverProgress = useExperienceStore((state) => state.setFlyoverProgress);
  const flyoverSpeed = useExperienceStore((state) => state.flyoverSpeed);
  const setFlyoverSpeed = useExperienceStore((state) => state.setFlyoverSpeed);
  const isFlying = useExperienceStore((state) => state.isFlying);
  const setIsFlying = useExperienceStore((state) => state.setIsFlying);

  // Compute current category index
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const categoryInfo = useMemo(() => {
    if (!transitionPath?.current_state?.emotion) return { name: "UNKNOWN", index: 0 };
    const emotion = allEmotions.find((e) => e.name === transitionPath.current_state.emotion);
    const catName = emotion?.category.toUpperCase() || "UNKNOWN";

    // Get sorted unique categories to find index
    const categories = Array.from(new Set(allEmotions.map((e) => e.category))).sort();
    const index = categories.indexOf(emotion?.category || "") + 1; // 1-based

    return { name: catName, index };
  }, [transitionPath, allEmotions]);

  const waypoints = useMemo(() => transitionPath?.waypoints || [], [transitionPath]);
  const startAndEndCount = 2;
  const totalPoints = waypoints.length + startAndEndCount;

  // Continuous index for smooth tracking
  const continuousIndex = flyoverProgress * (totalPoints - 1);
  const currentIndex = Math.floor(continuousIndex + 0.1);

  // Compute active item
  const activeItem = useMemo(() => {
    if (!transitionPath) return null;

    if (currentIndex === 0) {
      return {
        id: "start",
        label: "Step 1",
        emotion: transitionPath.current_state.emotion,
        description: "Your emotional point of departure.",
        index: 0,
        color: getEmotionColor(transitionPath.current_state.vac[0]),
      };
    } else if (currentIndex === totalPoints - 1) {
      return {
        id: "end",
        label: `Step ${totalPoints}`,
        emotion: transitionPath.goal_state.emotion,
        description: "Your desired emotional state.",
        index: totalPoints - 1,
        color: getEmotionColor(transitionPath.goal_state.vac[0]),
      };
    } else {
      const wp = waypoints[currentIndex - 1];
      return wp
        ? {
            id: `wp-${currentIndex}`,
            label: `Step ${currentIndex + 1}`,
            emotion: wp.emotion,
            description: wp.reasoning || "Transitioning through this emotional state.",
            index: currentIndex,
            // Check if wp has vac, otherwise default to neutral logic or look it up (assuming it has vac per interface)
            color: wp.vac ? getEmotionColor(wp.vac[0]) : "#fbbf24",
          }
        : null;
    }
  }, [currentIndex, totalPoints, waypoints, transitionPath]);

  // Main Card Animation
  const cardSpring = useSpring({
    from: { opacity: 0, y: -50 },
    to: { opacity: 1, y: 0 },
    config: config.gentle,
  });

  // Active Item Transition (Enter/Exit)
  const itemTransitions = useTransition(activeItem, {
    from: { opacity: 0, transform: "translate3d(0, 10px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0px, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", position: "absolute" },
    keys: (item) => item?.id || "empty",
    config: { tension: 280, friction: 60 },
  });

  if (!transitionPath) {
    return (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/40 text-xs uppercase tracking-widest font-medium pointer-events-none">
        No Active Journey
      </div>
    );
  }

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      {/* Main Control Deck */}
      <animated.div
        style={cardSpring}
        className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-6 py-3 flex items-center gap-6 shadow-2xl min-w-[600px] max-w-4xl"
      >
        {/* 1. Playback Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Main Button */}
          <button
            onClick={() => setIsFlying(!isFlying)}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-95"
          >
            {isFlying ? (
              <Pause size={20} fill="currentColor" className="ml-0.5" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-1" />
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              setIsFlying(false);
              setFlyoverProgress(0);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
            title="Reset Journey"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* 2. Info & Timeline (Flexible Middle) */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-[300px]">
          {/* Overall Journey Context (Start/End Labels - NOW ABOVE) */}
          <div className="flex justify-between px-1 text-[10px] font-mono uppercase tracking-tight">
            <span style={{ color: getEmotionColor(transitionPath.current_state.vac[0]) }}>
              {transitionPath.current_state.emotion}
            </span>

            <span style={{ color: getEmotionColor(transitionPath.goal_state.vac[0]) }}>
              {transitionPath.goal_state.emotion}
            </span>
          </div>

          {/* Timeline Bar (MIDDLE) */}
          <div className="relative h-1.5 bg-white/10 rounded-full w-full group cursor-pointer overflow-hidden">
            {/* Interactive Click Area */}
            <div
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${flyoverProgress * 100}%` }}
            />
            <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex justify-between px-[2px] pointer-events-none">
              {/* Start Point */}
              <div
                className={`rounded-full transition-all duration-300 ${currentIndex === 0 ? "w-2.5 h-2.5 shadow-lg scale-125" : "w-1.5 h-1.5 opacity-50"}`}
                style={{ backgroundColor: getEmotionColor(transitionPath.current_state.vac[0]) }}
              />

              {/* Waypoints */}
              {waypoints.map((wp, i) => {
                const idx = i + 1; // 0 is start
                const isCurrent = idx === currentIndex;
                const isActive = idx <= currentIndex; // passed or current
                const color = wp.vac ? getEmotionColor(wp.vac[0]) : "#fbbf24";
                return (
                  <div
                    key={i}
                    className={`
                                            rounded-full transition-all duration-300
                                            ${isCurrent ? "w-2.5 h-2.5 shadow-lg scale-125" : isActive ? "w-1.5 h-1.5" : "w-1 h-1 bg-white/10"}
                                        `}
                    style={{ backgroundColor: isActive || isCurrent ? color : undefined }}
                  />
                );
              })}

              {/* End Point */}
              <div
                className={`rounded-full transition-all duration-300 ${currentIndex === totalPoints - 1 ? "w-2.5 h-2.5 shadow-lg scale-125" : "w-1.5 h-1.5 opacity-50"}`}
                style={{ backgroundColor: getEmotionColor(transitionPath.goal_state.vac[0]) }}
              />
            </div>
          </div>

          {/* Text Details (Active Item - BELOW) */}
          <div className="h-6 relative mt-0.5">
            <div className="absolute top-0 left-0 w-full flex items-center gap-3 px-1">
              {/* Current Active Item */}
              {itemTransitions(
                (style, item) =>
                  item && (
                    <animated.div style={style} className="flex items-center gap-2">
                      {/* Colored Badge - REPURPOSED FOR CATEGORY NUMBER */}
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-sm"
                        style={{ backgroundColor: item.color }}
                        title="Category Index"
                      >
                        {categoryInfo.index > 0
                          ? String(categoryInfo.index).padStart(2, "0")
                          : "--"}
                      </span>
                      {/* Colored Label */}
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-sm font-medium truncate max-w-[200px]"
                          style={{ color: item.color }}
                        >
                          {item.emotion}
                        </span>
                        {/* Step label moved here */}
                        <span className="text-[10px] text-white/40 uppercase tracking-wider hidden sm:inline-block">
                          {item.label}
                        </span>
                      </div>
                    </animated.div>
                  )
              )}
            </div>
          </div>
        </div>

        {/* 3. Speed Controls */}
        <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
          {[0.5, 1.0, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => setFlyoverSpeed(s)}
              className={`
                                w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                ${
                                  flyoverSpeed === s
                                    ? "bg-white text-black shadow-sm"
                                    : "text-white/30 hover:bg-white/10 hover:text-white"
                                }
                            `}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* 4. Integrated Navigation Hints */}
        <div className="w-px h-8 bg-white/10 mx-2" />

        <div className="flex items-center gap-4 mr-1">
          {/* Category Nav */}
          <div className="flex flex-col items-center gap-1 group">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded border border-white/10 flex items-center justify-center bg-white/5 text-white/50 shadow-sm group-hover:border-white/20 transition-colors">
                <ChevronLeft size={10} />
              </div>
              <div className="w-5 h-5 rounded border border-white/10 flex items-center justify-center bg-white/5 text-white/50 shadow-sm group-hover:border-white/20 transition-colors">
                <ChevronRight size={10} />
              </div>
            </div>
            <span className="text-[7px] text-white/20 uppercase tracking-widest font-semibold group-hover:text-white/40 transition-colors">
              Category
            </span>
          </div>

          {/* Waypoint Nav */}
          <div className="flex flex-col items-center gap-1 group">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded border border-white/10 flex items-center justify-center bg-white/5 text-white/50 shadow-sm group-hover:border-white/20 transition-colors">
                <ChevronUp size={10} />
              </div>
              <div className="w-5 h-5 rounded border border-white/10 flex items-center justify-center bg-white/5 text-white/50 shadow-sm group-hover:border-white/20 transition-colors">
                <ChevronDown size={10} />
              </div>
            </div>
            <span className="text-[7px] text-white/20 uppercase tracking-widest font-semibold group-hover:text-white/40 transition-colors">
              Step
            </span>
          </div>
        </div>

        {/* 5. Category Display (Absolute Bottom Center) */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-white/30 uppercase tracking-[0.2em] font-medium selection:bg-transparent">
          BROWSING: <span className="text-white/60">{categoryInfo.name}</span>
        </div>
      </animated.div>
    </div>
  );
}
