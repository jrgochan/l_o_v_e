/**
 * Fano Plane Overlay — "Dimension Map" HUD
 *
 * An interactive SVG overlay showing the 7 octonion dimensions
 * as a Fano plane diagram. Each node represents a dimension,
 * and each line connects dimensions that interact algebraically
 * (eᵢ × eⱼ = eₖ).
 *
 * Features:
 *   - Nodes pulse ("heartbeat") based on rate of change
 *   - Hovering a line shows the algebraic interaction tooltip
 *   - "Octonion Fingerprint" readout with mini bar charts
 *   - Compact floating PiP in top-right corner
 */

"use client";

import { useState, useMemo } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";

/** Dimension definition */
interface Dimension {
  id: number;
  name: string;
  symbol: string;
  color: string;
  // Position on the Fano plane diagram (unit circle + center)
  x: number;
  y: number;
}

/** Fano triple — algebraic interaction */
interface FanoTriple {
  i: number;
  j: number;
  k: number;
  narrative: string;
}

// Layout: Regular hexagon + center point
// Node positions (SVG coords, centered in 180×180 viewBox)
const CX = 90;
const CY = 90;
const R = 65; // Radius of outer hexagon

const DIMENSIONS: Dimension[] = [
  { id: 1, name: "Valence",    symbol: "V",  color: "#2DD4BF", x: CX + R * Math.sin(0),            y: CY - R * Math.cos(0) },
  { id: 2, name: "Arousal",    symbol: "A",  color: "#F59E0B", x: CX + R * Math.sin(Math.PI * 2/7), y: CY - R * Math.cos(Math.PI * 2/7) },
  { id: 3, name: "Connection", symbol: "C",  color: "#A855F7", x: CX + R * Math.sin(Math.PI * 4/7), y: CY - R * Math.cos(Math.PI * 4/7) },
  { id: 4, name: "Depth",      symbol: "D",  color: "#EAB308", x: CX + R * Math.sin(Math.PI * 6/7), y: CY - R * Math.cos(Math.PI * 6/7) },
  { id: 5, name: "Coping",     symbol: "P",  color: "#22C55E", x: CX + R * Math.sin(Math.PI * 8/7), y: CY - R * Math.cos(Math.PI * 8/7) },
  { id: 6, name: "Velocity",   symbol: "Ė",  color: "#38BDF8", x: CX + R * Math.sin(Math.PI * 10/7), y: CY - R * Math.cos(Math.PI * 10/7) },
  { id: 7, name: "Novelty",    symbol: "N",  color: "#8B5CF6", x: CX + R * Math.sin(Math.PI * 12/7), y: CY - R * Math.cos(Math.PI * 12/7) },
];

const FANO_TRIPLES: FanoTriple[] = [
  { i: 1, j: 2, k: 4, narrative: "Valence × Arousal → Depth" },
  { i: 2, j: 3, k: 5, narrative: "Arousal × Connection → Coping" },
  { i: 3, j: 4, k: 6, narrative: "Connection × Depth → Velocity" },
  { i: 4, j: 5, k: 7, narrative: "Depth × Coping → Novelty" },
  { i: 5, j: 6, k: 1, narrative: "Coping × Velocity → Valence" },
  { i: 6, j: 7, k: 2, narrative: "Velocity × Novelty → Arousal" },
  { i: 7, j: 1, k: 3, narrative: "Novelty × Valence → Connection" },
];

/** Get dimension value from extended store */
function getDimensionValue(
  id: number,
  vac: [number, number, number],
  ext: { depth: number; coping: number; velocity: number; novelty: number }
): number {
  switch (id) {
    case 1: return vac[0]; // Valence
    case 2: return vac[1]; // Arousal
    case 3: return vac[2]; // Connection
    case 4: return ext.depth;
    case 5: return ext.coping;
    case 6: return ext.velocity;
    case 7: return ext.novelty;
    default: return 0;
  }
}

/** Mini bar chart string ████░░░░ */
function miniBar(value: number): string {
  const normalized = (value + 1) / 2; // [-1,1] → [0,1]
  const filled = Math.round(normalized * 8);
  return "█".repeat(filled) + "░".repeat(8 - filled);
}

export function FanoOverlay() {
  const [hoveredTriple, setHoveredTriple] = useState<FanoTriple | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Read current emotional state
  const currentVAC = useExperienceStore((s) => s.currentVAC);
  const octonionExt = useExperienceStore((s) => s.octonionExtended);

  // Compute dimension values
  const dimValues = useMemo(() => {
    const vals: Record<number, number> = {};
    DIMENSIONS.forEach((d) => {
      vals[d.id] = getDimensionValue(d.id, currentVAC, octonionExt);
    });
    return vals;
  }, [currentVAC, octonionExt]);

  // Find the dim object by id
  const dimById = (id: number) => DIMENSIONS.find((d) => d.id === id)!;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="absolute top-3 right-3 z-50 px-2.5 py-1.5 rounded-lg
                   bg-black/60 backdrop-blur-sm border border-violet-600/40
                   text-violet-300 text-[11px] font-medium
                   hover:border-violet-500/60 hover:bg-black/70 transition
                   pointer-events-auto"
        title="Show Dimension Map"
      >
        🔮 Dimension Map
      </button>
    );
  }

  return (
    <div
      className="absolute top-3 right-3 z-50 pointer-events-auto
                 w-[220px] rounded-xl overflow-hidden
                 bg-black/70 backdrop-blur-md border border-white/10
                 shadow-xl shadow-black/40"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          Dimension Map
        </span>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-500 hover:text-white text-xs transition"
          title="Minimize"
        >
          ─
        </button>
      </div>

      {/* SVG Fano Diagram */}
      <div className="px-2 pt-2">
        <svg viewBox="0 0 180 180" className="w-full h-auto">
          {/* Lines (Fano triples) */}
          {FANO_TRIPLES.map((triple) => {
            const di = dimById(triple.i);
            const dj = dimById(triple.j);
            const dk = dimById(triple.k);

            // Line opacity based on activity of the triple
            const activity =
              (Math.abs(dimValues[triple.i]) +
                Math.abs(dimValues[triple.j]) +
                Math.abs(dimValues[triple.k])) / 3;

            const isHovered = hoveredTriple === triple;

            return (
              <g key={`${triple.i}-${triple.j}-${triple.k}`}>
                {/* i → j line */}
                <line
                  x1={di.x} y1={di.y} x2={dj.x} y2={dj.y}
                  stroke={isHovered ? "#fff" : dk.color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.15 + activity * 0.35}
                  onMouseEnter={() => setHoveredTriple(triple)}
                  onMouseLeave={() => setHoveredTriple(null)}
                  className="cursor-pointer"
                />
                {/* j → k line */}
                <line
                  x1={dj.x} y1={dj.y} x2={dk.x} y2={dk.y}
                  stroke={isHovered ? "#fff" : di.color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.15 + activity * 0.35}
                  onMouseEnter={() => setHoveredTriple(triple)}
                  onMouseLeave={() => setHoveredTriple(null)}
                  className="cursor-pointer"
                />
                {/* k → i line */}
                <line
                  x1={dk.x} y1={dk.y} x2={di.x} y2={di.y}
                  stroke={isHovered ? "#fff" : dj.color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.15 + activity * 0.35}
                  onMouseEnter={() => setHoveredTriple(triple)}
                  onMouseLeave={() => setHoveredTriple(null)}
                  className="cursor-pointer"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {DIMENSIONS.map((dim) => {
            const val = dimValues[dim.id];
            const absVal = Math.abs(val);
            // Pulse radius: more active = larger
            const nodeR = 8 + absVal * 4;

            return (
              <g key={dim.id}>
                {/* Glow */}
                <circle
                  cx={dim.x} cy={dim.y} r={nodeR + 3}
                  fill={dim.color}
                  fillOpacity={absVal * 0.15}
                />
                {/* Core */}
                <circle
                  cx={dim.x} cy={dim.y} r={nodeR}
                  fill="black"
                  stroke={dim.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4 + absVal * 0.6}
                />
                {/* Label */}
                <text
                  x={dim.x} y={dim.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={dim.color}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {dim.symbol}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Tooltip */}
      {hoveredTriple && (
        <div className="px-3 pb-1 text-center">
          <p className="text-[9px] text-violet-300 font-medium">
            {hoveredTriple.narrative}
          </p>
        </div>
      )}

      {/* Fingerprint Readout */}
      <div className="px-3 py-2 border-t border-white/5 space-y-0.5">
        {DIMENSIONS.map((dim) => {
          const val = dimValues[dim.id];
          return (
            <div key={dim.id} className="flex items-center gap-1.5 text-[9px] font-mono">
              <span style={{ color: dim.color }} className="w-3 text-right font-bold">
                {dim.symbol}
              </span>
              <span className="text-gray-600 leading-none tracking-tighter">
                {miniBar(val)}
              </span>
              <span className="text-gray-400 w-8 text-right tabular-nums">
                {val >= 0 ? "+" : ""}{val.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
