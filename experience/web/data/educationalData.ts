export const GLOSSARY: Record<string, { title: string; definition: string; icon?: string }> = {
  VAC_MODEL: {
    title: "VAC Model",
    definition: "Valence, Arousal, and Connection. A 3D coordinate system used to map emotions mathematically. It measures positivity (Valence), energy (Arousal), and social connectedness (Connection).",
    icon: "🧠"
  },
  BRIDGE_EMOTION: {
    title: "Bridge Emotion",
    definition: "An intermediate emotional state (like Curiosity or Vulnerability) that serves as a gateway between disconnected emotional categories, enabling difficult transitions.",
    icon: "🌉"
  },
  CATEGORY_TRANSITION: {
    title: "Category Transition",
    definition: "Moving from one semantic group of emotions to another (e.g., from 'Places We Go When Things Are Uncertain' to 'Places We Go When We Search for Connection').",
    icon: "🔁"
  },
  AROUSAL_REGULATION: {
    title: "Arousal Regulation",
    definition: "The process of managing high-energy states (like Panic or Rage) down to manageable levels before attempting complex cognitive restructuring.",
    icon: "📉"
  },
  PATH_DIFFICULTY: {
    title: "Path Difficulty",
    definition: "A composite metric based on VAC distance, category changes, and required energy. 'Difficult' paths often require external support or multiple sessions.",
    icon: "🏔️"
  },
  SEARCH_DEPTH: {
    title: "Search Depth",
    definition: "How many steps forward the AI 'thought' to find this path. Deeper searches explore more complex, multi-stage emotional journeys.",
    icon: "🔍"
  },
  NODES_EXPLORED: {
    title: "Nodes Explored",
    definition: "The total number of emotional states considered by the algorithm before finding the optimal path. Higher numbers indicate a more complex problem space.",
    icon: "🕸️"
  },
  PRUNED_PATHS: {
    title: "Pruned Paths",
    definition: "Potential paths that were discarded because they violated therapeutic constraints (e.g., jumping too far too fast, or increasing arousal dangerously).",
    icon: "✂️"
  }
};
