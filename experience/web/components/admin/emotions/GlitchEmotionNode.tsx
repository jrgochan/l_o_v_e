/**
 * Glitch Emotion Node Component
 *
 * A dedicated renderer for Glitch mode — emotions as corrupted digital artifacts.
 * Features RGB channel splitting (3 offset cubes), random position teleportation,
 * and a digital/voxel aesthetic using BoxGeometry.
 *
 * Architecture:
 * - Red channel cube: Offset slightly left
 * - Green channel cube: Center (main interaction target)
 * - Blue channel cube: Offset slightly right
 * - Random glitch teleportation every few seconds
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Emotion } from "@/types/visualization";
import { getModeConfig, applyColorConfig } from "@/utils/modeVisualConfigs";

interface GlitchEmotionNodeProps {
  emotion: Emotion;
  color: THREE.Color;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

export function GlitchEmotionNode({
  emotion,
  color,
  size,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: GlitchEmotionNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const redRef = useRef<THREE.Mesh>(null);
  const greenRef = useRef<THREE.Mesh>(null);
  const blueRef = useRef<THREE.Mesh>(null);

  // Teleportation state
  const glitchOffsetRef = useRef(new THREE.Vector3());
  const lastGlitchTimeRef = useRef(0);

  const modeConfig = useMemo(() => getModeConfig("glitch"), []);

  const enhancedColor = useMemo(
    () => applyColorConfig(color, modeConfig.colors, emotion.vac[0], emotion.vac[1]),
    [color, modeConfig.colors, emotion.vac]
  );

  // Matrix-green tinted version
  const glitchColor = useMemo(() => {
    const c = enhancedColor.clone();
    // Add matrix green tint
    c.lerp(new THREE.Color("#00FF41"), 0.25);
    return c;
  }, [enhancedColor]);

  // Hash function for deterministic pseudo-random per emotion
  const emotionHash = useMemo(() => {
    let hash = 0;
    const name = emotion.name || emotion.id;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }, [emotion.name, emotion.id]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const [, arousal] = emotion.vac;

    // RGB split offset — wider when selected
    const splitAmount = (isSelected ? 0.08 : 0.04) * size;

    // Strobe/flash effect — rapid scale pulsing
    const strobe = Math.sin(time * 10.0 + emotionHash * 20.0) > 0.7 ? 1.15 : 1.0;
    const hoverScale = isHovered ? 1.25 : 1.0;
    const selectedScale = isSelected ? 1.2 : 1.0;
    const baseScale = size * strobe * hoverScale * selectedScale;

    // Red channel — offset left and slightly up
    if (redRef.current) {
      redRef.current.position.set(-splitAmount, splitAmount * 0.5, 0);
      redRef.current.scale.setScalar(baseScale);
      redRef.current.rotation.y = time * 0.3;
    }

    // Green channel — center (main)
    if (greenRef.current) {
      greenRef.current.position.set(0, 0, 0);
      greenRef.current.scale.setScalar(baseScale);
      greenRef.current.rotation.y = time * 0.3;
    }

    // Blue channel — offset right and slightly down
    if (blueRef.current) {
      blueRef.current.position.set(splitAmount, -splitAmount * 0.5, splitAmount * 0.3);
      blueRef.current.scale.setScalar(baseScale);
      blueRef.current.rotation.y = time * 0.3;
    }

    // Random position teleportation glitch
    // Deterministic trigger based on sin crossing a threshold
    const glitchTrigger = Math.sin(time * 2.0 + emotionHash * 100.0);
    const arousalFactor = (arousal + 1) / 2;
    const glitchThreshold = THREE.MathUtils.lerp(0.97, 0.92, arousalFactor); // Higher arousal = more glitches

    if (glitchTrigger > glitchThreshold && time - lastGlitchTimeRef.current > 0.5) {
      // Teleport to nearby random offset for a few frames
      glitchOffsetRef.current.set(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2
      );
      lastGlitchTimeRef.current = time;
    }

    // Decay glitch offset smoothly
    glitchOffsetRef.current.multiplyScalar(0.85);
    groupRef.current.position.copy(glitchOffsetRef.current);
  });

  // Common opacity
  const channelOpacity = 0.45;

  return (
    <group ref={groupRef}>
      {/* Red channel cube */}
      <mesh ref={redRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#FF0000"
          transparent
          opacity={channelOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Green channel cube — primary interaction target + base color */}
      <mesh
        ref={greenRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={glitchColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Blue channel cube */}
      <mesh ref={blueRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#0066FF"
          transparent
          opacity={channelOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Selection glitch aura */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[size * 2.5, size * 2.5, size * 2.5]} />
          <meshBasicMaterial
            color="#00FF41"
            transparent
            opacity={0.08}
            wireframe
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
