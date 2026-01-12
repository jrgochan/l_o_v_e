/**
 * Emotion Label Tracker (Inside Canvas)
 *
 * Tracks 3D positions and projects to screen space.
 * Communicates with HTML overlay component via callback.
 */

"use client";

import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import type { AtlasEmotion } from "@/types/atlas-admin";

export interface LabelPosition {
  emotion: AtlasEmotion;
  x: number;
  y: number;
  visible: boolean;
}

interface EmotionLabelTrackerProps {
  onUpdate: (labels: LabelPosition[]) => void;
}

export function EmotionLabelTracker({ onUpdate }: EmotionLabelTrackerProps) {
  const { camera, size } = useThree();

  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const hoveredId = useAtlasAdminStore((state) => state.hoveredEmotionId);
  const layers = useAtlasAdminStore((state) => state.layers);

  // Update label positions every frame
  useFrame(() => {
    if (!layers.emotionLabels) {
      onUpdate([]);
      return;
    }

    const newLabels: LabelPosition[] = [];
    const vector = new THREE.Vector3();

    allEmotions.forEach((emotion) => {
      const isSelected = selectedIds.has(emotion.id);
      const isHovered = hoveredId === emotion.id;

      // Only show labels for selected or hovered emotions
      if (!isSelected && !isHovered) return;

      // Get 3D position
      vector.set(...emotion.vac);

      // Project to screen space
      vector.project(camera);

      // Convert to pixel coordinates
      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (-(vector.y * 0.5) + 0.5) * size.height;

      // Check if in front of camera (z < 1)
      const visible = vector.z < 1;

      newLabels.push({ emotion, x, y, visible });
    });

    onUpdate(newLabels);
  });

  return null; // This component doesn't render anything
}
