import { useMemo } from "react";
import type { DetectedEmotion, EmotionRelationship } from "@/types/chat";
import * as d3 from "d3";
import { logger } from "@/utils/logger";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  emotion: DetectedEmotion;
  radius: number;
  color: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relationship: EmotionRelationship;
  color: string;
  width: number;
}

interface UseGraphDataProps {
  emotions: DetectedEmotion[];
  relationships: EmotionRelationship[];
}

export function useGraphData({ emotions, relationships }: UseGraphDataProps) {
  // Helper: Get emotion color based on VAC valence
  const getEmotionColor = (valence: number): string => {
    if (valence > 0.5) return "#22c55e"; // green-500 (very positive)
    if (valence > 0.1) return "#a3e635"; // lime-400 (positive)
    if (valence > -0.1) return "#fbbf24"; // amber-400 (neutral)
    if (valence > -0.5) return "#f97316"; // orange-500 (negative)
    return "#ef4444"; // red-500 (very negative)
  };

  // Helper: Get relationship color based on type
  const getRelationshipColor = (type: string): string => {
    switch (type) {
      case "complementary":
        return "#3b82f6"; // blue-500
      case "contradictory":
        return "#f97316"; // orange-500
      case "masking":
        return "#8b5cf6"; // purple-500
      case "amplifying":
        return "#22c55e"; // green-500
      case "sequential":
        return "#6b7280"; // gray-500
      default:
        return "#6b7280";
    }
  };

  const { nodes, links } = useMemo(() => {
    if (!emotions || emotions.length === 0) {
      return { nodes: [], links: [] };
    }

    // Create nodes from emotions
    const nodes: GraphNode[] = emotions.map((emotion) => ({
      id: emotion.emotion_name,
      emotion,
      radius: 20 + emotion.confidence * 30, // 20-50px based on confidence
      color: getEmotionColor(emotion.vac.valence),
    }));

    // Create set of valid emotion names for filtering
    const validEmotionNames = new Set(emotions.map((e) => e.emotion_name));

    // Create links from relationships, filtering out any that reference missing emotions
    const links: GraphLink[] = relationships
      .filter((rel) => validEmotionNames.has(rel.emotion_a) && validEmotionNames.has(rel.emotion_b))
      .map((rel) => ({
        source: rel.emotion_a,
        target: rel.emotion_b,
        relationship: rel,
        color: getRelationshipColor(rel.type),
        width: 2 + rel.strength * 4, // 2-6px based on strength
      }));

    // Log if any relationships were filtered out
    const filteredCount = relationships.length - links.length;
    if (filteredCount > 0) {
      logger.warn(
        "rendering",
        `Filtered out ${filteredCount} relationship(s) with missing emotions`
      );
    }

    return { nodes, links };
  }, [emotions, relationships]);

  return { nodes, links, getEmotionColor, getRelationshipColor };
}
