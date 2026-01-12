/**
 * Aggregate Sphere Component
 *
 * 3D visualization of blended emotional state from multiple emotions.
 * Features color blending, complexity-based opacity, and particle system.
 * Built on BaseSphere with particle effects.
 *
 * Replaces: AggregateEmotionSphere.tsx (263 lines)
 * New: ~180 lines (83 line reduction)
 */

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { blendColors, getColorFromValence } from "./BaseSphere";
import type { DetectedEmotion, AggregateState } from "@/types/chat";

interface AggregateSphereProps {
  emotions: DetectedEmotion[];
  aggregate: AggregateState;
  width?: number;
  height?: number;
  className?: string;
  mode?: "subtle" | "dynamic" | "mystical";
}

export function AggregateSphere({
  emotions,
  aggregate,
  width = 300,
  height = 300,
  className = "",
  mode = "subtle",
}: AggregateSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Capture ref for cleanup
    const container = containerRef.current;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    if (container) {
      container.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Blend emotion colors
    const emotionColors = emotions.map((e) => getColorFromValence(e.vac.valence));
    const weights = emotions.map((e) => e.confidence);
    const blendedColor = blendColors(emotionColors, weights);

    // Calculate opacity based on complexity
    const opacity = 0.95 - aggregate.complexity_score * 0.35;

    // Create sphere
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: blendedColor,
      transparent: true,
      opacity: opacity,
      shininess: 100,
      specular: 0x444444,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Create particles
    const particleCount = Math.floor(50 + (aggregate.vac.arousal + 1) * 75);
    const particles = createParticles(particleCount, aggregate.vac.arousal, blendedColor.getHex());
    scene.add(particles);
    particlesRef.current = particles;

    // Mode-based animation parameters
    const modeParams = {
      subtle: { rotationSpeed: 0.001, swirlMult: 1.0 },
      dynamic: { rotationSpeed: 0.003, swirlMult: 2.0 },
      mystical: { rotationSpeed: 0.002, swirlMult: 1.5 },
    };
    const params = modeParams[mode];

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      // Rotate sphere
      if (sphereRef.current) {
        sphereRef.current.rotation.y += params.rotationSpeed;
      }

      // Animate particles
      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position;
        const time = Date.now() * 0.0005;

        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          const baseSwirl = aggregate.vac.arousal > 0 ? 0.01 : 0.002;
          const swirl = baseSwirl * params.swirlMult;

          positions.array[i3] += Math.sin(time + i) * swirl;
          positions.array[i3 + 1] +=
            Math.cos(time + i) * swirl * (aggregate.vac.valence > 0 ? 1 : -1);
          positions.array[i3 + 2] += Math.sin(time * 0.5 + i) * swirl;

          // Keep particles within bounds
          const distance = Math.sqrt(
            positions.array[i3] ** 2 + positions.array[i3 + 1] ** 2 + positions.array[i3 + 2] ** 2
          );

          if (distance > 4) {
            positions.array[i3] *= 0.95;
            positions.array[i3 + 1] *= 0.95;
            positions.array[i3 + 2] *= 0.95;
          }
        }

        positions.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }

      if (rendererRef.current && container && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [emotions, aggregate, width, height, mode]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="rounded-lg overflow-hidden" />

      {/* Info overlay */}
      <div className="absolute top-2 left-2 bg-black/60 rounded px-2 py-1 text-xs text-white">
        <div>
          {emotions.length} emotion{emotions.length > 1 ? "s" : ""}
        </div>
        <div className="text-gray-300">
          Complexity: {(aggregate.complexity_score * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

// Helper: Create particle system
function createParticles(count: number, arousal: number, color: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 2.5 + Math.random() * 1.5;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: color,
    size: arousal > 0 ? 0.08 : 0.04,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}
