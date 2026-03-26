/**
 * Help Modal Component
 *
 * Comprehensive guide explaining the VAC model, Soul Sphere,
 * and how to use the Admin Interface.
 */

"use client";

import { useState } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

type TabType = "model" | "octonion" | "usage" | "shortcuts" | "concepts";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("model");
  const theme = useAdminTheme();

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm`}
    >
      <div
        className={`${theme.effects.glass} border ${theme.colors.border} ${theme.layout.borderRadius} ${theme.effects.glow} w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${theme.colors.border} ${theme.colors.background}`}
        >
          <div>
            <h2 className={`text-2xl font-bold ${theme.colors.text.primary}`}>
              Soul Sphere - Help & Guide
            </h2>
            <p className={`text-sm ${theme.colors.text.secondary} mt-1`}>
              Understanding the VAC Model and Interface
            </p>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 border ${theme.colors.border} ${theme.colors.text.primary} ${theme.colors.hover} rounded transition`}
          >
            Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b ${theme.colors.border} ${theme.colors.background}`}>
          {(["model", "octonion", "usage", "shortcuts", "concepts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? `${theme.colors.text.primary} bg-black/20 border-b-2 border-current`
                  : `${theme.colors.text.secondary} ${theme.colors.hover}`
              }`}
            >
              {tab === "model" && "🧠 VAC Model"}
              {tab === "octonion" && "🔮 8D Octonion"}
              {tab === "usage" && "🎯 How to Use"}
              {tab === "shortcuts" && "⌨️ Shortcuts"}
              {tab === "concepts" && "🌟 Key Concepts"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 ${theme.colors.background}`}>
          {activeTab === "model" && <ModelTab />}
          {activeTab === "octonion" && <OctonionTab />}
          {activeTab === "usage" && <UsageTab />}
          {activeTab === "shortcuts" && <ShortcutsTab />}
          {activeTab === "concepts" && <ConceptsTab />}
        </div>
      </div>
    </div>
  );
}

function ModelTab() {
  const theme = useAdminTheme();
  return (
    <div className={`prose prose-invert max-w-none space-y-6 ${theme.colors.text.secondary}`}>
      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          What is the Soul Sphere?
        </h3>
        <div
          className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-2 ${theme.colors.text.secondary}`}
        >
          <p>
            The Soul Sphere is a{" "}
            <strong className={theme.colors.text.primary}>living visualization</strong> of emotional
            states in 3D space. Unlike static charts or graphs, it morphs and transforms based on
            your position in the emotional landscape.
          </p>
          <p>
            The sphere is procedurally generated using custom shaders, with three visual dimensions:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong className={theme.colors.primary}>Color</strong> - Emotional tone (positive ↔
              negative)
            </li>
            <li>
              <strong className={theme.colors.primary}>Shape</strong> - Energy level (calm ↔
              chaotic)
            </li>
            <li>
              <strong className={theme.colors.primary}>Glow</strong> - Connection quality (isolated
              ↔ connected)
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>The VAC Model</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <p className={theme.colors.text.secondary}>
            <strong className={theme.colors.text.primary}>VAC</strong> stands for{" "}
            <strong className={theme.colors.text.primary}>Valence-Arousal-Connection</strong>, a
            three-dimensional model for representing emotions in computational space.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-black/40 border border-white/10 rounded p-3">
              <h4 className="font-semibold text-teal-400 mb-2">V - Valence</h4>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                Positive ↔ Negative
                <br />
                Joy (+0.9) to Shame (-0.9)
              </p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded p-3">
              <h4 className="font-semibold text-amber-500 mb-2">A - Arousal</h4>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                High Energy ↔ Low Energy
                <br />
                Overwhelm (+0.9) to Tranquility (-0.8)
              </p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded p-3">
              <h4 className="font-semibold text-purple-400 mb-2">C - Connection</h4>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                With Others ↔ Isolated
                <br />
                Love (+1.0) to Shame (-1.0)
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Why Connection Matters
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
          <p className={`${theme.colors.text.secondary} mb-3`}>
            The Connection axis is our <strong className={theme.colors.primary}>innovation</strong>.
            Traditional models use Dominance, which can&apos;t distinguish emotions that differ in
            relational quality.
          </p>

          <div className="space-y-3">
            <div className="bg-black/40 border border-white/10 rounded p-3">
              <h4 className={`font-semibold ${theme.colors.secondary} mb-1`}>
                Pity vs. Compassion
              </h4>
              <div className={`text-sm ${theme.colors.text.secondary} space-y-1`}>
                <p>
                  <strong className={theme.colors.text.primary}>Pity:</strong> &quot;I feel sorry
                  FOR them&quot; (Connection: -0.7)
                </p>
                <p>
                  <strong className={theme.colors.text.primary}>Compassion:</strong> &quot;I feel
                  WITH them&quot; (Connection: +0.9)
                </p>
                <p className={`${theme.colors.text.muted} italic`}>
                  Both feel &quot;caring&quot; but have different therapeutic value
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded p-3">
              <h4 className={`font-semibold ${theme.colors.secondary} mb-1`}>Grief vs. Despair</h4>
              <div className={`text-sm ${theme.colors.text.secondary} space-y-1`}>
                <p>
                  <strong className={theme.colors.text.primary}>Grief:</strong> Love persists
                  despite pain (Connection: +0.7)
                </p>
                <p>
                  <strong className={theme.colors.text.primary}>Despair:</strong> Isolated suffering
                  (Connection: -0.6)
                </p>
                <p className={`${theme.colors.text.muted} italic`}>
                  Connection distinguishes healing from hopelessness
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Ethical & Research Foundation
        </h3>
        <div
          className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 ${theme.colors.text.secondary} space-y-3 text-sm`}
        >
          <p>
            L.O.V.E. is a{" "}
            <strong className={theme.colors.text.primary}>private research initiative</strong>{" "}
            heavily indebted to the fundamental emotional theories of researchers such as{" "}
            <strong className={theme.colors.text.primary}>Dr. Brené Brown</strong> (relational
            dynamics), <strong className={theme.colors.text.primary}>Dr. James Russell</strong>{" "}
            (Circumplex Model), and{" "}
            <strong className={theme.colors.text.primary}>Dr. Paul Ekman</strong>.
          </p>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <p className="italic text-blue-300">
              No endorsement by these researchers is implied. This system represents an experimental
              attempt to operationalize their insights and was co-created through collaborative
              human-AI generation over 3.5 months.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function OctonionTab() {
  const theme = useAdminTheme();
  return (
    <div className={`prose prose-invert max-w-none space-y-6 ${theme.colors.text.secondary}`}>
      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          8D Octonion Emotional Modeling
        </h3>
        <div
          className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-2 ${theme.colors.text.secondary}`}
        >
          <p>
            The <strong className={theme.colors.text.primary}>Octonion Layer</strong> extends the
            standard 3D VAC model into <strong className={theme.colors.text.primary}>8 dimensions</strong> using
            octonion mathematics (hypercomplex numbers on the 7-sphere S⁷).
          </p>
          <p>
            This is grounded in the clinical observation that emotions like &quot;grief&quot; and
            &quot;despair&quot; may share similar VAC coordinates, but differ profoundly in
            how <em>deeply held</em> they are, whether the person feels <em>agency</em>, and
            whether the state is <em>novel</em> or <em>chronic</em>.
          </p>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          The 4 Extended Dimensions
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <p className={theme.colors.text.secondary}>
            Beyond <strong className={theme.colors.text.primary}>Valence (V)</strong>,{" "}
            <strong className={theme.colors.text.primary}>Arousal (A)</strong>, and{" "}
            <strong className={theme.colors.text.primary}>Connection (C)</strong>, the
            octonion model adds:
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-black/40 border border-amber-500/30 rounded p-3">
              <h4 className="font-semibold text-amber-400 mb-1">D — Depth</h4>
              <p className="text-xs text-amber-200/60 mb-1">Profound (+1) ↔ Superficial (-1)</p>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                How deeply held is this feeling? A surface frustration vs. a core wound.
                Drives <strong className={theme.colors.text.primary}>surface topology</strong> on the Soul Sphere.
              </p>
            </div>
            <div className="bg-black/40 border border-emerald-500/30 rounded p-3">
              <h4 className="font-semibold text-emerald-400 mb-1">P — Coping</h4>
              <p className="text-xs text-emerald-200/60 mb-1">Empowered (+1) ↔ Helpless (-1)</p>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                Your sense of agency. &quot;I&apos;ve got this&quot; vs. &quot;I can&apos;t do
                anything.&quot; Drives the <strong className={theme.colors.text.primary}>Coping Shell</strong>
                {" "}— emerald when empowered, cracked red when helpless.
              </p>
            </div>
            <div className="bg-black/40 border border-indigo-500/30 rounded p-3">
              <h4 className="font-semibold text-indigo-400 mb-1">Ė — Velocity</h4>
              <p className="text-xs text-indigo-200/60 mb-1">Rapid change (+1) ↔ Stillness (-1)</p>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                How fast your emotional state is shifting. Drives the Soul Sphere&apos;s{" "}
                <strong className={theme.colors.text.primary}>breathing rhythm</strong> and{" "}
                <strong className={theme.colors.text.primary}>orbiting particle field</strong>.
              </p>
            </div>
            <div className="bg-black/40 border border-violet-500/30 rounded p-3">
              <h4 className="font-semibold text-violet-400 mb-1">N — Novelty</h4>
              <p className="text-xs text-violet-200/60 mb-1">Novel (+1) ↔ Familiar (-1)</p>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                Is this a new experience or a worn groove? Drives the outer{" "}
                <strong className={theme.colors.text.primary}>Novelty Aura</strong>
                {" "}— iridescent shimmer for novel states, warm amber for familiar ones.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Visual Layers
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <p>When octonion mode is enabled, the Soul Sphere gains three concentric layers:</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-[-2px]">🫧</span>
              <div>
                <strong className="text-violet-400">Outer: Novelty Aura</strong>
                <p className={theme.colors.text.muted}>
                  Iridescent shimmer (novel) or warm amber glow (familiar). High novelty = vivid, low = barely visible.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-[-2px]">✨</span>
              <div>
                <strong className="text-indigo-400">Middle: Velocity Particles</strong>
                <p className={theme.colors.text.muted}>
                  Orbiting particles that accelerate with emotional velocity. Blue (still) → orange (rapid). Frozen at zero.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-[-2px]">🛡️</span>
              <div>
                <strong className="text-emerald-400">Inner: Coping Shell</strong>
                <p className={theme.colors.text.muted}>
                  Translucent crystalline shield. Solid emerald when empowered, cracked hot-orange when helpless.
                  Breathes in sympathy with the core sphere.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-[-2px]">🔮</span>
              <div>
                <strong className="text-amber-400">Core: Depth Topology</strong>
                <p className={theme.colors.text.muted}>
                  The Soul Sphere itself warps — shallow emotions are smooth, deep emotions develop complex terrain
                  (3-octave fractal noise + ocean swell). Deep feelings also glow from within.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          How to Toggle
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <div className="space-y-2 text-sm">
            <p>
              <strong className={theme.colors.text.primary}>1.</strong> Open{" "}
              <strong className={theme.colors.primary}>Settings</strong> (⚙️ gear icon in bottom-left, or press{" "}
              <kbd className={`px-2 py-0.5 bg-black/40 border ${theme.colors.border} rounded font-mono text-xs`}>⌘,</kbd>)
            </p>
            <p>
              <strong className={theme.colors.text.primary}>2.</strong> Find the{" "}
              <strong className="text-violet-400">🔮 Octonion Emotional Layer</strong> section
            </p>
            <p>
              <strong className={theme.colors.text.primary}>3.</strong> Toggle{" "}
              <strong className={theme.colors.primary}>&quot;Layered Soul&quot;</strong> to enable/disable
              the concentric shells
            </p>
            <p>
              <strong className={theme.colors.text.primary}>4.</strong> Toggle{" "}
              <strong className={theme.colors.primary}>&quot;Dimension Map&quot;</strong> to show/hide
              the Fano Plane HUD (7D interaction overlay)
            </p>
          </div>
          <div className="bg-violet-900/20 border border-violet-500/30 rounded p-3 mt-2">
            <p className="text-violet-300 text-sm">
              <strong>💡 Performance note:</strong> The octonion layer adds 3 transparent shells + 200
              particles. On lower-end devices, you can disable it with no loss of core VAC functionality.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          The Math: Why Octonions?
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3 text-sm`}>
          <p>
            The existing VAC model uses <strong className={theme.colors.text.primary}>quaternions</strong> (4D) to
            represent 3 emotional dimensions on S³. Extending to 7 dimensions requires jumping
            to <strong className={theme.colors.text.primary}>octonions</strong> (8D) — there is no
            5D, 6D, or 7D normed division algebra (by the <em>Hurwitz theorem</em>).
          </p>
          <p>
            Octonion SLERP (Spherical Linear Interpolation) on S⁷ provides{" "}
            <strong className={theme.colors.text.primary}>smooth, constant-velocity transitions</strong> between
            emotional states — ensuring that no matter how many dimensions change simultaneously,
            the path through emotional space remains geometrically optimal.
          </p>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <p className="italic text-blue-300">
              The 7 imaginary axes of the octonion obey the{" "}
              <strong className="text-blue-200">Fano plane</strong> multiplication rules, creating
              a beautiful algebraic structure where each dimension interacts with exactly 2 others
              (e.g., Valence × Arousal → Depth). These are not arbitrary — they encode clinically
              meaningful relationships.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function UsageTab() {
  const theme = useAdminTheme();
  return (
    <div className={`prose prose-invert max-w-none space-y-6 ${theme.colors.text.secondary}`}>
      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Getting Started</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong className={theme.colors.text.primary}>Select emotions</strong> from the left
              panel or click them in the 3D view
            </li>
            <li>
              <strong className={theme.colors.text.primary}>Paths auto-compute</strong> showing
              optimal transitions
            </li>
            <li>
              <strong className={theme.colors.text.primary}>Explore in InfoPanel</strong> on the
              right (sorted by distance)
            </li>
            <li>
              <strong className={theme.colors.text.primary}>Click waypoints</strong> for
              comprehensive transition guidance
            </li>
          </ol>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>3D Visualization</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <div>
            <h4 className={`font-semibold ${theme.colors.primary} mb-2`}>Navigation</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong className={theme.colors.text.primary}>Orbit:</strong> Left-click and drag to
                rotate view
              </li>
              <li>
                <strong className={theme.colors.text.primary}>Zoom:</strong> Scroll wheel to zoom
                in/out
              </li>
              <li>
                <strong className={theme.colors.text.primary}>Pan:</strong> Right-click and drag (or
                Ctrl+drag)
              </li>
            </ul>
          </div>

          <div>
            <h4 className={`font-semibold ${theme.colors.primary} mb-2`}>Interaction</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong className={theme.colors.text.primary}>Click emotion</strong> to
                select/deselect
              </li>
              <li>
                <strong className={theme.colors.text.primary}>Hover emotion</strong> for instant
                info in InfoPanel
              </li>
              <li>
                <strong className={theme.colors.text.primary}>Click path</strong> in 3D to persist
                details
              </li>
              <li>
                <strong className={theme.colors.text.primary}>Hover path</strong> for quick preview
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Path Exploration</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <p>
            All computed paths appear in the{" "}
            <strong className={theme.colors.text.primary}>InfoPanel</strong> (right sidebar), sorted
            with the shortest/optimal path first (⭐).
          </p>
          <p>Each path card shows:</p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Complete journey: Start → Waypoints → Goal</li>
            <li>Distance, difficulty, and time estimates</li>
            <li>Bridge emotion requirements</li>
            <li>
              <strong className={theme.colors.primary}>Clickable waypoints</strong> - Click any for
              deep dive modal
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Waypoint Deep Dive
        </h3>
        <div
          className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-2 text-sm`}
        >
          <p>Click any waypoint to open a comprehensive modal with 3 tabs:</p>
          <div className="space-y-2 ml-4">
            <div>
              <strong className="text-yellow-400">💡 Why This Step:</strong> Psychological
              reasoning, VAC dimensional shifts, position in journey
            </div>
            <div>
              <strong className="text-green-400">🛤️ How to Transition:</strong> Evidence-based
              strategies, time commitments, signs of success
            </div>
            <div>
              <strong className="text-blue-400">🔗 Relation to Others:</strong> How this waypoint
              connects to previous and next emotions, full journey context
            </div>
          </div>
          <p className="mt-3">
            <strong className={theme.colors.text.primary}>3D Highlighting:</strong> When viewing
            waypoint details, the corresponding emotion pulses with a bright cyan ring in the 3D
            sphere!
          </p>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Path Matrix</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-2`}>
          <p>
            Click <strong className="text-purple-400">&quot;📊 Show Path Matrix&quot;</strong> to
            view all possible emotion transitions at once.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Color-coded cells: Green (easy), Yellow (moderate), Red (difficult)</li>
            <li>
              Click <strong className="text-green-400">&quot;🚀 Compute All Paths&quot;</strong> to
              fill entire matrix (takes ~10 mins for 7,482 paths)
            </li>
            <li>Hover cells for tooltip details</li>
            <li>Click cell to select those emotions in 3D</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Backend Cache & Performance
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <p>
            All paths are{" "}
            <strong className={theme.colors.text.primary}>automatically cached</strong> in the
            Observer backend database for instant loading on future visits.
          </p>
          <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
            <p className="text-green-400 font-semibold mb-2">⚡ Performance Benefits:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-300">
              <li>
                <strong className="text-green-200">240x faster</strong> than client-side computation
              </li>
              <li>Load 7,482 paths in under 1 second</li>
              <li>Path Matrix ready instantly</li>
              <li>Statistics computed in real-time from database</li>
            </ul>
          </div>
          <p className="text-sm">
            Watch the <strong className={theme.colors.primary}>Cache Performance</strong> section in
            the Statistics tab to see load times and cache status.
          </p>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Statistics Dashboard
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
          <p>
            Switch to the{" "}
            <strong className={theme.colors.primary}>&quot;📊 Statistics&quot;</strong> tab in the
            InfoPanel to view aggregate analytics:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4 mt-2">
            <li>Computation progress and completion percentage</li>
            <li>Cache performance metrics (load time, cache status)</li>
            <li>Difficulty distribution (easy/moderate/difficult counts)</li>
            <li>Distance metrics (average, min, max)</li>
            <li>Bridge emotion usage frequency</li>
            <li>Waypoint statistics</li>
            <li>Top category transitions</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Tips & Tricks</h3>
        <div
          className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-2 text-sm`}
        >
          <p>
            <strong className={theme.colors.text.primary}>• Resize InfoPanel:</strong> Drag the thin
            vertical bar between 3D view and InfoPanel
          </p>
          <p>
            <strong className={theme.colors.text.primary}>• Search:</strong> Use search box in left
            panel to filter emotions quickly
          </p>
          <p>
            <strong className={theme.colors.text.primary}>• Category filters:</strong> Toggle
            categories to reduce visual clutter
          </p>
          <p>
            <strong className={theme.colors.text.primary}>• Layer controls:</strong> Show/hide soul
            sphere, paths, waypoints, etc.
          </p>
          <p>
            <strong className={theme.colors.text.primary}>• Export:</strong> Use buttons at bottom
            of left panel (JSON, CSV, clipboard, share link)
          </p>
          <p>
            <strong className={theme.colors.text.primary}>• Bridge emotions:</strong> Click yellow
            button to instantly select all 6 gateway emotions
          </p>
        </div>
      </section>
    </div>
  );
}

function ShortcutsTab() {
  const theme = useAdminTheme();
  return (
    <div className="space-y-4">
      <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Keyboard Shortcuts</h3>

      <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
        <h4 className={`font-semibold ${theme.colors.secondary} mb-3`}>Navigation & Selection</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Clear selection</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              Esc
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Select all bridge emotions</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              B
            </kbd>
          </div>
        </div>
      </div>

      <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
        <h4 className={`font-semibold ${theme.colors.secondary} mb-3`}>View Controls</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle focus mode (hide unselected)</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              F
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Cycle animation modes</span>
            <kbd
              className={`px-3 py-1 bg-purple-900/40 border border-purple-500/50 rounded font-mono ${theme.colors.primary}`}
            >
              M
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle path visibility</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              Space
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle all paths</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              P
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle emotion labels</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              L
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle soul sphere background</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              S
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle legend</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              G
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle axis labels & grids</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              A
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle motion indicators</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              O
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle data visualization mode</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              X
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle Debug Panels</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              D
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Toggle Zen session indicator</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              I
            </kbd>
          </div>
        </div>
      </div>

      <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
        <h4 className={`font-semibold ${theme.colors.secondary} mb-3`}>Navigation & System</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Previous/Next path</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              ↑ / ↓
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Jump to specific path</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              1 - 5
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Open Command Palette</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              Cmd+K
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Open Settings</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              Cmd+,
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Cycle View (Full / Zen / Cinema)</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              Z
            </kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className={theme.colors.text.primary}>Open this Help</span>
            <kbd
              className={`px-3 py-1 bg-black/40 border ${theme.colors.border} rounded font-mono ${theme.colors.text.primary}`}
            >
              H / ?
            </kbd>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-300">
          <strong>💡 Tip:</strong> Shortcuts only work when you&apos;re not typing in an input
          field.
        </p>
      </div>
    </div>
  );
}

function ConceptsTab() {
  const { allEmotions, getBridgeEmotions } = useVisualizationStore();
  const bridgeEmotions = getBridgeEmotions();
  const theme = useAdminTheme();

  return (
    <div className={`prose prose-invert max-w-none space-y-6 ${theme.colors.text.secondary}`}>
      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          The {allEmotions.length} Emotions
        </h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
          <p className="mb-2">
            The system maps{" "}
            <strong className={theme.colors.text.primary}>
              {allEmotions.length} distinct emotions
            </strong>{" "}
            to VAC space.
          </p>
          <p>
            These emotions are organized into categories representing different &quot;places we
            go&quot; emotionally. Each emotion has a unique position in 3D VAC space.
          </p>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>
          Bridge Emotions ({bridgeEmotions.length} Gateway States)
        </h3>
        <div className="space-y-2">
          {bridgeEmotions.length > 0 ? (
            bridgeEmotions.map((bridge) => (
              <div
                key={bridge.id}
                className={`bg-black/20 border ${theme.colors.border} rounded-lg p-3`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 text-lg">★</span>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${theme.colors.text.primary}`}>
                      {bridge.name}{" "}
                      <span className={`text-xs ${theme.colors.text.muted} font-mono`}>
                        [{bridge.vac[0].toFixed(1)}, {bridge.vac[1].toFixed(1)},{" "}
                        {bridge.vac[2].toFixed(1)}]
                      </span>
                    </h4>
                    <p className={`text-sm ${theme.colors.text.secondary} mt-1`}>
                      {bridge.definition}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className={`${theme.colors.text.muted} italic`}>
              No bridge emotions defined for this collection.
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Path Intelligence</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4 space-y-3`}>
          <p>
            The system uses <strong className={theme.colors.text.primary}>A* pathfinding</strong>{" "}
            with psychological constraints to find optimal emotional transitions.
          </p>
          <div className="text-sm space-y-2">
            <p>
              <strong className={theme.colors.primary}>Category-aware:</strong> Some category
              transitions are easier than others
            </p>
            <p>
              <strong className={theme.colors.primary}>Bridge detection:</strong> Automatically
              inserts bridge emotions when needed
            </p>
            <p>
              <strong className={theme.colors.primary}>Arousal regulation:</strong> High arousal
              must decrease before complex processing
            </p>
            <p>
              <strong className={theme.colors.primary}>Weighted distance:</strong> Connection axis
              is 1.5x more significant than Valence
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className={`text-xl font-bold ${theme.colors.text.primary} mb-3`}>Color Coding</h3>
        <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-4`}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: "#2DD4BF" }} />
              <div className="flex-1">
                <p className={`font-semibold ${theme.colors.text.primary}`}>
                  Teal - Easy Transitions
                </p>
                <p className={`text-sm ${theme.colors.text.muted}`}>
                  Distance &lt; 1.0 in VAC space
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: "#F59E0B" }} />
              <div className="flex-1">
                <p className={`font-semibold ${theme.colors.text.primary}`}>
                  Amber - Moderate Difficulty
                </p>
                <p className={`text-sm ${theme.colors.text.muted}`}>Distance 1.0 - 2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: "#E11D48" }} />
              <div className="flex-1">
                <p className={`font-semibold ${theme.colors.text.primary}`}>
                  Rose - Difficult Transitions
                </p>
                <p className={`text-sm ${theme.colors.text.muted}`}>
                  Distance &gt; 2.0, may require bridges
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-yellow-500" />
              <div className="flex-1">
                <p className={`font-semibold ${theme.colors.text.primary}`}>
                  Gold Ring - Bridge Emotion
                </p>
                <p className={`text-sm ${theme.colors.text.muted}`}>
                  Gateway state enabling difficult transitions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
