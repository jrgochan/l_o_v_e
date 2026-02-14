/**
 * Luminous Emotion Node Component
 *
 * A dedicated renderer for Luminous mode — emotions as pure light sources.
 * Two-layer architecture:
 * - Inner core: Small, opaque, brightly emissive
 * - Outer glow: Larger, AdditiveBlending halo that genuinely appears as emitted light
 *
 * Unlike MeshStandardMaterial's "emissive" which just brightens pixels,
 * this uses MeshBasicMaterial with AdditiveBlending to create actual
 * over-brightness that bleeds into bloom post-processing.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Emotion } from "@/types/visualization";
import { getModeConfig, applyColorConfig } from "@/utils/modeVisualConfigs";

interface LuminousEmotionNodeProps {
  emotion: Emotion;
  color: THREE.Color;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

export function LuminousEmotionNode({
  emotion,
  color,
  size,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: LuminousEmotionNodeProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const outerGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const modeConfig = useMemo(() => getModeConfig("luminous"), []);

  const enhancedColor = useMemo(
    () => applyColorConfig(color, modeConfig.colors, emotion.vac[0], emotion.vac[1]),
    [color, modeConfig.colors, emotion.vac]
  );

  // Brighter core version
  const brightColor = useMemo(() => {
    const c = enhancedColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s * 1.2, Math.min(hsl.l + 0.3, 0.95));
    return c;
  }, [enhancedColor]);

  // Star temperature coloring based on arousal
  const temperatureColor = useMemo(() => {
    const arousal = emotion.vac[1];
    const c = enhancedColor.clone();
    if (arousal > 0.3) {
      // High arousal: warm yellow-white like hot stars
      c.lerp(new THREE.Color("#FFF4E0"), arousal * 0.4);
    } else if (arousal < -0.3) {
      // Low arousal: cool blue-white like cold stars
      c.lerp(new THREE.Color("#E0F0FF"), Math.abs(arousal) * 0.3);
    }
    return c;
  }, [enhancedColor, emotion.vac]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const [, arousal, connection] = emotion.vac;

    // Fast pulsing — like a heartbeat of light
    const pulse = 1.0 + Math.sin(time * 3.0) * 0.15;
    const breathe = 1.0 + Math.sin(time * 1.5) * 0.08;
    const hoverScale = isHovered ? 1.3 : 1.0;
    const selectedScale = isSelected ? 1.2 : 1.0;

    // Core — small, bright, fast pulse
    if (coreRef.current) {
      coreRef.current.scale.setScalar(size * 0.5 * pulse * hoverScale * selectedScale);
    }

    // Inner glow — medium, slower breathe, additive
    if (glowRef.current) {
      glowRef.current.scale.setScalar(size * 1.2 * breathe * hoverScale * selectedScale);
    }

    // Outer glow — large halo, gentle pulse
    if (outerGlowRef.current) {
      const connectionFactor = (connection + 1) / 2;
      const haloSize = THREE.MathUtils.lerp(1.6, 2.2, connectionFactor);
      outerGlowRef.current.scale.setScalar(size * haloSize * breathe * hoverScale * selectedScale);
    }

    // Opacity pulses
    if (glowMatRef.current) {
      glowMatRef.current.opacity = (isSelected ? 0.7 : 0.5) * pulse;
    }
    if (outerGlowMatRef.current) {
      const arousalFactor = (arousal + 1) / 2;
      outerGlowMatRef.current.opacity = THREE.MathUtils.lerp(0.08, 0.2, arousalFactor) * breathe;
    }

    // Gentle float
    if (coreRef.current) {
      const floatY = Math.sin(time * 1.5 + emotion.vac[0] * 3) * 0.05;
      coreRef.current.position.y = floatY;
      if (glowRef.current) glowRef.current.position.y = floatY;
      if (outerGlowRef.current) outerGlowRef.current.position.y = floatY;
    }
  });

  return (
    <group>
      {/* Outer halo — large soft glow */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          ref={outerGlowMatRef}
          color={temperatureColor}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Inner glow sphere — additive blend for true light emission */}
      <mesh
        ref={glowRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color={enhancedColor}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Core — small, bright, opaque center */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={brightColor} transparent opacity={0.95} />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[size * 2.5, 16, 16]} />
          <meshBasicMaterial
            color={enhancedColor}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
