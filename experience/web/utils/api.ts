import { useAuthStore } from "@/stores/authStore";
import {
  AdminSession,
  AdminSessionListResponse,
  Emotion,
  EmotionUpdate,
  AtlasExportData,
  AtlasImportResult,
  TransitionStrategy,
  StrategyUpdate,
  StrategiesExportData,
  StrategiesImportResult,
  ModelAssignment,
  ModelAssignmentUpdate,
  ClinicalAlert,
  BootstrapData,
  BootstrapDataCreate,
  BootstrapDataUpdate,
  PromptTemplate,
  PromptTemplateCreate,
  PromptTemplateUpdate,
  PromptTestRequest,
  PromptTestResponse,
} from "../types/admin";

export const API_BASE_URL = process.env.NEXT_PUBLIC_OBSERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = API_BASE_URL;

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
  /** Internal flag to prevent infinite retry loops on 401 */
  _isRetry?: boolean;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { authenticated = true, headers = {}, ...rest } = options;

    const reqHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (authenticated) {
      const token = useAuthStore.getState().token;
      if (token) {
        (reqHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    // Ensure endpoint starts with / if not present
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    const response = await fetch(`${API_URL}${cleanEndpoint}`, {
      headers: reqHeaders,
      ...rest,
    });

    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        // Attempt a single token refresh before giving up
        if (!options._isRetry) {
          const refreshed = await useAuthStore.getState().refreshToken();
          if (refreshed) {
            // Retry the original request with the new token
            return this.request<T>(endpoint, { ...options, _isRetry: true });
          }
        }

        // Refresh failed or this was already a retry — log out
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("session-expired"));
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, authenticated = true): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", authenticated });
  }

  post<T>(endpoint: string, body: unknown, authenticated = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      authenticated,
    });
  }

  put<T>(endpoint: string, body: unknown, authenticated = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      authenticated,
    });
  }

  del<T>(endpoint: string, authenticated = true): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", authenticated });
  }
}

export const api = new ApiClient();

// Admin-specific API helpers
export const adminApi = {
  getSessions: (skip = 0, limit = 50) =>
    api.get<AdminSessionListResponse>(`admin/sessions?skip=${skip}&limit=${limit}`),

  async getSessionDetails(id: string): Promise<AdminSession> {
    return api.get<AdminSession>(`/admin/sessions/${id}`);
  },

  // Atlas Data Management
  async getEmotions(): Promise<Emotion[]> {
    return api.get<Emotion[]>("/admin/visualization/emotions");
  },

  async updateEmotion(id: string, data: EmotionUpdate): Promise<Emotion> {
    return api.put<Emotion>(`/admin/visualization/emotions/${id}`, data);
  },

  async exportAtlasData(): Promise<AtlasExportData> {
    return api.get<AtlasExportData>("/admin/visualization/export");
  },

  async importAtlasData(data: {
    emotions: AtlasExportData["emotions"];
  }): Promise<AtlasImportResult> {
    return api.post<AtlasImportResult>("/admin/visualization/import", data);
  },

  // AI Models
  getAiModels: async (): Promise<ModelAssignment[]> => {
    return api.get<ModelAssignment[]>("/admin/ai-models");
  },

  updateAiModel: async (func: string, data: ModelAssignmentUpdate): Promise<ModelAssignment> => {
    return api.put<ModelAssignment>(`/admin/ai-models/${func}`, data);
  },

  // Clinical Alerts
  getClinicalAlerts: async (
    page = 1,
    limit = 50,
    level?: string
  ): Promise<{ items: ClinicalAlert[]; total: number }> => {
    const skip = (page - 1) * limit;
    let url = `/admin/alerts?skip=${skip}&limit=${limit}`;
    if (level && level !== "all") url += `&level=${level}`;

    return api.get<{ items: ClinicalAlert[]; total: number }>(url);
  },

  // Strategies Management
  async getStrategies(): Promise<TransitionStrategy[]> {
    return api.get<TransitionStrategy[]>("/admin/strategies");
  },

  async updateStrategy(id: string, data: StrategyUpdate): Promise<TransitionStrategy> {
    return api.put<TransitionStrategy>(`/admin/strategies/${id}`, data);
  },

  async exportStrategies(): Promise<StrategiesExportData> {
    return api.get<StrategiesExportData>("/admin/strategies/export");
  },

  async importStrategies(data: {
    strategies: StrategiesExportData["strategies"];
  }): Promise<StrategiesImportResult> {
    return api.post<StrategiesImportResult>("/admin/strategies/import", data);
  },

  // Bootstrap Data
  async getBootstrapData(type?: string): Promise<BootstrapData[]> {
    const url = type ? `/admin/bootstrap?type=${type}` : "/admin/bootstrap";
    return api.get<BootstrapData[]>(url);
  },

  async createBootstrapData(data: BootstrapDataCreate): Promise<BootstrapData> {
    return api.post<BootstrapData>("/admin/bootstrap", data);
  },

  async updateBootstrapData(id: string, data: BootstrapDataUpdate): Promise<BootstrapData> {
    return api.put<BootstrapData>(`/admin/bootstrap/${id}`, data);
  },

  async deleteBootstrapData(id: string): Promise<void> {
    return api.del<void>(`/admin/bootstrap/${id}`);
  },

  // Prompt Templates
  async getPromptTemplates(functionName?: string): Promise<PromptTemplate[]> {
    const url = functionName ? `/admin/prompts?function_name=${functionName}` : "/admin/prompts";
    return api.get<PromptTemplate[]>(url);
  },

  async createPromptTemplate(data: PromptTemplateCreate): Promise<PromptTemplate> {
    return api.post<PromptTemplate>("/admin/prompts", data);
  },

  async updatePromptTemplate(id: string, data: PromptTemplateUpdate): Promise<PromptTemplate> {
    return api.put<PromptTemplate>(`/admin/prompts/${id}`, data);
  },

  async testPromptTemplate(data: PromptTestRequest): Promise<PromptTestResponse> {
    return api.post<PromptTestResponse>("/admin/prompts/test", data);
  },
};
