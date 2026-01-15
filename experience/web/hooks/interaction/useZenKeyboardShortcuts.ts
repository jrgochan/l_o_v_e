import { useEffect, Dispatch, SetStateAction } from "react";
import type { AtlasEmotion } from "@/types";
import type { TransitionPathResponse } from "@love/experience-shared";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

interface UseZenKeyboardShortcutsProps {
  initAudio: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  setHasAudioEnabled: (enabled: boolean) => void;
  setShowDebug: Dispatch<SetStateAction<boolean>>;
  emotions: AtlasEmotion[];
}

export function useZenKeyboardShortcuts({
  initAudio,
  isMuted,
  toggleMute,
  setHasAudioEnabled,
  setShowDebug,
  emotions,
}: UseZenKeyboardShortcutsProps) {
  const settings = useSettingsStore();
  // console.log("ZenShortcuts: Init", { layers: settings?.layers, emotionsLength: emotions?.length });

  const isFlying = useExperienceStore((state) => state.isFlying);
  const setIsFlying = useExperienceStore((state) => state.setIsFlying);
  const transitionPath = useExperienceStore((state) => state.transitionPath);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "m":
          // Toggle Audio
          if (!e.ctrlKey && !e.metaKey) {
            initAudio();
            toggleMute();
            setHasAudioEnabled(true);
          }
          break;
        case "i":
          // Toggle Zen Overlay
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("cinematicOverlay", !settings.layers.cinematicOverlay);
          }
          break;
        case "v":
          // Cycle Visual Modes
          if (!e.ctrlKey && !e.metaKey) {
            const modes: Array<"subtle" | "dynamic" | "mystical"> = [
              "subtle",
              "dynamic",
              "mystical",
            ];
            const nextIndex = (modes.indexOf(settings.pathAnimationMode) + 1) % modes.length;
            settings.updateVisualSetting("pathAnimationMode", modes[nextIndex]);
          }
          break;
        case "t":
          // Toggle Flyover (Alternative)
          if (!e.ctrlKey && !e.metaKey && transitionPath) {
            setIsFlying(!isFlying);
          }
          break;
        case "a":
          // Toggle Axis
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateVisualSetting("showAxisLabels", !settings.showAxisLabels);
          }
          break;
        case "s":
          // Toggle Sphere
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("soulSphere", !settings.layers.soulSphere);
          }
          break;
        case "e":
          // Toggle Emotions (Points)
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("emotionPoints", !settings.layers.emotionPoints);
          }
          break;
        case "f":
          // Toggle Focus Mode
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateBehaviorSetting("focusMode", !settings.focusMode);
          }
          break;
        case "l":
          // Toggle Labels
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("emotionLabels", !settings.layers.emotionLabels);
          }
          break;
        case "p":
          // Toggle Paths
          if (!e.ctrlKey && !e.metaKey) {
            settings.updateLayer("transitionPaths", !settings.layers.transitionPaths);
          }
          break;
        case " ":
          // Play/Pause Journey (Space)
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault(); // Prevent scrolling
            // If a path exists, toggle play/pause regardless of layer visibility
            if (transitionPath) {
              // Optional: Auto-show paths if they are hidden?
              if (!settings.layers.transitionPaths) {
                settings.updateLayer("transitionPaths", true);
              }
              setIsFlying(!isFlying);
            }
          }
          break;
        case "arrowright":
          // Next Emotion Category Path
          if (!e.ctrlKey && !e.metaKey && settings.layers.transitionPaths) {
            e.preventDefault();

            // 1. Get unique categories
            const categories = Array.from(new Set(emotions.map((e) => e.category))).sort();
            if (categories.length === 0) return;

            // 2. Find current category index (from current path or default)
            const currentCat = transitionPath?.current_state.emotion
              ? emotions.find((e) => e.name === transitionPath.current_state.emotion)?.category
              : categories[0];

            const nextIdx = (categories.indexOf(currentCat!) + 1) % categories.length;
            const nextCat = categories[nextIdx];

            // 3. Pick 2 random emotions from this category
            const catEmotions = emotions.filter((e) => e.category === nextCat);
            if (catEmotions.length >= 2) {
              const start = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              let end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              while (end.id === start.id) {
                end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              }

              // 4. Generate & Set Path
              const newPath: TransitionPathResponse = {
                path_id: "generated-" + Date.now().toString(),
                created_at: new Date().toISOString(),
                current_state: {
                  emotion: start.name,
                  category: start.category,
                  vac: start.vac,
                  quaternion: [0, 0, 0, 1],
                },
                goal_state: {
                  emotion: end.name,
                  category: end.category,
                  vac: end.vac,
                  quaternion: [0, 0, 0, 1],
                },
                waypoints: [
                  {
                    order: 1,
                    emotion: "Transition",
                    category: nextCat,
                    vac: [
                      (start.vac[0] + end.vac[0]) / 2,
                      (start.vac[1] + end.vac[1]) / 2,
                      (start.vac[2] + end.vac[2]) / 2,
                    ],
                    quaternion: [0, 0, 0, 1],
                    distance_from_previous: 0.5,
                    estimated_time: "10s",
                    difficulty: "easy",
                    reasoning: `Exploring ${nextCat}`,
                    strategies: [],
                  },
                ],
                visualization_data: {},
                path_metrics: {
                  total_distance: 0,
                  total_estimated_time: "20s",
                  overall_difficulty: "easy",
                  success_probability: 0.9,
                  requires_external_support: false,
                },
                alternatives: [],
                personalization_notes: [],
              };
              useExperienceStore.getState().setTransitionPath(newPath);

              // Pause when switching to allow browsing
              if (isFlying) useExperienceStore.getState().setIsFlying(false);
            }
          }
          break;
        case "arrowleft":
          // Prev Emotion Category Path
          if (!e.ctrlKey && !e.metaKey && settings.layers.transitionPaths) {
            e.preventDefault();

            // 1. Get unique categories
            const categories = Array.from(new Set(emotions.map((e) => e.category))).sort();
            if (categories.length === 0) return;

            // 2. Find current category index
            const currentCat = transitionPath?.current_state.emotion
              ? emotions.find((e) => e.name === transitionPath.current_state.emotion)?.category
              : categories[0];

            const prevIdx =
              (categories.indexOf(currentCat!) - 1 + categories.length) % categories.length;
            const prevCat = categories[prevIdx];

            // 3. Pick 2 random emotions
            const catEmotions = emotions.filter((e) => e.category === prevCat);
            if (catEmotions.length >= 2) {
              const start = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              let end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              while (end.id === start.id) {
                end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              }

              // 4. Generate & Set Path
              const newPath: TransitionPathResponse = {
                path_id: "generated-" + Date.now().toString(),
                created_at: new Date().toISOString(),
                current_state: {
                  emotion: start.name,
                  category: start.category,
                  vac: start.vac,
                  quaternion: [0, 0, 0, 1],
                },
                goal_state: {
                  emotion: end.name,
                  category: end.category,
                  vac: end.vac,
                  quaternion: [0, 0, 0, 1],
                },
                waypoints: [
                  {
                    order: 1,
                    emotion: "Transition",
                    category: prevCat,
                    vac: [
                      (start.vac[0] + end.vac[0]) / 2,
                      (start.vac[1] + end.vac[1]) / 2,
                      (start.vac[2] + end.vac[2]) / 2,
                    ],
                    quaternion: [0, 0, 0, 1],
                    distance_from_previous: 0.5,
                    estimated_time: "10s",
                    difficulty: "easy",
                    reasoning: `Exploring ${prevCat}`,
                    strategies: [],
                  },
                ],
                visualization_data: {},
                path_metrics: {
                  total_distance: 0,
                  total_estimated_time: "20s",
                  overall_difficulty: "easy",
                  success_probability: 0.9,
                  requires_external_support: false,
                },
                alternatives: [],
                personalization_notes: [],
              };
              useExperienceStore.getState().setTransitionPath(newPath);

              // Pause when switching
              if (isFlying) useExperienceStore.getState().setIsFlying(false);
            }
          }
          break;
        case "arrowup":
        case "arrowdown":
          // Cycle Path (Journey) within current Category
          if (!e.ctrlKey && !e.metaKey && settings.layers.transitionPaths) {
            e.preventDefault();

            // 1. Identify current category
            let currentCat = "Happiness"; // Default
            if (transitionPath?.current_state.emotion) {
              const currentEmotion = emotions.find(
                (e) => e.name === transitionPath.current_state.emotion
              );
              if (currentEmotion) currentCat = currentEmotion.category;
            }

            // 2. Get all emotions in this category
            const catEmotions = emotions.filter((e) => e.category === currentCat);

            // 3. Generate New Random Path
            if (catEmotions.length >= 2) {
              const start = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              let end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              while (end.id === start.id) {
                end = catEmotions[Math.floor(Math.random() * catEmotions.length)];
              }

              const newPath: TransitionPathResponse = {
                path_id: "generated-" + Date.now().toString(),
                created_at: new Date().toISOString(),
                current_state: {
                  emotion: start.name,
                  category: start.category,
                  vac: start.vac,
                  quaternion: [0, 0, 0, 1],
                },
                goal_state: {
                  emotion: end.name,
                  category: end.category,
                  vac: end.vac,
                  quaternion: [0, 0, 0, 1],
                },
                waypoints: [
                  {
                    order: 1,
                    emotion: "Transition",
                    category: currentCat,
                    vac: [
                      (start.vac[0] + end.vac[0]) / 2,
                      (start.vac[1] + end.vac[1]) / 2,
                      (start.vac[2] + end.vac[2]) / 2,
                    ],
                    quaternion: [0, 0, 0, 1],
                    distance_from_previous: 0.5,
                    estimated_time: "10s",
                    difficulty: "easy",
                    reasoning: `Exploring ${currentCat} Variation`,
                    strategies: [],
                  },
                ],
                visualization_data: {},
                path_metrics: {
                  total_distance: 0,
                  total_estimated_time: "20s",
                  overall_difficulty: "easy",
                  success_probability: 0.9,
                  requires_external_support: false,
                },
                alternatives: [],
                personalization_notes: [],
              };
              useExperienceStore.getState().setTransitionPath(newPath);

              // Pause when switching
              if (isFlying) useExperienceStore.getState().setIsFlying(false);
            }
          }
          break;
        case "d":
          // Toggle Debug Overlay
          if (!e.ctrlKey && !e.metaKey) {
            setShowDebug((prev) => !prev);
          }
          break;
        case "j":
          // MOCK JOURNEY (Debug/Verification)
          if (!e.ctrlKey && !e.metaKey) {
            // Create a mock path
            const mockPath: TransitionPathResponse = {
              path_id: "mock-journey",
              created_at: new Date().toISOString(),
              current_state: {
                emotion: "Anxiety",
                category: "Fear",
                vac: [0.8, 0.8, -0.5],
                quaternion: [0, 0, 0, 1],
              },
              goal_state: {
                emotion: "Serenity",
                category: "Peace",
                vac: [-0.8, -0.5, 0.8],
                quaternion: [0, 0, 0, 1],
              },
              waypoints: [
                {
                  order: 1,
                  emotion: "Acceptance",
                  category: "Peace",
                  vac: [0.2, 0.2, 0.2],
                  quaternion: [0, 0, 0, 1],
                  distance_from_previous: 0.5,
                  estimated_time: "1m",
                  difficulty: "easy",
                  reasoning: "Acknowledging the feeling.",
                  strategies: [],
                },
                {
                  order: 2,
                  emotion: "Calm",
                  category: "Peace",
                  vac: [-0.5, -0.2, 0.5],
                  quaternion: [0, 0, 0, 1],
                  distance_from_previous: 0.3,
                  estimated_time: "1m",
                  difficulty: "easy",
                  reasoning: "Finding ground.",
                  strategies: [],
                },
              ],
              visualization_data: {},
              path_metrics: {
                total_distance: 0,
                total_estimated_time: "2m",
                overall_difficulty: "easy",
                success_probability: 0.9,
                requires_external_support: false,
              },
              alternatives: [],
              personalization_notes: [],
            };
            useExperienceStore.getState().setTransitionPath(mockPath);
            useExperienceStore.getState().setIsFlying(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    initAudio,
    isMuted,
    toggleMute,
    setHasAudioEnabled,
    setShowDebug,
    settings,
    isFlying,
    setIsFlying,
    transitionPath,
    emotions,
  ]);
}
