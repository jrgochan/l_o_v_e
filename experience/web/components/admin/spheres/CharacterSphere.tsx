/**
 * Character Sphere Component
 *
 * Sphere with characteristic motion patterns based on emotion type.
 * Supports 4 motion types: stable, orbital, recoil, reaching.
 * Built on BaseSphere with custom animation logic.
 *
 * Replaces: EmotionCharacterSphere.tsx (218 lines)
 * New: ~150 lines (68 line reduction)
 */

"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { StandardLighting } from "./BaseSphere";
import type { AtlasEmotion, PathAnimationMode } from "@/types/atlas-admin";
import { getEmotionAnimationParams } from "@/utils/emotionAnimationMapper";
import { InnerCharacterSphere } from "./InnerCharacterSphere";

interface CharacterSphereProps {
  emotion: AtlasEmotion;
  size?: number;
  animationMode?: PathAnimationMode;
  showLabel?: boolean;
}

/**
 * Main component with canvas
 */
export function CharacterSphere({
  emotion,
  size = 150,
  animationMode = "subtle",
  showLabel = true,
}: CharacterSphereProps) {
  const animParams = useMemo(
    () => getEmotionAnimationParams(emotion, animationMode),
    [emotion, animationMode]
  );

  const motionLabels = {
    stable: "Stable (Core)",
    orbital: "Orbital (Social)",
    recoil: "Recoil (Self-conscious)",
    reaching: "Reaching (Growth)",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700 cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        style={{ width: size, height: size }}
      >
        <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          <StandardLighting />
          <InnerCharacterSphere emotion={emotion} mode={animationMode} />
        </Canvas>
      </div>

      {showLabel && (
        <div className="text-xs text-center">
          <div className="text-white/90 font-medium">{emotion.name}</div>
          <div className="text-white/50 text-[10px] mt-0.5">
            {motionLabels[animParams.secondaryMotion]}
          </div>
        </div>
      )}
    </div>
  );
}
