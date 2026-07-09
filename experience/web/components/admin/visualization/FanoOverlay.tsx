/**
 * Fano Plane Overlay — "Dimension Map" HUD
 *
 * An interactive SVG overlay showing the 7 octonion dimensions
 * as a Fano plane diagram. Each node represents a dimension,
 * and each line connects dimensions that interact algebraically
 * (eᵢ × eⱼ = eₖ).
 *
 * Features:
 *   - Color-filled nodes proportional to dimension value
 *   - Live value labels on each node
 *   - Breathing sync on Velocity node (Ė)
 *   - Crack ring on Coping node (P) when helpless
 *   - Active triple highlighting (triangle fill when all 3 active)
 *   - Directional flow chevrons on triple lines
 *   - Node hover tooltip with semantic meaning
 *   - SVG gradient bar readout (replaces block chars)
 *   - Line hover with algebraic narrative
 *   - Compact floating PiP in top-right corner
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";

/** Dimension definition */
interface Dimension {
  id: number;
  name: string;
  symbol: string;
  color: string;
  negColor: string; // Color when value is negative
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

// Layout: Regular heptagon + center concept
const CX = 90;
const CY = 90;
const R = 65;

const DIMENSIONS: Dimension[] = [
  {
    id: 1,
    name: "Valence",
    symbol: "V",
    color: "#2DD4BF",
    negColor: "#6B7280",
    x: CX + R * Math.sin(0),
    y: CY - R * Math.cos(0),
  },
  {
    id: 2,
    name: "Arousal",
    symbol: "A",
    color: "#F59E0B",
    negColor: "#92400E",
    x: CX + R * Math.sin((Math.PI * 2) / 7),
    y: CY - R * Math.cos((Math.PI * 2) / 7),
  },
  {
    id: 3,
    name: "Connection",
    symbol: "C",
    color: "#A855F7",
    negColor: "#6B21A8",
    x: CX + R * Math.sin((Math.PI * 4) / 7),
    y: CY - R * Math.cos((Math.PI * 4) / 7),
  },
  {
    id: 4,
    name: "Depth",
    symbol: "D",
    color: "#EAB308",
    negColor: "#78350F",
    x: CX + R * Math.sin((Math.PI * 6) / 7),
    y: CY - R * Math.cos((Math.PI * 6) / 7),
  },
  {
    id: 5,
    name: "Coping",
    symbol: "P",
    color: "#22C55E",
    negColor: "#EF4444",
    x: CX + R * Math.sin((Math.PI * 8) / 7),
    y: CY - R * Math.cos((Math.PI * 8) / 7),
  },
  {
    id: 6,
    name: "Velocity",
    symbol: "Ė",
    color: "#38BDF8",
    negColor: "#1E3A5F",
    x: CX + R * Math.sin((Math.PI * 10) / 7),
    y: CY - R * Math.cos((Math.PI * 10) / 7),
  },
  {
    id: 7,
    name: "Novelty",
    symbol: "N",
    color: "#8B5CF6",
    negColor: "#4C1D95",
    x: CX + R * Math.sin((Math.PI * 12) / 7),
    y: CY - R * Math.cos((Math.PI * 12) / 7),
  },
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

/** Semantic description based on value */
function getSemanticLabel(id: number, val: number): string {
  const abs = Math.abs(val);
  const intensity =
    abs < 0.2 ? "Neutral" : abs < 0.5 ? "Mild" : abs < 0.75 ? "Moderate" : "Intense";

  switch (id) {
    case 1:
      return val >= 0 ? `${intensity} positive` : `${intensity} negative`;
    case 2:
      return val >= 0 ? `${intensity} activation` : `${intensity} calm`;
    case 3:
      return val >= 0 ? `${intensity} bonding` : `${intensity} isolation`;
    case 4:
      return val >= 0 ? `${intensity} processing` : `${intensity} surface`;
    case 5:
      return val >= 0 ? `${intensity} resilience` : `${intensity} overwhelm`;
    case 6:
      return val >= 0 ? `${intensity} acceleration` : `${intensity} deceleration`;
    case 7:
      return val >= 0 ? `${intensity} novelty` : `${intensity} familiarity`;
    default:
      return "";
  }
}

/** Get dimension value from extended store */
function getDimensionValue(
  id: number,
  vac: [number, number, number],
  ext: { depth: number; coping: number; velocity: number; novelty: number }
): number {
  switch (id) {
    case 1:
      return vac[0];
    case 2:
      return vac[1];
    case 3:
      return vac[2];
    case 4:
      return ext.depth;
    case 5:
      return ext.coping;
    case 6:
      return ext.velocity;
    case 7:
      return ext.novelty;
    default:
      return 0;
  }
}

/** Chevron marker along a line (directional flow) */
function FlowChevron({
  x,
  y,
  angle,
  color,
  opacity,
}: {
  x: number;
  y: number;
  angle: number;
  color: string;
  opacity: number;
}) {
  const size = 3;
  const rad = (angle * Math.PI) / 180;
  // Three points of the chevron
  const tip = { x: x + Math.cos(rad) * size, y: y + Math.sin(rad) * size };
  const left = { x: x + Math.cos(rad + 2.5) * size * 0.8, y: y + Math.sin(rad + 2.5) * size * 0.8 };
  const right = {
    x: x + Math.cos(rad - 2.5) * size * 0.8,
    y: y + Math.sin(rad - 2.5) * size * 0.8,
  };

  return (
    <polyline
      points={`${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`}
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeOpacity={opacity}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function FanoOverlay() {
  const [hoveredTriple, setHoveredTriple] = useState<FanoTriple | null>(null);
  const [hoveredDim, setHoveredDim] = useState<Dimension | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Read current emotional state
  const currentVAC = useExperienceStore((s) => s.currentVAC);
  const octonionExt = useExperienceStore((s) => s.octonionExtended);

  // Breathing pulse phase — ticks for animation sync
  const [breathPhase, setBreathPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setBreathPhase((p) => p + 0.05);
    }, 33);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Compute dimension values
  const dimValues = useMemo(() => {
    const vals: Record<number, number> = {};
    DIMENSIONS.forEach((d) => {
      vals[d.id] = getDimensionValue(d.id, currentVAC, octonionExt);
    });
    return vals;
  }, [currentVAC, octonionExt]);

  const dimById = (id: number) => DIMENSIONS.find((d) => d.id === id)!;

  // Compute which triples are "active" (all 3 dims |val| > 0.3)
  const activeTriples = useMemo(() => {
    const set = new Set<string>();
    FANO_TRIPLES.forEach((t) => {
      if (
        Math.abs(dimValues[t.i]) > 0.3 &&
        Math.abs(dimValues[t.j]) > 0.3 &&
        Math.abs(dimValues[t.k]) > 0.3
      ) {
        set.add(`${t.i}-${t.j}-${t.k}`);
      }
    });
    return set;
  }, [dimValues]);

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
          {/* Gradient definitions for node fills */}
          <defs>
            {DIMENSIONS.map((dim) => (
              <radialGradient key={`grad-${dim.id}`} id={`nodeGrad-${dim.id}`}>
                <stop
                  offset="0%"
                  stopColor={dimValues[dim.id] >= 0 ? dim.color : dim.negColor}
                  stopOpacity={Math.abs(dimValues[dim.id]) * 0.6}
                />
                <stop offset="100%" stopColor="black" stopOpacity={0.9} />
              </radialGradient>
            ))}
          </defs>

          {/* Active triple fills — colored triangles for algebraically "live" interactions */}
          {FANO_TRIPLES.map((triple) => {
            const key = `${triple.i}-${triple.j}-${triple.k}`;
            if (!activeTriples.has(key)) return null;

            const di = dimById(triple.i);
            const dj = dimById(triple.j);
            const dk = dimById(triple.k);
            const avgColor = dk.color; // Use the "result" dimension's color

            return (
              <polygon
                key={`fill-${key}`}
                points={`${di.x},${di.y} ${dj.x},${dj.y} ${dk.x},${dk.y}`}
                fill={avgColor}
                fillOpacity={0.06}
                stroke={avgColor}
                strokeWidth={0.5}
                strokeOpacity={0.15}
              />
            );
          })}

          {/* Lines (Fano triples) */}
          {FANO_TRIPLES.map((triple) => {
            const di = dimById(triple.i);
            const dj = dimById(triple.j);
            const dk = dimById(triple.k);

            const activity =
              (Math.abs(dimValues[triple.i]) +
                Math.abs(dimValues[triple.j]) +
                Math.abs(dimValues[triple.k])) /
              3;

            const isHovered = hoveredTriple === triple;

            // Compute chevron position & angle for i→j (midpoint, direction)
            const midIJ = { x: (di.x + dj.x) / 2, y: (di.y + dj.y) / 2 };
            const angleIJ = Math.atan2(dj.y - di.y, dj.x - di.x) * (180 / Math.PI);

            const midJK = { x: (dj.x + dk.x) / 2, y: (dj.y + dk.y) / 2 };
            const angleJK = Math.atan2(dk.y - dj.y, dk.x - dj.x) * (180 / Math.PI);

            return (
              <g key={`${triple.i}-${triple.j}-${triple.k}`}>
                {/* i → j line */}
                <line
                  x1={di.x}
                  y1={di.y}
                  x2={dj.x}
                  y2={dj.y}
                  stroke={isHovered ? "#fff" : dk.color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.15 + activity * 0.35}
                  onMouseEnter={() => setHoveredTriple(triple)}
                  onMouseLeave={() => setHoveredTriple(null)}
                  className="cursor-pointer"
                />
                {/* j → k line */}
                <line
                  x1={dj.x}
                  y1={dj.y}
                  x2={dk.x}
                  y2={dk.y}
                  stroke={isHovered ? "#fff" : di.color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.15 + activity * 0.35}
                  onMouseEnter={() => setHoveredTriple(triple)}
                  onMouseLeave={() => setHoveredTriple(null)}
                  className="cursor-pointer"
                />
                {/* k → i line */}
                <line
                  x1={dk.x}
                  y1={dk.y}
                  x2={di.x}
                  y2={di.y}
                  stroke={isHovered ? "#fff" : dj.color}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.15 + activity * 0.35}
                  onMouseEnter={() => setHoveredTriple(triple)}
                  onMouseLeave={() => setHoveredTriple(null)}
                  className="cursor-pointer"
                />

                {/* Directional flow chevrons */}
                {activity > 0.2 && (
                  <>
                    <FlowChevron
                      x={midIJ.x}
                      y={midIJ.y}
                      angle={angleIJ}
                      color={dk.color}
                      opacity={0.1 + activity * 0.4}
                    />
                    <FlowChevron
                      x={midJK.x}
                      y={midJK.y}
                      angle={angleJK}
                      color={di.color}
                      opacity={0.1 + activity * 0.4}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {DIMENSIONS.map((dim) => {
            const val = dimValues[dim.id];
            const absVal = Math.abs(val);
            const nodeR = 8 + absVal * 4;

            // === BREATHING SYNC for Velocity node (id=6) ===
            const isVelocityNode = dim.id === 6;
            const velocityAbs = Math.abs(dimValues[6] || 0);
            const breathFreq = 3.14 + velocityAbs * 12.56;
            const breathPulse = isVelocityNode
              ? Math.sin(breathPhase * breathFreq) * velocityAbs * 3
              : 0;

            // === CRACK RING for Coping node (id=5) when negative ===
            const isCopingNode = dim.id === 5;
            const copingVal = dimValues[5] || 0;
            const copingNeg = Math.max(0, -copingVal);

            const effectiveR = nodeR + breathPulse;
            const isNodeHovered = hoveredDim?.id === dim.id;

            return (
              <g
                key={dim.id}
                onMouseEnter={() => setHoveredDim(dim)}
                onMouseLeave={() => setHoveredDim(null)}
                className="cursor-pointer"
              >
                {/* Outer glow */}
                <circle
                  cx={dim.x}
                  cy={dim.y}
                  r={effectiveR + 3}
                  fill={dim.color}
                  fillOpacity={absVal * 0.15 + (isVelocityNode ? Math.abs(breathPulse) * 0.05 : 0)}
                />
                {/* Hover highlight ring */}
                {isNodeHovered && (
                  <circle
                    cx={dim.x}
                    cy={dim.y}
                    r={effectiveR + 5}
                    fill="none"
                    stroke="white"
                    strokeWidth={1}
                    strokeOpacity={0.4}
                  />
                )}
                {/* Crack ring — coping helplessness */}
                {isCopingNode && copingNeg > 0.1 && (
                  <circle
                    cx={dim.x}
                    cy={dim.y}
                    r={effectiveR + 1}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={copingNeg * 2}
                    strokeOpacity={copingNeg * 0.7}
                    strokeDasharray={`${2 + copingNeg * 3} ${4 - copingNeg * 2}`}
                  />
                )}
                {/* Core — gradient filled */}
                <circle
                  cx={dim.x}
                  cy={dim.y}
                  r={effectiveR}
                  fill={`url(#nodeGrad-${dim.id})`}
                  stroke={dim.color}
                  strokeWidth={isNodeHovered ? 2 : 1.5}
                  strokeOpacity={0.4 + absVal * 0.6}
                />
                {/* Symbol label */}
                <text
                  x={dim.x}
                  y={dim.y - 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={dim.color}
                  fontSize="7"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {dim.symbol}
                </text>
                {/* Live value label — small number below symbol */}
                <text
                  x={dim.x}
                  y={dim.y + 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={dim.color}
                  fontSize="4.5"
                  fontFamily="monospace"
                  opacity={0.6 + absVal * 0.4}
                >
                  {val >= 0 ? "+" : ""}
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Hover Tooltip — semantic meaning */}
      {hoveredDim && (
        <div className="px-3 pb-1.5 text-center border-b border-white/5">
          <p className="text-[10px] font-medium" style={{ color: hoveredDim.color }}>
            {hoveredDim.name}
          </p>
          <p className="text-[9px] text-gray-400">
            {getSemanticLabel(hoveredDim.id, dimValues[hoveredDim.id])}
          </p>
          <p className="text-[9px] font-mono text-gray-500">
            {dimValues[hoveredDim.id] >= 0 ? "+" : ""}
            {dimValues[hoveredDim.id].toFixed(3)}
          </p>
        </div>
      )}

      {/* Line Hover Tooltip */}
      {hoveredTriple && !hoveredDim && (
        <div className="px-3 pb-1.5 text-center border-b border-white/5">
          <p className="text-[9px] text-violet-300 font-medium">{hoveredTriple.narrative}</p>
        </div>
      )}

      {/* SVG Gradient Bar Readout */}
      <div className="px-3 py-2 space-y-[3px]">
        {DIMENSIONS.map((dim) => {
          const val = dimValues[dim.id];
          const absVal = Math.abs(val);
          // Normalize to [0,1] for the bar: -1→0, 0→0.5, +1→1
          const normalized = (val + 1) / 2;

          return (
            <div key={dim.id} className="flex items-center gap-1.5 group">
              {/* Symbol */}
              <span
                className="text-[9px] w-3 text-right font-bold font-mono flex-shrink-0"
                style={{ color: dim.color }}
              >
                {dim.symbol}
              </span>
              {/* SVG gradient bar */}
              <svg width="100%" height="6" className="flex-1">
                {/* Track background */}
                <rect x="0" y="0" width="100%" height="6" rx="2" fill="rgba(255,255,255,0.04)" />
                {/* Center line (zero point) */}
                <line
                  x1="50%"
                  y1="0"
                  x2="50%"
                  y2="6"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="0.5"
                />
                {/* Value bar — extends from center */}
                {val >= 0 ? (
                  <rect
                    x="50%"
                    y="0.5"
                    width={`${absVal * 50}%`}
                    height="5"
                    rx="1.5"
                    fill={dim.color}
                    opacity={0.5 + absVal * 0.5}
                  />
                ) : (
                  <rect
                    x={`${50 - absVal * 50}%`}
                    y="0.5"
                    width={`${absVal * 50}%`}
                    height="5"
                    rx="1.5"
                    fill={dim.negColor}
                    opacity={0.5 + absVal * 0.5}
                  />
                )}
                {/* Position marker */}
                <circle
                  cx={`${normalized * 100}%`}
                  cy="3"
                  r="2"
                  fill="white"
                  fillOpacity={0.3 + absVal * 0.5}
                />
              </svg>
              {/* Numeric value */}
              <span className="text-[8px] text-gray-400 w-7 text-right tabular-nums font-mono flex-shrink-0">
                {val >= 0 ? "+" : ""}
                {val.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
