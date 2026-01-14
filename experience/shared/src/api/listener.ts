/**
 * Listener API Service
 *
 * Handles communication with the Listener module to process
 * voice/text input and extract VAC emotional coordinates.
 */

import { VACVector } from "../core/vac";

/**
 * Listener API Response Types
 */
export interface ListenerAnalysisResponse {
  user_id: string;
  session_id: string;
  transcription?: string;
  emotion: string;
  category: string;
  vac: {
    valence: number;
    arousal: number;
    connection: number;
  };
  confidence: number;
  reasoning: string;
  processing_time_ms: number;
}

export interface ListenerHealthResponse {
  status: string;
  service: string;
  timestamp: string;
  components: {
    transcription: boolean;
    semantic_analyzer: boolean;
    pii_scrubber: boolean;
    observer_client: boolean;
  };
}

/**
 * Listener API Configuration
 */
const DEFAULT_CONFIG = {
  baseUrl: "http://localhost:8002",
  timeout: 30000, // 30 seconds for audio processing
  retryAttempts: 2,
  retryDelay: 1000,
};

/**
 * Listener API Client
 */
export class ListenerApiClient {
  private config: typeof DEFAULT_CONFIG;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze text for emotional content
   */
  async analyzeText(
    text: string,
    userId: string = "demo-user",
    sessionId: string = "mobile-session"
  ): Promise<ListenerAnalysisResponse> {
    const url = `${this.config.baseUrl}/listener/analyze`;

    const formData = new FormData();
    formData.append("text", text);
    formData.append("user_id", userId);
    formData.append("session_id", sessionId);

    try {
      const response = await this.fetchWithRetry(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Listener API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as ListenerAnalysisResponse;
      return data;
    } catch (error) {
      console.error("Failed to analyze text:", error);
      throw error;
    }
  }

  /**
   * Analyze audio for emotional content (future implementation)
   */
  async analyzeAudio(
    audioBlob: Blob,
    userId: string = "demo-user",
    sessionId: string = "mobile-session"
  ): Promise<ListenerAnalysisResponse> {
    const url = `${this.config.baseUrl}/listener/ingest`;

    const formData = new FormData();
    // Note: React Native FormData may not support filename parameter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData.append("audio", audioBlob as any);
    formData.append("user_id", userId);
    formData.append("session_id", sessionId);

    try {
      const response = await this.fetchWithRetry(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Listener API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as ListenerAnalysisResponse;
      return data;
    } catch (error) {
      console.error("Failed to analyze audio:", error);
      throw error;
    }
  }

  /**
   * Check if Listener API is healthy
   */
  async healthCheck(): Promise<boolean> {
    const url = `${this.config.baseUrl}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      return response.ok;
    } catch (error) {
      console.error("Listener API health check failed:", error);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<ListenerHealthResponse> {
    const url = `${this.config.baseUrl}/health`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = (await response.json()) as ListenerHealthResponse;
      return data;
    } catch (error) {
      console.error("Failed to get health status:", error);
      throw error;
    }
  }

  /**
   * Fetch with automatic retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
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
 * Helper Functions
 */

/**
 * Convert Listener API VAC format to local format
 */
export function convertListenerVAC(vac: {
  valence: number;
  arousal: number;
  connection: number;
}): VACVector {
  return [vac.valence, vac.arousal, vac.connection];
}

/**
 * Default client instance (singleton)
 */
let defaultClient: ListenerApiClient | null = null;

/**
 * Get or create the default Listener API client
 */
export function getListenerClient(config?: Partial<typeof DEFAULT_CONFIG>): ListenerApiClient {
  if (!defaultClient) {
    defaultClient = new ListenerApiClient(config);
  } else if (config) {
    defaultClient.updateConfig(config);
  }

  return defaultClient;
}

/**
 * Quick text analysis helper for one-off requests
 */
export async function analyzeText(
  text: string,
  userId?: string,
  baseUrl?: string
): Promise<ListenerAnalysisResponse> {
  const client = new ListenerApiClient({ baseUrl: baseUrl || DEFAULT_CONFIG.baseUrl });
  return client.analyzeText(text, userId);
}
