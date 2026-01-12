/**
 * Strategy Feedback Modal
 *
 * Collects user feedback on strategies they tried for a waypoint.
 * Captures ratings, time spent, completion status, and notes.
 */

"use client";

import { useState } from "react";
import { StrategyInfo } from "@love/experience-shared";

export interface StrategyFeedback {
  strategy_id: string;
  name: string;
  tried: boolean;
  helpful_rating?: number;
  time_spent?: number;
  completed: boolean;
  notes?: string;
}

interface Props {
  waypoint: {
    emotion: string;
    strategies: StrategyInfo[];
  };
  onSubmit: (feedback: StrategyFeedback[]) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function StrategyFeedbackModal({ waypoint, onSubmit, onSkip, onClose }: Props) {
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Map<string, number>>(new Map());
  const [timeSpent, setTimeSpent] = useState<Map<string, number>>(new Map());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());

  const toggleStrategy = (strategyId: string) => {
    const newSelected = new Set(selectedStrategies);
    if (newSelected.has(strategyId)) {
      newSelected.delete(strategyId);
      // Clear associated data
      const newRatings = new Map(ratings);
      const newTime = new Map(timeSpent);
      const newCompleted = new Set(completed);
      const newNotes = new Map(notes);

      newRatings.delete(strategyId);
      newTime.delete(strategyId);
      newCompleted.delete(strategyId);
      newNotes.delete(strategyId);

      setRatings(newRatings);
      setTimeSpent(newTime);
      setCompleted(newCompleted);
      setNotes(newNotes);
    } else {
      newSelected.add(strategyId);
    }
    setSelectedStrategies(newSelected);
  };

  const setRating = (strategyId: string, rating: number) => {
    const newRatings = new Map(ratings);
    newRatings.set(strategyId, rating);
    setRatings(newRatings);
  };

  const setTime = (strategyId: string, minutes: number) => {
    const newTime = new Map(timeSpent);
    newTime.set(strategyId, minutes);
    setTimeSpent(newTime);
  };

  const toggleCompleted = (strategyId: string) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(strategyId)) {
      newCompleted.delete(strategyId);
    } else {
      newCompleted.add(strategyId);
    }
    setCompleted(newCompleted);
  };

  const setNote = (strategyId: string, note: string) => {
    const newNotes = new Map(notes);
    newNotes.set(strategyId, note);
    setNotes(newNotes);
  };

  const handleSubmit = () => {
    const feedback: StrategyFeedback[] = waypoint.strategies.map((strategy) => ({
      strategy_id: strategy.strategy_id,
      name: strategy.name,
      tried: selectedStrategies.has(strategy.strategy_id),
      helpful_rating: ratings.get(strategy.strategy_id),
      time_spent: timeSpent.get(strategy.strategy_id),
      completed: completed.has(strategy.strategy_id),
      notes: notes.get(strategy.strategy_id),
    }));

    onSubmit(feedback);
  };

  const canSubmit = selectedStrategies.size > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-purple-900/40 to-pink-900/40">
          <div>
            <h3 className="text-lg font-bold text-white">Waypoint Reached! 🎉</h3>
            <p className="text-sm text-gray-300">How did these strategies work for you?</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
            <div className="text-sm text-purple-400">You reached:</div>
            <div className="text-lg text-white font-bold">{waypoint.emotion}</div>
          </div>

          <div className="text-sm text-gray-300">
            Select the strategies you tried and rate their helpfulness:
          </div>

          {/* Strategy List */}
          <div className="space-y-2">
            {waypoint.strategies.map((strategy) => {
              const isSelected = selectedStrategies.has(strategy.strategy_id);
              const rating = ratings.get(strategy.strategy_id) || 0;
              const time = timeSpent.get(strategy.strategy_id) || 0;
              const isCompleted = completed.has(strategy.strategy_id);

              return (
                <div
                  key={strategy.strategy_id}
                  className={`border rounded-lg p-3 transition-all ${
                    isSelected
                      ? "bg-purple-900/40 border-purple-500"
                      : "bg-gray-800/50 border-gray-700"
                  }`}
                >
                  {/* Strategy Selection */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStrategy(strategy.strategy_id)}
                      className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-white font-medium">{strategy.name}</span>
                  </label>

                  {/* Expanded Feedback Form */}
                  {isSelected && (
                    <div className="mt-3 space-y-3 pl-6 border-l-2 border-purple-500">
                      {/* Star Rating */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          How helpful was this? (1-5 stars)
                        </label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(strategy.strategy_id, star)}
                              className={`text-2xl transition-all ${
                                star <= rating
                                  ? "text-yellow-400 hover:text-yellow-300"
                                  : "text-gray-600 hover:text-gray-500"
                              }`}
                            >
                              ★
                            </button>
                          ))}
                          {rating > 0 && (
                            <span className="ml-2 text-sm text-gray-400 self-center">
                              {rating} star{rating !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Time Spent */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Time spent (minutes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={time || ""}
                          onChange={(e) =>
                            setTime(strategy.strategy_id, parseInt(e.target.value) || 0)
                          }
                          placeholder="e.g., 15"
                          className="w-32 px-3 py-1 bg-gray-900 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>

                      {/* Completed Checkbox */}
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => toggleCompleted(strategy.strategy_id)}
                            className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500 focus:ring-offset-gray-900"
                          />
                          <span className="text-sm text-gray-300">
                            I completed this strategy fully
                          </span>
                        </label>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
                        <textarea
                          value={notes.get(strategy.strategy_id) || ""}
                          onChange={(e) => setNote(strategy.strategy_id, e.target.value)}
                          placeholder="Any thoughts or observations..."
                          rows={2}
                          className="w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg"
            >
              {canSubmit
                ? `Submit Feedback (${selectedStrategies.size} selected)`
                : "Select at least one strategy"}
            </button>
          </div>
          <button
            onClick={onSkip}
            className="w-full px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Skip Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
