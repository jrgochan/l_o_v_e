/**
 * Settings Component
 *
 * Main settings modal with all configuration options.
 * Provides a comprehensive UI for user preferences.
 */

"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle, Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useSettingsStore, ApiService } from "@/stores/useSettingsStore";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { X, Globe, Activity, Eye, Accessibility, Database, Info } from "lucide-react";

type ApiStatus = "unknown" | "connected" | "disconnected";
type RenderQuality = "low" | "medium" | "high";

export function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [testingApi, setTestingApi] = useState<ApiService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<ApiService, ApiStatus>
  >({
    observer: "unknown",
    listener: "unknown",
    versor: "unknown",
  });

  // Settings from store
  const settings = useSettingsStore();
  const visualization = useVisualizationStore();

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

  const tabs = [
    { id: "api", label: "API", icon: Globe },
    { id: "polling", label: "Polling", icon: Activity },
    { id: "visualization", label: "Visual", icon: Eye },
    { id: "accessibility", label: "Access", icon: Accessibility },
    { id: "data", label: "Data", icon: Database },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full h-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        aria-label="Open Settings"
      >
        <span className="text-xl">⚙️</span>
      </button>

      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={() => setIsOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900/90 border border-white/10 shadow-2xl backdrop-blur-xl transition-all text-left align-middle flex flex-col h-[80vh]">
                  {/* Header */}
                  <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
                    <DialogTitle as="h3" className="text-2xl font-light text-white tracking-wide">
                      Settings
                    </DialogTitle>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <TabGroup className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Unified Tabs */}
                    <TabList className="flex md:flex-col overflow-x-auto md:overflow-visible w-full md:w-64 shrink-0 bg-black/20 border-b md:border-b-0 md:border-r border-white/10 p-2 md:p-4 gap-2 md:gap-y-2 min-w-max md:min-w-0 custom-scrollbar">
                      {tabs.map((tab) => (
                        <Tab
                          key={tab.id}
                          data-testid={`tab-${tab.id}`}
                          className={({ selected }) =>
                            `flex items-center gap-2 md:gap-3 px-4 py-2 md:py-3 text-xs md:text-sm font-medium rounded-lg md:rounded-xl transition-all duration-200 outline-none whitespace-nowrap md:whitespace-normal ${
                              selected
                                ? "bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.1)] border border-cyan-500/30"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                            }`
                          }
                        >
                          <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                          {tab.label}
                        </Tab>
                      ))}
                    </TabList>

                    {/* Content */}
                    <TabPanels className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-900/50 to-black/50">

                      {/* API Configuration */}
                      <TabPanel data-testid="panel-api" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                        <div>
                          <h3 className="text-xl font-medium text-white mb-2">API Configuration</h3>
                          <p className="text-sm text-gray-400 mb-6">Manage connections to L.O.V.E. microservices.</p>

                          <div className="space-y-6">
                            {(["observer", "listener", "versor"] as ApiService[]).map((service) => {

                              const status = connectionStatus[service];

                              return (
                                <div key={service} className="bg-white/5 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                                  <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-medium text-cyan-100 capitalize flex items-center gap-2">
                                      {service === "observer" && "🧠"}
                                      {service === "listener" && "👂"}
                                      {service === "versor" && "👁️"}
                                      {service} API
                                    </label>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      status === "connected" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                      status === "disconnected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                      "bg-gray-700/50 text-gray-400 border-gray-600/30"
                                    }`}>
                                      {status === "connected" ? "Connected" : status === "disconnected" ? "Disconnected" : "Unknown"}
                                    </span>
                                  </div>
                                  <div className="flex gap-3">
                                    <input
                                      type="url"
                                      value={settings.network.endpoints[service]}
                                      onChange={(e) => settings.setApiUrl(service, e.target.value)}
                                      className="flex-1 px-4 py-2.5 bg-black/40 text-white border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm font-mono placeholder-gray-600"
                                      placeholder={`http://localhost:800${service === "observer" ? "0" : service === "versor" ? "1" : "2"}`}
                                    />
                                      <button
                                        data-testid={`btn-test-${service}`}
                                        onClick={() => testConnection(service)}
                                        disabled={testingApi === service}
                                        className="px-5 py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/30 rounded-lg transition-all text-sm font-medium disabled:opacity-50 min-w-[80px]"
                                      >
                                        {testingApi === service ? "..." : "Test"}
                                      </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TabPanel>

                      {/* Polling Settings */}
                      <TabPanel data-testid="panel-polling" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                        <div>
                           <h3 className="text-xl font-medium text-white mb-2">Real-time Polling</h3>
                           <p className="text-sm text-gray-400 mb-6">Configure how frequently the application fetches updates.</p>

                           <div className="bg-white/5 border border-white/5 rounded-xl p-6 space-y-6">
                             <div className="flex items-center justify-between">
                                <div>
                                  <label className="text-base text-white font-medium">Enable Polling</label>
                                  <p className="text-xs text-gray-400 mt-1">Automatically fetch new data</p>
                                </div>
                                <button
                                  data-testid="btn-polling-toggle"
                                  onClick={() => settings.setPollingEnabled(!settings.pollingEnabled)}
                                  className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                                    settings.pollingEnabled ? "bg-cyan-600 shadow-inner" : "bg-gray-700"
                                  }`}
                                >
                                  <div
                                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                                      settings.pollingEnabled ? "transform translate-x-6" : ""
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="border-t border-white/5 pt-6 space-y-4">
                                <div className="flex justify-between items-center">
                                  <label className="text-sm text-gray-300">Polling Interval</label>
                                  <span className="text-xs px-2 py-1 rounded bg-black/40 text-cyan-400 font-mono border border-white/10">
                                    {(settings.pollingInterval / 1000).toFixed(1)}s
                                  </span>
                                </div>
                                <input
                                  data-testid="slider-polling-interval"
                                  type="range"
                                  min="1000"
                                  max="30000"
                                  step="1000"
                                  value={settings.pollingInterval}
                                  onChange={(e) => settings.setPollingInterval(Number(e.target.value))}
                                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 font-mono">
                                  <span>1s</span>
                                  <span>30s</span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm text-gray-300">User ID Identifier</label>
                                <input
                                  data-testid="input-userid"
                                  type="text"
                                  value={settings.userId}
                                  onChange={(e) => settings.setUserId(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-black/40 text-white border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
                                  placeholder="web-user"
                                />
                              </div>
                           </div>
                        </div>
                      </TabPanel>

                      {/* Visualization Settings */}
                      <TabPanel data-testid="panel-visual" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                         <div>
                           <h3 className="text-xl font-medium text-white mb-2">Visualization</h3>
                           <p className="text-sm text-gray-400 mb-6">Customize the 3D emotive rendering experience.</p>

                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             {/* Toggles */}
                             <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-5">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">View Layers</h4>

                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-200">Cinematic Overlay</span>
                                  <button
                                    data-testid="btn-toggle-cinematic"
                                    onClick={() => settings.updateLayer("cinematicOverlay", !settings.layers.cinematicOverlay)}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${settings.layers.cinematicOverlay ? "bg-cyan-600" : "bg-gray-700"}`}
                                  >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.layers.cinematicOverlay ? "translate-x-4" : ""}`} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-200">Keyboard Shortcuts</span>
                                  <button
                                    data-testid="btn-toggle-shortcuts"
                                    onClick={() => settings.updateLayer("viewerShortcuts", !settings.layers.viewerShortcuts)}
                                     className={`w-10 h-6 rounded-full transition-colors relative ${settings.layers.viewerShortcuts ? "bg-cyan-600" : "bg-gray-700"}`}
                                  >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.layers.viewerShortcuts ? "translate-x-4" : ""}`} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-200">VAC Metrics</span>
                                   <button
                                    data-testid="btn-toggle-vac"
                                    onClick={() => settings.updateLayer("vacDisplay", !settings.layers.vacDisplay)}
                                     className={`w-10 h-6 rounded-full transition-colors relative ${settings.layers.vacDisplay ? "bg-cyan-600" : "bg-gray-700"}`}
                                  >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.layers.vacDisplay ? "translate-x-4" : ""}`} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-200">Transition Paths</span>
                                   <button
                                    data-testid="btn-toggle-paths"
                                    onClick={() => settings.setShowTransitionPath(!settings.showTransitionPath)}
                                     className={`w-10 h-6 rounded-full transition-colors relative ${settings.showTransitionPath ? "bg-cyan-600" : "bg-gray-700"}`}
                                  >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showTransitionPath ? "translate-x-4" : ""}`} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-200">Auto-Rotate</span>
                                   <button
                                    data-testid="btn-toggle-rotate"
                                    onClick={settings.toggleAutoRotate}
                                     className={`w-10 h-6 rounded-full transition-colors relative ${settings.autoRotate ? "bg-cyan-600" : "bg-gray-700"}`}
                                  >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoRotate ? "translate-x-4" : ""}`} />
                                  </button>
                                </div>
                                 <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-200">Debug Info</span>
                                   <button
                                    data-testid="btn-toggle-debug"
                                    onClick={settings.toggleDebugInfo}
                                     className={`w-10 h-6 rounded-full transition-colors relative ${settings.showDebugInfo ? "bg-cyan-600" : "bg-gray-700"}`}
                                  >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showDebugInfo ? "translate-x-4" : ""}`} />
                                  </button>
                                </div>
                             </div>

                             {/* Sliders & Selects */}
                              <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-6">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Performance & Rendering</h4>

                                 <div className="space-y-3">
                                  <div className="flex justify-between items-center text-sm">
                                    <label className="text-gray-300">Animation Speed</label>
                                    <span className="text-cyan-400 font-mono">{settings.animationSpeed.toFixed(1)}x</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={settings.animationSpeed}
                                    onChange={(e) => settings.setAnimationSpeed(Number(e.target.value))}
                                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                  />
                                </div>

                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                      <label className="text-gray-300">Sphere Transparency</label>
                                      <span className="text-cyan-400 font-mono">{((1 - settings.sphereOpacity) * 100).toFixed(0)}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.05"
                                      value={1 - settings.sphereOpacity}
                                      onChange={(e) => settings.setSphereOpacity(1 - Number(e.target.value))}
                                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                  </div>

                                <div className="space-y-2 pt-2">
                                  <label className="text-sm text-gray-300">Render Quality</label>
                                  <div className="relative">
                                    <select
                                      value={settings.renderQuality}
                                      onChange={(e) => settings.setRenderQuality(e.target.value as RenderQuality)}
                                      className="w-full px-4 py-2.5 bg-black/40 text-white border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none text-sm"
                                    >
                                      <option value="low">Low (Max FPS)</option>
                                      <option value="medium">Medium (Balanced)</option>
                                      <option value="high">High (Max Quality)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                           </div>
                         </div>
                      </TabPanel>

                      {/* Accessibility Settings */}
                      <TabPanel data-testid="panel-access" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                        <div>
                          <h3 className="text-xl font-medium text-white mb-2">Accessibility</h3>
                          <p className="text-sm text-gray-400 mb-6">Make L.O.V.E. experience adapt to your needs.</p>

                          <div className="grid gap-4">
                            {[
                              {
                                id: "reduced-motion",
                                label: "Reduced Motion",
                                desc: "Minimize animations and transitions",
                                value: settings.reducedMotion,
                                toggle: () => settings.setReducedMotion(!settings.reducedMotion)
                              },
                              {
                                id: "high-contrast",
                                label: "High Contrast",
                                desc: "Increase contrast for better visibility",
                                value: settings.highContrast,
                                toggle: () => settings.setHighContrast(!settings.highContrast)
                              },
                              {
                                id: "screen-reader",
                                label: "Screen Reader Mode",
                                desc: "Enhanced ARIA labels and descriptions",
                                value: settings.screenReaderMode,
                                toggle: settings.toggleScreenReaderMode
                              }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                                <div>
                                  <div className="font-medium text-white">{item.label}</div>
                                  <div className="text-xs text-gray-400">{item.desc}</div>
                                </div>
                                <button
                                  data-testid={`btn-toggle-${item.id}`}
                                  onClick={item.toggle}
                                  className={`w-12 h-7 rounded-full transition-colors relative ${item.value ? "bg-cyan-600" : "bg-gray-700"}`}
                                >
                                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${item.value ? "translate-x-5" : ""}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabPanel>

                       {/* Data & Privacy */}
                      <TabPanel data-testid="panel-data" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                        <div>
                          <h3 className="text-xl font-medium text-white mb-2">Data Management</h3>
                          <p className="text-sm text-gray-400 mb-6">Manage your local settings and datasets.</p>

                          <div className="space-y-6">
                            {/* Data Source Selection */}
                            <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                               <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">Active Collection</h4>
                               <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                  {visualization.collections.length === 0 ? (
                                    <div className="text-sm text-gray-500 italic p-4 text-center border border-dashed border-gray-700 rounded-lg">No collections loaded</div>
                                  ) : (
                                    visualization.collections.map((collection) => (
                                      <div
                                        key={collection.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                          visualization.activeCollectionId === collection.id
                                            ? "bg-cyan-900/30 border-cyan-500/50 shadow-sm"
                                            : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5"
                                        }`}
                                        onClick={() => {
                                          if (visualization.activeCollectionId !== collection.id) {
                                            visualization.setActiveCollection(collection.id);
                                          }
                                        }}
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium text-white text-sm">{collection.name}</span>
                                          {visualization.activeCollectionId === collection.id && (
                                            <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded-full border border-cyan-500/20">Active</span>
                                          )}
                                        </div>
                                        {collection.description && (
                                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{collection.description}</p>
                                        )}
                                      </div>
                                    ))
                                  )}
                               </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button data-testid="btn-export" onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all group">
                                <span className="text-2xl mb-2 group-hover:-translate-y-1 transition-transform">📥</span>
                                <span className="font-medium text-white text-sm">Export Settings</span>
                                <span className="text-xs text-gray-500 mt-1">Save as JSON</span>
                              </button>
                               <button data-testid="btn-import" onClick={handleImport} className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all group">
                                <span className="text-2xl mb-2 group-hover:-translate-y-1 transition-transform">📤</span>
                                <span className="font-medium text-white text-sm">Import Settings</span>
                                <span className="text-xs text-gray-500 mt-1">Load from JSON</span>
                              </button>
                            </div>

                             <div className="pt-4 border-t border-white/10 space-y-3">
                                <button
                                  data-testid="btn-reset"
                                  onClick={() => { if (confirm("Reset all settings to defaults?")) settings.resetToDefaults(); }}
                                  className="w-full px-4 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-200 border border-yellow-500/20 rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  🔄 Reset to Defaults
                                </button>
                                <button
                                  data-testid="btn-clear"
                                  onClick={() => { if (confirm("Clear all data including journeys? This cannot be undone.")) settings.clearAllData(); }}
                                  className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/20 rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  🗑️ Clear All Data
                                </button>
                             </div>
                          </div>
                        </div>
                      </TabPanel>

                      {/* About */}
                      <TabPanel data-testid="panel-about" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                         <div className="flex flex-col h-full justify-between">
                            <div>
                              <h3 className="text-xl font-medium text-white mb-2">About L.O.V.E.</h3>
                              <p className="text-sm text-gray-400 mb-8">Listener-Observer-Versor-Experience System</p>

                              <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border border-white/10 rounded-2xl p-8 mb-8 text-center">
                                <h4 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">L.O.V.E.</h4>
                                <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                                  A multi-modal emotional intelligence platform using the VAC (Valence-Arousal-Control) model with quaternion mathematics for high-fidelity 3D emotional visualization.
                                </p>
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                                  <span className="text-gray-400">Version</span>
                                  <span className="text-white font-mono">1.0.0-alpha</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                                  <span className="text-gray-400">Platform</span>
                                  <span className="text-white">Next.js / FastAPI / Three.js</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-center text-xs text-gray-600 mt-8">
                              &copy; 2026 L.O.V.E. Project
                            </div>
                         </div>
                      </TabPanel>

                    </TabPanels>
                  </TabGroup>

                  {/* Footer */}
        <div className="p-4 bg-black/30 border-t border-white/10 text-center">
           <p className="text-xs text-gray-500">Settings are automatically saved to your browser.</p>
        </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
