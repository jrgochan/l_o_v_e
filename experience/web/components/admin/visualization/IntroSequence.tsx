"use client";

import { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { Html } from "@react-three/drei";

const startPos = new THREE.Vector3(0, 50, 100); // Start from high above
const endPos = new THREE.Vector3(0, 0, 5); // Default view

export function IntroSequence() {
  const { camera } = useThree();
  const setIntroActive = useVisualizationStore((state) => state.setIntroActive);
  const { playWhoosh } = useAmbientAudio();

  const [opacity, setOpacity] = useState(1);
  const [showTitle, setShowTitle] = useState(false);

  const startTimeRef = useRef<number | null>(null);

  const DURATION = 6.0;

  useEffect(() => {
    // Initial setup
    camera.position.copy(startPos);
    camera.lookAt(0, 0, 0);

    // Play sound
    playWhoosh(4.0);

    // Fade in title after a delay
    const titleTimer = setTimeout(() => setShowTitle(true), 1000);
    const titleFadeOut = setTimeout(() => setShowTitle(false), 4500);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(titleFadeOut);
    };
  }, [camera, playWhoosh]); // Run once on mount

  useFrame((state) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const progress = Math.min(elapsed / DURATION, 1.0);

    // Easing: Cubic Out
    const t = 1 - Math.pow(1 - progress, 3);

    // Interpolate Camera Position
    const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
    camera.position.copy(currentPos);
    camera.lookAt(0, 0, 0);

    // Fade out overlay at the end
    if (progress > 0.8) {
      const fadeProgress = (progress - 0.8) / 0.2;
      setOpacity(1 - fadeProgress);
    }

    // Complete
    if (progress >= 1.0) {
      setIntroActive(false);
    }
  });

  // Render Overlay (Black fade + Title)
  return (
    <Html fullscreen style={{ pointerEvents: "none", zIndex: 100 }}>
      <div
        className="w-full h-full flex items-center justify-center bg-black transition-opacity duration-1000"
        style={{ opacity: opacity }}
      >
        <div
          className={`text-center transition-opacity duration-1000 transform ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h1 className="text-6xl font-extralight text-white tracking-[0.2em] mb-4">ATLAS</h1>
          <p className="text-xl text-gray-400 font-light tracking-widest uppercase">
            of Human Experience
          </p>
        </div>
      </div>
    </Html>
  );
}
