import { logger } from "@/utils/logger";
import type {
  DeepFeelingServerMessage,
  InsightData,
  VAC,
  EmotionProminence,
  RelationshipType,
  ProsodyData,
  ThreeWayAnalysis,
  AggregateState,
} from "@/types/chat";

export interface MessageHandlers {
  onTranscription?: (text: string) => void;
  onAnalysis?: (
    emotion: string,
    category: string,
    vac: VAC,
    confidence: number,
    originalEmotion?: string,
    matchMethod?: string,
    matchConfidence?: number
  ) => void;
  onProsody?: (data: ProsodyData) => void;
  onInsight?: (insights: InsightData) => void;
  onError?: (error: string) => void;
  onMultiEmotion?: (
    emotion: string,
    category: string,
    vac: VAC,
    confidence: number,
    prominence: EmotionProminence,
    originalEmotion?: string,
    matchMethod?: string,
    matchConfidence?: number
  ) => void;
  onRelationship?: (
    emotionA: string,
    emotionB: string,
    type: RelationshipType,
    strength: number,
    description: string
  ) => void;
  onAggregateState?: (state: AggregateState) => void;
  onThreeWayAnalysis?: (data: ThreeWayAnalysis) => void;
  onProgressUpdate?: (
    stage: string,
    status: string,
    message: string,
    percentage: number,
    elapsed_ms?: number
  ) => void;
  setError: (error: string | null) => void;
}

export const dispatchMessage = (
  message: DeepFeelingServerMessage,
  handlers: MessageHandlers
): void => {
  const {
    onTranscription,
    onAnalysis,
    onInsight,
    onError,
    onMultiEmotion,
    onRelationship,
    onAggregateState,
    onThreeWayAnalysis,
    onProgressUpdate,
    onProsody,
    setError,
  } = handlers;

  switch (message.type) {
    case "transcription":
      onTranscription?.(message.text);
      break;

    case "prosody":
      onProsody?.(message.data);
      logger.debug("websocket", "Prosody data received", message.data);
      break;

    case "analysis":
      onAnalysis?.(
        message.emotion,
        message.category,
        message.vac,
        message.confidence,
        message.original_emotion,
        message.match_method,
        message.match_confidence
      );
      break;

    case "insight":
      logger.info("websocket", "Insight message received", message);
      logger.debug("websocket", "Insight data", message.insights);
      onInsight?.(message.insights);
      break;

    case "multi_emotion":
      if ("emotion" in message && "vac" in message && "prominence" in message) {
        logger.info("websocket", "Multi-emotion detected", {
          emotion: message.emotion,
          prominence: message.prominence,
        });
        onMultiEmotion?.(
          message.emotion,
          message.category || "",
          message.vac,
          message.confidence || 0,
          message.prominence,
          message.original_emotion,
          message.match_method,
          message.match_confidence
        );
      }
      break;

    case "emotion_relationship":
      if ("emotion_a" in message && "emotion_b" in message && "relationship_type" in message) {
        logger.info("websocket", "Relationship detected", {
          emotionA: message.emotion_a,
          emotionB: message.emotion_b,
          type: message.relationship_type,
        });
        onRelationship?.(
          message.emotion_a,
          message.emotion_b,
          message.relationship_type,
          message.strength || 0,
          message.description || ""
        );
      }
      break;

    case "aggregate_state":
      if ("aggregate_vac" in message) {
        const aggregateData = {
          vac: message.aggregate_vac,
          complexity_score: message.complexity_score,
          emotional_clarity: message.emotional_clarity,
          temporal_pattern: message.temporal_pattern,
        };
        logger.info("websocket", "Aggregate state received", aggregateData);
        onAggregateState?.(aggregateData);
      }
      break;

    case "three_way_analysis":
      if ("data" in message) {
        logger.info("websocket", "3-way analysis received", message.data);
        onThreeWayAnalysis?.(message.data);
      }
      break;

    case "progress_update":
      if ("stage" in message && "status" in message) {
        logger.debug("websocket", "Progress update", {
          stage: message.stage,
          percentage: message.percentage,
        });
        onProgressUpdate?.(
          message.stage,
          message.status,
          message.message,
          message.percentage,
          message.elapsed_ms
        );
      }
      break;

    case "error":
      setError(message.message);
      onError?.(message.message);
      break;
  }
};
