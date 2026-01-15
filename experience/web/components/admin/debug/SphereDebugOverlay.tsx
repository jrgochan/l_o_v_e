"use client";

import { useExperienceStore } from "@/stores/useExperienceStore";
import { useState, useEffect, useCallback } from "react";
import type { AtlasEmotion } from "@/types";

interface SyncMessage {
  timestamp: number;
  type: string;
  vac?: number[];
  selectedEmotionIds?: string[];
}

interface SphereDebugOverlayProps {
  isConnected: boolean;
  isWaiting: boolean;
  targetVAC: number[] | null;
  activeEmotions: AtlasEmotion[];
  debugLog: SyncMessage[];
}

export function SphereDebugOverlay({
  isConnected,
  isWaiting,
  targetVAC,
  activeEmotions,
  debugLog,
}: SphereDebugOverlayProps) {
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
          {
            /* istanbul ignore next */
            typeof window !== "undefined" ? window.origin : "SSR"
          }
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
            <div>Age: {age}s ago</div>
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
