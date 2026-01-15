/**
 * Goal Setting Component
 *
 * Allows users to select a target emotional state and generate a transition path.
 * Integrates with Observer's transition-path API.
 */

"use client";

import { useState, useEffect } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { getObserverClient, AtlasEmotion, TransitionPathResponse } from "@love/experience-shared";
import { PersonalStrategies } from "./PersonalStrategies";
import { logger } from "@/utils/logger";
import { useGoalSettingLogic } from "./GoalSettingLogic";

export function GoalSetting() {
  const {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    emotions,
    filteredEmotions,
    selectedGoal,
    generatedPath,
    setGeneratedPath,
    isGenerating,
    isLoading,
    error,
    expandedStrategy,
    handleGeneratePath,
    handleSelectGoal,
    toggleStrategy,
    handleStartJourney,
    currentVAC,
    activeJourney,
  } = useGoalSettingLogic();

  if (!isOpen) {
    return (
      <div className="p-4 bg-gray-800/50 rounded-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all shadow-lg"
        >
          🎯 Set Emotional Goal & Get Path
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center sticky top-0 bg-gray-800/90 backdrop-blur-sm pb-2 z-10">
        <h3 className="text-lg font-semibold text-white">Set Your Emotional Goal</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      {/* Current State Display */}
      <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
        <div className="text-sm text-blue-400 font-medium">Current State</div>
        <div className="text-lg text-white">
          VAC: [{currentVAC[0].toFixed(2)}, {currentVAC[1].toFixed(2)}, {currentVAC[2].toFixed(2)}]
        </div>
      </div>

      {/* Personal Strategies */}
      <PersonalStrategies userId="00000000-0000-0000-0000-000000000001" />

      {/* Loading State */}
      {isLoading && <div className="p-4 text-center text-gray-400">Loading emotional atlas...</div>}

      {/* Goal Selection */}
      {!isLoading && (
        <div className="space-y-2">
          <label className="text-sm text-gray-300">
            Choose Goal Emotion ({filteredEmotions.length} of {emotions.length})
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emotions..."
            className="w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2 bg-gray-900/50">
            {filteredEmotions.length === 0 ? (
              <div className="text-gray-500 text-sm p-4 text-center">No emotions found</div>
            ) : (
              filteredEmotions.map((emotion) => (
                <button
                  key={emotion.id}
                  onClick={() => handleSelectGoal(emotion)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedGoal?.id === emotion.id
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  <div className="font-semibold">{emotion.name}</div>
                  <div className="text-xs opacity-70 line-clamp-1">{emotion.category}</div>
                  <div className="text-xs mt-1 font-mono">
                    VAC: [{emotion.vac[0].toFixed(1)}, {emotion.vac[1].toFixed(1)},{" "}
                    {emotion.vac[2].toFixed(1)}]
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Distance Info */}
      {selectedGoal && (
        <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
          <div className="text-sm text-purple-400">Selected Goal</div>
          <div className="text-lg text-white font-semibold">{selectedGoal.name}</div>
          <div className="text-xs text-purple-300 mt-1 italic">{selectedGoal.definition}</div>
          <div className="text-sm text-purple-300 mt-2">
            Emotional Distance: {calculateDistance(currentVAC, selectedGoal.vac).toFixed(2)} units
          </div>
        </div>
      )}

      {/* Generate Path Button */}
      <button
        onClick={handleGeneratePath}
        disabled={!selectedGoal || isGenerating}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg"
      >
        {isGenerating ? "Generating Path..." : "🗺️ Generate Transition Path"}
      </button>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="text-sm text-red-400">{error}</div>
          <div className="text-xs text-red-500 mt-1">
            Make sure Observer API is running at{" "}
            {process.env.NEXT_PUBLIC_OBSERVER_URL || "http://localhost:8000"}
          </div>
        </div>
      )}

      {/* Generated Path Display */}
      {generatedPath && (
        <div className="space-y-3 p-4 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-700 rounded-lg">
          <h4 className="text-md font-bold text-white">Your Transition Path</h4>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-black/30 rounded">
              <div className="text-gray-400">Difficulty</div>
              <div className="text-white font-semibold capitalize">
                {generatedPath.path_metrics.overall_difficulty}
              </div>
            </div>
            <div className="p-2 bg-black/30 rounded">
              <div className="text-gray-400">Est. Time</div>
              <div className="text-white font-semibold">
                {generatedPath.path_metrics.total_estimated_time}
              </div>
            </div>
            <div className="p-2 bg-black/30 rounded">
              <div className="text-gray-400">Success Rate</div>
              <div className="text-white font-semibold">
                {(generatedPath.path_metrics.success_probability * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-2 bg-black/30 rounded">
              <div className="text-gray-400">Waypoints</div>
              <div className="text-white font-semibold">{generatedPath.waypoints.length}</div>
            </div>
          </div>

          {/* Waypoints */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">Journey Steps:</div>

            {/* Start */}
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                ●
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  {generatedPath.current_state.emotion}
                </div>
                <div className="text-xs text-gray-400">Starting point</div>
              </div>
            </div>

            {/* Waypoints */}
            {generatedPath.waypoints.map((waypoint, idx) => (
              <div key={idx} className="space-y-2">
                <div className="ml-4 border-l-2 border-dashed border-purple-500 h-4"></div>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {waypoint.order}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">{waypoint.emotion}</div>
                    <div className="text-xs text-gray-400">{waypoint.reasoning}</div>
                    <div className="text-xs text-purple-400 mt-1">
                      {waypoint.estimated_time} • {waypoint.difficulty}
                    </div>

                    {/* Strategies for this waypoint */}
                    {waypoint.strategies && waypoint.strategies.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-semibold text-purple-300">
                          Recommended Strategies ({waypoint.strategies.length}):
                        </div>
                        {waypoint.strategies.map((strategy) => (
                          <div key={strategy.strategy_id} className="bg-black/30 rounded p-2">
                            <button
                              onClick={() => toggleStrategy(strategy.strategy_id)}
                              className="w-full text-left"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-white font-medium">
                                  {strategy.name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {expandedStrategy === strategy.strategy_id ? "▼" : "▶"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {strategy.time_required} • Level {strategy.difficulty_level}
                              </div>
                            </button>

                            {/* Expanded Strategy Details */}
                            {expandedStrategy === strategy.strategy_id && (
                              <div className="mt-2 pt-2 border-t border-gray-700 space-y-2">
                                <div className="text-xs text-gray-300">{strategy.description}</div>

                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-purple-300">
                                    Steps:
                                  </div>
                                  <ol className="text-xs text-gray-300 space-y-1 pl-4">
                                    {strategy.steps.map((step, stepIdx) => (
                                      <li key={stepIdx} className="list-decimal">
                                        {step}
                                      </li>
                                    ))}
                                  </ol>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <span className="px-2 py-0.5 bg-purple-900/50 rounded text-purple-300">
                                    {strategy.evidence_level}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-900/50 rounded text-blue-300">
                                    {strategy.type}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Goal */}
            <div className="ml-4 border-l-2 border-dashed border-green-500 h-4"></div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-white font-semibold">{generatedPath.goal_state.emotion}</div>
                <div className="text-xs text-gray-400">Your goal</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleStartJourney}
              disabled={activeJourney !== null}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {activeJourney ? "✓ Journey Started" : "🚀 Start Journey"}
            </button>
            <button
              onClick={() => setGeneratedPath(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        {isLoading
          ? "Loading emotional atlas..."
          : `Select an emotional goal from ${emotions.length} emotions to see the optimal path.`}
      </div>
    </div>
  );
}

// Helper function to calculate Euclidean distance
function calculateDistance(vac1: [number, number, number], vac2: [number, number, number]): number {
  const [v1, a1, c1] = vac1;
  const [v2, a2, c2] = vac2;
  return Math.sqrt(Math.pow(v1 - v2, 2) + Math.pow(a1 - a2, 2) + Math.pow(c1 - c2, 2));
}
