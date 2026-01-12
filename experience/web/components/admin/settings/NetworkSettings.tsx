/**
 * Network Settings Component
 *
 * Controls for network mode, API endpoints, and connection testing
 */

"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ConnectionStatus } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";

export function NetworkSettings() {
  const settings = useSettingsStore();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const status = await settings.testConnection();
      setConnectionStatus(status);
    } catch (error) {
      logger.error("api", "Connection test failed", error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Connection Mode */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Connection Mode</h2>
        <div>
          <Toggle
            checked={settings.network.mode === "network"}
            onChange={(checked) => settings.switchNetworkMode(checked ? "network" : "local")}
            leftLabel="🏠 Local"
            rightLabel="🌐 Network"
          />
        </div>

        {/* Mode Info */}
        <div className="mt-4">
          {settings.network.mode === "local" ? (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-300 mb-2">
                ✅ Local Mode (Privacy First)
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>✓ All data stays on your device</li>
                <li>✓ HIPAA compliant</li>
                <li>✓ Offline capable</li>
                <li>✓ Maximum privacy</li>
              </ul>
            </div>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Network Mode</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>⚠️ Data sent to cloud servers</li>
                <li>⚠️ Internet connection required</li>
                <li>✓ Enables collaboration and sync</li>
                <li>✓ Cross-device access</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* API Endpoints */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">API Endpoints</h2>

        <div className="mb-4">
          <Toggle
            checked={settings.network.customEndpoints}
            onChange={(checked) => settings.updateNetworkSetting({ customEndpoints: checked })}
            leftLabel="Default Endpoints"
            rightLabel="Custom Endpoints"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">
            Override default {settings.network.mode} endpoints
          </p>
        </div>

        {(settings.network.customEndpoints || settings.network.mode === "local") && (
          <div className="space-y-4">
            {/* Observer */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Observer URL</label>
              <input
                type="text"
                value={settings.network.endpoints.observer}
                onChange={(e) =>
                  settings.updateNetworkSetting({
                    endpoints: { ...settings.network.endpoints, observer: e.target.value },
                  })
                }
                disabled={!settings.network.customEndpoints && settings.network.mode === "network"}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                placeholder="http://localhost:8000"
              />
            </div>

            {/* Listener */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Listener URL</label>
              <input
                type="text"
                value={settings.network.endpoints.listener}
                onChange={(e) =>
                  settings.updateNetworkSetting({
                    endpoints: { ...settings.network.endpoints, listener: e.target.value },
                  })
                }
                disabled={!settings.network.customEndpoints && settings.network.mode === "network"}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                placeholder="http://localhost:8002"
              />
            </div>

            {/* Versor */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Versor URL</label>
              <input
                type="text"
                value={settings.network.endpoints.versor}
                onChange={(e) =>
                  settings.updateNetworkSetting({
                    endpoints: { ...settings.network.endpoints, versor: e.target.value },
                  })
                }
                disabled={!settings.network.customEndpoints && settings.network.mode === "network"}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                placeholder="http://localhost:8001"
              />
            </div>
          </div>
        )}
      </section>

      {/* Connection Testing */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Connection Status</h2>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded transition font-medium"
        >
          {testing ? "Testing..." : "🔍 Test Connection"}
        </button>

        {connectionStatus && (
          <div className="mt-4 space-y-3">
            {Object.entries(connectionStatus).map(([service, status]) => (
              <div
                key={service}
                className={`p-4 rounded-lg border ${
                  status.connected
                    ? "bg-green-900/20 border-green-500/30"
                    : "bg-red-900/20 border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{status.connected ? "✅" : "❌"}</span>
                    <div>
                      <div className="font-semibold text-white capitalize">{service}</div>
                      <div className="text-xs text-gray-400">
                        {
                          settings.network.endpoints[
                            service as keyof typeof settings.network.endpoints
                          ]
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    {status.connected ? (
                      <span className="text-green-400">{status.latency}ms</span>
                    ) : (
                      <span className="text-red-400">{status.error || "Failed"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
