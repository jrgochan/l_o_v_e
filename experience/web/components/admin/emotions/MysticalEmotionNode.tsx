/**
 * Mystical Emotion Node Component
 *
 * Multi-layer translucent sphere for Mystical mode:
 * - Inner core: Pure glowing light
 * - Middle layer: Colored translucent glass
 * - Outer aura: Soft atmospheric glow
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface MysticalEmotionNodeProps {
  emotion: AtlasEmotion;
  color: THREE.Color;
  size: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

export function MysticalEmotionNode({
  emotion,
  color,
  size,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: MysticalEmotionNodeProps) {
  const outerRef = useRef<THREE.Mesh>(null);
  const middleRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);

  const [valence, , connection] = emotion.vac;

  // Inner core color - derive from the emotion's actual color but brighter
  const coreColor = useMemo(() => {
    const c = color.clone();
    // Increase lightness for core glow
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, Math.min(hsl.l + 0.3, 0.95)); // Ensure it's bright
    return c;
  }, [color]);

  // Add mystical undertone to main color
  const mysticalColor = useMemo(() => {
    const col = color.clone();
    const undertone = new THREE.Color("#4A3B77"); // Purple/blue
    // Reduced lerp strength to preserve original identity more
    col.lerp(undertone, 0.1);
    return col;
  }, [color]);

  // Animate layers
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Gentle breathing animation
    const breathe = 1.0 + Math.sin(time * 0.4) * 0.08;
    const hoverScale = isHovered ? 1.2 : 1.0;
    const scale = breathe * hoverScale;

    // Inner core - fastest pulse
    /* istanbul ignore next */
    if (innerRef.current) {
      const corePulse = 1.0 + Math.sin(time * 1.5) * 0.15;
      innerRef.current.scale.setScalar(scale * corePulse * 0.3);

      // Slow multi-axis rotation
      innerRef.current.rotation.y += 0.003;
      innerRef.current.rotation.x += 0.002;
      innerRef.current.rotation.z += 0.001;
    }

    // Middle layer - medium pulse
    /* istanbul ignore next */
    if (middleRef.current) {
      const middlePulse = 1.0 + Math.sin(time * 0.8) * 0.1;
      middleRef.current.scale.setScalar(scale * middlePulse * 0.7);

      // Counter-rotate slowly
      middleRef.current.rotation.y -= 0.002;
      middleRef.current.rotation.x += 0.0015;
    }

    // Outer layer - slowest pulse
    /* istanbul ignore next */
    if (outerRef.current) {
      outerRef.current.scale.setScalar(scale);

      // Very slow rotation
      outerRef.current.rotation.y += 0.001;
      outerRef.current.rotation.z += 0.0005;
    }

    // Aura - expands and contracts
    /* istanbul ignore next */
    if (auraRef.current) {
      const auraPulse = 1.0 + Math.sin(time * 0.5) * 0.2;
      auraRef.current.scale.setScalar(scale * auraPulse * 1.5);

      // Opacity pulse
      const material = auraRef.current.material as THREE.MeshBasicMaterial;
      const connectionFactor = (connection + 1) / 2; // 0-1
      material.opacity = (0.1 + connectionFactor * 0.15) * auraPulse;
    }

    // Floating motion
    const floatY = Math.sin(time * 0.3) * 0.08;
    [innerRef, middleRef, outerRef, auraRef].forEach((ref) => {
      /* istanbul ignore next */
      if (ref.current) {
        ref.current.position.y = floatY;
      }
    });
  });

  // Calculate opacities based on connection
  const connectionFactor = (connection + 1) / 2; // 0-1
  const outerOpacity = 0.3 + connectionFactor * 0.4; // 0.3-0.7
  const middleOpacity = 0.5 + connectionFactor * 0.3; // 0.5-0.8

  return (
    <group>
      {/* Outer aura - very transparent, large */}
      <mesh
        ref={auraRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial
          color={mysticalColor}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer layer - translucent glass */}
      <mesh
        ref={outerRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshPhysicalMaterial
          color={mysticalColor}
          transparent
          opacity={outerOpacity}
          metalness={0.1}
          roughness={0.1}
          transmission={0.6} // Glass-like
          thickness={0.5}
          envMapIntensity={1.0}
        />
      </mesh>

      {/* Middle layer - colored glass */}
      <mesh ref={middleRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={middleOpacity}
          metalness={0.2}
          roughness={0.2}
          transmission={0.4}
          thickness={0.8}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Inner core - pure glowing light */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner core glow */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[size * 1.2, 16, 16]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Selection glow */}
      {(isSelected || isHovered) && (
        <mesh>
          <sphereGeometry args={[size * 1.8, 32, 32]} />
          <meshBasicMaterial
            color={mysticalColor}
            transparent
            opacity={isSelected ? 0.4 : 0.25}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
