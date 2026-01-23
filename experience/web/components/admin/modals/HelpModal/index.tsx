/**
 * Help Modal Component
 *
 * Comprehensive guide explaining the VAC model, Soul Sphere,
 * and how to use the Atlas Admin Interface.
 */

"use client";

import { useState } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

type TabType = "model" | "usage" | "shortcuts" | "concepts";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("model");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-cyan-500/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900/50">
          <div>
            <h2 className="text-2xl font-bold text-white">Soul Sphere Atlas - Help & Guide</h2>
            <p className="text-sm text-gray-400 mt-1">Understanding the VAC Model and Interface</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
          >
            Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("model")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${activeTab === "model"
              ? "text-white bg-gray-800 border-b-2 border-cyan-500"
              : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
          >
            🧠 VAC Model & Soul Sphere
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${activeTab === "usage"
              ? "text-white bg-gray-800 border-b-2 border-cyan-500"
              : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
          >
            🎯 How to Use
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${activeTab === "shortcuts"
              ? "text-white bg-gray-800 border-b-2 border-cyan-500"
              : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
          >
            ⌨️ Shortcuts
          </button>
          <button
            onClick={() => setActiveTab("concepts")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${activeTab === "concepts"
              ? "text-white bg-gray-800 border-b-2 border-cyan-500"
              : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
          >
            🌟 Key Concepts
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "model" && <ModelTab />}
          {activeTab === "usage" && <UsageTab />}
          {activeTab === "shortcuts" && <ShortcutsTab />}
          {activeTab === "concepts" && <ConceptsTab />}
        </div>
      </div>
    </div>
  );
}

function ModelTab() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <section>
        <h3 className="text-xl font-bold text-white mb-3">What is the Soul Sphere?</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-gray-300">
          <p>
            The Soul Sphere is a <strong className="text-white">living visualization</strong> of
            emotional states in 3D space. Unlike static charts or graphs, it morphs and transforms
            based on your position in the emotional landscape.
          </p>
          <p>
            The sphere is procedurally generated using custom shaders, with three visual dimensions:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong className="text-cyan-400">Color</strong> - Emotional tone (positive ↔
              negative)
            </li>
            <li>
              <strong className="text-cyan-400">Shape</strong> - Energy level (calm ↔ chaotic)
            </li>
            <li>
              <strong className="text-cyan-400">Glow</strong> - Connection quality (isolated ↔
              connected)
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">The VAC Model</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <p className="text-gray-300">
            <strong className="text-white">VAC</strong> stands for{" "}
            <strong>Valence-Arousal-Connection</strong>, a three-dimensional model for representing
            emotions in computational space.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-700 rounded p-3">
              <h4 className="font-semibold text-red-400 mb-2">V - Valence</h4>
              <p className="text-sm text-gray-300">
                Positive ↔ Negative
                <br />
                Joy (+0.9) to Shame (-0.9)
              </p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <h4 className="font-semibold text-green-400 mb-2">A - Arousal</h4>
              <p className="text-sm text-gray-300">
                High Energy ↔ Low Energy
                <br />
                Overwhelm (+0.9) to Tranquility (-0.8)
              </p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <h4 className="font-semibold text-blue-400 mb-2">C - Connection</h4>
              <p className="text-sm text-gray-300">
                With Others ↔ Isolated
                <br />
                Love (+1.0) to Shame (-1.0)
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Why Connection Matters</h3>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-300 mb-3">
            The Connection axis is our <strong className="text-cyan-400">innovation</strong>.
            Traditional models use Dominance, which can&apos;t distinguish emotions that differ in
            relational quality.
          </p>

          <div className="space-y-3">
            <div className="bg-gray-700/50 rounded p-3">
              <h4 className="font-semibold text-yellow-400 mb-1">Pity vs. Compassion</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <p>
                  <strong>Pity:</strong> &quot;I feel sorry FOR them&quot; (Connection: -0.7)
                </p>
                <p>
                  <strong>Compassion:</strong> &quot;I feel WITH them&quot; (Connection: +0.9)
                </p>
                <p className="text-gray-400 italic">
                  Both feel &quot;caring&quot; but have different therapeutic value
                </p>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded p-3">
              <h4 className="font-semibold text-yellow-400 mb-1">Grief vs. Despair</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <p>
                  <strong>Grief:</strong> Love persists despite pain (Connection: +0.7)
                </p>
                <p>
                  <strong>Despair:</strong> Isolated suffering (Connection: -0.6)
                </p>
                <p className="text-gray-400 italic">
                  Connection distinguishes healing from hopelessness
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Research Foundation</h3>
        <div className="bg-gray-800 rounded-lg p-4 text-gray-300 space-y-2 text-sm">
          <p>
            <strong className="text-white">Brené Brown&apos;s</strong> - Atlas of the Heart (
            relational dynamics)
          </p>
          <p>
            <strong className="text-white">James Russell</strong> - Circumplex Model (VA foundation,
            extended to VAC)
          </p>
          <p>
            <strong className="text-white">Paul Ekman</strong> - Basic Emotions (universal patterns)
          </p>
        </div>
      </section>
    </div>
  );
}

function UsageTab() {
  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <section>
        <h3 className="text-xl font-bold text-white mb-3">Getting Started</h3>
        <div className="bg-gray-800 rounded-lg p-4">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong className="text-white">Select emotions</strong> from the left panel or click
              them in the 3D view
            </li>
            <li>
              <strong className="text-white">Paths auto-compute</strong> showing optimal transitions
            </li>
            <li>
              <strong className="text-white">Explore in InfoPanel</strong> on the right (sorted by
              distance)
            </li>
            <li>
              <strong className="text-white">Click waypoints</strong> for comprehensive transition
              guidance
            </li>
          </ol>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">3D Visualization</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-cyan-400 mb-2">Navigation</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
              <li>
                <strong>Orbit:</strong> Left-click and drag to rotate view
              </li>
              <li>
                <strong>Zoom:</strong> Scroll wheel to zoom in/out
              </li>
              <li>
                <strong>Pan:</strong> Right-click and drag (or Ctrl+drag)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-cyan-400 mb-2">Interaction</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
              <li>
                <strong>Click emotion</strong> to select/deselect
              </li>
              <li>
                <strong>Hover emotion</strong> for instant info in InfoPanel
              </li>
              <li>
                <strong>Click path</strong> in 3D to persist details
              </li>
              <li>
                <strong>Hover path</strong> for quick preview
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Path Exploration</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 text-gray-300">
          <p>
            All computed paths appear in the <strong className="text-white">InfoPanel</strong>{" "}
            (right sidebar), sorted with the shortest/optimal path first (⭐).
          </p>
          <p>Each path card shows:</p>
          <ul className="list-disc list-inside space-y-1 text-sm ml-4">
            <li>Complete journey: Start → Waypoints → Goal</li>
            <li>Distance, difficulty, and time estimates</li>
            <li>Bridge emotion requirements</li>
            <li>
              <strong className="text-cyan-400">Clickable waypoints</strong> - Click any for deep
              dive modal
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Waypoint Deep Dive</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-gray-300 text-sm">
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
            <strong>3D Highlighting:</strong> When viewing waypoint details, the corresponding
            emotion pulses with a bright cyan ring in the 3D sphere!
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Path Matrix</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-gray-300">
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
        <h3 className="text-xl font-bold text-white mb-3">Backend Cache & Performance</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <p className="text-gray-300">
            All paths are <strong className="text-white">automatically cached</strong> in the
            Observer backend database for instant loading on future visits.
          </p>
          <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
            <p className="text-green-400 font-semibold mb-2">⚡ Performance Benefits:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-300">
              <li>
                <strong>240x faster</strong> than client-side computation
              </li>
              <li>Load 7,482 paths in under 1 second</li>
              <li>Path Matrix ready instantly</li>
              <li>Statistics computed in real-time from database</li>
            </ul>
          </div>
          <p className="text-gray-300 text-sm">
            Watch the <strong className="text-cyan-400">Cache Performance</strong> section in the
            Statistics tab to see load times and cache status.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Statistics Dashboard</h3>
        <div className="bg-gray-800 rounded-lg p-4 text-gray-300">
          <p>
            Switch to the <strong className="text-cyan-400">&quot;📊 Statistics&quot;</strong> tab
            in the InfoPanel to view aggregate analytics:
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
        <h3 className="text-xl font-bold text-white mb-3">Tips & Tricks</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-gray-300 text-sm">
          <p>
            • <strong>Resize InfoPanel:</strong> Drag the thin vertical bar between 3D view and
            InfoPanel
          </p>
          <p>
            • <strong>Search:</strong> Use search box in left panel to filter emotions quickly
          </p>
          <p>
            • <strong>Category filters:</strong> Toggle categories to reduce visual clutter
          </p>
          <p>
            • <strong>Layer controls:</strong> Show/hide soul sphere, paths, waypoints, etc.
          </p>
          <p>
            • <strong>Export:</strong> Use buttons at bottom of left panel (JSON, CSV, clipboard,
            share link)
          </p>
          <p>
            • <strong>Bridge emotions:</strong> Click yellow button to instantly select all 6
            gateway emotions
          </p>
        </div>
      </section>
    </div>
  );
}

function ShortcutsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-3">Keyboard Shortcuts</h3>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold text-gray-400 mb-3">Navigation & Selection</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Clear selection</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">Esc</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Select all bridge emotions</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">B</kbd>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold text-gray-400 mb-3">View Controls</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle focus mode (hide unselected)</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">F</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Cycle animation modes</span>
            <kbd className="px-3 py-1 bg-purple-700 rounded font-mono text-white">M</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle path visibility</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">Space</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle all paths</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">P</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle emotion labels</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">L</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle soul sphere background</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">S</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle legend</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">G</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle axis labels & grids</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">A</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle motion indicators</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">O</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle data visualization mode</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">X</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle Debug Panels</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">D</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Toggle Zen session indicator</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">I</kbd>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold text-gray-400 mb-3">Navigation & System</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Previous/Next path</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">↑ / ↓</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Jump to specific path</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">1 - 5</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Open Command Palette</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">Cmd+K</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Open Settings</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">Cmd+,</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Cycle View (Full / Zen / Cinema)</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">Z</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Open this Help</span>
            <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-white">H / ?</kbd>
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

  return (
    <div className="prose prose-invert max-w-none space-y-6">
      <section>
        <h3 className="text-xl font-bold text-white mb-3">The {allEmotions.length} Emotions</h3>
        <div className="bg-gray-800 rounded-lg p-4 text-gray-300">
          <p className="mb-2">
            The system maps <strong className="text-white">{allEmotions.length} distinct emotions</strong> to VAC space.
          </p>
          <p>
            These emotions are organized into categories representing different
            &quot;places we go&quot; emotionally. Each emotion has a unique position in 3D VAC
            space.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Bridge Emotions ({bridgeEmotions.length} Gateway States)</h3>
        <div className="space-y-2">
          {bridgeEmotions.length > 0 ? (
            bridgeEmotions.map((bridge) => (
              <div key={bridge.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 text-lg">★</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      {bridge.name}{" "}
                      <span className="text-xs text-gray-400 font-mono">
                        [{bridge.vac[0].toFixed(1)}, {bridge.vac[1].toFixed(1)}, {bridge.vac[2].toFixed(1)}]
                      </span>
                    </h4>
                    <p className="text-sm text-gray-300 mt-1">{bridge.definition}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic">No bridge emotions defined for this collection.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Path Intelligence</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3 text-gray-300">
          <p>
            The system uses <strong className="text-white">A* pathfinding</strong> with
            psychological constraints to find optimal emotional transitions.
          </p>
          <div className="text-sm space-y-2">
            <p>
              <strong className="text-cyan-400">Category-aware:</strong> Some category transitions
              are easier than others
            </p>
            <p>
              <strong className="text-cyan-400">Bridge detection:</strong> Automatically inserts
              bridge emotions when needed
            </p>
            <p>
              <strong className="text-cyan-400">Arousal regulation:</strong> High arousal must
              decrease before complex processing
            </p>
            <p>
              <strong className="text-cyan-400">Weighted distance:</strong> Connection axis is 1.5x
              more significant than Valence
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-3">Color Coding</h3>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: "#00FFC8" }} />
              <div className="flex-1">
                <p className="font-semibold text-white">Green - Easy Transitions</p>
                <p className="text-sm text-gray-400">Distance &lt; 1.0 in VAC space</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: "#FFC800" }} />
              <div className="flex-1">
                <p className="font-semibold text-white">Yellow - Moderate Difficulty</p>
                <p className="text-sm text-gray-400">Distance 1.0 - 2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: "#FF0096" }} />
              <div className="flex-1">
                <p className="font-semibold text-white">Red - Difficult Transitions</p>
                <p className="text-sm text-gray-400">Distance &gt; 2.0, may require bridges</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-yellow-500" />
              <div className="flex-1">
                <p className="font-semibold text-white">Gold Ring - Bridge Emotion</p>
                <p className="text-sm text-gray-400">
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
