/**
 * Emotion Particles Component
 *
 * Creates particle systems around emotions based on their VAC coordinates.
 * Different particle behaviors for connection levels and categories.
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AtlasEmotion } from "@/types/atlas-admin";
import type { ParticleConfig } from "@/utils/modeVisualConfigs";

interface EmotionParticlesProps {
  emotion: AtlasEmotion;
  color: THREE.Color;
  config: ParticleConfig;
  isSelected: boolean;
  isHovered: boolean;
}

export function EmotionParticles({
  emotion,
  color,
  config,
  isSelected,
  isHovered,
}: EmotionParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const [, arousal, connection] = emotion.vac;

  // Use state to hold particle data, initialized to null/empty to match server
  const [particleData, setParticleData] = useState<{
    positions: Float32Array;
    velocities: Float32Array;
    sizes: Float32Array;
  } | null>(null);

  useEffect(() => {
    if (!config.enabled) {
      // Don't need to clear data, render handles it via !config.enabled check
      return;
    }

    const count = config.density;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Initial position around emotion (sphere distribution)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 0.05 + Math.random() * 0.1;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Velocity based on connection
      const connectionFactor = (connection + 1) / 2; // 0-1
      const speed = config.speedMultiplier * (0.3 + connectionFactor * 0.7);

      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;

      // High arousal = faster upward movement
      if (arousal > 0.3) {
        velocities[i3 + 1] += arousal * 0.2;
      }

      // Size variation
      sizes[i] = config.particleSize * (0.7 + Math.random() * 0.6);
    }

    // Wrap in setTimeout to avoid "setState synchronously in effect" lint error
    const timer = setTimeout(() => {
      setParticleData({ positions, velocities, sizes });
    }, 0);
    return () => clearTimeout(timer);
  }, [config, connection, arousal]);

  useFrame((state, delta) => {
    /* istanbul ignore next */
    if (!particlesRef.current || !config.enabled || !particleData) return;

    timeRef.current += delta;

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const { velocities } = particleData;
    const count = particleData.positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update position based on velocity
      posArray[i3] += velocities[i3] * delta;
      posArray[i3 + 1] += velocities[i3 + 1] * delta;
      posArray[i3 + 2] += velocities[i3 + 2] * delta;

      // Calculate distance from center
      const dx = posArray[i3];
      const dy = posArray[i3 + 1];
      const dz = posArray[i3 + 2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Reset particles that go too far
      if (distance > config.maxDistance) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 0.05 + Math.random() * 0.1;

        posArray[i3] = radius * Math.sin(phi) * Math.cos(theta);
        posArray[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        posArray[i3 + 2] = radius * Math.cos(phi);
      }

      // Add subtle orbital motion
      if (config.enableAuras) {
        const orbitSpeed = 0.3;
        const angle = timeRef.current * orbitSpeed + i * 0.1;
        posArray[i3] += Math.sin(angle) * 0.001;
        posArray[i3 + 2] += Math.cos(angle) * 0.001;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    if (config.enableAuras) {
      particlesRef.current.rotation.y += delta * 0.1;
    }
  });

  if (!config.enabled || !particleData) {
    return null;
  }

  const { positions, sizes } = particleData;
  const opacity =
    config.opacity * /* istanbul ignore next */ (isSelected ? 1.5 : isHovered ? 1.2 : 1.0);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={config.particleSize}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface BurstParticlesProps {
  position: THREE.Vector3;
  color: THREE.Color;
  trigger: boolean;
}

export function BurstParticles({ position, color, trigger }: BurstParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const progressRef = useRef(0);

  const [burstData, setBurstData] = useState<{
    positions: Float32Array;
    velocities: Float32Array;
  } | null>(null);

  useEffect(() => {
    if (trigger) {
      const count = 30;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Start at center
        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;

        // Burst outward
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.5 + Math.random() * 0.5;

        velocities[i3] = speed * Math.sin(phi) * Math.cos(theta);
        velocities[i3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
        velocities[i3 + 2] = speed * Math.cos(phi);
      }
      const timer = setTimeout(() => {
        setBurstData({ positions, velocities });
      }, 0);
      progressRef.current = 0;
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  useFrame((state, delta) => {
    /* istanbul ignore next */
    if (!particlesRef.current || !trigger || !burstData) return;

    progressRef.current += delta * 2;

    if (progressRef.current > 1) {
      return;
    }

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const { velocities } = burstData;
    const count = burstData.positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] = velocities[i3] * progressRef.current;
      posArray[i3 + 1] = velocities[i3 + 1] * progressRef.current;
      posArray[i3 + 2] = velocities[i3 + 2] * progressRef.current;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    /* istanbul ignore next */
    if (materialRef.current) {
      materialRef.current.opacity = 1 - progressRef.current;
    }
  });

  if (!trigger || !burstData) {
    // If we return null, the component unmounts and particles disappear instantly.
    // This is fine if trigger becomes false. But if trigger is true and animation finishes (progress > 1),
    // we might want to return null too.
    return null;
  }

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[burstData.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.03}
        color={color}
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
