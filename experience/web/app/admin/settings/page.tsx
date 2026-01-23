/**
 * Settings Page
 *
 * Unified settings management interface for the L.O.V.E. platform.
 * Centralizes all user preferences with localStorage persistence.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { VisualSettings } from "@/components/admin/settings/VisualSettings";
import { BehaviorSettings } from "@/components/admin/settings/BehaviorSettings";
import { NetworkSettings } from "@/components/admin/settings/NetworkSettings";
import { ChatSettings } from "@/components/admin/settings/ChatSettings";
import { AccessibilitySettings } from "@/components/admin/settings/AccessibilitySettings";
import { AIModelsSettings } from "@/components/admin/settings/AIModelsSettings";
import { DevelopmentSettings } from "@/components/admin/settings/DevelopmentSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { SETTINGS_PRESETS } from "@/utils/settingsPresets";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CollectionSwitcher } from "@/components/admin/data/CollectionSwitcher";

type SettingsTab =
  | "dataset"
  | "visual"
  | "behavior"
  | "network"
  | "chat"
  | "accessibility"
  | "ai-models"
  | "development";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("dataset");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);
  const exportSettings = useSettingsStore((state) => state.exportSettings);
  const importSettings = useSettingsStore((state) => state.importSettings);

  // Enable keyboard shortcuts globally (including on this page)
  useKeyboardShortcuts();

  // Show notification temporarily
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle export
  const handleExport = () => {
    try {
      const json = exportSettings();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `love-settings-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification("success", "Settings exported successfully!");
    } catch {
      showNotification("error", "Failed to export settings");
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const json = exportSettings();
      await navigator.clipboard.writeText(json);
      showNotification("success", "Settings copied to clipboard!");
    } catch {
      showNotification("error", "Failed to copy to clipboard");
    }
  };

  // Handle import
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = importSettings(text);
        if (success) {
          showNotification("success", "Settings imported successfully!");
        } else {
          showNotification("error", "Invalid settings file");
        }
      } catch {
        showNotification("error", "Failed to import settings");
      }
    };
    input.click();
  };

  // Handle reset
  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
    showNotification("success", "Settings reset to defaults");
  };

  // Handle preset load
  const handleLoadPreset = (presetSettings: string) => {
    const success = importSettings(presetSettings);
    if (success) {
      setShowPresets(false);
      showNotification("success", "Preset loaded successfully!");
    } else {
      showNotification("error", "Failed to load preset");
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: "dataset", label: "Dataset", icon: "📚" },
    { id: "visual", label: "Visual", icon: "🎨" },
    { id: "behavior", label: "Behavior", icon: "⚙️" },
    { id: "network", label: "Network", icon: "🌐" },
    { id: "chat", label: "Chat", icon: "💬" },
    { id: "accessibility", label: "Accessibility", icon: "♿" },
    { id: "ai-models", label: "AI Models", icon: "🤖" },
    { id: "development", label: "Development", icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/visualization"
                className="text-gray-400 hover:text-white transition"
              >
                ← Back to Atlas
              </Link>
              <div className="h-6 w-px bg-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-gray-400">Manage your L.O.V.E. platform preferences</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPresets(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition"
                title="Load preset configurations"
              >
                ⚙️ Presets
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition"
                title="Copy settings JSON to clipboard"
              >
                📋 Copy
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition"
                title="Download settings as JSON file"
              >
                📥 Export
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition"
                title="Import settings from JSON file"
              >
                📤 Import
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition"
                title="Reset all settings to defaults"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? "text-white border-cyan-500 bg-gray-900/50"
                  : "text-gray-400 border-transparent hover:text-gray-300 hover:bg-gray-900/30"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-900 rounded-lg p-6">
          {activeTab === "dataset" && <CollectionSwitcher />}
          {activeTab === "visual" && <VisualSettings />}
          {activeTab === "behavior" && <BehaviorSettings />}
          {activeTab === "network" && <NetworkSettings />}
          {activeTab === "chat" && <ChatSettings />}
          {activeTab === "accessibility" && <AccessibilitySettings />}
          {activeTab === "ai-models" && <AIModelsSettings />}
          {activeTab === "development" && <DevelopmentSettings />}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">
            💡 Settings are automatically saved
          </h3>
          <p className="text-sm text-gray-300">
            Your preferences are stored locally in your browser and will persist across sessions.
            Use Export/Import to share configurations or backup your settings.
          </p>
        </div>
      </div>

      {/* Presets Modal */}
      {showPresets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-purple-500/50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Load Settings Preset</h2>
              <button
                onClick={() => setShowPresets(false)}
                className="text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-300 mb-6 text-sm">
              Choose a pre-configured settings profile optimized for different use cases.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SETTINGS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset.settings)}
                  className="text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-purple-500 transition group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{preset.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition">
                        {preset.name}
                      </h3>
                      <p className="text-sm text-gray-400">{preset.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm text-yellow-200">
                ⚠️ Loading a preset will replace your current settings. Consider exporting your
                current settings first.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md border border-red-500/50">
            <h2 className="text-xl font-bold text-white mb-3">Reset to Defaults?</h2>
            <p className="text-gray-300 mb-6">
              This will reset <strong>all</strong> settings to their default values. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition"
              >
                Reset All Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-6 py-3 rounded-lg border shadow-lg ${
              notification.type === "success"
                ? "bg-green-900/90 border-green-500 text-green-100"
                : "bg-red-900/90 border-red-500 text-red-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{notification.type === "success" ? "✅" : "❌"}</span>
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
