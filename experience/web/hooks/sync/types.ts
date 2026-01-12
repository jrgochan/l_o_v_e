import type { VACVector, TransitionPathResponse } from "@love/experience-shared";

export const CHANNEL_NAME = "love-sphere-sync";
export const HEARTBEAT_INTERVAL = 5000;
export const STALE_THRESHOLD = 60000;

export interface SphereStateMessage {
  type: "sphere_update" | "selection_update" | "path_update" | "heartbeat";
  vac?: VACVector;
  quaternion?: [number, number, number, number];
  selectedEmotionIds?: string[];
  path?: TransitionPathResponse | null;
  showPath?: boolean;
  timestamp: number;
}

export type SyncMode = "broadcaster" | "listener";
