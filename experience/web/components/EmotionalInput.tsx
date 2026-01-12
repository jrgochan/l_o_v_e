/**
 * Emotional Input Component
 *
 * Allows users to type text and submit it to the Listener API
 * for emotional analysis. The analyzed VAC will update the Soul Sphere.
 */

"use client";

import { useState } from "react";
import { analyzeText } from "@love/experience-shared";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";

export function EmotionalInput() {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEmotion, setLastEmotion] = useState<string | null>(null);

  const setTarget = useExperienceStore((state) => state.setTarget);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002";
      const result = await analyzeText(text, "web-user", baseUrl);

      // Extract VAC from response
      const vac: [number, number, number] = [
        result.vac.valence,
        result.vac.arousal,
        result.vac.connection,
      ];

      // Update Soul Sphere
      setTarget(vac);

      // Show result
      setLastEmotion(result.emotion);
      setText(""); // Clear input after successful analysis
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      logger.error("api", "Emotional analysis error", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
      <h3 className="text-lg font-semibold text-white">Emotional Input</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type how you're feeling..."
          className="w-full h-24 px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          disabled={isAnalyzing}
        />

        <button
          type="submit"
          disabled={isAnalyzing || !text.trim()}
          className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Emotion"}
        </button>
      </form>

      {lastEmotion && (
        <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
          <div className="text-sm text-green-400">
            Detected: <span className="font-semibold">{lastEmotion}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="text-sm text-red-400">{error}</div>
          <div className="text-xs text-red-500 mt-1">
            Make sure Listener API is running at{" "}
            {process.env.NEXT_PUBLIC_LISTENER_URL || "http://localhost:8002"}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Type a sentence describing your emotional state and let the AI analyze it.
      </div>
    </div>
  );
}
