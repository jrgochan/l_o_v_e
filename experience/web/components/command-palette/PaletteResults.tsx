"use client";

import { Command } from "cmdk";
import type { Emotion, EmotionPath } from "@/types/visualization";

interface QuickAction {
  command: string;
  description: string;
  icon?: string;
}

interface PaletteResultsProps {
  search: string;
  currentPage: string;
  selectedCategory: string | null;
  selectedEmotionIds: Set<string>;
  filteredEmotions: Emotion[];
  filteredPaths: EmotionPath[];
  recentEmotionsList: Emotion[];
  favoriteEmotionsList: Emotion[];
  emotionsByCategory: Map<string, Emotion[]>;
  quickActions: QuickAction[];
  onSelectEmotion: (emotion: Emotion) => void;
  onSelectPath: (pathId: string) => void;
  onSelectCategory: (category: string) => void;
  onQuickAction: (command: string) => void;
  isFavorite: (id: string) => boolean;
}

export function PaletteResults({
  search,
  currentPage,
  selectedCategory,
  selectedEmotionIds,
  filteredEmotions,
  filteredPaths,
  recentEmotionsList,
  favoriteEmotionsList,
  emotionsByCategory,
  quickActions,
  onSelectEmotion,
  onSelectPath,
  onSelectCategory,
  onQuickAction,
  isFavorite,
}: PaletteResultsProps) {
  // Scenario 1: Quick Actions (when typing /)
  if (currentPage === "home" && search.startsWith("/")) {
    return (
      <Command.Group heading="⚡ Quick Actions">
        {quickActions
          .filter((qa) => qa.command.startsWith(search))
          .map((qa) => (
            <Command.Item
              key={qa.command}
              value={qa.command}
              onSelect={() => onQuickAction(qa.command)}
              className="px-3 py-2 rounded-lg cursor-pointer hover:bg-purple-500/20 hover:text-purple-300 transition-colors duration-150"
            >
              <div className="font-mono text-purple-400">{qa.command}</div>
              <div className="text-xs text-gray-400 mt-1">{qa.description}</div>
            </Command.Item>
          ))}
      </Command.Group>
    );
  }

  // Scenario 2: Active Search (Filtered Emotions & Paths)
  if (currentPage === "home" && (search || filteredPaths.length > 0) && !search.startsWith("/")) {
    return (
      <>
        {/* Helper Hint for Operators */}
        {!search.match(/^[~!>@]/) &&
          !search.match(/^(valence|arousal|connection)/i) &&
          filteredEmotions.length === 0 && (
            <div className="px-4 py-6 text-center">
              <div className="text-sm text-gray-400 mb-3">Try power search operators:</div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  <span className="text-cyan-400 font-mono">~joy</span> - Find similar emotions
                </div>
                <div>
                  <span className="text-purple-400 font-mono">!anxiety</span> - Find opposite
                  emotions
                </div>
                <div>
                  <span className="text-orange-400 font-mono">&gt;expansive</span> - Filter by
                  category
                </div>
                <div>
                  <span className="text-yellow-400 font-mono">@favorite</span> - Show favorites only
                </div>
                <div>
                  <span className="text-green-400 font-mono">valence&gt;0.5</span> - Filter by VAC
                  coordinate
                </div>
              </div>
            </div>
          )}

        {/* Filtered Paths */}
        {filteredPaths.length > 0 && (
          <Command.Group
            heading={
              !search && selectedEmotionIds.size === 1
                ? `✨ Paths from ${filteredEmotions.find((e) => selectedEmotionIds.has(e.id))?.name || "Selected"}`
                : "🛤️ Relevant Paths"
            }
          >
            {filteredPaths.map((path) => (
              <Command.Item
                key={path.id}
                value={`path ${path.from.name} ${path.to.name}`}
                onSelect={() => onSelectPath(path.id)}
                className="group px-4 py-3 my-1 rounded-xl cursor-pointer bg-gray-800/40 hover:bg-gray-800 transition-all duration-200 border border-gray-700/50 hover:border-gray-600 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-200">
                    <span className="text-xs font-mono opacity-50">START</span>
                    <span className="font-semibold">{path.from.name}</span>
                  </div>
                  <div className="flex flex-col items-center px-4">
                    <div className="h-0.5 w-16 bg-gray-700/50 group-hover:bg-cyan-500/50 relative">
                      <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-gray-600 group-hover:bg-cyan-400" />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 font-mono tracking-wider">
                      {path.waypoints.length === 0 ? "DIRECT" : `${path.waypoints.length} STOPS`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-bold text-lg">{path.to.name}</span>
                    <span className="text-xs font-mono opacity-50">GOAL</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                      ${
                        path.difficulty === "easy"
                          ? "bg-green-500/20 text-green-300"
                          : path.difficulty === "moderate"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-300"
                      }
                    `}
                  >
                    {path.difficulty}
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-cyan-400 transition-colors">
                    Open ↵
                  </span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Filtered Emotions */}
        {filteredEmotions.length > 0 && (
          <Command.Group
            heading={
              search.startsWith("~")
                ? "🔗 Similar Emotions"
                : search.startsWith("!")
                  ? "⚡ Opposite Emotions"
                  : search.startsWith(">")
                    ? "📂 Filtered by Category"
                    : search === "@favorite" || search === "@favorites"
                      ? "⭐ Favorites"
                      : search.match(/^(valence|arousal|connection)/i)
                        ? "📊 VAC Filtered"
                        : "🔍 Search Results"
            }
          >
            {filteredEmotions.map((emotion) => (
              <Command.Item
                key={emotion.id}
                value={`${emotion.name} ${emotion.category}`}
                keywords={[emotion.name.toLowerCase(), emotion.category.toLowerCase()]}
                onSelect={() => onSelectEmotion(emotion)}
                className={`
                  px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 flex items-center justify-between
                  ${
                    selectedEmotionIds.has(emotion.id)
                      ? "bg-cyan-500/30 text-cyan-200"
                      : "hover:bg-cyan-500/20 hover:text-cyan-300"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{emotion.color_hint || "✨"}</span>
                  <div>
                    <div className="font-medium">{emotion.name}</div>
                    <div className="text-xs text-gray-400">{emotion.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEmotionIds.has(emotion.id) && (
                    <span className="text-cyan-400 text-xs">✓</span>
                  )}
                  {isFavorite(emotion.id) && <span className="text-yellow-400 text-xs">⭐</span>}
                  <div className="text-xs text-gray-500 font-mono">
                    [{emotion.vac.map((v) => v.toFixed(1)).join(", ")}]
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </>
    );
  }

  // Scenario 3: Category Drill-Down
  if (currentPage === "category" && selectedCategory) {
    return (
      <Command.Group heading={`📂 ${selectedCategory}`}>
        {emotionsByCategory.get(selectedCategory)?.map((emotion) => (
          <Command.Item
            key={emotion.id}
            value={emotion.name}
            onSelect={() => onSelectEmotion(emotion)}
            className={`
              px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 flex items-center justify-between
              ${
                selectedEmotionIds.has(emotion.id)
                  ? "bg-cyan-500/30 text-cyan-200"
                  : "hover:bg-cyan-500/20 hover:text-cyan-300"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{emotion.color_hint || "✨"}</span>
              <div className="font-medium">{emotion.name}</div>
            </div>
            <div className="flex items-center gap-2">
              {selectedEmotionIds.has(emotion.id) && (
                <span className="text-cyan-400 text-xs">✓</span>
              )}
              {isFavorite(emotion.id) && <span className="text-yellow-400 text-xs">⭐</span>}
              <div className="text-xs text-gray-500 font-mono">
                [{emotion.vac.map((v) => v.toFixed(1)).join(", ")}]
              </div>
            </div>
          </Command.Item>
        ))}
      </Command.Group>
    );
  }

  // Scenario 4: Home View (Recent, Favorites, Categories)
  // Only show if no search term
  if (currentPage === "home" && !search) {
    return (
      <>
        <Command.Empty className="py-12 text-center text-gray-400 text-sm">
          <div className="mb-2">🤔 No direct matches found</div>
          <div className="text-xs text-gray-500">
            Try searching for an emotion like &quot;joy&quot; or path like &quot;joy to awe&quot;
          </div>
        </Command.Empty>

        {/* Favorites */}
        {favoriteEmotionsList.length > 0 && (
          <Command.Group heading="⭐ Favorites" className="mb-2">
            {favoriteEmotionsList.map((emotion) => (
              <Command.Item
                key={emotion.id}
                value={emotion.name}
                onSelect={() => onSelectEmotion(emotion)}
                className="px-3 py-2 rounded-lg cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors duration-150 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{emotion.color_hint || "✨"}</span>
                  <div>
                    <div className="font-medium">{emotion.name}</div>
                    <div className="text-xs text-gray-400">{emotion.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEmotionIds.has(emotion.id) && (
                    <span className="text-cyan-400 text-xs">✓</span>
                  )}
                  <div className="text-xs text-gray-500 font-mono">
                    [{emotion.vac.map((v) => v.toFixed(1)).join(", ")}]
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Recent */}
        {recentEmotionsList.length > 0 && (
          <Command.Group heading="🕐 Recent" className="mb-2">
            {recentEmotionsList.map((emotion) => (
              <Command.Item
                key={emotion.id}
                value={emotion.name}
                onSelect={() => onSelectEmotion(emotion)}
                className="px-3 py-2 rounded-lg cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors duration-150 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{emotion.color_hint || "✨"}</span>
                  <div>
                    <div className="font-medium">{emotion.name}</div>
                    <div className="text-xs text-gray-400">{emotion.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEmotionIds.has(emotion.id) && (
                    <span className="text-cyan-400 text-xs">✓</span>
                  )}
                  {isFavorite(emotion.id) && <span className="text-yellow-400 text-xs">⭐</span>}
                  <div className="text-xs text-gray-500 font-mono">
                    [{emotion.vac.map((v) => v.toFixed(1)).join(", ")}]
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Categories */}
        <Command.Group heading="📂 All Categories">
          {Array.from(emotionsByCategory.entries()).map(([category, emotions]) => (
            <Command.Item
              key={category}
              value={category}
              onSelect={() => onSelectCategory(category)}
              className="px-3 py-2 rounded-lg cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors duration-150 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📂</span>
                <span className="font-medium">{category}</span>
              </div>
              <span className="text-xs text-gray-500">({emotions.length} emotions)</span>
            </Command.Item>
          ))}
        </Command.Group>
      </>
    );
  }

  return null;
}
