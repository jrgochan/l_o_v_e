import type { AtlasEmotion } from "@/types/atlas-admin";
import { useFocusActions } from "./actions/useFocusActions";
import { useSelectionActions } from "./actions/useSelectionActions";
import { useViewActions } from "./actions/useViewActions";

interface UseNavigationActionsOptions {
  findEmotionByName: (name: string) => AtlasEmotion | null;
  onNavigate?: () => void;
}

export function useNavigationActions(options: UseNavigationActionsOptions) {
  const { focusEmotion, autoFocusEmotion } = useFocusActions(options);
  const { selectEmotionByName, addToSelection } = useSelectionActions(options);
  const { viewInSphere, viewMultipleInSphere } = useViewActions(options);

  return {
    focusEmotion,
    selectEmotionByName,
    viewInSphere,
    addToSelection,
    viewMultipleInSphere,
    autoFocusEmotion,
  };
}
