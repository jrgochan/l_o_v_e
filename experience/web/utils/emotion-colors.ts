
import { AtlasEmotion, CATEGORY_COLORS } from "@/types/atlas-admin";

/**
 * Resolves the color for an emotion, prioritizing specific color hints
 * over category-based defaults.
 * 
 * Priority:
 * 1. Emotion-specific color hint (from database/API)
 * 2. Hardcoded category color map (legacy Atlas support)
 * 3. Default gray fallback
 */
export function resolveEmotionColor(emotion: Partial<AtlasEmotion> | undefined | null, defaultColor = "#888888"): string {
    if (!emotion) return defaultColor;

    // 1. Explicit color hint from DB
    if (emotion.color_hint) {
        return emotion.color_hint;
    }

    // 2. Category mapping (Fallback for Atlas legacy)
    if (emotion.category && CATEGORY_COLORS[emotion.category]) {
        return CATEGORY_COLORS[emotion.category];
    }

    return defaultColor;
}

/**
 * Resolves color from category name alone (legacy support)
 */
export function resolveCategoryColor(category: string | undefined): string {
    if (!category) return "#888888";
    return CATEGORY_COLORS[category] || "#888888";
}
