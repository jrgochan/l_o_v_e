export interface ModelInfo {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  parameter_size: string;
  quantization: string;
  family: string;
}

export interface ModelDetails extends ModelInfo {
  parameters: string;
  template: string;
  format: string;
  estimated_ram_gb: number;
  estimated_speed_tokens_per_sec: number;
  recommended_for: string[];
}

export interface PullProgress {
  task_id: string;
  ai_model_name: string;
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
}
