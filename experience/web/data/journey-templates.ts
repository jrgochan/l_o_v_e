/**
 * Journey Templates
 *
 * Pre-built emotional journey templates for quick therapeutic access.
 * Based on research-backed transition paths.
 */

export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  from_emotion: string;
  to_emotion: string;
  waypoints: string[]; // Emotion names in order
  difficulty: "easy" | "moderate" | "hard";
  estimated_duration: string; // e.g., "15-20 min"
  success_rate?: number; // 0-1, based on bootstrap data
  categories: string[]; // Related categories
  research_notes?: string;
  icon: string;
}

/**
 * Pre-built Journey Templates
 *
 * These are the most common and well-researched emotional transitions
 */
const BASE_JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    id: "anxiety-calm",
    name: "Anxiety → Calm",
    description: "Navigate from anxious worry to peaceful calm",
    from_emotion: "Anxiety",
    to_emotion: "Calm",
    waypoints: ["Worry", "Contentment"],
    difficulty: "easy",
    estimated_duration: "15-20 min",
    success_rate: 0.85,
    categories: ["When Things Are Uncertain or Too Much", "When Life Is Good"],
    research_notes: "Mindfulness-based approach with high success rate in clinical trials",
    icon: "🌊",
  },

  {
    id: "sadness-contentment",
    name: "Sadness → Contentment",
    description: "Transform sadness into contentment through melancholy reflection",
    from_emotion: "Sadness",
    to_emotion: "Contentment",
    waypoints: ["Melancholy"],
    difficulty: "moderate",
    estimated_duration: "20-25 min",
    success_rate: 0.78,
    categories: ["When We're Hurting", "When Life Is Good"],
    research_notes: "Acceptance and commitment therapy (ACT) principles",
    icon: "🌅",
  },

  {
    id: "anger-calm",
    name: "Anger → Calm",
    description: "Release anger and find calm through frustration processing",
    from_emotion: "Anger",
    to_emotion: "Calm",
    waypoints: ["Frustration", "Contentment"],
    difficulty: "moderate",
    estimated_duration: "25-30 min",
    success_rate: 0.72,
    categories: ["When We Feel Wronged", "When Life Is Good"],
    research_notes: "Cognitive reframing with emotional regulation",
    icon: "🕊️",
  },

  {
    id: "stress-relief",
    name: "Stress → Relief",
    description: "Move from stress and overwhelm to relieved calm",
    from_emotion: "Stress",
    to_emotion: "Relief",
    waypoints: ["Overwhelm"],
    difficulty: "easy",
    estimated_duration: "15-20 min",
    success_rate: 0.82,
    categories: ["When Things Are Uncertain or Too Much", "When Life Is Good"],
    research_notes: "Progressive relaxation with body awareness",
    icon: "😌",
  },

  {
    id: "fear-trust",
    name: "Fear → Trust",
    description: "Build trust and security from a place of fear",
    from_emotion: "Fear",
    to_emotion: "Trust",
    waypoints: ["Anxiety", "Curiosity"],
    difficulty: "hard",
    estimated_duration: "30-40 min",
    success_rate: 0.65,
    categories: ["When Things Are Uncertain or Too Much", "When the Heart Is Open"],
    research_notes: "Gradual exposure with cognitive restructuring",
    icon: "🤝",
  },

  {
    id: "loneliness-belonging",
    name: "Loneliness → Belonging",
    description: "Overcome loneliness and find authentic belonging",
    from_emotion: "Loneliness",
    to_emotion: "Belonging",
    waypoints: ["Vulnerability", "Compassion"],
    difficulty: "moderate",
    estimated_duration: "20-30 min",
    success_rate: 0.74,
    categories: ["When We Search for Connection", "Places We Go With Others"],
    research_notes: "Vulnerability and self-compassion practices",
    icon: "💫",
  },

  {
    id: "shame-self-compassion",
    name: "Shame → Self-Compassion",
    description: "Transform shame into self-compassion through vulnerability",
    from_emotion: "Shame",
    to_emotion: "Self-Compassion",
    waypoints: ["Vulnerability", "Compassion"],
    difficulty: "hard",
    estimated_duration: "30-45 min",
    success_rate: 0.68,
    categories: ["When We Fall Short", "Places We Go With Others"],
    research_notes: "Shame resilience based on Brené Brown research",
    icon: "✨",
  },

  {
    id: "boredom-curiosity",
    name: "Boredom → Curiosity",
    description: "Rekindle curiosity and interest from apathy and boredom",
    from_emotion: "Boredom",
    to_emotion: "Curiosity",
    waypoints: ["Interest"],
    difficulty: "easy",
    estimated_duration: "10-15 min",
    success_rate: 0.88,
    categories: ["When Things Don't Go As Planned", "When It's Beyond Us"],
    research_notes: "Mindful awareness with interest cultivation",
    icon: "🔍",
  },

  {
    id: "guilt-self-compassion",
    name: "Guilt → Self-Compassion",
    description: "Release guilt and develop self-compassion",
    from_emotion: "Guilt",
    to_emotion: "Self-Compassion",
    waypoints: ["Regret", "Compassion"],
    difficulty: "moderate",
    estimated_duration: "25-30 min",
    success_rate: 0.76,
    categories: ["When We Fall Short", "Places We Go With Others"],
    research_notes: "Self-compassion and restorative practices",
    icon: "🕊️",
  },

  {
    id: "envy-gratitude",
    name: "Envy → Gratitude",
    description: "Transform envy into gratitude through compassion",
    from_emotion: "Envy",
    to_emotion: "Gratitude",
    waypoints: ["Admiration", "Compassion"],
    difficulty: "moderate",
    estimated_duration: "20-25 min",
    success_rate: 0.71,
    categories: ["When We Compare", "When Life Is Good"],
    research_notes: "Gratitude practice with reframing",
    icon: "🙏",
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): JourneyTemplate | undefined {
  return BASE_JOURNEY_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: "easy" | "moderate" | "hard"
): JourneyTemplate[] {
  return BASE_JOURNEY_TEMPLATES.filter((t) => t.difficulty === difficulty);
}

/**
 * Get templates containing an emotion
 */
export function getTemplatesWithEmotion(emotionName: string): JourneyTemplate[] {
  const name = emotionName.toLowerCase();
  return BASE_JOURNEY_TEMPLATES.filter(
    (t) =>
      t.from_emotion.toLowerCase() === name ||
      t.to_emotion.toLowerCase() === name ||
      t.waypoints.some((w) => w.toLowerCase() === name)
  );
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): JourneyTemplate[] {
  const q = query.toLowerCase();
  return BASE_JOURNEY_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.from_emotion.toLowerCase().includes(q) ||
      t.to_emotion.toLowerCase().includes(q)
  );
}

/**
 * Get templates valid for the current set of emotions
 */
export function getValidTemplates(availableEmotions: { name: string }[]): JourneyTemplate[] {
  const availableNames = new Set(availableEmotions.map((e) => e.name.toLowerCase()));

  return BASE_JOURNEY_TEMPLATES.filter((template) => {
    // Check if start and end emotions exist
    if (!availableNames.has(template.from_emotion.toLowerCase())) return false;
    if (!availableNames.has(template.to_emotion.toLowerCase())) return false;

    // Check if all waypoints exist
    if (!template.waypoints.every((w) => availableNames.has(w.toLowerCase()))) return false;

    return true;
  });
}

// Re-export for backward compatibility
export const JOURNEY_TEMPLATES = BASE_JOURNEY_TEMPLATES;
