/**
 * Preview Sphere Component
 *
 * Static sphere for previews and small displays.
 * Built on BaseSphere with simplified rendering for performance.
 *
 * Replaces: EmotionSpherePreview.tsx (122 lines)
 * New: ~80 lines (42 line reduction)
 */

"use client";

import { Canvas } from "@react-three/fiber";
import { BaseSphere, StandardLighting } from "./BaseSphere";
import type { Emotion } from "@/types/visualization";
import { resolveEmotionColor } from "@/utils/emotion-colors";

interface PreviewSphereProps {
  emotion: Emotion;
  size?: number;
  showLabels?: boolean;
}

/**
 * Preview Sphere - Optimized for static display
 */
export function PreviewSphere({ emotion, size = 120, showLabels = true }: PreviewSphereProps) {
  const color = resolveEmotionColor(emotion);

  // Position based on VAC (scaled for compact view)
  const position = [emotion.vac[0] * 0.8, emotion.vac[1] * 0.8, emotion.vac[2] * 0.8] as [
    number,
    number,
    number,
  ];

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-gray-900/50"
      style={{ width: size, height: size }}
    >
      <Canvas camera={{ position: [2, 1.5, 2], fov: 50 }} gl={{ antialias: true, alpha: true }}>
        <StandardLighting />

        <BaseSphere
          color={color}
          size={0.15}
          position={position}
          animation={{
            breathing: { enabled: true, rate: 2.0, amplitude: 0.08 },
            rotation: { enabled: true, speed: 0.003, axis: "y" },
            glow: { enabled: true, intensity: 0.5, pulseSpeed: 1.5 },
          }}
        >
          {() => (
            /* Reference sphere at origin */
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="#444444" transparent opacity={0.3} />
            </mesh>
          )}
        </BaseSphere>
      </Canvas>

      {/* VAC labels overlay */}
      {showLabels && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-blue-400/60">
            Arousal
          </div>
          <div className="absolute bottom-1 left-1 text-[10px] text-red-400/60">V</div>
          <div className="absolute bottom-1 right-1 text-[10px] text-purple-400/60">C</div>
        </div>
      )}
    </div>
  );
}
