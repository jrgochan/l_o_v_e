/**
 * Atlas Scene Component
 *
 * Main 3D scene that combines all visual elements:
 * - Soul Sphere (optional background)
 * - Emotion Cloud (Dynamic emotion points)
 * - Path Network (transition paths)
 */

"use client";

import { SoulSphere } from "@/components/SoulSphere";
import { EmotionCloud } from "./EmotionCloud";
import { PathNetwork } from "./PathNetwork";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function AtlasScene() {
  const { layers, showAxisLabels } = useSettingsStore();

  return (
    <group>
      {/* VAC Axis helpers - Grids for reference (render first) */}
      {showAxisLabels && (
        <>
          {/* V-A Grid (Valence-Arousal plane, XY) - vertical facing front */}
          <gridHelper args={[4, 20, 0x444444, 0x222222]} rotation={[Math.PI / 2, 0, 0]} />

          {/* C-A Grid (Connection-Arousal plane, YZ) - vertical facing side */}
          <gridHelper args={[4, 20, 0x333344, 0x111122]} rotation={[0, 0, Math.PI / 2]} />

          {/* V-C Grid (Valence-Connection plane, XZ) - horizontal floor */}
          <gridHelper args={[4, 20, 0x443344, 0x221122]} rotation={[0, 0, 0]} />
        </>
      )}

      {/* Optional: Background Soul Sphere for context (render second with depth write disabled) */}
      {/* Optional: Background Soul Sphere for context (render second with depth write disabled) */}
      {layers.soulSphere && (
        <group scale={0.8} position={[0, 0, 0]} renderOrder={0}>
          <SoulSphere />
        </group>
      )}

      {/* Transition paths between selected emotions (render third, always visible) */}
      <group renderOrder={2}>
        <PathNetwork />
      </group>

      {/* Emotion points in VAC space (render last, highest priority) */}
      <group renderOrder={3}>
        <EmotionCloud />
      </group>
    </group>
  );
}
