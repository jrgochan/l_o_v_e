"use client";

export function PaletteHelp() {
  return (
    <div className="p-4 space-y-5 max-h-[500px] overflow-y-auto">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-2">🎹 Command Palette Guide</h2>
        <p className="text-sm text-gray-400">Complete keyboard control for emotional exploration</p>
      </div>

      {/* Getting Started */}
      <section className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-700/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wide mb-3">
          🚀 Getting Started
        </h3>
        <div className="space-y-2 text-xs text-gray-300">
          <p>
            <strong className="text-white">Opening the palette:</strong> Press{" "}
            <span className="text-cyan-400 font-mono">CMD+K</span> (Mac) or{" "}
            <span className="text-cyan-400 font-mono">Ctrl+K</span> (Windows/Linux) from anywhere
          </p>
          <p>
            <strong className="text-white">Finding emotions:</strong> Just start typing emotion
            names like &quot;joy&quot;, &quot;calm&quot;, or &quot;anxiety&quot;
          </p>
          <p>
            <strong className="text-white">Browsing categories:</strong> Scroll through categories
            at bottom of home view
          </p>
          <p>
            <strong className="text-white">Quick commands:</strong> Type{" "}
            <span className="text-purple-400 font-mono">/</span> to see all available actions
          </p>
        </div>
      </section>

      {/* Basic Navigation */}
      <section>
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-3">
          📌 Basic Navigation
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-cyan-300 font-mono">CMD/Ctrl+K</span>
              <span className="text-gray-500">Open/Toggle</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Opens command palette from anywhere in the app
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-cyan-300 font-mono">↑↓ Arrow Keys</span>
              <span className="text-gray-500">Navigate</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Move up and down through emotions and commands
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-cyan-300 font-mono">Enter</span>
              <span className="text-gray-500">Select</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Select the highlighted emotion or execute command
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-cyan-300 font-mono">Esc</span>
              <span className="text-gray-500">Close/Back</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Go back one level or close the palette entirely
            </p>
          </div>
        </div>
      </section>

      {/* Modifier Keys */}
      <section>
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">
          ⌨️ Advanced: Modifier Keys
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Hold these keys while pressing Enter to perform different actions on emotions:
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">⌘+Enter</span>
              <span className="text-purple-400">Multi-Select</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Add emotion to current selection without replacing it
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">⌥+Enter</span>
              <span className="text-purple-400">Focus</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Focus camera on emotion and highlight it in the visualization
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">⇧+Enter</span>
              <span className="text-purple-400">Navigate</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Smoothly fly camera to emotion&apos;s location in 3D space
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">⌘⇧+Enter</span>
              <span className="text-purple-400">Toggle</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Add if not selected, remove if already selected
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">⌥⇧+Enter</span>
              <span className="text-purple-400">Isolate</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Select only this emotion and hide all others
            </p>
          </div>
        </div>
      </section>

      {/* Search Operators */}
      <section>
        <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3">
          🔍 Power Search Operators
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          These operators filter the emotion list, then select from filtered results:
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-green-300 font-mono">~joy</span>
              <span className="text-green-400">Similar</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Find emotions similar to &quot;joy&quot; based on VAC distance
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">!anxiety</span>
              <span className="text-purple-400">Opposite</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Find emotions opposite to &quot;anxiety&quot; (inverted VAC coordinates)
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-orange-300 font-mono">&gt;uncertain</span>
              <span className="text-orange-400">Category</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Show emotions in categories starting with &quot;uncertain&quot;
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-yellow-300 font-mono">@favorite</span>
              <span className="text-yellow-400">Favorites</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">Show only your favorited emotions</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-cyan-300 font-mono">valence&gt;0.5</span>
              <span className="text-cyan-400">VAC Filter</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Filter by coordinate (also: arousal&lt;0, connection&gt;0.8)
            </p>
          </div>
        </div>
      </section>

      {/* Journey Commands */}
      <section>
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">
          🛤️ Journey Control
        </h3>
        <p className="text-xs text-gray-400 mb-3">Navigate emotional journeys step-by-step:</p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">/journey start</span>
              <span className="text-purple-400">Start</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Begin journey from computed path (select 2 emotions first)
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">/next</span>
              <span className="text-purple-400">Advance</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Mark current waypoint reached, move to next
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">/previous</span>
              <span className="text-purple-400">Go Back</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">Return to previous waypoint in journey</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-purple-300 font-mono">/waypoint 2</span>
              <span className="text-purple-400">Jump</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">
              Jump to specific waypoint number (can&apos;t skip ahead)
            </p>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section>
        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wide mb-3">
          🗺️ Pre-Built Templates
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Instantly load research-backed emotional journeys:
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-300 font-mono">/template list</span>
            <span className="text-gray-500">View all 10 templates</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-300 font-mono">/template anxiety-calm</span>
            <span className="text-gray-500">Anxiety → Calm journey</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-300 font-mono">/template loneliness-belonging</span>
            <span className="text-gray-500">Loneliness → Belonging</span>
          </div>
          <p className="text-xs text-gray-500 italic mt-2 bg-orange-900/20 p-2 rounded">
            💡 Templates automatically select start/end emotions. Path computes in background!
          </p>
        </div>
      </section>

      {/* Sessions */}
      <section>
        <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3">
          📝 Therapeutic Sessions
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Track therapeutic work across multiple journeys:
        </p>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-green-300 font-mono">/session start</span>
              <span className="text-green-400">Begin</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">Start tracking a therapeutic session</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-green-300 font-mono">/session notes</span>
              <span className="text-green-400">Note</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">Add timestamped notes during session</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-green-300 font-mono">/session pause</span>
              <span className="text-green-400">Pause</span>
            </div>
            <p className="text-xs text-gray-400 pl-4">Pause session timer (resume later)</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-3">
          ⚡ Quick Actions
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyan-300 font-mono">/clear</span>
            <span className="text-gray-500">Clear all selections</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyan-300 font-mono">/bridge</span>
            <span className="text-gray-500">Select 6 bridge emotions</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyan-300 font-mono">/reset</span>
            <span className="text-gray-500">Reset everything to neutral</span>
          </div>
        </div>
      </section>

      {/* Pro Tips */}
      <section className="bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-cyan-900/20 border border-purple-700/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-3">
          💡 Pro Workflow Tips
        </h3>
        <ul className="space-y-2 text-xs text-gray-300">
          <li>
            • <strong className="text-white">Operators filter lists:</strong> Type{" "}
            <span className="text-green-400 font-mono">~joy</span>, then select from similar
            emotions
          </li>
          <li>
            • <strong className="text-white">Chain commands:</strong> Select emotions, load
            template, start journey - all via keyboard!
          </li>
          <li>
            • <strong className="text-white">Watch footer:</strong> Current mode and status
            indicators show your context
          </li>
          <li>
            • <strong className="text-white">Active journey:</strong> Purple banner appears showing
            progress when journey active
          </li>
          <li>
            • <strong className="text-white">Session tracking:</strong> Green indicator in footer
            when session is active
          </li>
          <li>
            • <strong className="text-white">Complete workflows:</strong> Start→navigate→complete
            entire therapeutic sessions without mouse!
          </li>
        </ul>
      </section>

      {/* Example Workflow */}
      <section className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-600/40 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-3">
          🎯 Example Workflow
        </h3>
        <ol className="space-y-2 text-xs text-gray-300 list-decimal list-inside">
          <li>
            <span className="text-cyan-400 font-mono">CMD+K</span> → Type{" "}
            <span className="text-orange-400 font-mono">/template anxiety-calm</span> → Enter
          </li>
          <li>Wait 2-3 seconds for path to compute</li>
          <li>
            <span className="text-cyan-400 font-mono">CMD+K</span> → Type{" "}
            <span className="text-purple-400 font-mono">/journey start</span> → Enter
          </li>
          <li>
            <span className="text-cyan-400 font-mono">CMD+K</span> → Type{" "}
            <span className="text-purple-400 font-mono">/next</span> → Enter (advance waypoint)
          </li>
          <li>Repeat step 4 until journey complete</li>
          <li>
            <span className="text-cyan-400 font-mono">CMD+K</span> → Type{" "}
            <span className="text-purple-400 font-mono">/journey complete</span> → Enter
          </li>
        </ol>
        <p className="text-xs text-cyan-300 mt-3 italic">
          ⚡ Complete therapeutic journey in under 30 seconds of keyboard time!
        </p>
      </section>
    </div>
  );
}
