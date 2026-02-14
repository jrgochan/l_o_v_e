/**
 * Scene Effects Component
 *
 * Mode-reactive post-processing pipeline for the 7 visual modes.
 * Reads PostProcessingConfig from modeVisualConfigs.ts.
 *
 * NOTE: Currently disabled due to @react-three/postprocessing compatibility
 * issues with @react-three/fiber v9 — EffectComposer takes over the render
 * pipeline and causes frame loop stalls. The component is kept as a stub
 * so imports don't break. Re-enable when postprocessing v3.x ships R3F v9
 * support or when we upgrade to a compatible version pair.
 *
 * When re-enabling, the effect configuration per mode is already defined in
 * modeVisualConfigs.ts (PostProcessingConfig).
 */

"use client";

export function SceneEffects() {
  // TODO: Re-enable when @react-three/postprocessing is compatible with R3F v9
  // The full implementation with Bloom, Vignette, and ChromaticAberration
  // is ready — see git history or modeVisualConfigs.ts for per-mode configs.
  return null;
}
