/**
 * Aggregate Emotion Sphere Component
 *
 * 3D visualization of blended emotional state using Three.js
 * Color blending from multiple emotions, opacity based on complexity
 */

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { DetectedEmotion, AggregateState } from "@/types/chat";

interface AggregateEmotionSphereProps {
  emotions: DetectedEmotion[];
  aggregate: AggregateState;
  width?: number;
  height?: number;
  className?: string;
  mode?: "subtle" | "dynamic" | "mystical";
}

export function AggregateEmotionSphere({
  emotions,
  aggregate,
  width = 300,
  height = 300,
  className = "",
  mode = "subtle",
}: AggregateEmotionSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
    const container = containerRef.current; // Capture ref for cleanup
    if (container) {
      container.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(2, 64, 64);

    // Calculate blended color from emotions
    const blendedColor = blendEmotionColors(emotions);

    // Calculate opacity based on complexity
    const opacity = calculateOpacity(aggregate.complexity_score);

    // Create sphere material
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

    // Create particles based on arousal
    const particleCount = Math.floor(50 + (aggregate.vac.arousal + 1) * 75); // 50-200 particles
    const particles = createParticles(particleCount, aggregate.vac.arousal, blendedColor);
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

      // Rotate sphere (speed based on mode)
      if (sphereRef.current) {
        sphereRef.current.rotation.y += params.rotationSpeed;
      }

      // Animate particles
      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position;
        const time = Date.now() * 0.0005;

        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          // Swirl effect based on arousal and mode
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

// Helper: Blend colors from multiple emotions
function blendEmotionColors(emotions: DetectedEmotion[]): number {
  if (!emotions || emotions.length === 0) {
    return 0xfbbf24; // amber-400 (neutral)
  }

  let totalConfidence = 0;
  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;

  emotions.forEach((emotion) => {
    const color = getEmotionColor(emotion.vac.valence);
    const confidence = emotion.confidence;

    // Extract RGB components
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // Weight by confidence
    weightedR += r * confidence;
    weightedG += g * confidence;
    weightedB += b * confidence;
    totalConfidence += confidence;
  });

  if (totalConfidence === 0) {
    return 0xfbbf24;
  }

  // Calculate weighted average
  const finalR = Math.round(weightedR / totalConfidence);
  const finalG = Math.round(weightedG / totalConfidence);
  const finalB = Math.round(weightedB / totalConfidence);

  return (finalR << 16) | (finalG << 8) | finalB;
}

// Helper: Get emotion color based on VAC valence
function getEmotionColor(valence: number): number {
  if (valence > 0.5) return 0x22c55e; // green-500
  if (valence > 0.1) return 0xa3e635; // lime-400
  if (valence > -0.1) return 0xfbbf24; // amber-400
  if (valence > -0.5) return 0xf97316; // orange-500
  return 0xef4444; // red-500
}

// Helper: Calculate opacity based on complexity
function calculateOpacity(complexity: number): number {
  // High complexity = more transparent (muddied, unclear)
  // Low complexity = more opaque (clear, simple)
  return 0.95 - complexity * 0.35; // Range: 0.60 (complex) to 0.95 (simple)
}

// Helper: Create particle system
function createParticles(count: number, arousal: number, color: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  // Distribute particles randomly around sphere
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 2.5 + Math.random() * 1.5;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Particle material
  const material = new THREE.PointsMaterial({
    color: color,
    size: arousal > 0 ? 0.08 : 0.04, // Larger particles for high arousal
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}
