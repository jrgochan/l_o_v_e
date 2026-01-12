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

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { StandardLighting } from "./BaseSphere";
import * as THREE from "three";
import type { AtlasEmotion, PathAnimationMode } from "@/types/atlas-admin";
import { CATEGORY_COLORS } from "@/types/atlas-admin";
import { getEmotionAnimationParams } from "@/utils/emotionAnimationMapper";

interface CharacterSphereProps {
  emotion: AtlasEmotion;
  size?: number;
  animationMode?: PathAnimationMode;
  showLabel?: boolean;
}

type MotionType = "stable" | "orbital" | "recoil" | "reaching";

/**
 * Animated sphere with characteristic motion
 */
function AnimatedCharacterSphere({
  emotion,
  mode,
}: {
  emotion: AtlasEmotion;
  mode: PathAnimationMode;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Get emotion-specific animation parameters
  const animParams = useMemo(() => getEmotionAnimationParams(emotion, mode), [emotion, mode]);

  // Color from category
  const color = useMemo(() => {
    return new THREE.Color(CATEGORY_COLORS[emotion.category] || "#888888");
  }, [emotion.category]);

  // Characteristic animation
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // 1. BREATHING
    const breathe =
      1.0 +
      Math.sin(time * ((Math.PI * 2) / animParams.breathingRate)) * animParams.breathingAmplitude;
    meshRef.current.scale.setScalar(breathe);

    // 2. ROTATION
    meshRef.current.rotation.y += animParams.rotationSpeed;

    // 3. SECONDARY MOTION (characteristic!)
    const secondaryOffset = new THREE.Vector3();

    switch (animParams.secondaryMotion) {
      case "stable":
        // No additional motion
        break;

      case "orbital": {
        // Gentle circular motion
        const orbitalRadius = animParams.secondaryAmplitude;
        secondaryOffset.x = Math.sin(time * 0.5) * orbitalRadius;
        secondaryOffset.z = Math.cos(time * 0.5) * orbitalRadius;
        break;
      }

      case "recoil": {
        // Slight shrinking/retreating motion
        const recoil = Math.sin(time * 1.5) * animParams.secondaryAmplitude;
        secondaryOffset.y = -Math.abs(recoil) * 0.5;
        break;
      }

      case "reaching": {
        // Gentle reaching outward
        const reach = Math.sin(time * 0.8) * animParams.secondaryAmplitude;
        secondaryOffset.x = reach * 0.5;
        secondaryOffset.y = Math.abs(reach) * 0.3;
        break;
      }
    }

    meshRef.current.position.copy(initialPosition.current).add(secondaryOffset);

    // 4. GLOW PULSE
    const glowPulse = 1.0 + Math.sin(time * ((Math.PI * 2) / animParams.glowPulseSpeed)) * 0.3;
    const baseGlow = animParams.glowIntensity * glowPulse;
    materialRef.current.emissiveIntensity = baseGlow;

    // 5. COLOR BOOST
    const boostedColor = color.clone().multiplyScalar(animParams.colorBoost);
    materialRef.current.color.copy(boostedColor);
    materialRef.current.emissive.copy(boostedColor);
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      <MotionIndicator type={animParams.secondaryMotion} />
    </>
  );
}

/**
 * Motion indicator ring/cone
 */
function MotionIndicator({ type }: { type: MotionType }) {
  const colors = {
    stable: "#64748b",
    orbital: "#06b6d4",
    recoil: "#6b7280",
    reaching: "#a3e635",
  };

  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z += 0.005;
  });

  if (type === "stable") {
    return (
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.7, 0.2, 32, 1, true]} />
        <meshBasicMaterial
          color={colors.stable}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[0.65, 0.02, 16, 32]} />
      <meshBasicMaterial color={colors[type]} transparent opacity={0.5} />
    </mesh>
  );
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

  const [isHovered, setIsHovered] = useState(false);

  const motionLabels = {
    stable: "Stable (Core)",
    orbital: "Orbital (Social)",
    recoil: "Recoil (Self-conscious)",
    reaching: "Reaching (Growth)",
  };

  // Safe fallback color if category is missing
  const color = CATEGORY_COLORS[emotion.category] || "#888888";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700 cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        style={{ width: size, height: size }}
      >
        <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          <StandardLighting />
          <AnimatedCharacterSphere emotion={emotion} mode={animationMode} />
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
