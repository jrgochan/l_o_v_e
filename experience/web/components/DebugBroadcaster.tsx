"use client";

import { useEffect, useState, useCallback } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

export function DebugBroadcaster() {
  const [lastBroadcast, setLastBroadcast] = useState<number>(0);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [lsValue, setLsValue] = useState<string>("Reading...");
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const targetVAC = useExperienceStore((state) => state.targetVAC);

  const [origin, setOrigin] = useState("SSR");

  useEffect(() => {
    setTimeout(() => setOrigin(window.origin), 0);
  }, []);

  // Poll LocalStorage to see what we actually wrote
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem("love-sphere-sync");
        setLsValue(raw || "NULL");
      } catch {
        setLsValue("Error reading LS");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const forceBroadcast = useCallback(() => {
    try {
      const message = {
        type: "sphere_update",
        vac: targetVAC,
        selectedEmotionIds: Array.from(selectedIds),
        timestamp: Date.now(),
        force: true,
      };

      localStorage.setItem("love-sphere-sync", JSON.stringify(message));
      setLastBroadcast(Date.now());
      setBroadcastCount((p) => p + 1);
      setError(null);
      // console.log("[DEBUG] Force Broadcast", message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      // console.error("[DEBUG] Force Broadcast Failed", e);
    }
  }, [targetVAC, selectedIds]);

  return (
    <div className="fixed bottom-4 left-4 z-50 p-4 bg-gray-900/90 border border-green-700 text-xs font-mono rounded shadow-xl backdrop-blur max-w-sm pointer-events-auto">
      <h3 className="text-green-400 font-bold mb-2 border-b border-gray-700 pb-1">
        Admin Broadcaster Debug
      </h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
        <div>Broadcasts:</div>
        <div>{broadcastCount}</div>

        <div>Last Time:</div>
        <div>{lastBroadcast ? new Date(lastBroadcast).toLocaleTimeString() : "Never"}</div>

        <div>Target VAC:</div>
        <div>{targetVAC ? `[${targetVAC.map((v) => v.toFixed(2)).join(",")}]` : "None"}</div>

        <div>Origin:</div>
        <div className="text-orange-300">{origin}</div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className="text-gray-500 mb-1">LocalStorage Value:</div>
        <div
          className={`text-[9px] break-all ${lsValue === "NULL" ? "text-red-500 font-bold" : "text-green-300"}`}
        >
          {lsValue.substring(0, 100)}
          {lsValue.length > 100 ? "..." : ""}
        </div>
      </div>

      {error && (
        <div className="mt-2 p-1 bg-red-900/50 text-red-200 border border-red-500 rounded">
          Error: {error}
        </div>
      )}

      <button
        onClick={forceBroadcast}
        className="mt-2 w-full py-2 bg-green-800 hover:bg-green-700 text-white rounded font-bold transition-colors"
      >
        FORCE BROADCAST NOW
      </button>
    </div>
  );
}
