/**
 * Voice Chat Component
 *
 * UI for PersonaPlex voice mode with audio visualizer and session controls
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { usePersonaPlexVoice, type PersonaId } from "@/hooks/usePersonaPlexVoice";
import { AudioVisualizer } from "./AudioVisualizer";

interface VoiceChatProps {
  personaId: PersonaId;
  personaColor: string;
  personaDescription: string;
}

export function VoiceChat({ personaId, personaColor, personaDescription }: VoiceChatProps) {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setDebugLogs(prev => [...prev.slice(-50), msg]); // Keep more logs
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [debugLogs]);

  const {
    isConnected,
    isConnecting,
    startSession,
    stopSession,
    isMuted,
    toggleMute,
    audioLevel,
    latency,
    error,
  } = usePersonaPlexVoice({
    personaId,
    enabled: true,
    onSessionStart: () => {
        console.log("Voice session started");
        addLog("Session STARTED");
    },
    onSessionEnd: () => {
        console.log("Voice session ended");
        addLog("Session ENDED");
    },
    onError: (err) => {
        console.error("Voice session error:", err);
        addLog(`ERROR: ${err}`);
    },
    onDebug: addLog,
  });

  const handleSessionToggle = () => {
    if (isConnected) {
      stopSession();
    } else {
      setDebugLogs([]); // Clear logs on start
      startSession();
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Persona Indicator */}
      <div
        className="px-6 py-4 rounded-lg border-2"
        style={{
          borderColor: personaColor,
          backgroundColor: `${personaColor}15`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Voice Mode Active</h4>
            <p className="text-sm text-gray-300 mt-1">{personaDescription}</p>
          </div>
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: isConnected ? personaColor : "#6B7280" }}
          />
        </div>
      </div>

      {/* Audio Visualizer */}
      <div className="flex-1 flex items-center justify-center">
        <AudioVisualizer
          audioLevel={audioLevel}
          isActive={isConnected}
          personaColor={personaColor}
        />
      </div>

      {/* Session Status */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status:</span>
          <span className={isConnected ? "text-green-400" : "text-gray-400"}>
            {isConnecting
              ? "Connecting..."
              : isConnected
                ? "Connected"
                : "Disconnected"}
          </span>
        </div>

        {latency !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Latency:</span>
            <span className="text-gray-300 font-mono">{latency}ms</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded border border-red-500/30">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Start/Stop Session */}
        <button
          onClick={handleSessionToggle}
          disabled={isConnecting}
          className={`flex-1 px-6 py-4 rounded-lg font-semibold text-white transition ${
            isConnected
              ? "bg-red-600 hover:bg-red-500"
              : "bg-gradient-to-r hover:opacity-90"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{
            background: !isConnected
              ? `linear-gradient(135deg, ${personaColor}, ${personaColor}CC)`
              : undefined,
          }}
        >
          {isConnecting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Connecting...
            </span>
          ) : isConnected ? (
            <span className="flex items-center justify-center gap-2">
              ⏹️ End Session
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🎙️ Start Voice Session
            </span>
          )}
        </button>

        {/* Mute Toggle */}
        {isConnected && (
          <button
            onClick={toggleMute}
            className={`px-6 py-4 rounded-lg font-semibold transition ${
              isMuted
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-800 hover:bg-gray-700 text-white"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>
        )}
      </div>

      {/* Instructions */}
      {!isConnected && !error && (
        <div className="text-center text-gray-400 text-sm space-y-2">
          <p>Click "Start Voice Session" to begin full-duplex conversation</p>
          <p className="text-xs">
            • Microphone access required
            • You can interrupt the AI naturally
            • Audio is processed in real-time
          </p>
        </div>
      )}

      {/* Debug Logs */}
      <div className="mt-4 p-2 bg-black/50 rounded text-xs font-mono text-gray-500 overflow-y-auto max-h-32">
        {debugLogs.map((log, i) => (
            <div key={i}>{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
