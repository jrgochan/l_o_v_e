/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Observer API Service
 *
 * Handles communication with the Observer module to fetch
 * emotional state data and update the Soul Sphere visualization.
 */

import { VACVector, Quaternion } from "../core/vac";

/**
 * Observer API Response Types
 */
export interface ObserverEmotionResponse {
  user_id: string;
  timestamp: string;
  vac_vector: [number, number, number];
  quaternion: {
    w: number;
    x: number;
    y: number;
    z: number;
  };
  dominant_emotion: {
    name: string;
    vac: [number, number, number];
    confidence: number;
  };
  metrics: {
    elasticity: number;
    rigidity: number;
    angular_distance?: number;
  };
}

export interface ObserverHistoryResponse {
  user_id: string;
  states: Array<{
    timestamp: string;
    vac_vector: [number, number, number];
    dominant_emotion: string;
  }>;
  total_count: number;
}

/**
 * Atlas API Response Types
 */
export interface AtlasEmotion {
  id: string;
  name: string;
  category: string;
  definition: string;
  vac: [number, number, number];
  quaternion: [number, number, number, number];
}

export interface AtlasEmotionsResponse {
  total_count: number;
  emotions: AtlasEmotion[];
}

/**
 * Bootstrap Data Types
 */
export interface BootstrapStrategyRating {
  strategy_name: string;
  global_rating: number;
  success_rate: number;
  best_for_patterns: string[];
  avg_time_to_effect: string;
  difficulty: number;
  completion_rate: number;
}

export interface BootstrapPathTemplate {
  from_emotion: string;
  to_emotion: string;
  optimal_path: string[];
  difficulty: number;
  estimated_time_minutes: number;
  success_rate: number;
  recommended_strategies: string[];
}

export interface UserContext {
  time_of_day?: "morning" | "afternoon" | "evening" | "late_night";
  energy_level?: "high" | "moderate" | "low";
  location?: "home" | "work" | "public";
  available_time?: "5_minutes" | "15_minutes" | "30_minutes" | "60_plus_minutes";
  experience_level?: "beginner" | "intermediate" | "advanced";
}

export interface ContextualRecommendation {
  context: UserContext;
  recommended_strategies: string[];
  avoid_strategies: string[];
  reasoning: string[];
}

export interface ChallengePattern {
  challenge_name: string;
  starting_emotions: string[];
  immediate_relief_strategies: string[];
  sustained_work_strategies: string[];
  difficulty_progression: number[];
}

/**
 * Transition Path API Response Types
 */
export interface StrategyInfo {
  strategy_id: string;
  name: string;
  type: string;
  description: string;
  steps: string[];
  time_required: string;
  difficulty_level: number;
  evidence_level: string;
  effectiveness_rating?: number;
  times_successful_for_user: number;
  user_notes: string[];
}

export interface WaypointInfo {
  order: number;
  emotion: string;
  category: string;
  vac: [number, number, number];
  quaternion: [number, number, number, number];
  distance_from_previous: number;
  estimated_time: string;
  difficulty: string;
  reasoning: string;
  strategies: StrategyInfo[];
}

export interface TransitionPathResponse {
  path_id: string;
  created_at: string;
  current_state: {
    emotion: string;
    category: string;
    vac: [number, number, number];
    quaternion: [number, number, number, number];
  };
  goal_state: {
    emotion: string;
    category: string;
    vac: [number, number, number];
    quaternion: [number, number, number, number];
  };
  waypoints: WaypointInfo[];
  visualization_data: any;
  path_metrics: {
    total_distance: number;
    total_estimated_time: string;
    overall_difficulty: string;
    success_probability: number;
    requires_external_support: boolean;
  };
  alternatives: any[];
  personalization_notes: string[];
}

/**
 * Observer API Configuration
 */
const DEFAULT_CONFIG = {
  baseUrl: "http://localhost:8000",
  pollingInterval: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  timeout: 5000, // 5 seconds
};

/**
 * Observer API Client
 */
export class ObserverApiClient {
  private config: typeof DEFAULT_CONFIG;
  private abortController: AbortController | null = null;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current emotional state for a user
   */
  async getCurrentState(userId: string): Promise<ObserverEmotionResponse> {
    const url = `${this.config.baseUrl}/observer/current/${userId}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ObserverEmotionResponse;
      return data;
    } catch (error) {
      console.error("Failed to fetch current state:", error);
      throw error;
    }
  }

  /**
   * Get historical emotional states for a user
   */
  async getHistory(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ObserverHistoryResponse> {
    const url = `${this.config.baseUrl}/observer/history/${userId}?limit=${limit}&offset=${offset}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ObserverHistoryResponse;
      return data;
    } catch (error) {
      console.error("Failed to fetch history:", error);
      throw error;
    }
  }

  /**
   * Load the complete emotion atlas (87 emotions)
   */
  async loadEmotionAtlas(category?: string): Promise<AtlasEmotionsResponse> {
    let url = `${this.config.baseUrl}/observer/atlas/emotions`;
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as AtlasEmotionsResponse;
      return data;
    } catch (error) {
      console.error("Failed to load emotion atlas:", error);
      throw error;
    }
  }

  /**
   * Generate an optimal transition path between emotional states
   */
  async generateTransitionPath(
    userId: string,
    currentVAC: [number, number, number],
    goalVAC: [number, number, number],
    maxWaypoints: number = 3
  ): Promise<TransitionPathResponse> {
    const url = `${this.config.baseUrl}/observer/transition-path`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          current_vac: currentVAC,
          goal_vac: goalVAC,
          max_waypoints: maxWaypoints,
          include_alternatives: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `API error: ${response.statusText}`);
      }

      const data = (await response.json()) as TransitionPathResponse;
      return data;
    } catch (error) {
      console.error("Failed to generate transition path:", error);
      throw error;
    }
  }

  /**
   * Start a new journey
   */
  async startJourney(
    userId: string,
    pathId: string,
    context?: any
  ): Promise<{ journey_id: string; status: string; started_at: string }> {
    const url = `${this.config.baseUrl}/observer/journey/start`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          path_id: pathId,
          start_time: new Date().toISOString(),
          context: context || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to start journey:", error);
      throw error;
    }
  }

  /**
   * Get bootstrap strategy effectiveness ratings
   */
  async getBootstrapStrategyRatings(): Promise<BootstrapStrategyRating[]> {
    const url = `${this.config.baseUrl}/observer/bootstrap/strategy-effectiveness`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.ratings || [];
    } catch (error) {
      console.error("Failed to fetch bootstrap strategy ratings:", error);
      throw error;
    }
  }

  /**
   * Get bootstrap path templates
   */
  async getBootstrapPathTemplates(
    fromEmotion?: string,
    toEmotion?: string,
    maxDifficulty?: number
  ): Promise<BootstrapPathTemplate[]> {
    let url = `${this.config.baseUrl}/observer/bootstrap/path-templates`;
    const params = new URLSearchParams();

    if (fromEmotion) params.append("from_emotion", fromEmotion);
    if (toEmotion) params.append("to_emotion", toEmotion);
    if (maxDifficulty !== undefined) params.append("max_difficulty", maxDifficulty.toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error("Failed to fetch bootstrap path templates:", error);
      throw error;
    }
  }

  /**
   * Get contextual strategy recommendations
   */
  async getContextRecommendations(context: UserContext): Promise<ContextualRecommendation> {
    let url = `${this.config.baseUrl}/observer/bootstrap/context-recommendations`;
    const params = new URLSearchParams();

    if (context.time_of_day) params.append("time_of_day", context.time_of_day);
    if (context.energy_level) params.append("energy_level", context.energy_level);
    if (context.location) params.append("location", context.location);
    if (context.available_time) params.append("available_time", context.available_time);
    if (context.experience_level) params.append("experience_level", context.experience_level);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.recommendations;
    } catch (error) {
      console.error("Failed to fetch context recommendations:", error);
      throw error;
    }
  }

  /**
   * Get challenge patterns
   */
  async getChallengePatterns(challengeName?: string): Promise<ChallengePattern[]> {
    let url = `${this.config.baseUrl}/observer/bootstrap/challenge-patterns`;

    if (challengeName) {
      url += `?challenge_name=${encodeURIComponent(challengeName)}`;
    }

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.patterns || [];
    } catch (error) {
      console.error("Failed to fetch challenge patterns:", error);
      throw error;
    }
  }

  /**
   * Get all bootstrap data in one call
   */
  async getAllBootstrapData(): Promise<any> {
    const url = `${this.config.baseUrl}/observer/bootstrap/all`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Failed to fetch all bootstrap data:", error);
      throw error;
    }
  }

  /**
   * Get user's effective strategies
   */
  async getUserEffectiveStrategies(userId: string, limit: number = 5): Promise<any> {
    const url = `${this.config.baseUrl}/observer/user/${userId}/effective-strategies?limit=${limit}`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch effective strategies:", error);
      throw error;
    }
  }

  /**
   * Get user's journey history
   */
  async getUserJourneyHistory(userId: string): Promise<any> {
    const url = `${this.config.baseUrl}/observer/user/${userId}/journey-history`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`Observer API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch journey history:", error);
      throw error;
    }
  }

  /**
   * Check if Observer API is healthy
   */
  async healthCheck(): Promise<boolean> {
    const url = `${this.config.baseUrl}/health`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      // console.error("Observer API health check failed:", error);
      return false;
    }
  }

  /**
   * Fetch with automatic retry logic
   */
  private async fetchWithRetry(url: string, attempt: number = 1): Promise<Response> {
    try {
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => this.abortController?.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        // console.log(`Retry attempt ${attempt} for ${url}`);
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Cancel any in-flight requests
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof DEFAULT_CONFIG>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Polling Manager
 *
 * Manages automatic polling of Observer API at regular intervals
 */
export class ObserverPollingManager {
  private client: ObserverApiClient;
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private onUpdate: ((data: ObserverEmotionResponse) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  constructor(client: ObserverApiClient) {
    this.client = client;
  }

  /**
   * Start polling for emotional state updates
   */
  start(
    userId: string,
    onUpdate: (data: ObserverEmotionResponse) => void,
    onError?: (error: Error) => void,
    intervalMs?: number
  ): void {
    if (this.isPolling) {
      // console.warn("Polling is already active");
      return;
    }

    this.onUpdate = onUpdate;
    this.onError =
      onError ||
      ((_error) => {
        /* Silent error */
      });
    this.isPolling = true;

    // Immediate first fetch
    this.poll(userId);

    // Set up interval
    this.intervalId = setInterval(() => {
      this.poll(userId);
    }, intervalMs || DEFAULT_CONFIG.pollingInterval);

    // console.log(`Started polling for user ${userId}`);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.client.cancel();
    this.isPolling = false;
    this.onUpdate = null;
    this.onError = null;

    // console.log("Stopped polling");
  }

  /**
   * Perform a single poll
   */
  private async poll(userId: string): Promise<void> {
    if (!this.isPolling) return;

    try {
      const data = await this.client.getCurrentState(userId);

      if (this.onUpdate) {
        this.onUpdate(data);
      }
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error);
      }
    }
  }

  /**
   * Check if currently polling
   */
  isActive(): boolean {
    return this.isPolling;
  }
}

/**
 * Helper Functions
 */

/**
 * Convert Observer API quaternion format to local format
 */
export function convertQuaternion(q: { w: number; x: number; y: number; z: number }): Quaternion {
  return [q.w, q.x, q.y, q.z];
}

/**
 * Convert Observer API VAC format to local format
 */
export function convertVAC(vac: [number, number, number]): VACVector {
  return vac;
}

/**
 * Default client instance (singleton)
 */
let defaultClient: ObserverApiClient | null = null;

/**
 * Get or create the default Observer API client
 */
export function getObserverClient(config?: Partial<typeof DEFAULT_CONFIG>): ObserverApiClient {
  if (!defaultClient) {
    defaultClient = new ObserverApiClient(config);
  } else if (config) {
    defaultClient.updateConfig(config);
  }

  return defaultClient;
}

/**
 * Create a new polling manager
 */
export function createPollingManager(
  config?: Partial<typeof DEFAULT_CONFIG>
): ObserverPollingManager {
  const client = new ObserverApiClient(config);
  return new ObserverPollingManager(client);
}

/**
 * Quick fetch helper for one-off requests
 */
export async function fetchCurrentState(
  userId: string,
  baseUrl: string = DEFAULT_CONFIG.baseUrl
): Promise<ObserverEmotionResponse> {
  const client = new ObserverApiClient({ baseUrl });
  return client.getCurrentState(userId);
}

/**
 * Mock data generator for testing without Observer API
 */
export function generateMockResponse(userId: string): ObserverEmotionResponse {
  const emotions = [
    { name: "Joy", vac: [0.9, 0.7, 0.8] },
    { name: "Calm", vac: [0.5, -0.8, 0.4] },
    { name: "Excitement", vac: [0.8, 0.9, 0.6] },
    { name: "Grief", vac: [-0.9, -0.4, 0.5] },
  ];

  const emotion = emotions[Math.floor(Math.random() * emotions.length)];

  return {
    user_id: userId,
    timestamp: new Date().toISOString(),
    vac_vector: emotion.vac as [number, number, number],
    quaternion: { w: 0.7, x: 0.3, y: 0.5, z: 0.4 },
    dominant_emotion: {
      name: emotion.name,
      vac: emotion.vac as [number, number, number],
      confidence: 0.85,
    },
    metrics: {
      elasticity: Math.random() * 0.5,
      rigidity: Math.random() * 0.3,
      angular_distance: Math.random() * Math.PI,
    },
  };
}
