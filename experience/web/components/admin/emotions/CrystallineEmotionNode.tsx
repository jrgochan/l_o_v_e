/**
 * Crystalline Emotion Node Component
 *
 * A dedicated renderer for Crystalline mode that makes emotions look like
 * actual gemstones — faceted IcosahedronGeometry with glass-like refraction,
 * visible edge wireframes, inner core glow, and slow deliberate rotation.
 *
 * Architecture (3 layers):
 * - Inner core: Small bright emissive glow
 * - Crystal body: Transparent MeshPhysicalMaterial with transmission/ior
 * - Edge wireframe: EdgesGeometry with thin white lines for sharp facets
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Emotion } from "@/types/visualization";
import {
  getModeConfig,
  applyColorConfig,
  calculateEmissiveIntensity,
} from "@/utils/modeVisualConfigs";

interface CrystallineEmotionNodeProps {
  emotion: Emotion;
  color: THREE.Color;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

export function CrystallineEmotionNode({
  emotion,
  color,
  size,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: CrystallineEmotionNodeProps) {
  const crystalRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const crystalMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const modeConfig = useMemo(() => getModeConfig("crystalline"), []);

  // Apply crystalline color adjustments — slight cool shift
  const enhancedColor = useMemo(
    () => applyColorConfig(color, modeConfig.colors, emotion.vac[0], emotion.vac[1]),
    [color, modeConfig.colors, emotion.vac]
  );

  // Brighter core color
  const coreColor = useMemo(() => {
    const c = enhancedColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s * 0.8, Math.min(hsl.l + 0.4, 0.95));
    return c;
  }, [enhancedColor]);

  // Create faceted geometry — low subdivision for sharp crystal faces
  const crystalGeometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1, 1); // Detail 1 = 80 faces, nice crystal look
  }, []);

  // Edge geometry for wireframe overlay
  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(crystalGeometry, 15); // threshold angle 15° for visible edges
  }, [crystalGeometry]);

  // Very slow rotation — crystals turn deliberately to catch light
  useFrame((state) => {
    if (!crystalRef.current) return;

    const time = state.clock.elapsedTime;
    const [, , connection] = emotion.vac;

    // Slow deliberate rotation
    crystalRef.current.rotation.y += 0.003;
    crystalRef.current.rotation.x += 0.001;

    // Hover scale
    const hoverScale = isHovered ? 1.25 : 1.0;
    const selectedScale = isSelected ? 1.15 : 1.0;
    crystalRef.current.scale.setScalar(size * hoverScale * selectedScale);

    // Core pulse — subtle inner light breathing
    if (coreRef.current) {
      const corePulse = 1.0 + Math.sin(time * 0.8) * 0.1;
      coreRef.current.scale.setScalar(size * 0.35 * corePulse * hoverScale * selectedScale);
      // Counter-rotate core slowly for internal sparkle
      coreRef.current.rotation.y -= 0.005;
      coreRef.current.rotation.z += 0.003;
    }

    // Edge wireframe tracks crystal rotation
    if (edgesRef.current) {
      edgesRef.current.rotation.copy(crystalRef.current.rotation);
      edgesRef.current.scale.copy(crystalRef.current.scale);
    }

    // Update material properties dynamically
    if (crystalMatRef.current) {
      // Connection affects opacity — more connected = more opaque crystal
      const connectionFactor = (connection + 1) / 2;
      crystalMatRef.current.opacity = THREE.MathUtils.lerp(0.35, 0.7, connectionFactor);

      // Glow intensity from mode config
      const glowPulse = 1.0 + Math.sin(time * 0.5) * 0.15;
      const emissiveIntensity = calculateEmissiveIntensity(
        modeConfig.materials,
        connection,
        glowPulse
      );
      crystalMatRef.current.emissiveIntensity = isSelected
        ? emissiveIntensity * 1.5
        : emissiveIntensity;
    }
  });

  // Edge wireframe opacity
  const edgeOpacity = isSelected ? 0.5 : isHovered ? 0.35 : 0.15;

  return (
    <group data-testid="crystal-group">
      {/* Inner core — pure glowing light */}
      <mesh ref={coreRef} data-testid="crystal-core">
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={isSelected ? 0.95 : 0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Crystal body — transparent glass */}
      <mesh
        ref={crystalRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        data-testid="crystal-body"
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          ref={crystalMatRef}
          color={enhancedColor}
          emissive={enhancedColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
          metalness={0.05}
          roughness={0.05}
          transmission={0.6}
          ior={1.5}
          thickness={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          envMapIntensity={2.0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Edge wireframe — sharp crystalline facet lines */}
      <lineSegments ref={edgesRef} geometry={edgesGeometry} data-testid="crystal-edges">
        <lineBasicMaterial
          color={isSelected ? "#FFFFFF" : "#C0D8FF"}
          transparent
          opacity={edgeOpacity}
          linewidth={1}
        />
      </lineSegments>

      {/* Selection glow ring */}
      {(isSelected || isHovered) && (
        <mesh data-testid="crystal-aura">
          <sphereGeometry args={[size * 2.0, 16, 16]} />
          <meshBasicMaterial
            color={enhancedColor}
            transparent
            opacity={isSelected ? 0.25 : 0.12}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
