/**
 * Animation Mode Transition Hook
 *
 * Provides smooth crossfade when switching between animation modes.
 * Prevents jarring jumps by interpolating between old and new parameters.
 */

import { useState, useEffect, useRef } from "react";
import type { PathAnimationMode } from "@/types/visualization";

interface TransitionState {
  isTransitioning: boolean;
  progress: number; // 0-1, for interpolation
  fromMode: PathAnimationMode;
  toMode: PathAnimationMode;
}

/**
 * Hook to manage smooth transitions between animation modes
 */
export function useAnimationModeTransition(
  currentMode: PathAnimationMode,
  transitionDuration: number = 1500 // milliseconds
) {
  const [transition, setTransition] = useState<TransitionState>({
    isTransitioning: false,
    progress: 1.0,
    fromMode: currentMode,
    toMode: currentMode,
  });

  const previousMode = useRef<PathAnimationMode>(currentMode);
  const startTime = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Mode changed - start transition
    if (currentMode !== previousMode.current) {
      setTransition({
        isTransitioning: true,
        progress: 0.0,
        fromMode: previousMode.current,
        toMode: currentMode,
      });

      startTime.current = Date.now();
      previousMode.current = currentMode;

      // Animate transition
      const animate = () => {
        const elapsed = Date.now() - startTime.current;
        const progress = Math.min(elapsed / transitionDuration, 1.0);

        setTransition((prev) => ({
          ...prev,
          progress: easeInOutCubic(progress),
        }));

        if (progress < 1.0) {
          animationFrameId.current = requestAnimationFrame(animate);
        } else {
          setTransition({
            isTransitioning: false,
            progress: 1.0,
            fromMode: currentMode,
            toMode: currentMode,
          });
        }
      };

      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [currentMode, transitionDuration]);

  return transition;
}

/**
 * Easing function for smooth transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Interpolate between two values based on transition progress
 */
export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/**
 * Get effective opacity during transition
 */
export function getTransitionOpacity(
  transition: TransitionState,
  baseOpacity: number = 1.0
): { fromOpacity: number; toOpacity: number } {
  if (!transition.isTransitioning) {
    return { fromOpacity: 0, toOpacity: baseOpacity };
  }

  return {
    fromOpacity: baseOpacity * (1.0 - transition.progress),
    toOpacity: baseOpacity * transition.progress,
  };
}
