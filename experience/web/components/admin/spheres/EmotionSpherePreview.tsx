/**
 * Emotion Sphere Preview Component
 *
 * Small WebGL sphere showing an emotion's VAC position in 3D space.
 * Perfect for InfoPanel since we're only showing a few emotions.
 */

"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtlasEmotion } from "@/types/atlas-admin";
import { CATEGORY_COLORS } from "@/types/atlas-admin";

interface EmotionSpherePreviewProps {
  emotion: AtlasEmotion;
  size?: number;
}

/**
 * 3D sphere inside Canvas
 */
function EmotionSphere({ emotion }: { emotion: AtlasEmotion }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Color from category
  const color = useMemo(() => {
    return new THREE.Color(CATEGORY_COLORS[emotion.category] || "#888888");
  }, [emotion.category]);

  // Position based on VAC coordinates
  const position = useMemo(() => {
    const [valence, arousal, connection] = emotion.vac;
    return new THREE.Vector3(
      valence * 0.8, // Scaled for compact view
      arousal * 0.8,
      connection * 0.8
    );
  }, [emotion.vac]);

  // Gentle animation
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Subtle breathing
    const breathe = 1.0 + Math.sin(time * 2) * 0.08;
    meshRef.current.scale.setScalar(breathe);

    // Slow rotation
    meshRef.current.rotation.y += 0.003;

    // Gentle glow pulse
    const glowPulse = 1.0 + Math.sin(time * 1.5) * 0.3;
    materialRef.current.emissiveIntensity = 0.5 * glowPulse;
  });

  return (
    <>
      {/* Emotion sphere */}
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Reference sphere (origin) - subtle */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#444444" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

/**
 * Main component with Canvas wrapper
 */
export function EmotionSpherePreview({ emotion, size = 120 }: EmotionSpherePreviewProps) {
  return (
    <div
      className="relative rounded-lg overflow-hidden bg-gray-900/50"
      style={{ width: size, height: size }}
    >
      <Canvas camera={{ position: [2, 1.5, 2], fov: 50 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} />
        <EmotionSphere emotion={emotion} />
      </Canvas>

      {/* VAC labels overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-blue-400/60">
          Arousal
        </div>
        <div className="absolute bottom-1 left-1 text-[10px] text-red-400/60">V</div>
        <div className="absolute bottom-1 right-1 text-[10px] text-purple-400/60">C</div>
      </div>
    </div>
  );
}
