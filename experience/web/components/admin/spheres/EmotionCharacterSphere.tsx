/**
 * Emotion Character Sphere Component
 *
 * Standalone mini soul sphere showing an emotion's unique "personality"
 * with its characteristic animations (orbital, reaching, recoil, stable).
 * Similar to main soul sphere but focused on a single emotion.
 */

"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtlasEmotion, PathAnimationMode } from "@/types/atlas-admin";
import { CATEGORY_COLORS } from "@/types/atlas-admin";
import { getEmotionAnimationParams } from "@/utils/emotionAnimationMapper";

interface EmotionCharacterSphereProps {
  emotion: AtlasEmotion;
  size?: number;
  animationMode?: PathAnimationMode;
}

/**
 * Animated emotion sphere with characteristic motion
 */
function AnimatedSphere({ emotion, mode }: { emotion: AtlasEmotion; mode: PathAnimationMode }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Get emotion-specific animation parameters
  const animParams = useMemo(() => getEmotionAnimationParams(emotion, mode), [emotion, mode]);

  // Color from category
  const color = useMemo(() => {
    return new THREE.Color(CATEGORY_COLORS[emotion.category] || "#888888");
  }, [emotion.category]);

  // Animate with emotion's characteristic motions
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // 1. BREATHING - based on arousal-derived rate
    const breathe =
      1.0 +
      Math.sin(time * ((Math.PI * 2) / animParams.breathingRate)) * animParams.breathingAmplitude;
    meshRef.current.scale.setScalar(breathe);

    // 2. ROTATION - around Y axis
    meshRef.current.rotation.y += animParams.rotationSpeed;

    // 3. SECONDARY MOTION - based on category (this is the key!)
    const secondaryOffset = new THREE.Vector3();

    switch (animParams.secondaryMotion) {
      case "stable":
        // No additional motion (core emotions)
        break;

      case "orbital": {
        // Gentle circular motion (social emotions)
        const orbitalRadius = animParams.secondaryAmplitude;
        secondaryOffset.x = Math.sin(time * 0.5) * orbitalRadius;
        secondaryOffset.z = Math.cos(time * 0.5) * orbitalRadius;
        break;
      }

      case "recoil": {
        // Slight shrinking/retreating motion (self-conscious emotions)
        const recoil = Math.sin(time * 1.5) * animParams.secondaryAmplitude;
        secondaryOffset.y = -Math.abs(recoil) * 0.5; // Downward
        break;
      }

      case "reaching": {
        // Gentle reaching outward (bridge emotions, curiosity)
        const reach = Math.sin(time * 0.8) * animParams.secondaryAmplitude;
        secondaryOffset.x = reach * 0.5;
        secondaryOffset.y = Math.abs(reach) * 0.3; // Slightly upward
        break;
      }
    }

    meshRef.current.position.copy(initialPosition.current).add(secondaryOffset);

    // 4. GLOW PULSE - based on connection
    const glowPulse = 1.0 + Math.sin(time * ((Math.PI * 2) / animParams.glowPulseSpeed)) * 0.3;
    const baseGlow = animParams.glowIntensity * glowPulse;
    materialRef.current.emissiveIntensity = baseGlow;

    // 5. COLOR BRIGHTNESS - based on valence
    const boostedColor = color.clone().multiplyScalar(animParams.colorBoost);
    materialRef.current.color.copy(boostedColor);
    materialRef.current.emissive.copy(boostedColor);
  });

  return (
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
  );
}

/**
 * Motion indicator ring (like in main sphere)
 */
function MotionIndicator({ type }: { type: "stable" | "orbital" | "recoil" | "reaching" }) {
  const colors = {
    stable: "#64748b", // Slate - core emotions
    orbital: "#06b6d4", // Cyan - social/relational
    recoil: "#6b7280", // Gray - self-conscious/retreat
    reaching: "#a3e635", // Lime - growth/curiosity/bridge
  };

  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z += 0.005;
  });

  if (type === "stable") {
    // Cone for stable
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

  // Ring for others
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
export function EmotionCharacterSphere({
  emotion,
  size = 150,
  animationMode = "subtle",
}: EmotionCharacterSphereProps) {
  // Get animation parameters to show motion type
  const animParams = useMemo(
    () => getEmotionAnimationParams(emotion, animationMode),
    [emotion, animationMode]
  );

  const motionLabels = {
    stable: "Stable (Core emotion)",
    orbital: "Orbital (Social/Relational)",
    recoil: "Recoil (Self-conscious)",
    reaching: "Reaching (Growth/Bridge)",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700"
        style={{ width: size, height: size }}
      >
        <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={1.0} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />

          <AnimatedSphere emotion={emotion} mode={animationMode} />
          <MotionIndicator type={animParams.secondaryMotion} />
        </Canvas>
      </div>

      {/* Motion type label */}
      <div className="text-xs text-center">
        <div className="text-white/90 font-medium">{emotion.name}</div>
        <div className="text-white/50 text-[10px] mt-0.5">
          {motionLabels[animParams.secondaryMotion]}
        </div>
      </div>
    </div>
  );
}
