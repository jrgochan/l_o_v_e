/**
 * VAC Display Component
 *
 * Displays the current Valence, Arousal, and Connection values
 * in a subtle, technical manner.
 */

"use client";

import type { VACVector } from "@love/experience-shared";

interface Props {
  vac?: VACVector | null;
}

export function VACDisplay({ vac }: Props) {
  if (!vac) return null;

  const [v, a, c] = vac;

  return (
    <div className="fixed bottom-6 right-6 z-40 font-mono text-[10px] text-gray-500 tracking-wider pointer-events-none select-none">
      <div className="flex flex-col items-end space-y-1 uppercase">
        <div className="flex items-center gap-3">
          <span className="text-gray-600">Valence</span>
          <span className="w-12 text-right text-cyan-400/80">{v.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600">Arousal</span>
          <span className="w-12 text-right text-purple-400/80">{a.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600">Connection</span>
          <span className="w-12 text-right text-emerald-400/80">{c.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}
