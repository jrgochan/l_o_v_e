/**
 * Ollama Model Catalog
 *
 * Curated list of popular Ollama models with metadata for search/autocomplete.
 * Updated periodically to include new popular models.
 */

export interface OllamaModelSuggestion {
  name: string;
  family: string;
  size: string;
  description: string;
  recommended_for?: string[];
  tags?: string[];
}

/**
 * Curated list of popular Ollama models
 * Organized by family and use case
 */
export const OLLAMA_MODEL_CATALOG: OllamaModelSuggestion[] = [
  // Llama 3.1 family - Meta's flagship
  {
    name: "llama3.1:8b-instruct-q4_0",
    family: "llama",
    size: "4.7GB",
    description: "Balanced performance, great for most tasks",
    recommended_for: ["semantic_vac", "multi_emotion", "atlas_mapping"],
    tags: ["balanced", "recommended", "instruct"],
  },
  {
    name: "llama3.1:70b-instruct-q4_0",
    family: "llama",
    size: "40GB",
    description: "Clinical grade, best quality (requires 48GB+ RAM)",
    recommended_for: ["insight_generation", "multi_emotion"],
    tags: ["clinical", "large", "high-quality", "instruct"],
  },
  {
    name: "llama3.1:8b",
    family: "llama",
    size: "4.7GB",
    description: "Base model (non-instruct)",
    tags: ["base"],
  },

  // Phi-3 family - Microsoft's small efficient models
  {
    name: "phi3:mini",
    family: "phi",
    size: "2.3GB",
    description: "Fast & lightweight, great for classification",
    recommended_for: ["semantic_vac", "atlas_mapping"],
    tags: ["fast", "lightweight", "mini"],
  },
  {
    name: "phi3:medium",
    family: "phi",
    size: "7.9GB",
    description: "Medium size with strong performance",
    tags: ["medium"],
  },

  // Mixtral family - Mistral AI's mixture of experts
  {
    name: "mixtral:8x7b-instruct-v0.1",
    family: "mixtral",
    size: "26GB",
    description: "Mixture of experts, excellent for nuanced analysis",
    recommended_for: ["multi_emotion", "insight_generation"],
    tags: ["moe", "expert", "instruct", "nuanced"],
  },
  {
    name: "mixtral:8x22b",
    family: "mixtral",
    size: "80GB",
    description: "Largest Mixtral, cutting-edge (requires huge RAM)",
    tags: ["moe", "huge", "expert"],
  },

  // Qwen family - Alibaba's models
  {
    name: "qwen2.5:7b-instruct",
    family: "qwen",
    size: "4.7GB",
    description: "Strong multilingual, good general purpose",
    tags: ["multilingual", "instruct", "general"],
  },
  {
    name: "qwen2.5:14b-instruct",
    family: "qwen",
    size: "9GB",
    description: "Larger Qwen with better reasoning",
    tags: ["multilingual", "instruct", "reasoning"],
  },

  // Gemma family - Google's open models
  {
    name: "gemma2:9b-instruct",
    family: "gemma",
    size: "5.5GB",
    description: "Google Gemma, good instruction following",
    tags: ["google", "instruct"],
  },
  {
    name: "gemma2:27b",
    family: "gemma",
    size: "16GB",
    description: "Larger Gemma with strong capabilities",
    tags: ["google", "large"],
  },

  // Mistral family - Mistral AI's core models
  {
    name: "mistral:7b-instruct",
    family: "mistral",
    size: "4.1GB",
    description: "Fast and capable instruction model",
    tags: ["fast", "instruct"],
  },

  // Codellama - Code-specific
  {
    name: "codellama:13b-instruct",
    family: "codellama",
    size: "7.4GB",
    description: "Specialized for code (not recommended for L.O.V.E.)",
    tags: ["code", "instruct"],
  },

  // Llama 2 (older, but stable)
  {
    name: "llama2:13b",
    family: "llama",
    size: "7.4GB",
    description: "Older Llama 2, stable but superseded by 3.1",
    tags: ["legacy", "stable"],
  },
];

/**
 * Search the model catalog
 * Returns models matching the query string
 */
export function searchOllamaModels(query: string): OllamaModelSuggestion[] {
  if (!query || query.trim().length < 2) {
    // Return popular models if query is too short
    return OLLAMA_MODEL_CATALOG.filter(
      (m) => m.recommended_for && m.recommended_for.length > 0
    ).slice(0, 5);
  }

  const lowerQuery = query.toLowerCase().trim();

  return OLLAMA_MODEL_CATALOG.filter((model) => {
    // Search in name
    if (model.name.toLowerCase().includes(lowerQuery)) return true;

    // Search in family
    if (model.family.toLowerCase().includes(lowerQuery)) return true;

    // Search in description
    if (model.description.toLowerCase().includes(lowerQuery)) return true;

    // Search in tags
    if (model.tags && model.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) return true;

    return false;
  }).slice(0, 10); // Limit to top 10 results
}

/**
 * Get all models from a specific family
 */
export function getModelsByFamily(family: string): OllamaModelSuggestion[] {
  return OLLAMA_MODEL_CATALOG.filter((m) => m.family.toLowerCase() === family.toLowerCase());
}

/**
 * Get recommended models for a specific L.O.V.E. function
 */
export function getRecommendedModelsForFunction(functionName: string): OllamaModelSuggestion[] {
  return OLLAMA_MODEL_CATALOG.filter(
    (m) => m.recommended_for && m.recommended_for.includes(functionName)
  );
}
