import { ToneMode, ChatMessage } from "./chat";

export interface ModelAssignment {
  function: string;
  ai_model_name: string;
  assigned_at: string;
  assigned_by?: string;
  avg_latency_ms?: number;
  total_invocations: number;
  last_used_at?: string;
}

export interface ModelAssignmentUpdate {
  ai_model_name: string;
}

export interface ClinicalAlert {
  id: string;
  session_id: string;
  timestamp: string;
  level: "critical" | "warning" | "attention" | "stable";
  type: string;
  message: string;
  suggestion?: string;
  triggered_by: Record<string, unknown>;
  threshold_used: Record<string, unknown>;
  version: string;
}
// Admin Session Management
export interface AdminSession {
  id: string;
  user_id: string; // Identifier string (guest or user ID)
  started_at: string; // ISO date
  ended_at?: string; // ISO date
  message_count: number;
  tone_preference: ToneMode;
  created_at: string;
  updated_at: string;
  user?: {
    id: string; // UUID
    email: string;
    full_name?: string;
    role: string;
  };
  messages?: ChatMessage[]; // Full transcript (detail view only)
}

export interface AdminSessionListResponse {
  total: number;
  items: AdminSession[];
  skip: number;
  limit: number;
}

export interface AtlasEmotion {
  id: string;
  emotion_name: string;
  category: string;
  definition: string;
  vac_vector: [number, number, number];
  q_constant: [number, number, number, number];
  haptic_pattern_id?: string;
  color_hint?: string;
  created_at: string;
  updated_at: string;
}

export interface AtlasEmotionUpdate {
  category?: string;
  definition?: string;
  vac_vector?: [number, number, number];
  haptic_pattern_id?: string;
  color_hint?: string;
}

export interface AtlasExportData {
  version: string;
  source: string;
  metadata: {
    total_emotions: number;
    generated_at: string;
  };
  emotions: Array<{
    emotion_name: string;
    category: string;
    definition: string;
    vac: [number, number, number];
    haptic_pattern_id?: string;
  }>;
}

export interface AtlasImportResult {
  status: string;
  updated: number;
  errors: string[];
}

export interface TransitionStrategy {
  id: string; // UUID from backend
  strategy_name: string;
  strategy_type: string;
  description: string;
  detailed_steps: string[];
  time_required?: string;
  difficulty_level?: number;
  evidence_level: string;
  research_citations?: Record<string, string>[];
  contraindications?: string;
}

export interface StrategyUpdate {
  description?: string;
  detailed_steps?: string[];
  time_required?: string;
  difficulty_level?: number;
  evidence_level?: string;
  contraindications?: string;
}

export interface StrategiesExportData {
  version: string;
  source: string;
  metadata: {
    total_strategies: number;
    generated_at: string;
  };
  strategies: Array<{
    strategy_name: string;
    strategy_type: string;
    description: string;
    detailed_steps: string[];
    time_required?: string;
    difficulty_level?: number;
    evidence_level?: string;
    research_citations?: Record<string, string>[];
    contraindications?: string;
  }>;
}

export interface StrategiesImportResult {
  updated: number;
  created: number;
  errors: string[];
}

export interface BootstrapData {
  id: string;
  data_type: string;
  data_category?: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BootstrapDataUpdate {
  data_type?: string;
  data_category?: string;
  content?: Record<string, unknown>;
}

export interface BootstrapDataCreate {
  data_type: string;
  data_category?: string;
  content: Record<string, unknown>;
}

export type BootstrapDataResponse = BootstrapData;

export interface PromptTemplate {
  id: string;
  function_name: string;
  version: string;
  template_content: string;
  input_variables: string[];
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface PromptTemplateCreate {
  function_name: string;
  version: string;
  template_content: string;
  input_variables: string[];
  description?: string;
  is_active?: boolean;
}

export interface PromptTemplateUpdate {
  template_content?: string;
  input_variables?: string[];
  description?: string;
  is_active?: boolean;
}

export interface PromptTestRequest {
  template_content: string;
  input_variables: Record<string, string>;
}

export interface PromptTestResponse {
  rendered_content: string;
}
