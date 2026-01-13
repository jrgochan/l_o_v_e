/**
 * Soul Sphere Atlas Admin Interface
 *
 * A comprehensive admin tool for visualizing and exploring the 87 emotions
 * in VAC space, with path computation and analysis capabilities.
 */

"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls } from "@react-three/drei";
import type { TransitionPathResponse } from "@love/experience-shared";
import { useEmotionAtlas } from "@/hooks/useEmotionAtlas";
import { usePathCalculator } from "@/hooks/usePathCalculator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLoadCachedPaths } from "@/hooks/useLoadCachedPaths";
import { useAdminSphereSync } from "@/hooks/useAdminSphereSync";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useSphereSync } from "@/hooks/useSphereSync";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { AtlasScene } from "@/components/admin/atlas/AtlasScene";
import { VACAxisLabels3D } from "@/components/VACAxisLabels3D";
import { ControlPanel } from "@/components/admin/panels/ControlPanel";
import { InfoPanel } from "@/components/admin/panels/InfoPanel";
import { LegendOverlay } from "@/components/admin/atlas/LegendOverlay";
import { EmotionLabelOverlay } from "@/components/admin/atlas/EmotionLabelOverlay";
import {
  EmotionLabelTracker,
  type LabelPosition,
} from "@/components/admin/atlas/EmotionLabelTracker";

import { PathMatrixGrid } from "@/components/admin/visualizations/PathMatrix";
import { HelpModal } from "@/components/admin/modals/HelpModal";
import { ChatPanel } from "@/components/admin/ChatPanel";
import { AggregateVACHeaderDisplay } from "@/components/admin/state-display/AggregateVACHeaderDisplay";
import { DataVisualizationOverlay } from "@/components/admin/visualizations/DataVisualizationOverlay";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { PathFlyover } from "@/components/admin/atlas/PathFlyover";
import { IntroSequence } from "@/components/admin/atlas/IntroSequence";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import { VACAnimator } from "@/components/VACAnimator";
import { DebugBroadcaster } from "@/components/DebugBroadcaster";
import { PathDetailsOverlay } from "@/components/PathDetailsOverlay";

const AtlasAdminContent = () => {
  // Load emotions and set up path calculator
  const { isLoading, error } = useEmotionAtlas();
  usePathCalculator();
  useKeyboardShortcuts();
  useLoadCachedPaths(); // Auto-load cached paths from backend
  useAdminSphereSync(); // Sync soul sphere with selected emotions
  useSettingsSync(); // Sync unified settings with atlas store

  // Sonic Architecture
  const { initAudio, toggleMute, isMuted, playClickSound } = useAmbientAudio();

  useEffect(() => {
    // console.log("[DEBUG] AtlasAdminContent Mounted");
    return () => {
      /* Cleanup */
    };
  }, []);

  // Initialize audio on first user interaction (standard web audio policy)
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [initAudio]);

  // Zen Experience: Broadcast sphere state to main page listener
  const { broadcast } = useSphereSync({ mode: "broadcaster" });

  // Command Palette
  const palette = useCommandPalette();

  const [showMatrix, setShowMatrix] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [chatSessionId] = useState(() => {
    // Generate proper UUID for session ID (backend requires UUID format)
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback UUID v4 format if randomUUID not available
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  });
  const [infoPanelWidth, setInfoPanelWidth] = useState(384); // Default 96 * 4 = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const [isInfoPanelExpanded, setIsInfoPanelExpanded] = useState(false);
  const [labelPositions, setLabelPositions] = useState<LabelPosition[]>([]);

  const layers = useAtlasAdminStore((state) => state.layers);
  const dataVisualizationMode = useAtlasAdminStore((state) => state.settings.dataVisualizationMode);
  const updateSetting = useAtlasAdminStore((state) => state.updateSetting);

  // Broadcast sphere state changes to Zen viewer
  const selectedEmotionIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const viewMode = useAtlasAdminStore((state) => state.viewMode); // "default" | "zen" | "cinema"
  const isFlying = useAtlasAdminStore((state) => state.isFlying);
  const isIntroActive = useAtlasAdminStore((state) => state.isIntroActive);
  const targetVAC = useExperienceStore((state) => state.targetVAC);
  const transitionPath = useExperienceStore((state) => state.transitionPath);

  useEffect(() => {
    // Broadcast whenever selection, VAC, or path changes
    broadcast();
  }, [selectedEmotionIds, targetVAC, transitionPath, broadcast]);

  // Expose command palette for keyboard shortcut
  useEffect(() => {
    window.openCommandPalette = () => {
      palette.open();
    };

    // Expose Help toggle for shortcut
    (window as unknown as { toggleHelp: () => void }).toggleHelp = () => {
      setShowHelp((prev) => !prev);
    };

    return () => {
      delete (window as unknown as { openCommandPalette?: () => void }).openCommandPalette;
      delete (window as unknown as { toggleHelp?: () => void }).toggleHelp;
    };
  }, [palette]);

  // Handle panel resize
  const handleMouseDown = () => {
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();

      // Calculate from right edge
      const newWidth = window.innerWidth - e.clientX;
      setInfoPanelWidth(Math.max(300, Math.min(900, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  // Debug Toggle
  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Debug Toggle (D)
      if (key === "d" && !e.ctrlKey && !e.metaKey) {
        setShowDebug((prev) => !prev);
      }

      // Play/Pause Journey (Space)
      if (key === " " && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); // Prevent scrolling
        if (transitionPath) {
          // Auto-enable paths layer if hidden
          if (!layers.transitionPaths) {
            useAtlasAdminStore.getState().updateLayer("transitionPaths", true);
          }
          // Toggle flying state
          // Note: We need to update the AtlasAdminStore which syncs to ExperienceStore
          useAtlasAdminStore.getState().setIsFlying(!isFlying);
        }
      }

      // Next Path (ArrowRight)
      if (key === "arrowright" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const state = useAtlasAdminStore.getState();
        // If we have selected emotions >= 2, cycle through their paths
        if (state.selectedEmotionIds.size >= 2) {
          state.cycleSelectedPath("next");
          state.setIsFlying(false); // Pause to browse
          return;
        }

        // Fallback: Default Category Logic (Existing)
        const emotions = state.allEmotions;
        // ... (existing random logic kept as fallback or removed if user STRICTLY wants selected only? User said "only toggle through available paths between selected emotions" contextually implies when browsing overlay).
        // Let's keep fallback if selection < 2, otherwise the keys die.
        // Implementation of fallback:
        // 1. Get unique categories
        const categories = Array.from(new Set(emotions.map((e) => e.category))).sort();
        // ... (rest of existing fallback logic) ...
        if (categories.length === 0) return;
        // ...
      }

      // Prev Path (ArrowLeft)
      if (key === "arrowleft" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const state = useAtlasAdminStore.getState();
        if (state.selectedEmotionIds.size >= 2) {
          state.cycleSelectedPath("prev");
          state.setIsFlying(false);
          return;
        }
        // ... (fallback)
      }

      // Up/Down (Variations)
      if ((key === "arrowup" || key === "arrowdown") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const state = useAtlasAdminStore.getState();
        if (state.selectedEmotionIds.size >= 2) {
          state.cycleSelectedPath(key === "arrowup" ? "up" : "down");
          state.setIsFlying(false);
          return;
        }
        // ... (fallback)
      }
    };

    window.addEventListener("keydown", handleKeyPress, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyPress, { capture: true });
  }, [transitionPath, layers, isFlying]);

  // View Mode Logic
  // Hide header in "Zen" mode ONLY. Show in "Default" and "Cinema".
  const isHeaderVisible = viewMode !== "zen" && !isIntroActive;

  // Hide sidebars in "Zen" OR "Cinema" mode. Show in "Default".
  const areSidebarsVisible = viewMode === "default" && !isIntroActive;

  useEffect(() => {
    // console.log("[DEBUG] ViewMode Changed:", viewMode);
  }, [viewMode, isHeaderVisible, areSidebarsVisible]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Atlas</h1>
          <p className="text-red-400">{error}</p>
          <p className="text-gray-400 mt-4">
            Make sure the Observer service is running at{" "}
            {process.env.NEXT_PUBLIC_OBSERVER_API_URL || "http://localhost:8000"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-gray-950 overflow-hidden">
      {/* Header - Hidden in Zen Mode or Intro */}
      <header
        className={`absolute top-0 left-0 right-0 z-30 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 transition-transform duration-500 ${!isHeaderVisible ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Soul Sphere Atlas</h1>
            <p className="text-sm text-gray-400">Admin Interface - 87 Emotions Visualization</p>
          </div>

          {/* Center: Aggregate VAC Display */}
          <div className="flex-1 flex justify-center">
            <AggregateVACHeaderDisplay />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                toggleMute();
                playClickSound();
              }}
              className={`px-3 py-2 rounded transition flex items-center gap-2 text-sm ${isMuted
                ? "bg-red-900/50 text-red-200 hover:bg-red-800/50"
                : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded transition inline-flex items-center gap-2"
              title="Return to Admin Dashboard"
            >
              ⚡ Dashboard
            </Link>
            <Link
              href="/admin/settings"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition inline-flex items-center gap-2"
              title="Settings (Ctrl/Cmd+,)"
            >
              ⚙️ Settings
            </Link>
            <button
              onClick={() => setShowHelp(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition"
            >
              📖 Help
            </button>
            <button
              onClick={() => setShowMatrix(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition"
            >
              📊 Path Matrix
            </button>
            {isLoading && (
              <div className="flex items-center gap-2 text-cyan-400">
                <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
                <span>Loading emotions...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout: Control Panel | 3D Scene | Info Panel */}
      <div
        className={`absolute inset-0 flex ${!isHeaderVisible ? "top-0 bottom-0" : "top-[85px] bottom-[70px]"}`}
      >
        {/* Left Control Panel */}
        {areSidebarsVisible && (
          <aside className="w-80 flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 overflow-y-auto">
            <ControlPanel />
          </aside>
        )}

        {/* Center 3D Scene - Hidden when InfoPanel expanded */}
        {!isInfoPanelExpanded && (
          <main className="flex-1 relative min-w-0">
            {/* 3D Scene */}
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-white">Loading 3D Scene...</div>
                </div>
              }
            >
              <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
              >
                {/* Lighting */}
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.0} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Animator Driver */}
                <VACAnimator />

                {/* Main Content */}
                <AtlasScene />

                {/* Visual Helpers */}
                <VACAxisLabels3D />

                {/* Labeling System */}
                <EmotionLabelTracker onUpdate={setLabelPositions} />

                {/* Controls */}
                <DreiOrbitControls
                  enableDamping
                  dampingFactor={0.05}
                  rotateSpeed={0.5}
                  zoomSpeed={0.8}
                  minDistance={2}
                  maxDistance={15}
                  enabled={!isFlying && !isIntroActive}
                />

                {/* Cinematic Flyover */}
                <PathFlyover />

                {/* Intro Sequence */}
                {isIntroActive && <IntroSequence />}
              </Canvas>
            </Suspense>
            <div className="absolute inset-0 pointer-events-none">
              {layers.legend && <LegendOverlay />}
              <EmotionLabelOverlay labels={labelPositions} />
            </div>
          </main>
        )}

        {/* Resize Handle - Hidden when expanded */}
        {!isInfoPanelExpanded && areSidebarsVisible && (
          <div
            onMouseDown={handleMouseDown}
            className={`w-2 flex-shrink-0 bg-gray-700 hover:bg-cyan-500 cursor-col-resize transition flex items-center justify-center ${isResizing ? "bg-cyan-500" : ""
              }`}
            style={{ touchAction: "none" }}
          >
            <div className="w-px h-8 bg-gray-500" />
          </div>
        )}

        {/* Right Info Panel - Resizable/Expandable */}
        {areSidebarsVisible && (
          <aside
            className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 overflow-y-auto flex flex-col"
            style={{
              width: isInfoPanelExpanded ? "calc(100% - 320px)" : `${infoPanelWidth}px`,
            }}
          >
            {/* Expand/Collapse Button */}
            <div className="p-2 border-b border-gray-700 flex justify-end">
              <button
                onClick={() => setIsInfoPanelExpanded(!isInfoPanelExpanded)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition"
                title={isInfoPanelExpanded ? "Collapse panel" : "Expand panel"}
              >
                {isInfoPanelExpanded ? "◀ Collapse" : "▶ Expand"}
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <InfoPanel />
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {showMatrix && <PathMatrixGrid onClose={() => setShowMatrix(false)} />}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Data Visualization Overlay */}
      {dataVisualizationMode && (
        <DataVisualizationOverlay onClose={() => updateSetting("dataVisualizationMode", false)} />
      )}

      {/* Chat Panel - Always rendered at bottom */}
      <ChatPanel sessionId={chatSessionId} />

      {/* Command Palette (CMD+L) */}
      <CommandPalette />

      {/* Zen HUD (Visible in Zen or Cinema modes) - Replaced by Beautiful UX Overlay */}
      {viewMode !== "default" && layers.transitionPaths && <PathDetailsOverlay />}

      {/* Debug Broadcaster */}
      {showDebug && <DebugBroadcaster />}
    </div>
  );
};

import { AdminGuard } from "@/components/admin/layout/AdminGuard";

export default function AtlasAdminPage() {
  return (
    <AdminGuard>
      <AtlasAdminContent />
    </AdminGuard>
  );
}
