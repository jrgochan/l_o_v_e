import type { VACVector, TransitionPathResponse } from "@love/experience-shared";

export const CHANNEL_NAME = "love-sphere-sync";
export const HEARTBEAT_INTERVAL = 5000;
export const STALE_THRESHOLD = 60000;

export interface VisualSettingsPayload {
  sphereTransparency: number; // 0 (solid) to 1 (invisible)
  animationSpeed: number;
  renderQuality: "low" | "medium" | "high";
  autoRotate: boolean;
  pathAnimationMode: string;
}

export interface SphereStateMessage {
  type: "sphere_update" | "selection_update" | "path_update" | "heartbeat";
  vac?: VACVector;
  quaternion?: [number, number, number, number];
  selectedEmotionIds?: string[];
  path?: TransitionPathResponse | null;
  showPath?: boolean;
  visualSettings?: VisualSettingsPayload;
  timestamp: number;
}

export type SyncMode = "broadcaster" | "listener";
