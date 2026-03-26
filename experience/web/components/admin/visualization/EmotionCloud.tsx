/**
 * Emotion Cloud Component
 *
 * Renders all emotions as interactive spheres in 3D VAC space.
 * Each emotion is positioned at its [Valence, Arousal, Connection] coordinates.
 */

"use client";

import { useMemo, useEffect } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { BRIDGE_EMOTIONS } from "@/types/visualization";
import { resolveEmotionColor } from "@/utils/emotion-colors";
import type { Emotion, PathAnimationMode } from "@/types/visualization";
//
import { AnimatedEmotionNode } from "../emotions/AnimatedEmotionNode";
import { MysticalEmotionNode } from "../emotions/MysticalEmotionNode";
import { CrystallineEmotionNode } from "../emotions/CrystallineEmotionNode";
import { LuminousEmotionNode } from "../emotions/LuminousEmotionNode";
import { LiquidEmotionNode } from "../emotions/LiquidEmotionNode";
import { GlitchEmotionNode } from "../emotions/GlitchEmotionNode";
import { getEmotionAnimationParams } from "@/utils/emotionAnimationMapper";
import { getModeConfig } from "@/utils/modeVisualConfigs";
import { EmotionParticles } from "../particles/EmotionParticles";
import { getLabelStyle } from "./EmotionLabelOverlay";

import { useAmbientAudio } from "@/hooks/useAmbientAudio";

interface EmotionCloudProps {
  enableFloatingLabels?: boolean;
}

export function EmotionCloud({ enableFloatingLabels = false }: EmotionCloudProps) {
  // const { playHoverSound } = useAmbientAudio();
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const selectedIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const hoveredId = useVisualizationStore((state) => state.hoveredEmotionId);
  const focusedId = useVisualizationStore((state) => state.focusedEmotionId);
  const categoryFilters = useVisualizationStore((state) => state.categoryFilters);
  const { layers } = useSettingsStore();
  // settings store has flat properties, while useVisualizationStore nested them.
  // Actually useSettingsStore has 'layers' and flat settings.
  // We need to match what EmotionCloud expects.
  // EmotionCloud uses: settings.pathAnimationMode, settings.focusMode, settings.enableAnimations, settings.emotionSize, settings.showMotionIndicators
  // useSettingsStore HAS these properties directly on the state.
  const settings = useSettingsStore();

  // Get mode configuration for lighting
  const modeConfig = useMemo(
    () => getModeConfig(settings.pathAnimationMode),
    [settings.pathAnimationMode]
  );

  // Filter visible emotions by category filters and focus mode
  const visibleEmotions = allEmotions.filter((emotion) => {
    // Category filter
    const categoryFilter = categoryFilters.get(emotion.category);
    const categoryEnabled = categoryFilter?.enabled ?? true;

    // Focus mode filter (only show selected emotions)
    const focusEnabled = !settings.focusMode || selectedIds.has(emotion.id);

    return categoryEnabled && focusEnabled;
  });

  // === REACTIVE SHELL BINDING ===
  // Drive OctonionLayers from selected/hovered emotion atlas data
  useEffect(() => {
    if (!settings.enableOctonionLayer) return;

    // Gather emotions to consider: selected + hovered
    const relevantEmotions = allEmotions.filter(
      (e) => selectedIds.has(e.id) || e.id === hoveredId
    );

    // No selection → return to neutral
    if (relevantEmotions.length === 0 || !relevantEmotions.some((e) => e.extended)) {
      useExperienceStore.getState().setTargetOctonionExtended({
        depth: 0, coping: 0, velocity: 0, novelty: 0,
      });
      return;
    }

    const withExt = relevantEmotions.filter((e) => e.extended);
    if (withExt.length === 0) return;

    // Max-absolute for Depth, Velocity, Novelty (prevents washout)
    let maxDepth = 0, maxVelocity = 0, maxNovelty = 0;
    let copingSum = 0, minCoping = 1;

    for (const e of withExt) {
      const [d, p, v, n] = e.extended!;
      if (Math.abs(d) > Math.abs(maxDepth)) maxDepth = d;
      if (Math.abs(v) > Math.abs(maxVelocity)) maxVelocity = v;
      if (Math.abs(n) > Math.abs(maxNovelty)) maxNovelty = n;
      copingSum += p;
      if (p < minCoping) minCoping = p;
    }

    // Coping: negativity-biased average (one overwhelmed emotion drags the system down)
    const copingAvg = copingSum / withExt.length;
    const copingBiased = copingAvg * (1 - 0.3 * Math.max(0, -minCoping));

    useExperienceStore.getState().setTargetOctonionExtended({
      depth: maxDepth,
      coping: copingBiased,
      velocity: maxVelocity,
      novelty: maxNovelty,
    });
  }, [selectedIds, hoveredId, allEmotions, settings.enableOctonionLayer]);

  if (!layers.emotionPoints) {
    return null;
  }

  return (
    <group>
      {/* Mode-based scene lighting */}
      <ambientLight intensity={modeConfig.lighting.ambientIntensity} />
      <directionalLight
        position={modeConfig.lighting.keyLightPosition}
        intensity={modeConfig.lighting.keyLightIntensity}
        castShadow={modeConfig.lighting.castShadows}
      />
      <directionalLight
        position={modeConfig.lighting.fillLightPosition}
        intensity={modeConfig.lighting.fillLightIntensity}
      />

      {/* Per-emotion point lights (for Dynamic & Mystical modes) */}
      {modeConfig.lighting.enableEmotionLights &&
        visibleEmotions.map((emotion) => {
          const isSelected = selectedIds.has(emotion.id);
          const isHovered = hoveredId === emotion.id;

          // Only add lights for selected/hovered emotions to avoid performance hit
          if (!isSelected && !isHovered) return null;

          const categoryColor = resolveEmotionColor(emotion);
          const lightColor = new THREE.Color(categoryColor);

          // Warm or cool based on valence
          const valence = emotion.vac[0];
          if (valence > 0) {
            lightColor.lerp(new THREE.Color("#FFA500"), 0.3); // Warm
          } else if (valence < 0) {
            lightColor.lerp(new THREE.Color("#00CED1"), 0.3); // Cool
          }

          return (
            <pointLight
              key={`light-${emotion.id}`}
              position={emotion.vac}
              color={lightColor}
              intensity={modeConfig.lighting.emotionLightIntensity}
              distance={modeConfig.lighting.emotionLightDistance}
              decay={2}
            />
          );
        })}

      {/* Emotion spheres */}
      {visibleEmotions.map((emotion) => {
        const isSelected = selectedIds.has(emotion.id);
        const isHovered = hoveredId === emotion.id;
        const isFocused = focusedId === emotion.id;
        const isBridge = (BRIDGE_EMOTIONS as readonly string[]).includes(emotion.name);

        return (
          <EmotionSphere
            key={emotion.id}
            emotion={emotion}
            isSelected={isSelected}
            isHovered={isHovered}
            isFocused={isFocused}
            isBridge={isBridge}
            showLabel={layers.emotionLabels && (isSelected || isHovered)}
            enableFloatingLabels={enableFloatingLabels}
          />
        );
      })}
    </group>
  );
}

interface EmotionSphereProps {
  emotion: Emotion;
  isSelected: boolean;
  isHovered: boolean;
  isFocused: boolean;
  isBridge: boolean;
  showLabel: boolean;
  enableFloatingLabels: boolean;
}

function EmotionSphere({
  emotion,
  isSelected,
  isHovered,
  isFocused,
  isBridge,
  showLabel,
  enableFloatingLabels,
}: EmotionSphereProps) {
  const toggleEmotion = useVisualizationStore((state) => state.toggleEmotion);
  const setHoveredEmotion = useVisualizationStore((state) => state.setHoveredEmotion);
  const settings = useSettingsStore();
  // const toast = useToast();
  const { playHoverSound } = useAmbientAudio();

  // Position in VAC space
  const [v, a, c] = emotion.vac;
  const position = useMemo(() => new THREE.Vector3(v, a, c), [v, a, c]);

  // Color based on category
  const color = useMemo(() => {
    const categoryColor = resolveEmotionColor(emotion);
    return new THREE.Color(categoryColor);
  }, [emotion]);

  // Size calculation
  const baseSize = 0.06 * settings.emotionSize;
  const size = isSelected ? baseSize * 1.8 : baseSize;

  // Get animation parameters to determine motion type
  const animParams = useMemo(
    () => getEmotionAnimationParams(emotion, settings.pathAnimationMode),
    [emotion, settings.pathAnimationMode]
  );

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    toggleEmotion(emotion.id);

    if (isSelected) {
      // console.log(`[EmotionCloud] Removed ${emotion.name}`);
    } else {
      // console.log(`[EmotionCloud] Selected ${emotion.name}`);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredEmotion(emotion.id);
    document.body.style.cursor = "pointer";
    playHoverSound();
  };

  const handlePointerOut = () => {
    setHoveredEmotion(null);
    document.body.style.cursor = "auto";
  };

  // Get mode config for particles
  const modeConfig = useMemo(
    () => getModeConfig(settings.pathAnimationMode),
    [settings.pathAnimationMode]
  );

  return (
    <group position={position}>
      {/* Particle system (for Dynamic and Mystical modes) */}
      {settings.enableAnimations && modeConfig.particles.enabled && (
        <EmotionParticles
          emotion={emotion}
          color={color}
          config={modeConfig.particles}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}

      {/* VAC-based animated emotion sphere */}
      {settings.enableAnimations ? (
        settings.pathAnimationMode === "mystical" ? (
          <MysticalEmotionNode
            emotion={emotion}
            color={color}
            size={size}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ) : settings.pathAnimationMode === "crystalline" ? (
          <CrystallineEmotionNode
            emotion={emotion}
            color={color}
            size={size}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ) : settings.pathAnimationMode === "luminous" ? (
          <LuminousEmotionNode
            emotion={emotion}
            color={color}
            size={size}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ) : settings.pathAnimationMode === "liquid" ? (
          <LiquidEmotionNode
            emotion={emotion}
            color={color}
            size={size}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ) : settings.pathAnimationMode === "glitch" ? (
          <GlitchEmotionNode
            emotion={emotion}
            color={color}
            size={size}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ) : (
          <AnimatedEmotionNode
            emotion={emotion}
            color={color}
            size={size}
            mode={settings.pathAnimationMode}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        )
      ) : (
        <mesh
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={(isSelected ? 1.5 : isHovered ? 1.0 : 0.3) + (settings.enableOctonionLayer && emotion.extended ? emotion.extended[0] * 0.3 : 0)}
            transparent
            opacity={isSelected ? 1.0 : isHovered ? 0.9 : 0.7}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      )}

      {/* Bridge emotion indicator (gold ring) */}
      {isBridge && (
        <mesh>
          <torusGeometry args={[size * 1.6, size * 0.15, 8, 16]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Motion type indicators for non-bridge emotions */}
      {!isBridge && settings.enableAnimations && settings.showMotionIndicators && (
        <>
          {animParams.secondaryMotion === "orbital" && (
            <mesh rotation={[Math.PI / 6, 0, 0]}>
              {" "}
              {/* Tilted for 3D orbital effect */}
              <torusGeometry args={[size * 1.8, size * 0.08, 8, 24]} />
              <meshBasicMaterial
                color="#00CED1" // Cyan - social/relational
                transparent
                opacity={0.35}
              />
            </mesh>
          )}

          {animParams.secondaryMotion === "reaching" && (
            <>
              {/* Upward reaching arcs */}
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <torusGeometry args={[size * 1.7, size * 0.07, 6, 16, Math.PI * 0.6]} />
                <meshBasicMaterial
                  color="#A3E635" // Lime green - growth/optimism
                  transparent
                  opacity={0.4}
                />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <torusGeometry args={[size * 1.7, size * 0.07, 6, 16, Math.PI * 0.6]} />
                <meshBasicMaterial color="#A3E635" transparent opacity={0.4} />
              </mesh>
            </>
          )}

          {animParams.secondaryMotion === "recoil" && (
            <mesh rotation={[Math.PI, 0, 0]}>
              {" "}
              {/* Flipped downward */}
              <coneGeometry args={[size * 1.5, size * 0.8, 8, 1, true]} />
              <meshBasicMaterial
                color="#6B7280" // Gray - retreat/inward
                transparent
                opacity={0.25}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {animParams.secondaryMotion === "stable" && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              {" "}
              {/* Flat base circle */}
              <ringGeometry args={[size * 1.4, size * 1.6, 16]} />
              <meshBasicMaterial
                color="#94A3B8" // Slate - grounded/stable
                transparent
                opacity={0.2}
              />
            </mesh>
          )}
        </>
      )}

      {/* Focused indicator (bright teal ring for waypoint navigation) */}
      {isFocused && (
        <mesh>
          <torusGeometry args={[size * 2.0, size * 0.2, 8, 24]} />
          <meshBasicMaterial color="#2DD4BF" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Outer glow for selected/hovered */}
      {(isSelected || isHovered || isFocused) && (
        <mesh>
          <sphereGeometry args={[size * 1.8, 16, 16]} />
          <meshBasicMaterial
            color={isFocused ? new THREE.Color("#2DD4BF") : color}
            transparent
            opacity={isFocused ? 0.3 : 0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Note: Labels removed to prevent WebGL context loss */}
      {/* Emotion names are shown in the InfoPanel on hover instead */}
      {/* Re-enabled via Html for viewer toggle support (scoped to Client via enableFloatingLabels) */}
      {enableFloatingLabels && showLabel && (
        <Html position={[0, size * 2.5, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
          <FloatingEmotionLabel
            emotion={emotion}
            mode={settings.pathAnimationMode}
            isSelected={isSelected}
            isHovered={isHovered}
            isBridge={isBridge}
          />
        </Html>
      )}
    </group>
  );
}

function FloatingEmotionLabel({
  emotion,
  mode,
  isSelected,
  isHovered,
  isBridge,
}: {
  emotion: Emotion;
  mode: PathAnimationMode;
  isSelected: boolean;
  isHovered: boolean;
  isBridge: boolean;
}) {
  const categoryColor = resolveEmotionColor(emotion);
  const labelStyle = getLabelStyle(mode, isSelected, isHovered, categoryColor);

  return (
    <div
      className={`${labelStyle.containerClass} ${labelStyle.textClass} scale-75 origin-bottom`}
      style={{
        ...labelStyle.containerStyle,
        pointerEvents: "none", // Ensure it doesn't block interactions
        whiteSpace: "nowrap",
      }}
    >
      <div className="flex items-center gap-1.5">
        {isBridge && <span className={labelStyle.bridgeIconClass}>★</span>}
        <span className="font-medium">{emotion.name}</span>
      </div>
      {isHovered && (
        <>
          <div className={`text-xs mt-0.5 ${labelStyle.categoryClass}`}>{emotion.category}</div>
          <div className={`text-xs font-mono mt-0.5 ${labelStyle.vacClass}`}>
            [{emotion.vac.map((v) => v.toFixed(2)).join(", ")}]
          </div>
          {emotion.extended && (
            <div className="text-[9px] font-mono mt-0.5 text-violet-300/80">
              D:{emotion.extended[0].toFixed(2)} P:{emotion.extended[1].toFixed(2)} Ė:{emotion.extended[2].toFixed(2)} N:{emotion.extended[3].toFixed(2)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
