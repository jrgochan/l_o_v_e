/**
 * PersonaPlex Voice Mode Hook
 *
 * Manages WebSocket connection to PersonaPlex service for real-time voice chat
 * Uses AudioWorklet for low-latency bidirectional audio.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export type PersonaId = "lumina" | "logos" | "metis";

export interface UsePersonaPlexVoiceOptions {
  personaId: PersonaId;
  enabled: boolean;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onError?: (error: string) => void;
  onDebug?: (msg: string) => void;
}

export interface UsePersonaPlexVoiceReturn {
  isConnected: boolean;
  isConnecting: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  audioLevel: number; // 0-1 for visualization
  latency: number | null; // milliseconds
  error: string | null;
}

export function usePersonaPlexVoice({
  personaId,
  enabled,
  onSessionStart,
  onSessionEnd,
  onError,
  onDebug,
}: UsePersonaPlexVoiceOptions): UsePersonaPlexVoiceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const onSessionStartRef = useRef(onSessionStart);
  const onSessionEndRef = useRef(onSessionEnd);
  const onErrorRef = useRef(onError);
  const onDebugRef = useRef(onDebug);

  const isMutedRef = useRef(false);

  useEffect(() => {
    onSessionStartRef.current = onSessionStart;
    onSessionEndRef.current = onSessionEnd;
    onErrorRef.current = onError;
    onDebugRef.current = onDebug;
  }, [onSessionStart, onSessionEnd, onError, onDebug]);

  const stopSession = useCallback(() => {
    onDebugRef.current?.("stopSession() called");
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop Worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: "clear" });
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Stop Source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Stop Media Stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close Audio Context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
    setLatency(null);

    onSessionEndRef.current?.();
  }, []);

  const startSession = useCallback(async () => {
    if (!enabled) {
      setError("Voice mode is not enabled");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 1. Initialize Audio Context
      onDebugRef.current?.("Initializing AudioContext...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      // Request 24kHz if possible (Moshi native), but browser might ignore
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // 2. Load AudioWorklet
      // Note: In Next.js, public files are served at root
      try {
        onDebugRef.current?.("Loading AudioWorklet module...");
        await audioContext.audioWorklet.addModule("/audio-processor.js");
      } catch (e) {
        throw new Error(`Failed to load audio-processor: ${e}`);
      }

      // 3. Get Microphone Access
      onDebugRef.current?.("Requesting Microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000, // Try to match context
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      onDebugRef.current?.("Microphone access granted.");

      // 4. Create Nodes
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(audioContext, "personaplex-audio-processor");
      workletNodeRef.current = workletNode;

      // Connect: Source -> Worklet -> Destination
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      // 5. Connect WebSocket
      const wsHost = window.location.hostname; // Connect to same host if serving locally, or env
      // Simple logic to determine WS port: 8003 (default PersonaPlex)
      // If we are in dev mode, we usually proxy or hit port directly.
      const wsUrl = `ws://${wsHost}:8003/voice-session`;

      onDebugRef.current?.(`Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer"; // CRITICAL: Force ArrayBuffer for Python backend compatibility
      wsRef.current = ws;

      // 6. Worklet <-> Main Thread Communication
      workletNode.port.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === "input") {
          // Audio from Mic (Float32Array)
          // Calculate Audio Level (RMS) for UI
          // Optimization: Don't calculate every chunk if not needed, but chunks are small here.
          // Maybe do it every N chunks or use a leaky integrator?
          // For now, quick RMS.
          // data is Float32Array (128 length usually)

          // CRITICAL FIX: Use ws.readyState to check connection (local scope)
          // and isMutedRef for mute state (stable ref) to avoid stale closure issues.
          if (ws.readyState === WebSocket.OPEN && !isMutedRef.current) {
            ws.send(data); // Send raw float32

            // RMS for Vis
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
            const rms = Math.sqrt(sum / data.length);
            setAudioLevel((prev) => prev * 0.8 + rms * 5 * 0.2); // Smooth
          }
        }
      };

      ws.onopen = () => {
        console.log("PersonaPlex WebSocket connected");
        onDebugRef.current?.("WebSocket OPEN. Sending handshake...");

        // Handshake
        ws.send(
          JSON.stringify({
            type: "configure",
            persona_id: personaId,
            mode: "default",
          })
        );

        setIsConnected(true);
        setIsConnecting(false);
        onSessionStartRef.current?.();
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "text-delta") {
              console.log("AI:", msg.text);
            }
          } catch (e) {
            console.error("WS Parse error", e);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary Audio (PCM Float32) from Server - Already ArrayBuffer due to binaryType="arraybuffer"
          const arrayBuffer = event.data;
          const prefix = new Uint8Array(arrayBuffer, 0, 1)[0];

          if (prefix === 1) {
            // Audio
            const audioBytes = arrayBuffer.slice(1);
            // Assume server sends Float32
            const audioFloat32 = new Float32Array(audioBytes);

            // Send to Worklet for Playback
            if (workletNodeRef.current) {
              workletNodeRef.current.port.postMessage({
                type: "enqueue",
                data: audioFloat32,
              });
            }
          }
        }
      };

      ws.onerror = (event) => {
        console.error("PersonaPlex WebSocket error", event);
        setError("Connection failed");
        onDebugRef.current?.("WebSocket ERROR");
        onErrorRef.current?.("Connection failed");
      };

      ws.onclose = () => {
        console.log("PersonaPlex WebSocket closed");
        onDebugRef.current?.("WebSocket CLOSE");
        stopSession();
      };

      // Resume context if suspended (browser requirements)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start voice session";
      console.error("Voice session error:", err);
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      setIsConnecting(false);
      stopSession();
    }
  }, [enabled, personaId, stopSession]); // Remove isConnected, isMuted deps

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      return next;
    });
  }, []);

  // Cleanup
  useEffect(() => {
    onDebugRef.current?.(`Effect MOUNT. isConnected=${isConnected}`);
    return () => {
      onDebugRef.current?.(`Effect CLEANUP. isConnected=${isConnected}`);
      // We do not auto-stop on unmount if we want background voice?
      // No, typical react behavior is stop.
      if (isConnected) {
        onDebugRef.current?.("Unmount/Update triggering stopSession");
        stopSession();
      }
    };
  }, [stopSession, isConnected]);

  return {
    isConnected,
    isConnecting,
    startSession,
    stopSession,
    isMuted,
    toggleMute,
    audioLevel,
    latency,
    error,
  };
}
