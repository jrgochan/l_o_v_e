"use client";

import Link from "next/link";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { AggregateVACHeaderDisplay } from "@/components/admin/state-display/AggregateVACHeaderDisplay";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface VisualizationHeaderProps {
  isHeaderVisible: boolean;
  isLoading: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  playClickSound: () => void;
  setShowHelp: (show: boolean) => void;
  showMatrix: boolean;
  setShowMatrix: (show: boolean) => void;
  showStrategyLibrary: boolean;
  setShowStrategyLibrary: (show: boolean) => void;
  dataVisualizationMode: boolean;
  toggleDataVisualizationMode: () => void;
}

export function VisualizationHeader({
  isHeaderVisible,
  isLoading,
  isMuted,
  toggleMute,
  playClickSound,
  setShowHelp,
  showMatrix,
  setShowMatrix,
  showStrategyLibrary,
  setShowStrategyLibrary,
  dataVisualizationMode,
  toggleDataVisualizationMode,
}: VisualizationHeaderProps) {
  const theme = useAdminTheme();

  // Use settings store directly for auto-rotate
  const autoRotate = useSettingsStore((state) => state.autoRotate);
  const updateSetting = useSettingsStore((state) => state.updateVisualSetting);

  return (
    <header
      className={`absolute top-0 left-0 right-0 z-30 transition-all duration-500 border-b flex items-center justify-between px-6 py-4 ${theme.colors.background} ${theme.effects.backdropBlur} ${theme.colors.border} ${!isHeaderVisible ? "-translate-y-full" : "translate-y-0"}`}
      style={{
        fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined,
      }}
    >
      <div>
        <h1 className={`text-2xl font-bold ${theme.colors.text.primary}`}>Soul Sphere</h1>
        <p className={`text-sm ${theme.colors.text.secondary}`}>
          Admin Interface - Emotion Visualization
        </p>
      </div>

      {/* Center: Aggregate VAC Display */}
      <div className="flex-1 flex justify-center mx-4">
        <AggregateVACHeaderDisplay />
      </div>

      {/* Right Controls Container */}
      <div className="flex items-center gap-6">
        {/* Data Tools Group */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className={`px-3 py-2 ${theme.layout.borderRadius} transition-all duration-300 flex items-center gap-2 text-sm border ${
              showMatrix
                ? `${theme.colors.primary} bg-amber-900/30 border-amber-800 text-amber-200`
                : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`
            }`}
            title={showMatrix ? "Close Path Matrix" : "Open Path Matrix"}
          >
            {showMatrix ? "📊 Matrix (Active)" : "📊 Matrix"}
          </button>
          <button
            onClick={() => setShowStrategyLibrary(!showStrategyLibrary)}
            className={`px-3 py-2 ${theme.layout.borderRadius} transition-all duration-300 flex items-center gap-2 text-sm border ${
              showStrategyLibrary
                ? `${theme.colors.primary} bg-teal-900/30 border-teal-800 text-teal-200`
                : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`
            }`}
            title={showStrategyLibrary ? "Close Strategy Library" : "Browse Strategy Library"}
          >
            {showStrategyLibrary ? "📚 Library (Active)" : "📚 Library"}
          </button>
        </div>

        {/* Divider */}
        <div className={`w-px h-6 ${theme.colors.border}`} />

        {/* Scene Controls Group */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDataVisualizationMode}
            className={`px-3 py-2 ${theme.layout.borderRadius} transition-all duration-300 flex items-center gap-2 text-sm border ${
              dataVisualizationMode
                ? `${theme.colors.primary} bg-purple-900/30 border-purple-800 text-purple-200`
                : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`
            }`}
            title={dataVisualizationMode ? "Close Data Sense Mode (x)" : "Open Data Sense Mode (x)"}
          >
            {dataVisualizationMode ? "🌌 Data Sense" : "💠 Data Sense"}
          </button>

          <button
            onClick={() => updateSetting("autoRotate", !autoRotate)}
            className={`px-3 py-2 ${theme.layout.borderRadius} transition-all duration-300 flex items-center gap-2 text-sm border ${
              autoRotate
                ? `${theme.colors.primary} bg-cyan-900/30 border-cyan-800 text-cyan-200`
                : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`
            }`}
            title={autoRotate ? "Pause Auto-Rotate" : "Start Auto-Rotate"}
          >
            {autoRotate ? "🔄 Spinning" : "⏸️ Paused"}
          </button>

          <button
            onClick={() => {
              toggleMute();
              playClickSound();
            }}
            className={`px-3 py-2 ${theme.layout.borderRadius} transition-all duration-300 flex items-center gap-2 text-sm border ${
              isMuted
                ? `bg-red-900/50 border-red-800 text-red-200 hover:bg-red-800/50`
                : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`
            }`}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>

        {/* Divider */}
        <div className={`w-px h-6 ${theme.colors.border}`} />

        {/* System & Global Nav Dropdown */}
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button
            className={`px-4 py-2 text-sm transition-all duration-300 inline-flex items-center gap-2 ${theme.layout.borderRadius} ${theme.colors.primary} ${theme.effects.glass} hover:brightness-110 shadow-lg`}
          >
            ⚡ Admin Hub
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className={`absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-700/50 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${theme.colors.background} ${theme.colors.border} border`}
            >
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/admin/clinical"
                      className={`${
                        active ? "bg-white/10" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm ${theme.colors.text.primary}`}
                    >
                      <span className="mr-2">🩺</span> Clinical Portal
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/admin/sessions"
                      className={`${
                        active ? "bg-white/10" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm ${theme.colors.text.primary}`}
                    >
                      <span className="mr-2">💬</span> Manage Sessions
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/admin/data"
                      className={`${
                        active ? "bg-white/10" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm ${theme.colors.text.primary}`}
                    >
                      <span className="mr-2">💾</span> Data Management
                    </Link>
                  )}
                </Menu.Item>
              </div>
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowHelp(true)}
                      className={`${
                        active ? "bg-white/10" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm ${theme.colors.text.primary}`}
                    >
                      <span className="mr-2">📖</span> Help Document
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/admin/settings"
                      className={`${
                        active ? "bg-white/10" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm ${theme.colors.text.primary}`}
                    >
                      <span className="mr-2">⚙️</span> Settings
                    </Link>
                  )}
                </Menu.Item>
              </div>
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/admin/users"
                      className={`${
                        active ? "bg-white/10" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm ${theme.colors.text.primary}`}
                    >
                      <span className="mr-2">🏠</span> Return to Dashboard
                    </Link>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {isLoading && (
          <div className="flex items-center gap-2 text-cyan-400 absolute right-6 -bottom-8">
            <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <span className="text-xs font-medium">Loading...</span>
          </div>
        )}
      </div>
    </header>
  );
}
