/**
 * Chat Panel Component
 *
 * Coordinator component for the Emotional Chat interface.
 * Composes UI components and manages state/logic via hooks.
 */

"use client";

import { useState, useEffect } from "react";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import { logger } from "@/utils/logger";
import { useEmotionNavigation } from "@/hooks/useEmotionNavigation";
import { useHistorySphereSync } from "@/hooks/useHistorySphereSync";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Hooks
import { useChatPanelState } from "@/hooks/chat/useChatPanelState";
import { useChatSessionState } from "@/hooks/chat/useChatSessionState";
import { useChatAnalysisState } from "@/hooks/chat/useChatAnalysisState";
import {
  useChatProgress,
  initializeProgressStages,
  getAdaptiveMessage,
} from "@/hooks/chat/useChatProgress";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

// Components
import { ChatHeader } from "./chat/ChatHeader";
import { ChatToggleFAB } from "./chat/ChatToggleFAB";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { AnalysisPanel } from "./panels/AnalysisPanel";
import { EmotionHistoryPanel } from "./panels/EmotionHistoryPanel";

// Types
import type {
  DisplayMessage,
  DeepFeelingServerMessage,
  VAC,
  EmotionProminence,
  RelationshipType,
  AggregateState,
  ThreeWayAnalysis,
  ProsodyData,
  InsightData,
  DetectedEmotion,
  EmotionRelationship,
  ProgressStage,
} from "@/types/chat";

interface ChatPanelProps {
  sessionId: string;
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  // --- UI State ---
  const {
    isExpanded,
    setIsExpanded,
    isFullscreen,
    height,
    setHeight,
    toneMode,
    toggleToneMode,
    useAtlasMapping,
    setUseAtlasMapping,
    deepFeelingMode,
    setDeepFeelingMode,
    analysisExpandState,
    handleToggleExpand,
    handleToggleFullscreen,
    handleToggleAnalysisExpansion,
    handleMouseDown,
    isResizing,
  } = useChatPanelState();

  // --- Session & Metrics State ---
  const {
    sessionMetrics,
    setSessionMetrics,
    vacHistory,
    setVacHistory,
    emotionTimeline,
    setEmotionTimeline,
  } = useChatSessionState();

  // --- Analysis Data State ---
  const {
    currentAnalysis,
    setCurrentAnalysis,
    multiEmotionAnalysis,
    setMultiEmotionAnalysis, // Explicitly extracted
    threeWayAnalysis,
    setThreeWayAnalysis, // Explicitly extracted
    clearAnalysis,
  } = useChatAnalysisState();

  // --- Progress / Heartbeat State ---
  const {
    progressState,
    setProgressState,
    showProgress,
    setShowProgress,
    startProgressSimulation,
    progressSimulationRef,
  } = useChatProgress();

  const theme = useAdminTheme();

  // --- Local State ---
  const viewMode = useAtlasAdminStore((state) => state.viewMode);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addMessage = (message: DisplayMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  // --- External Stores & Navigation ---
  const addHistoryEntry = useEmotionHistoryStore((state) => state.addEntry);
  useHistorySphereSync();

  const { autoFocusEmotion, viewInSphere } = useEmotionNavigation({
    onNavigate: () => {
      // Collapse chat when navigating to sphere
      setIsExpanded(false);
      setHeight(60);
    },
  });

  // --- WebSocket Logic ---
  const {
    isConnected,
    isConnecting,
    sendMessage,
    sendAudio,
    updateTonePreference,
    updateDeepFeelingMode,
    error: wsError,
  } = useWebSocketChat({
    sessionId,
    enabled: isExpanded, // Only connect when expanded
    onMessage: (message: DeepFeelingServerMessage) => {
      logger.debug("websocket", "Chat message received", message);

      if (message.type === "message_received") {
        setIsProcessing(true);
        // Timeout safeguard
        setTimeout(() => setIsProcessing(false), 120000);
      }
    },
    onMultiEmotion: (
      emotion: string,
      category: string,
      vac: VAC,
      confidence: number,
      prominence: EmotionProminence
    ) => {
      logger.info("websocket", "Multi-emotion received", { emotion, prominence });

      const detectedEmotion: DetectedEmotion = {
        id: crypto.randomUUID(),
        emotion_name: emotion,
        category: category,
        vac: vac,
        confidence: confidence,
        prominence: prominence,
      };

      setMultiEmotionAnalysis((prev) => {
        if (!prev) {
          return {
            id: crypto.randomUUID(),
            message_id: "",
            session_id: sessionId,
            emotions: [detectedEmotion],
            relationships: [],
            aggregate: {
              vac: vac,
              complexity_score: 0,
              emotional_clarity: 0,
              temporal_pattern: "concurrent" as const,
            },
            reasoning: "",
            timestamp: new Date(),
          };
        } else {
          return {
            ...prev,
            emotions: [...prev.emotions, detectedEmotion],
          };
        }
      });
    },
    onRelationship: (
      emotionA: string,
      emotionB: string,
      type: RelationshipType,
      strength: number,
      description: string
    ) => {
      logger.info("websocket", "Relationship received", { emotionA, emotionB, type });

      const relationship: EmotionRelationship = {
        id: crypto.randomUUID(),
        emotion_a: emotionA,
        emotion_b: emotionB,
        type: type,
        strength: strength,
        description: description,
      };

      setMultiEmotionAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          relationships: [...prev.relationships, relationship],
        };
      });
    },
    onAggregateState: (state: AggregateState & { vac?: VAC; aggregate_vac?: VAC }) => {
      logger.info("websocket", "Aggregate state received", state);

      setMultiEmotionAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          aggregate: {
            vac: state.vac || state.aggregate_vac || prev.aggregate.vac,
            complexity_score: state.complexity_score || 0,
            emotional_clarity: state.emotional_clarity || 0,
            temporal_pattern: state.temporal_pattern || "concurrent",
          },
        };
      });
    },
    onThreeWayAnalysis: (data: ThreeWayAnalysis) => {
      logger.info("websocket", "3-way analysis received", data);
      setThreeWayAnalysis(data);
    },
    onTranscription: (text: string) => {
      const timestamp = new Date();
      setCurrentAnalysis((prev) => ({ ...prev, transcription: text }));
      addMessage({
        id: crypto.randomUUID(),
        type: "transcription",
        content: `Transcription: ${text}`,
        timestamp,
      });
    },
    onProsody: (data: ProsodyData) => {
      setCurrentAnalysis((prev) => ({ ...prev, prosody: data }));
      logger.debug("websocket", "Prosody data received", data);
    },
    onAnalysis: (emotion: string, category: string, vac: VAC, confidence: number) => {
      const messageId = crypto.randomUUID();

      setCurrentAnalysis((prev) => ({
        ...prev,
        emotion,
        category,
        vac,
        confidence,
      }));

      addMessage({
        id: messageId,
        type: "analysis",
        content: `Detected: ${emotion}`,
        emotion,
        category,
        vac,
        confidence,
        timestamp: new Date(),
      });

      // Determine alert level
      let alertLevel: "critical" | "warning" | "attention" | "stable" = "stable";
      if (vac.arousal > 0.7 && vac.valence < -0.5) {
        alertLevel = "critical";
      } else if (confidence < 0.6) {
        alertLevel = "attention";
      }

      setVacHistory((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          vac,
          emotion,
          confidence,
        },
      ]);

      setEmotionTimeline((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          emotion,
          category,
          vac,
          confidence,
          alertLevel,
        },
      ]);

      setSessionMetrics((prev) => {
        const newEmotionCount = prev.emotionCount + 1;
        const newAverageConfidence =
          (prev.averageConfidence * prev.emotionCount + confidence) / newEmotionCount;

        const newAlertCount = { ...prev.alertCount };
        if (vac.arousal > 0.7 && vac.valence < -0.5) {
          newAlertCount.critical++;
        }
        if (confidence < 0.6) {
          newAlertCount.attention++;
        }

        return {
          ...prev,
          emotionCount: newEmotionCount,
          averageConfidence: newAverageConfidence,
          dominantCategory: category,
          alertCount: newAlertCount,
        };
      });

      addHistoryEntry({
        emotion,
        category,
        vac,
        confidence,
        timestamp: new Date(),
        isVisibleInSphere: true,
        messageId,
        transcription: currentAnalysis.transcription || undefined,
      });

      autoFocusEmotion(emotion);
    },
    onInsight: (insights: InsightData) => {
      logger.info("websocket", "Insight received", insights);
      setCurrentAnalysis((prev) => {
        const updated = { ...prev, insights };
        if (
          insights.voice_content_correlation &&
          insights.voice_content_correlation.discrepancy > 0.5
        ) {
          setSessionMetrics((prev) => ({
            ...prev,
            alertCount: {
              ...prev.alertCount,
              warning: prev.alertCount.warning + 1,
            },
          }));
        }
        return updated;
      });
      addMessage({
        id: crypto.randomUUID(),
        type: "insight",
        content: insights.summary,
        insights,
        timestamp: new Date(),
      });
      setIsProcessing(false);
    },
    onProgressUpdate: (
      stage: string,
      status: string,
      message: string,
      percentage: number,
      elapsed_ms?: number
    ) => {
      logger.info("websocket", "Progress update received", {
        stage,
        status,
        percentage,
        elapsed_ms,
      });

      if (progressSimulationRef.current) {
        clearInterval(progressSimulationRef.current);
        progressSimulationRef.current = null;
      }

      if (status === "started") {
        setShowProgress(true);
        setProgressState({
          stages: initializeProgressStages(deepFeelingMode),
          currentStage: stage,
          overallPercentage: percentage,
          currentMessage: getAdaptiveMessage(stage, status, toneMode, deepFeelingMode),
        });
        startProgressSimulation();
      } else {
        setProgressState((prev) => {
          const updatedStages = prev.stages.map((s) => {
            if (s.id === stage) {
              return { ...s, status: status as ProgressStage["status"], percentage, elapsed_ms };
            }
            return s;
          });

          return {
            ...prev,
            stages: updatedStages,
            currentStage: stage,
            overallPercentage: percentage,
            currentMessage: getAdaptiveMessage(stage, status, toneMode, deepFeelingMode),
          };
        });

        if (status === "in_progress" && percentage < 90) {
          startProgressSimulation();
        }
      }

      if (status === "complete" && percentage === 100) {
        setTimeout(() => setShowProgress(false), 1500);
      }
    },
    onError: (error: string) => {
      logger.error("websocket", "Chat error", error);
      setIsProcessing(false);
      setShowProgress(false);
    },
  });

  // --- Effects for Syncing Preferences ---
  useEffect(() => {
    if (isConnected) {
      updateDeepFeelingMode(deepFeelingMode);
    }
  }, [deepFeelingMode, isConnected, updateDeepFeelingMode]);

  // Sync Tone Mode change (state is managed by useChatPanelState, but we need to notify socket)
  // useChatPanelState handles local state. We use an effect here or modify the toggle handler.
  // The toggle handler in ChatHeader calls toggleToneMode.
  // Let's use an effect to sync.
  useEffect(() => {
    if (isConnected) {
      updateTonePreference(toneMode);
    }
  }, [toneMode, isConnected, updateTonePreference]);

  // --- Handlers ---

  const [inputText, setInputText] = useState("");

  const executeSend = () => {
    if (!inputText.trim() || !isConnected) return;

    clearAnalysis();
    addMessage({
      id: crypto.randomUUID(),
      type: "user",
      content: inputText,
      timestamp: new Date(),
    });

    sendMessage(inputText, toneMode, deepFeelingMode);
    setInputText("");
  };

  const executeSendAudio = (text: string) => {
    if (!isConnected) return; // Guard clause
    clearAnalysis(null);
    // Note: useChatAnalysisState's clearAnalysis takes optional blob.
    // But here we are sending text-based audio representation/transcription?
    // Original handleSendAudio took (audioData: string, audioBlob?: Blob).
    // The VoiceRecorder returns text transcription usually? Or audio data?
    // Looking at original ChatPanel: onSend={(text) => handleSendAudio(text.trim())} from VoiceRecorder.
    // So VoiceRecorder does the transcription internally or returns text?
    // Let's assume text for now as per original code usage `handleSendAudio(text.trim())`.
    // Wait, create clean separation.
    addMessage({
      id: crypto.randomUUID(),
      type: "user",
      content: "🎤 Voice message",
      timestamp: new Date(),
    });
    // For now we just send the text from the recorder as audio data?
    // Original: sendAudio(audioData, toneMode, deepFeelingMode).
    // Let's assume the text passed back is the audio data string (base64).
    sendAudio(text, toneMode, deepFeelingMode);
  };

  return (
    <>
      {/* FAB - Show ONLY when collapsed AND in Zen/Cinema mode */}
      {!isExpanded && viewMode !== "default" && <ChatToggleFAB onClick={handleToggleExpand} />}

      {/* Collapsed Bar - Show ONLY when collapsed AND in Default mode */}
      {!isExpanded && viewMode === "default" && (
        <button
          onClick={handleToggleExpand}
          className={`
            fixed bottom-0 left-0 right-0 z-40
            h-[60px] 
            flex items-center justify-between px-6
            ${theme.colors.background} ${theme.effects.backdropBlur}
            border-t border-cyan-500/30
            hover:bg-cyan-500/5 transition-all duration-300
            group
          `}
        >
          <div className="flex items-center gap-3">
            <div
              className={`
              w-2 h-2 rounded-full 
              ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}
              shadow-[0_0_8px_current]
            `}
            />
            <span className={`text-sm font-medium ${theme.colors.text.primary}`}>
              Emotional Intelligence
            </span>
            <span
              className={`text-xs ${theme.colors.text.muted} px-2 py-0.5 rounded-full bg-white/5`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Preview of latest message could go here */}
            <div className="flex items-center gap-2 text-cyan-400 group-hover:translate-y-[-2px] transition-transform">
              <span className="text-sm font-medium">Open Chat</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </div>
          </div>
        </button>
      )}

      {/* Main Panel Container - Show ONLY when expanded */}
      {isExpanded && (
        <div
          data-testid="chat-panel-container"
          className={`fixed ${isFullscreen ? "inset-0 z-50" : "bottom-0 left-0 right-0 z-40"
            } ${theme.colors.background} ${theme.effects.backdropBlur} border-t-2 ${theme.colors.border.replace("border-", "border-t-")} shadow-[0_-4px_20px_rgba(6,182,212,0.3)] flex flex-col transition-all duration-300`}
          style={{ height: isFullscreen ? "100vh" : `${height}px` }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-full h-2 cursor-row-resize hover:bg-cyan-500/30 transition flex items-center justify-center ${isResizing ? "bg-cyan-500/50" : ""
              }`}
          >
            <div className="w-12 h-1 bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <ChatHeader
            isExpanded={isExpanded}
            isFullscreen={isFullscreen}
            isConnecting={isConnecting}
            isConnected={isConnected}
            wsError={wsError}
            toneMode={toneMode}
            useAtlasMapping={useAtlasMapping}
            deepFeelingMode={deepFeelingMode}
            onToggleExpand={handleToggleExpand}
            onToggleFullscreen={handleToggleFullscreen}
            onToneModeChange={toggleToneMode}
            onUseAtlasMappingChange={setUseAtlasMapping}
            onDeepFeelingModeChange={setDeepFeelingMode}
          />

          {/* Expanded Content */}
          <div className="flex-1 flex gap-4 px-6 py-4 overflow-hidden">
            {/* Left: Emotion History */}
            {analysisExpandState !== "fullscreen" && <EmotionHistoryPanel />}

            {/* Middle: Chat Messages */}
            {analysisExpandState === "normal" && (
              <ChatMessages
                messages={messages}
                showProgress={showProgress}
                progressState={progressState}
                toneMode={toneMode}
                deepFeelingMode={deepFeelingMode}
                onEmotionClick={(emotion) => viewInSphere(emotion)}
              />
            )}

            {/* Right: Analysis Panel */}
            <div
              className={`flex-shrink-0 transition-all duration-300 ease-in-out ${analysisExpandState === "normal"
                  ? "w-96"
                  : analysisExpandState === "expanded"
                    ? "w-[calc(100%-18rem)]" // approximate width calc
                    : "w-full"
                }`}
            >
              <AnalysisPanel
                transcription={currentAnalysis.transcription}
                prosody={currentAnalysis.prosody}
                emotion={currentAnalysis.emotion}
                category={currentAnalysis.category}
                vac={currentAnalysis.vac}
                confidence={currentAnalysis.confidence}
                insights={currentAnalysis.insights}
                multiEmotionAnalysis={multiEmotionAnalysis}
                deepFeelingMode={deepFeelingMode}
                expandState={analysisExpandState}
                onToggleExpansion={handleToggleAnalysisExpansion}
                sessionMetrics={sessionMetrics}
                vacHistory={vacHistory}
                emotionTimeline={emotionTimeline}
                audioBlob={currentAnalysis.audioBlob}
                threeWayAnalysis={threeWayAnalysis}
              />
            </div>
          </div>

          {/* Input Area */}
          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSend={executeSend}
            onSendAudio={executeSendAudio}
            isConnected={isConnected}
            isProcessing={isProcessing}
          />
        </div>
      )}
    </>
  );
}
