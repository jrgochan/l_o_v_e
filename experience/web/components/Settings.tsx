/**
 * Settings Component
 *
 * Main settings modal with all configuration options.
 * Provides a comprehensive UI for user preferences.
 */

"use client";

import { useState } from "react";
import { useSettingsStore, ApiService } from "@/stores/useSettingsStore";

type SettingsTab = "api" | "polling" | "visualization" | "accessibility" | "data" | "about";
type RenderQuality = "low" | "medium" | "high";

export function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("api");
  const [testingApi, setTestingApi] = useState<ApiService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<ApiService, "unknown" | "connected" | "disconnected">
  >({
    observer: "unknown",
    listener: "unknown",
    versor: "unknown",
  });

  // Settings from store
  const settings = useSettingsStore();

  const testConnection = async (service: ApiService) => {
    setTestingApi(service);
    setConnectionStatus((prev) => ({ ...prev, [service]: "unknown" }));

    const results = await settings.testConnection();
    const isConnected = results[service].connected;
    setConnectionStatus((prev) => ({
      ...prev,
      [service]: isConnected ? "connected" : "disconnected",
    }));
    setTestingApi(null);
  };

  const handleExport = () => {
    const json = settings.exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `love-settings-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          const success = settings.importSettings(json);
          if (success) {
            alert("Settings imported successfully!");
          } else {
            alert("Failed to import settings. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Open Settings"
      >
        ⚙️
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">⚙️ Settings</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close Settings"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {[
            { id: "api", label: "API", icon: "🔌" },
            { id: "polling", label: "Polling", icon: "🔄" },
            { id: "visualization", label: "Visual", icon: "🎨" },
            { id: "accessibility", label: "Access", icon: "♿" },
            { id: "data", label: "Data", icon: "💾" },
            { id: "about", label: "About", icon: "ℹ️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-cyan-400 border-b-2 border-cyan-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* API Configuration */}
          {activeTab === "api" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">API Configuration</h3>

              {(["observer", "listener", "versor"] as ApiService[]).map((service) => {
                const urlKey = `${service}ApiUrl` as keyof typeof settings;
                const status = connectionStatus[service];

                return (
                  <div key={service} className="space-y-2">
                    <label className="text-sm text-gray-300 capitalize">{service} API URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={settings[urlKey] as string}
                        onChange={(e) => settings.setApiUrl(service, e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder={`http://localhost:800${service === "observer" ? "0" : service === "versor" ? "1" : "2"}`}
                      />
                      <button
                        onClick={() => testConnection(service)}
                        disabled={testingApi === service}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        {testingApi === service ? "..." : "Test"}
                      </button>
                    </div>
                    {status !== "unknown" && (
                      <div
                        className={`text-xs ${status === "connected" ? "text-green-400" : "text-red-400"}`}
                      >
                        {status === "connected" ? "🟢 Connected" : "🔴 Connection failed"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Polling Settings */}
          {activeTab === "polling" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Real-time Polling</h3>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Enable Polling</label>
                <button
                  onClick={() => settings.setPollingEnabled(!settings.pollingEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.pollingEnabled ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.pollingEnabled ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-gray-300">Polling Interval</label>
                  <span className="text-sm text-white font-mono">
                    {(settings.pollingInterval / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={settings.pollingInterval}
                  onChange={(e) => settings.setPollingInterval(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">User ID</label>
                <input
                  type="text"
                  value={settings.userId}
                  onChange={(e) => settings.setUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="web-user"
                />
              </div>
            </div>
          )}

          {/* Visualization Settings */}
          {activeTab === "visualization" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Visualization Options</h3>

              <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Viewer Experience
                </h4>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Cinematic Overlay</label>
                  <button
                    onClick={() =>
                      settings.updateLayer("cinematicOverlay", !settings.layers.cinematicOverlay)
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.layers.cinematicOverlay ? "bg-cyan-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.layers.cinematicOverlay ? "transform translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Keyboard Shortcuts</label>
                  <button
                    onClick={() =>
                      settings.updateLayer("viewerShortcuts", !settings.layers.viewerShortcuts)
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.layers.viewerShortcuts ? "bg-cyan-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.layers.viewerShortcuts ? "transform translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">VAC Metrics Display</label>
                  <button
                    onClick={() => settings.updateLayer("vacDisplay", !settings.layers.vacDisplay)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.layers.vacDisplay ? "bg-cyan-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.layers.vacDisplay ? "transform translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-700 my-4" />

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Show Transition Path</label>
                <button
                  onClick={() => settings.setShowTransitionPath(!settings.showTransitionPath)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.showTransitionPath ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.showTransitionPath ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-gray-300">Animation Speed</label>
                  <span className="text-sm text-white font-mono">
                    {settings.animationSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.animationSpeed}
                  onChange={(e) => settings.setAnimationSpeed(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Auto-Rotate Camera</label>
                <button
                  onClick={settings.toggleAutoRotate}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.autoRotate ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.autoRotate ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Render Quality</label>
                <select
                  value={settings.renderQuality}
                  onChange={(e) => settings.setRenderQuality(e.target.value as RenderQuality)}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="low">Low (Better Performance)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Better Quality)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-gray-300">Sphere Opacity</label>
                  <span className="text-sm text-white font-mono">
                    {(settings.sphereOpacity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sphereOpacity}
                  onChange={(e) => settings.setSphereOpacity(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Control Soul Sphere transparency (0% = invisible, 100% = opaque)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Show Debug Info</label>
                <button
                  onClick={settings.toggleDebugInfo}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.showDebugInfo ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.showDebugInfo ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Accessibility Settings */}
          {activeTab === "accessibility" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Accessibility</h3>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300">Reduced Motion</label>
                  <p className="text-xs text-gray-500">Disable animations and transitions</p>
                </div>
                <button
                  onClick={() => settings.setReducedMotion(!settings.reducedMotion)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.reducedMotion ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.reducedMotion ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300">High Contrast</label>
                  <p className="text-xs text-gray-500">Enhanced colors for visibility</p>
                </div>
                <button
                  onClick={() => settings.setHighContrast(!settings.highContrast)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.highContrast ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.highContrast ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300">Screen Reader Mode</label>
                  <p className="text-xs text-gray-500">Enhanced ARIA descriptions</p>
                </div>
                <button
                  onClick={settings.toggleScreenReaderMode}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.screenReaderMode ? "bg-cyan-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.screenReaderMode ? "transform translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Data & Privacy */}
          {activeTab === "data" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Data & Privacy</h3>

              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                >
                  📥 Export Settings
                </button>
                <p className="text-xs text-gray-500">Download your settings as JSON</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleImport}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  📤 Import Settings
                </button>
                <p className="text-xs text-gray-500">Load settings from JSON file</p>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <button
                  onClick={() => {
                    if (confirm("Reset all settings to defaults?")) {
                      settings.resetToDefaults();
                    }
                  }}
                  className="w-full px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                >
                  🔄 Reset to Defaults
                </button>
                <p className="text-xs text-gray-500">Restore original settings</p>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <button
                  onClick={() => {
                    if (confirm("Clear all data including journeys? This cannot be undone.")) {
                      settings.clearAllData();
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  🗑️ Clear All Data
                </button>
                <p className="text-xs text-gray-500">Remove all settings and journey history</p>
              </div>
            </div>
          )}

          {/* About */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">About L.O.V.E. Experience</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Version</span>
                  <span className="text-white font-mono">1.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Platform</span>
                  <span className="text-white">Web (Next.js)</span>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="text-sm font-semibold text-white mb-2">API Status</div>
                <div className="space-y-2">
                  {(["observer", "listener", "versor"] as ApiService[]).map((service) => (
                    <div key={service} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{service}</span>
                      <span
                        className={`${
                          connectionStatus[service] === "connected"
                            ? "text-green-400"
                            : connectionStatus[service] === "disconnected"
                              ? "text-red-400"
                              : "text-gray-500"
                        }`}
                      >
                        {connectionStatus[service] === "connected"
                          ? "🟢 Online"
                          : connectionStatus[service] === "disconnected"
                            ? "🔴 Offline"
                            : "⚪ Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 text-xs text-gray-500">
                <p>L.O.V.E. (Listener-Observer-Versor-Experience)</p>
                <p className="mt-2">
                  A multi-modal emotional intelligence platform using the VAC model with quaternion
                  mathematics for 3D visualization.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">Settings are automatically saved</p>
        </div>
      </div>
    </div>
  );
}
