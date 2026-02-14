/**
 * Scene Environment Component
 *
 * Provides mode-reactive environment maps for physically-based material rendering.
 *
 * NOTE: Currently disabled — drei's Environment component loads HDR textures
 * asynchronously, and the Suspense resolution can trigger re-render cascades
 * in the R3F tree that cause frame loop stalls. Re-enable when investigated.
 */

"use client";

export function SceneEnvironment() {
  // TODO: Re-enable when Environment HDR loading is compatible with this Canvas setup
  return null;
}
