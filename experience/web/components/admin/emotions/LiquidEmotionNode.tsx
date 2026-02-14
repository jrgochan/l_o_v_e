/**
 * Liquid Emotion Node Component
 *
 * A dedicated renderer for Liquid mode — emotions as glossy mercury droplets
 * or deep-sea bioluminescent orbs. Uses MeshPhysicalMaterial with clearcoat
 * and sheen for a wet, glossy look.
 *
 * Architecture:
 * - Main body: High-poly sphere with clearcoat + sheen for wet surface
 * - Inner glow: Faint subsurface-like core light
 * - Reflection halo: BackSide sphere showing environment reflections
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Emotion } from "@/types/visualization";
import { getModeConfig, applyColorConfig } from "@/utils/modeVisualConfigs";

interface LiquidEmotionNodeProps {
  emotion: Emotion;
  color: THREE.Color;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

export function LiquidEmotionNode({
  emotion,
  color,
  size,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: LiquidEmotionNodeProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const bodyMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const modeConfig = useMemo(() => getModeConfig("liquid"), []);

  const enhancedColor = useMemo(
    () => applyColorConfig(color, modeConfig.colors, emotion.vac[0], emotion.vac[1]),
    [color, modeConfig.colors, emotion.vac]
  );

  // Deeper version for the body
  const deepColor = useMemo(() => {
    const c = enhancedColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(hsl.s * 1.2, 1.0), hsl.l * 0.8);
    // Add deep blue undertone
    c.lerp(new THREE.Color("#001133"), 0.15);
    return c;
  }, [enhancedColor]);

  // Brighter core for subsurface look
  const coreColor = useMemo(() => {
    const c = enhancedColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s * 0.7, Math.min(hsl.l + 0.3, 0.9));
    return c;
  }, [enhancedColor]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const [, arousal, connection] = emotion.vac;

    // Slow, organic breathing — like a deep-sea creature
    const breathe = 1.0 + Math.sin(time * 0.5) * 0.12;
    const wobbleX = 1.0 + Math.sin(time * 0.7 + 1.0) * 0.04;
    const wobbleZ = 1.0 + Math.sin(time * 0.6 + 2.0) * 0.04;
    const hoverScale = isHovered ? 1.2 : 1.0;
    const selectedScale = isSelected ? 1.15 : 1.0;

    // Body — non-uniform scaling for liquid wobble
    if (bodyRef.current) {
      bodyRef.current.scale.set(
        size * breathe * wobbleX * hoverScale * selectedScale,
        size * breathe * hoverScale * selectedScale,
        size * breathe * wobbleZ * hoverScale * selectedScale
      );
      // Very slow rotation
      bodyRef.current.rotation.y += 0.002;
      bodyRef.current.rotation.x += 0.001;

      // Gentle float
      const floatY = Math.sin(time * 0.5 + emotion.vac[0] * 3) * 0.06;
      bodyRef.current.position.y = floatY;
    }

    // Core follows body
    if (coreRef.current && bodyRef.current) {
      const corePulse = 1.0 + Math.sin(time * 0.8) * 0.1;
      coreRef.current.scale.setScalar(size * 0.4 * corePulse * hoverScale * selectedScale);
      coreRef.current.position.y = bodyRef.current.position.y;
    }

    // Dynamic material properties
    if (bodyMatRef.current) {
      // Connection drives opacity — more connected = more opaque/solid
      const connectionFactor = (connection + 1) / 2;
      bodyMatRef.current.opacity = THREE.MathUtils.lerp(0.5, 0.85, connectionFactor);

      // Arousal drives sheen intensity — more aroused = more iridescent
      const arousalFactor = (arousal + 1) / 2;
      bodyMatRef.current.sheenColor = new THREE.Color().setHSL(
        (time * 0.05 + emotion.vac[0]) % 1.0, // Slowly rotating hue for iridescence
        0.8,
        THREE.MathUtils.lerp(0.3, 0.6, arousalFactor)
      );
    }
  });

  return (
    <group>
      {/* Subsurface core glow */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Main liquid body — glossy wet surface */}
      <mesh
        ref={bodyRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial
          ref={bodyMatRef}
          color={deepColor}
          emissive={enhancedColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
          metalness={0.15}
          roughness={0.02}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          sheen={0.8}
          sheenRoughness={0.3}
          sheenColor={enhancedColor}
          envMapIntensity={1.5}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Reflection/environment halo */}
      {(isSelected || isHovered) && (
        <mesh>
          <sphereGeometry args={[size * 1.8, 16, 16]} />
          <meshBasicMaterial
            color={enhancedColor}
            transparent
            opacity={isSelected ? 0.2 : 0.1}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
