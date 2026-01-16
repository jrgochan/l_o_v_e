/**
 * Path Animator Component
 *
 * Animates a "traveler" sphere moving along a transition path.
 * Great for demonstrations and understanding emotional journeys.
 */

"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { EmotionPath } from "@/types/atlas-admin";

interface PathAnimatorProps {
  path: EmotionPath;
  isPlaying: boolean;
  speed: number;
  onProgress?: (progress: number, currentEmotion: string) => void;
}

export function PathAnimator({ path, isPlaying, speed, onProgress }: PathAnimatorProps) {
  const travelerRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  // Build path curve
  const curve = useRef<THREE.CatmullRomCurve3 | undefined>(undefined);
  const emotions = useRef<string[]>([]);

  useEffect(() => {
    // Build path points: start → waypoints → end
    const points: THREE.Vector3[] = [];
    const emotionNames: string[] = [];

    // Start
    points.push(new THREE.Vector3(...path.from.vac));
    emotionNames.push(path.from.name);

    // Waypoints
    path.waypoints.forEach((wp) => {
      points.push(new THREE.Vector3(...wp.vac));
      emotionNames.push(wp.emotion);
    });

    // End
    points.push(new THREE.Vector3(...path.to.vac));
    emotionNames.push(path.to.name);

    curve.current = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    emotions.current = emotionNames;

    // Reset progress when path changes
    progressRef.current = 0;
  }, [path]);

  // Animation loop
  useFrame((state, delta) => {
    if (!isPlaying || !curve.current || !travelerRef.current) return;

    // Update progress
    progressRef.current += delta * speed * 0.1;

    if (progressRef.current >= 1.0) {
      progressRef.current = 0; // Loop back to start
    }

    // Get position along curve
    const point = curve.current.getPoint(progressRef.current);
    travelerRef.current.position.copy(point);

    // Determine current emotion based on progress
    const emotionIndex = Math.floor(progressRef.current * (emotions.current.length - 1));
    const currentEmotion = emotions.current[emotionIndex] || emotions.current[0];

    onProgress?.(progressRef.current, currentEmotion);
  });

  return (
    <mesh ref={travelerRef}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial
        color="#FFFFFF"
        emissive="#FFFFFF"
        emissiveIntensity={2.0}
        transparent
        opacity={0.9}
      />

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#00FFFF" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
    </mesh>
  );
}

/**
 * Path Animation Controls Component
 *
 * UI controls for path animation (play/pause/speed).
 */

interface PathAnimationControlsProps {
  isPlaying: boolean;
  speed: number;
  currentEmotion: string;
  progress: number;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function PathAnimationControls({
  isPlaying,
  speed,
  currentEmotion,
  progress,
  onPlayPause,
  onSpeedChange,
  onReset,
}: PathAnimationControlsProps) {
  const theme = useAdminTheme();

  return (
    <div className={`${theme.colors.background} rounded-lg p-4 space-y-3 border ${theme.colors.border}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${theme.colors.secondary}`}>Path Animation</h3>
        <button onClick={onReset} className={`text-xs ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}>
          Reset
        </button>
      </div>

      {/* Current Position */}
      <div>
        <h4 className={`text-xs ${theme.colors.text.secondary} mb-1`}>Current Emotion</h4>
        <p className={`text-sm font-medium ${theme.colors.text.primary}`}>{currentEmotion}</p>
      </div>

      {/* Progress Bar */}
      <div>
        <div className={`flex justify-between text-xs ${theme.colors.text.secondary} mb-1`}>
          <span>Progress</span>
          <span>{(progress * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${isPlaying ? 'bg-cyan-500' : 'bg-gray-500'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPlayPause}
          className={`flex-1 px-3 py-2 ${isPlaying ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-green-600 hover:bg-green-500'} text-white text-sm rounded transition`}
        >
          {isPlaying ? "⏸️ Pause" : "▶️ Play"}
        </button>
      </div>

      {/* Speed Control */}
      <div>
        <div className={`flex justify-between text-xs ${theme.colors.text.secondary} mb-1`}>
          <span>Speed</span>
          <span>{speed}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}
