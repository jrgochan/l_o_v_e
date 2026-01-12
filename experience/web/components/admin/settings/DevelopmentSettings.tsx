/**
 * Development Settings Component
 *
 * Controls for logging, debugging, and development features.
 * Provides granular control over frontend and backend logging.
 */

"use client";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { Toggle } from "@/components/ui/Toggle";
import { logger } from "@/utils/logger";
import type { LogLevel, LogCategory } from "@/utils/logger";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const BACKEND_LOG_LEVELS = ["ERROR", "WARNING", "INFO", "DEBUG"] as const;

const CATEGORY_INFO: Record<LogCategory, { label: string; description: string }> = {
  websocket: {
    label: "WebSocket Communications",
    description: "Real-time connections for chat and deep feeling mode",
  },
  api: {
    label: "API Calls",
    description: "HTTP requests to Observer, Listener, and Versor services",
  },
  hooks: {
    label: "Hook Lifecycle",
    description: "React hooks and data fetching operations",
  },
  rendering: {
    label: "3D Rendering",
    description: "THREE.js and shader operations",
  },
  state: {
    label: "State Management",
    description: "Zustand store updates and state changes",
  },
  "user-interaction": {
    label: "User Interactions",
    description: "Clicks, selections, and user-triggered events",
  },
  general: {
    label: "General",
    description: "Miscellaneous and uncategorized logs",
  },
};

export function DevelopmentSettings() {
  const { development, updateDevelopmentSetting, updateDevelopmentCategory } = useSettingsStore();

  const handleCopyLogs = () => {
    const logs = logger.exportLogs();
    navigator.clipboard.writeText(logs);
    alert(`Copied ${logger.getBuffer().length} log entries to clipboard`);
  };

  const handleClearConsole = () => {
    console.clear();
    logger.clearBuffer();
    alert("Console and log buffer cleared");
  };

  const handleToggleMaster = (enabled: boolean) => {
    updateDevelopmentSetting({ enabled });
  };

  const handleLogLevelChange = (level: LogLevel) => {
    updateDevelopmentSetting({ frontendLogLevel: level });
  };

  const handleBackendLogLevelChange = (level: (typeof BACKEND_LOG_LEVELS)[number]) => {
    updateDevelopmentSetting({ backendLogLevel: level });
    // Note: This doesn't persist across service restarts as requested
  };

  const logBuffer = logger.getBuffer();
  const bufferSizeKB = (JSON.stringify(logBuffer).length / 1024).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">🔧 Development Settings</h2>
        <p className="text-gray-400 text-sm">
          Control logging, debugging, and development tools across the platform.
        </p>
      </div>

      {/* Master Toggle */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Development Mode</h3>
            <p className="text-sm text-gray-400">
              Enable detailed logging and debugging tools for development and troubleshooting
            </p>
          </div>
          <Toggle
            leftLabel="OFF"
            rightLabel="ON"
            checked={development.enabled}
            onChange={handleToggleMaster}
          />
        </div>
      </div>

      {/* Frontend Logging Controls */}
      {development.enabled && (
        <>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">📱 Frontend Logging</h3>
              <p className="text-sm text-gray-400 mb-4">
                Control browser console logging for the Experience module
              </p>
            </div>

            {/* Log Level Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Log Level</label>
              <select
                value={development.frontendLogLevel}
                onChange={(e) => handleLogLevelChange(e.target.value as LogLevel)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded focus:outline-none focus:border-cyan-500 transition"
              >
                {LOG_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {development.frontendLogLevel === "debug" &&
                  "All logs including detailed debug information"}
                {development.frontendLogLevel === "info" &&
                  "Informational messages, warnings, and errors"}
                {development.frontendLogLevel === "warn" && "Warnings and errors only"}
                {development.frontendLogLevel === "error" && "Errors only"}
              </p>
            </div>

            {/* Category Toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Categories</label>
              <div className="space-y-3">
                {(
                  Object.entries(CATEGORY_INFO) as [
                    LogCategory,
                    (typeof CATEGORY_INFO)[LogCategory],
                  ][]
                ).map(([category, info]) => (
                  <div
                    key={category}
                    className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={development.frontendCategories[category]}
                      onChange={(e) => updateDevelopmentCategory(category, e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-gray-900"
                    />
                    <label htmlFor={`category-${category}`} className="flex-1 cursor-pointer">
                      <div className="text-sm font-medium text-white">{info.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{info.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Backend Logging Controls */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">🖥️ Backend Logging</h3>
              <p className="text-sm text-gray-400 mb-4">
                Control Python service logging (Observer, Listener, Versor)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Log Level (All Services)
              </label>
              <select
                value={development.backendLogLevel}
                onChange={(e) =>
                  handleBackendLogLevelChange(e.target.value as (typeof BACKEND_LOG_LEVELS)[number])
                }
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded focus:outline-none focus:border-cyan-500 transition"
              >
                {BACKEND_LOG_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Applied to: Observer, Listener, Versor</p>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">⚠️</span>
                <div className="text-xs text-yellow-200">
                  <div className="font-semibold mb-1">Note:</div>
                  Backend log level changes take effect immediately but do not persist across
                  service restarts. Set{" "}
                  <code className="bg-yellow-900/40 px-1 py-0.5 rounded">LOG_LEVEL</code> in{" "}
                  <code className="bg-yellow-900/40 px-1 py-0.5 rounded">.env</code> for persistent
                  changes.
                </div>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">🛠️ Tools</h3>
              <p className="text-sm text-gray-400 mb-4">Debugging utilities and log management</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyLogs}
                className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition font-medium flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>Copy Recent Logs</span>
              </button>
              <button
                onClick={handleClearConsole}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition font-medium flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Clear Console</span>
              </button>
            </div>

            <div className="bg-gray-900/50 rounded p-3 text-xs text-gray-400">
              <div className="flex justify-between items-center">
                <span>Logs Buffer:</span>
                <span className="font-mono text-cyan-400">
                  {logBuffer.length} messages (~{bufferSizeKB} KB)
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Last 5 minutes buffered</span>
                <span className="font-mono text-gray-500">Max: 500 entries</span>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-sm font-semibold text-blue-300 mb-1">About Development Mode</h3>
                <p className="text-sm text-gray-300 mb-2">
                  Development mode enables detailed logging across the entire platform. This helps
                  with debugging, but may reduce performance and clutter the console.
                </p>
                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                  <li>Frontend logs appear in browser console (color-coded by category)</li>
                  <li>Backend logs appear in service terminal output</li>
                  <li>Settings persist across browser sessions</li>
                  <li>Disable for cleaner production experience</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Disabled State Info */}
      {!development.enabled && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">🔇</div>
          <h3 className="text-lg font-semibold text-white mb-2">Development Mode Disabled</h3>
          <p className="text-sm text-gray-400">
            Console logging is minimized. Enable development mode above to access debugging tools.
          </p>
        </div>
      )}
    </div>
  );
}
