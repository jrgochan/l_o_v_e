/**
 * L.O.V.E. Experience - Zen Mode
 *
 * Pure contemplative viewer that displays the Soul Sphere in real-time
 * as controlled from the admin/atlas page. This is the "Zen Experience" -
 * a beautiful, uncluttered emotional visualization with no controls.
 *
 * This page listens to BroadcastChannel messages from /admin/visualization
 * and updates the sphere accordingly, creating a clean viewer experience
 * perfect for therapeutic sessions, presentations, or pure contemplation.
 */

"use client";

import type { Emotion } from "@/types";
import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useExperienceStore } from "@/stores/useExperienceStore";

const Scene = dynamic(() => import("@/components/Scene").then((mod) => mod.Scene), {
  ssr: false,
});

import { CinematicOverlay } from "@/components/CinematicOverlay";
import { ViewerShortcuts } from "@/components/ViewerShortcuts";
import { VACDisplay } from "@/components/VACDisplay";
import { Header } from "@/components/layout/Header";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSphereSync } from "@/hooks/useSphereSync";
import { useEmotionData } from "@/hooks/useEmotionData";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { PathDetailsOverlay } from "@/components/PathDetailsOverlay";
import { SphereDebugOverlay } from "@/components/admin/debug/SphereDebugOverlay";
import { useZenKeyboardShortcuts } from "@/hooks/interaction/useZenKeyboardShortcuts";
import { WaypointArrivalOverlay } from "@/components/WaypointArrivalOverlay";

// Helper Component to isolate VAC updates/re-renders
function LiveVACDisplay() {
  const currentVAC = useExperienceStore((state) => state.currentVAC);
  return <VACDisplay vac={currentVAC} />;
}

// Helper types
interface SyncMessage {
  timestamp: number;
  type: string;
  vac?: number[];
  selectedEmotionIds?: string[];
}

export default function ZenExperience() {
  // Load emotions for internal lookups (not for editing)
  useEmotionData();

  // Sync store for emotion lookups
  const emotions = useVisualizationStore((state) => state.allEmotions);
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);

  // Audio Engine
  const { initAudio, isMuted, toggleMute } = useAmbientAudio();
  const [hasAudioEnabled, setHasAudioEnabled] = useState(false);

  // Settings for layers
  const settings = useSettingsStore();

  const [isWaiting, setIsWaiting] = useState(false);
  const [activeEmotions, setActiveEmotions] = useState<Emotion[]>([]);

  const targetVAC = useExperienceStore((state) => state.targetVAC);
  const lastSyncRef = useRef(0);
  const [debugLog, setDebugLog] = useState<SyncMessage[]>([]);

  // Zen Experience: Listen for sphere state from admin/atlas broadcaster
  const handleSyncDisplay = useCallback(
    (message: SyncMessage) => {
      lastSyncRef.current = message.timestamp;
      setIsWaiting(false);

      // Update Debug Log
      setDebugLog((prev) =>
        [{ timestamp: message.timestamp, type: message.type, vac: message.vac }, ...prev].slice(
          0,
          5
        )
      );

      if (message.selectedEmotionIds && emotions.length > 0) {
        // Find full emotion objects
        const resolvedEmotions = message.selectedEmotionIds
          .map((id: string) => emotions.find((e: Emotion) => e.id === id))
          .filter((e: Emotion | undefined): e is Emotion => !!e);

        // Update local Admin store selection so components like EmotionCloud know what's selected
        selectMultiple(message.selectedEmotionIds);

        // If no emotions selected, show default state or nothing
        if (resolvedEmotions.length === 0 && message.vac) {
          setActiveEmotions([]);
        } else {
          setActiveEmotions(resolvedEmotions);
        }
      } else {
        selectMultiple([]);
        setActiveEmotions([]);
      }
    },
    [emotions, selectMultiple]
  );

  const { isConnected } = useSphereSync({
    mode: "listener",
    onSync: handleSyncDisplay,
    onStale: useCallback(() => setIsWaiting(true), []),
  });

  // Check for waiting state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Increased to 60s to handle background tab throttling on Admin side
      if (Date.now() - lastSyncRef.current > 60000) {
        setIsWaiting(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableAudio = useCallback(() => {
    initAudio();
    if (isMuted) toggleMute();
    setHasAudioEnabled(true);
  }, [initAudio, isMuted, toggleMute]);

  const [showDebug, setShowDebug] = useState(false);

  // Keyboard Shortcuts Hook
  useZenKeyboardShortcuts({
    initAudio,
    isMuted,
    toggleMute,
    setHasAudioEnabled,
    setShowDebug,
    emotions,
  });

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Pure Soul Sphere Visualization */}
      <Scene />

      {/* Cinematic Overlay (toggleable) */}
      <CinematicOverlay
        activeEmotions={activeEmotions}
        isWaiting={isWaiting}
        hasAudioEnabled={hasAudioEnabled}
        onEnableAudio={handleEnableAudio}
        visible={settings.layers.cinematicOverlay}
      />

      {/* Helper UI */}
      {settings.layers.viewerShortcuts && <ViewerShortcuts />}
      {settings.layers.vacDisplay && <LiveVACDisplay />}

      {/* Header UI (Settings only) */}
      <Header showAuth={true} />

      {/* Debug Overlay - Sync Diagnosis (Toggle with 'D') */}
      {showDebug && (
        <SphereDebugOverlay
          isConnected={isConnected}
          isWaiting={isWaiting}
          targetVAC={targetVAC}
          activeEmotions={activeEmotions}
          debugLog={debugLog}
        />
      )}

      {/* Zen Mode Path Details Overlay (Beautiful UX) */}
      {settings.layers.transitionPaths && <PathDetailsOverlay />}
      <WaypointArrivalOverlay />
    </div>
  );
}
