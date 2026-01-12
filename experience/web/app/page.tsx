/**
 * L.O.V.E. Experience - Zen Mode
 *
 * Pure contemplative viewer that displays the Soul Sphere in real-time
 * as controlled from the admin/atlas page. This is the "Zen Experience" -
 * a beautiful, uncluttered emotional visualization with no controls.
 *
 * This page listens to BroadcastChannel messages from /admin/atlas
 * and updates the sphere accordingly, creating a clean viewer experience
 * perfect for therapeutic sessions, presentations, or pure contemplation.
 */

"use client";

import type { AtlasEmotion } from "@/types";
import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useExperienceStore } from "@/stores/useExperienceStore";

const Scene = dynamic(() => import("@/components/Scene").then((mod) => mod.Scene), {
  ssr: false,
});
import { SimpleAxisLabels } from "@/components/SimpleAxisLabels";
import { CinematicOverlay } from "@/components/CinematicOverlay";
import { ViewerShortcuts } from "@/components/ViewerShortcuts";
import { VACDisplay } from "@/components/VACDisplay";
import { Header } from "@/components/layout/Header";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSphereSync } from "@/hooks/useSphereSync";
import { useEmotionAtlas } from "@/hooks/useEmotionAtlas";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { PathDetailsOverlay } from "@/components/PathDetailsOverlay";

// Helper Component to isolate VAC updates/re-renders
function LiveVACDisplay() {
  const currentVAC = useExperienceStore((state) => state.currentVAC);
  return <VACDisplay vac={currentVAC} />;
}

export default function ZenExperience() {
  // Load emotions for internal lookups (not for editing)
  useEmotionAtlas();

  // Sync store for emotion lookups
  const emotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectMultiple = useAtlasAdminStore((state) => state.selectMultiple);

  // Audio Engine
  const { initAudio, isMuted, toggleMute } = useAmbientAudio();
  const [hasAudioEnabled, setHasAudioEnabled] = useState(false);

  // Settings for layers
  // Settings for layers
  const settings = useSettingsStore();

  const [isWaiting, setIsWaiting] = useState(false);
  const [activeEmotions, setActiveEmotions] = useState<string[]>([]);

  // const currentVAC = useExperienceStore((state) => state.currentVAC); // Removed to prevent re-renders
  const targetVAC = useExperienceStore((state) => state.targetVAC);
  const lastSyncRef = useRef(0);
  const [debugLog, setDebugLog] = useState<{ timestamp: number; type: string; vac?: number[] }[]>(
    []
  );

  // Flyover state
  const isFlying = useExperienceStore((state) => state.isFlying);
  const setIsFlying = useExperienceStore((state) => state.setIsFlying);
  const transitionPath = useExperienceStore((state) => state.transitionPath);

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
        const names = message.selectedEmotionIds
          .map((id: string) => emotions.find((e: AtlasEmotion) => e.id === id)?.name)
          .filter((name: string | undefined): name is string => !!name);

        // Update local Admin store selection so components like EmotionCloud know what's selected
        selectMultiple(message.selectedEmotionIds);

        // If no emotions selected, show default state or nothing
        if (names.length === 0 && message.vac) {
          setActiveEmotions([]);
        } else {
          setActiveEmotions(names);
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

  // Viewer-Specific Keyboard Shortcuts
  // Only allows interaction with local visuals (Audio, Layers, Camera), NOT data/state.
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "m":
          // Toggle Audio
          if (!e.ctrlKey && !e.metaKey) {
            initAudio();
            toggleMute();
            setHasAudioEnabled(true);
          }
          break;
        case "i":
          // Toggle Zen Overlay
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("cinematicOverlay", !settings.layers.cinematicOverlay);
          }
          break;
        case "v":
          // Cycle Visual Modes
          if (!e.ctrlKey && !e.metaKey) {
            const modes: Array<"subtle" | "dynamic" | "mystical"> = [
              "subtle",
              "dynamic",
              "mystical",
            ];
            const nextIndex = (modes.indexOf(settings.pathAnimationMode) + 1) % modes.length;
            settings.updateVisualSetting("pathAnimationMode", modes[nextIndex]);
          }
          break;
        case "t":
          // Toggle Flyover (Alternative)
          if (!e.ctrlKey && !e.metaKey && transitionPath) {
            setIsFlying(!isFlying);
          }
          break;
        case "a":
          // Toggle Axis
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateVisualSetting("showAxisLabels", !settings.showAxisLabels);
          }
          break;
        case "s":
          // Toggle Sphere
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("soulSphere", !settings.layers.soulSphere);
          }
          break;
        case "e":
          // Toggle Emotions (Points)
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("emotionPoints", !settings.layers.emotionPoints);
          }
          break;
        case "f":
          // Toggle Focus Mode
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateBehaviorSetting("focusMode", !settings.focusMode);
          }
          break;
        case "l":
          // Toggle Labels
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("emotionLabels", !settings.layers.emotionLabels);
          }
          break;
        case "p":
          // Toggle Paths
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("transitionPaths", !settings.layers.transitionPaths);
          }
          break;
        case " ":
          // Play/Pause Journey (Space)
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault(); // Prevent scrolling
            // If a path exists, toggle play/pause regardless of layer visibility
            if (transitionPath) {
              // Optional: Auto-show paths if they are hidden?
              if (!settings.layers.transitionPaths) {
                settings.updateLayer("transitionPaths", true);
              }
              setIsFlying(!isFlying);
            }
          }
          break;
        case "arrowright":
          // Next Emotion Category Path
          if (!e.ctrlKey && !e.metaKey && settings.layers.transitionPaths) {
            e.preventDefault();

            // 1. Get unique categories
            const categories = Array.from(new Set(emotions.map(e => e.category))).sort();
            if (categories.length === 0) return;

            // 2. Find current category index (from current path or default)
            const currentCat = transitionPath?.current_state.emotion ?
              emotions.find(e => e.name === transitionPath.current_state.emotion)?.category :
              categories[0];

            let nextIdx = (categories.indexOf(currentCat || "") + 1) % categories.length;
            const nextCat = categories[nextIdx];

            // 3. Pick 2 random emotions from this category
            const catEmotions = emotions.filter(e => e.category === nextCat);
            if (catEmotions.length >= 2) {
              const start = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              let end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              while (end.id === start.id) {
                end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              }

              // 4. Generate & Set Path
              const newPath: any = {
                current_state: { emotion: start.name, vac: start.vac },
                goal_state: { emotion: end.name, vac: end.vac },
                waypoints: [
                  {
                    emotion: "Transition",
                    vac: [
                      (start.vac[0] + end.vac[0]) / 2,
                      (start.vac[1] + end.vac[1]) / 2,
                      (start.vac[2] + end.vac[2]) / 2
                    ],
                    reasoning: `Exploring ${nextCat}`
                  }
                ]
              };
              useExperienceStore.getState().setTransitionPath(newPath);

              // Pause when switching to allow browsing
              if (isFlying) useExperienceStore.getState().setIsFlying(false);
            }
          }
          break;
        case "arrowleft":
          // Prev Emotion Category Path
          if (!e.ctrlKey && !e.metaKey && settings.layers.transitionPaths) {
            e.preventDefault();

            // 1. Get unique categories
            const categories = Array.from(new Set(emotions.map(e => e.category))).sort();
            if (categories.length === 0) return;

            // 2. Find current category index
            const currentCat = transitionPath?.current_state.emotion ?
              emotions.find(e => e.name === transitionPath.current_state.emotion)?.category :
              categories[0];

            let prevIdx = (categories.indexOf(currentCat || "") - 1 + categories.length) % categories.length;
            const prevCat = categories[prevIdx];

            // 3. Pick 2 random emotions
            const catEmotions = emotions.filter(e => e.category === prevCat);
            if (catEmotions.length >= 2) {
              const start = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              let end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              while (end.id === start.id) {
                end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              }

              // 4. Generate & Set Path
              const newPath: any = {
                current_state: { emotion: start.name, vac: start.vac },
                goal_state: { emotion: end.name, vac: end.vac },
                waypoints: [
                  {
                    emotion: "Transition",
                    vac: [
                      (start.vac[0] + end.vac[0]) / 2,
                      (start.vac[1] + end.vac[1]) / 2,
                      (start.vac[2] + end.vac[2]) / 2
                    ],
                    reasoning: `Exploring ${prevCat}`
                  }
                ]
              };
              useExperienceStore.getState().setTransitionPath(newPath);

              // Pause when switching
              if (isFlying) useExperienceStore.getState().setIsFlying(false);
            }
          }
          break;
        case "d":
          // Toggle Debug Overlay
          if (!e.ctrlKey && !e.metaKey) {
            setShowDebug((prev) => !prev);
          }
          break;
        case "j":
          // MOCK JOURNEY (Debug/Verification)
          if (!e.ctrlKey && !e.metaKey) {
            // Create a mock path
            const mockPath: any = {
              current_state: { emotion: "Anxiety", vac: [0.8, 0.8, -0.5] },
              goal_state: { emotion: "Serenity", vac: [-0.8, -0.5, 0.8] },
              waypoints: [
                { emotion: "Acceptance", vac: [0.2, 0.2, 0.2], reasoning: "Acknowledging the feeling." },
                { emotion: "Calm", vac: [-0.5, -0.2, 0.5], reasoning: "Finding ground." }
              ]
            };
            useExperienceStore.getState().setTransitionPath(mockPath);
            useExperienceStore.getState().setIsFlying(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [initAudio, isMuted, toggleMute, settings, isFlying, setIsFlying, transitionPath]);

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Pure Soul Sphere Visualization */}
      <Scene />

      {/* VAC Axis Labels (toggle with 'A' key) */}
      <SimpleAxisLabels />

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
      <Header showAuth={false} />

      {/* Debug Overlay - Sync Diagnosis (Toggle with 'D') */}
      {showDebug && (
        <DebugOverlay
          isConnected={isConnected}
          isWaiting={isWaiting}
          targetVAC={targetVAC}
          activeEmotions={activeEmotions}
          debugLog={debugLog}
        />
      )}

      {/* Zen Mode Path Details Overlay (Beautiful UX) */}
      {settings.layers.transitionPaths && <PathDetailsOverlay />}
    </div>
  );
}

// Helper types
interface SyncMessage {
  timestamp: number;
  type: string;
  vac?: number[];
  selectedEmotionIds?: string[];
}

// DebugOverlay Component
function DebugOverlay({
  isConnected,
  isWaiting,
  targetVAC,
  activeEmotions,
  debugLog,
}: {
  isConnected: boolean;
  isWaiting: boolean;
  targetVAC: number[] | null;
  activeEmotions: string[];
  debugLog: SyncMessage[];
}) {
  // Subscribe to currentVAC locally so ONLY this component re-renders
  const currentVAC = useExperienceStore((state) => state.currentVAC);

  return (
    <div className="absolute top-20 left-4 z-50 p-4 bg-gray-900/90 border border-gray-700 text-xs font-mono rounded shadow-xl backdrop-blur max-w-sm">
      <h3 className="text-white font-bold mb-2 border-b border-gray-700 pb-1">Sync Diagnostics</h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
        <div>Status:</div>
        <div className={isConnected ? "text-green-400 font-bold" : "text-red-400"}>
          {isConnected ? "CONNECTED" : "DISCONNECTED"}
        </div>

        <div>Waiting:</div>
        <div className={isWaiting ? "text-yellow-400" : "text-gray-500"}>
          {isWaiting ? "YES" : "NO"}
        </div>

        <div>Emotions:</div>
        <div>{activeEmotions.length} active</div>

        <div>Target VAC:</div>
        <div>
          {targetVAC ? `[${targetVAC.map((v: number) => v.toFixed(2)).join(",")}]` : "None"}
        </div>

        <div>Current VAC:</div>
        <div className="text-cyan-400">
          {currentVAC ? `[${currentVAC.map((v) => v.toFixed(2)).join(",")}]` : "None"}
        </div>

        <div>Origin:</div>
        <div className="text-orange-400">
          {typeof window !== "undefined" ? window.origin : "SSR"}
        </div>
      </div>

      {/* Recent Message Log */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="text-gray-500 mb-1 flex justify-between items-center">
          <span>Recent Messages:</span>
          <span className="text-[10px]">{debugLog.length} events</span>
        </div>
        <div className="max-h-24 overflow-y-auto mb-2 space-y-1">
          {debugLog.length === 0 ? (
            <div className="text-gray-600 italic">No messages received yet</div>
          ) : (
            debugLog.map((log, i) => (
              <div
                key={i}
                className="text-[10px] text-cyan-300/80 border-l-2 border-cyan-500/30 pl-1"
              >
                <span className="text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString().split(" ")[0]}
                </span>
                <span className="mx-1">-</span>
                <span>{log.type}</span>
                {log.vac && (
                  <span className="ml-1 text-white/50">
                    [{log.vac.map((v) => v.toFixed(1)).join(",")}]
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-700">
          <RawStorageMonitor />
        </div>
      </div>
    </div>
  );
}

interface StorageData {
  timestamp: number;
  vac?: number[];
  type?: string;
}

function RawStorageMonitor() {
  const [data, setData] = useState<{ raw: string; parsed: StorageData | null }>({
    raw: "Reading...",
    parsed: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const checkStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem("love-sphere-sync");
      if (!raw) {
        setData({ raw: "NULL", parsed: null });
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        setData({ raw, parsed });
        setError(null);
      } catch {
        setData({ raw, parsed: null });
        setError("Invalid JSON");
      }
    } catch {
      setError("Storage Access Error");
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(checkStorage, 500);
    return () => clearInterval(interval);
  }, [checkStorage]);

  const age = data.parsed ? Math.round((now - data.parsed.timestamp) / 1000) : null;

  return (
    <div className="space-y-2">
      <div className="text-[10px]">
        <span className="text-gray-500">Local Storage:</span>
        {data.parsed ? (
          <div className="text-green-400 mt-1">
            <div>
              VAC:{" "}
              {data.parsed.vac && Array.isArray(data.parsed.vac)
                ? `[${data.parsed.vac.map((v) => v.toFixed(2)).join(",")}]`
                : "No VAC"}
            </div>
            <div>Age: {age !== null ? `${age}s ago` : "Unknown"}</div>
            <div className="text-gray-500 text-[9px] truncate">{data.raw.substring(0, 40)}...</div>
          </div>
        ) : (
          <div className="text-red-400 mt-1 font-bold">{data.raw}</div>
        )}
        {error && (
          <div className="text-red-500 font-bold bg-red-900/20 p-1 rounded mt-1">{error}</div>
        )}
      </div>
      <button
        onClick={checkStorage}
        className="w-full py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-[10px] text-white transition-colors"
      >
        Force Refresh Storage
      </button>
    </div>
  );
}
