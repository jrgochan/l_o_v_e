/**
 * Animated Emotion Node Component
 *
 * Each emotion sphere animates based on its VAC coordinates and category.
 * Breathing, rotation, glow, and secondary motion express emotional character.
 */

"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { AtlasEmotion, PathAnimationMode } from "@/types/atlas-admin";
import { getEmotionAnimationParams } from "@/utils/emotionAnimationMapper";
import {
  getModeConfig,
  applyColorConfig,
  calculateEmissiveIntensity,
} from "@/utils/modeVisualConfigs";

interface AnimatedEmotionNodeProps {
  emotion: AtlasEmotion;
  color: THREE.Color;
  size: number;
  mode: PathAnimationMode;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

export function AnimatedEmotionNode({
  emotion,
  color,
  size,
  mode,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: AnimatedEmotionNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialPosition = useRef<THREE.Vector3>(new THREE.Vector3());

  // Get animation parameters based on VAC + mode
  const animParams = useMemo(() => getEmotionAnimationParams(emotion, mode), [emotion, mode]);

  // Get mode visual configuration
  const modeConfig = useMemo(() => getModeConfig(mode), [mode]);

  // Apply mode-specific color adjustments
  const enhancedColor = useMemo(
    () => applyColorConfig(color, modeConfig.colors, emotion.vac[0], emotion.vac[1]),
    [color, modeConfig.colors, emotion.vac]
  );

  // Store initial position
  useEffect(() => {
    if (meshRef.current?.position) {
      initialPosition.current.copy(meshRef.current.position);
    }
  }, []);

  // Animate based on parameters
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_valence, arousal, connection] = emotion.vac;

    // 1. BREATHING - scale based on arousal-derived rate
    const breathe =
      1.0 +
      Math.sin(time * ((Math.PI * 2) / animParams.breathingRate)) * animParams.breathingAmplitude;

    // 1a. CONNECTION-BASED SIZE SCALING - more connected = slightly larger presence
    const connectionFactor = (connection + 1) / 2; // 0-1 range
    const connectionScale = THREE.MathUtils.lerp(0.9, 1.1, connectionFactor);

    const baseScale = size * breathe * connectionScale;
    const hoverScale = isHovered ? 1.3 : 1.0;
    meshRef.current.scale.setScalar(baseScale * hoverScale);

    // 2. ROTATION - around Y axis (mode-aware + arousal-influenced)
    // Higher arousal = faster rotation
    const arousalFactor = (arousal + 1) / 2; // 0-1 range
    const arousalRotationMultiplier = THREE.MathUtils.lerp(0.7, 1.3, arousalFactor);
    meshRef.current.rotation.y += animParams.rotationSpeed * arousalRotationMultiplier;

    // Multi-axis rotation for mystical mode
    if (modeConfig.animations.floatEnabled) {
      meshRef.current.rotation.x += animParams.rotationSpeed * 0.3;
      meshRef.current.rotation.z += animParams.rotationSpeed * 0.2;
    }

    // 3. SECONDARY MOTION - based on category
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

    // 4. VERTICAL FLOAT - different character per mode
    if (modeConfig.animations.floatEnabled) {
      meshRef.current.position.copy(initialPosition.current).add(secondaryOffset);

      if (mode === "dynamic") {
        // DYNAMIC: Bouncy, energetic floating with occasional jitter
        const floatOffset =
          Math.sin(time * modeConfig.animations.floatSpeed) * modeConfig.animations.floatAmplitude;
        meshRef.current.position.y += floatOffset;

        // Excitement jitter for high-arousal emotions (deterministic, not random)
        if (arousal > 0.5) {
          const jitterIntensity = (arousal - 0.5) * 0.01; // Reduced intensity
          // Use multiple sine waves at different frequencies for pseudo-random jitter
          const jitterX = Math.sin(time * 13.7 + emotion.vac[0]) * jitterIntensity;
          const jitterZ = Math.cos(time * 17.3 + emotion.vac[1]) * jitterIntensity;
          meshRef.current.position.x += jitterX;
          meshRef.current.position.z += jitterZ;
        }
      } else if (mode === "mystical") {
        // MYSTICAL: Smooth drift in figure-8 pattern
        const verticalFloat =
          Math.sin(time * modeConfig.animations.floatSpeed) * modeConfig.animations.floatAmplitude;
        const horizontalDrift =
          Math.sin(time * modeConfig.animations.floatSpeed * 0.5) *
          modeConfig.animations.floatAmplitude *
          0.6;
        const depthDrift =
          Math.cos(time * modeConfig.animations.floatSpeed * 0.5) *
          modeConfig.animations.floatAmplitude *
          0.6;

        meshRef.current.position.y += verticalFloat;
        meshRef.current.position.x += horizontalDrift;
        meshRef.current.position.z += depthDrift;

        // Add wobble/precession for planetary feel
        meshRef.current.rotation.x += Math.sin(time * 0.3) * 0.001;
        meshRef.current.rotation.z += Math.cos(time * 0.3) * 0.001;
      }
    } else {
      meshRef.current.position.copy(initialPosition.current).add(secondaryOffset);
    }

    // 5. GLOW PULSE - mode-aware intensity
    const glowPulse = 1.0 + Math.sin(time * ((Math.PI * 2) / animParams.glowPulseSpeed)) * 0.3;
    const emissiveIntensity = calculateEmissiveIntensity(
      modeConfig.materials,
      emotion.vac[2], // connection
      glowPulse
    );
    const selectedGlow = isSelected ? emissiveIntensity * 2.0 : emissiveIntensity;
    materialRef.current.emissiveIntensity = selectedGlow;

    // 6. COLOR - mode-enhanced
    const boostedColor = enhancedColor.clone().multiplyScalar(animParams.colorBoost);
    materialRef.current.color.copy(boostedColor);
    materialRef.current.emissive.copy(boostedColor);

    // 7. OPACITY - for mystical/dynamic modes
    if (modeConfig.materials.transparent) {
      const connectionFactor = (emotion.vac[2] + 1) / 2; // Normalize connection to 0-1
      materialRef.current.opacity = THREE.MathUtils.lerp(
        modeConfig.materials.opacityBase * 0.7,
        modeConfig.materials.opacityBase,
        connectionFactor
      );
    }
  });

  return (
    <mesh ref={meshRef} onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        color={enhancedColor}
        emissive={enhancedColor}
        emissiveIntensity={1.0}
        metalness={modeConfig.materials.metalness}
        roughness={modeConfig.materials.roughness}
        transparent={modeConfig.materials.transparent}
        opacity={modeConfig.materials.opacityBase}
      />
    </mesh>
  );
}
