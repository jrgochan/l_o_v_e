/**
 * Export Controls Component
 *
 * Provides export and screenshot functionality for the Atlas interface.
 */

"use client";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";
import { BRIDGE_EMOTIONS } from "@/types/atlas-admin";

export function ExportControls() {
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const computedPaths = useAtlasAdminStore((state) => state.computedPaths);

  /**
   * Export selected emotions and paths as JSON
   */
  const exportJSON = () => {
    const selectedEmotions = allEmotions.filter((e) => selectedIds.has(e.id));
    const paths = Array.from(computedPaths.values());

    const exportData = {
      exported_at: new Date().toISOString(),
      emotions: selectedEmotions.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        vac: e.vac,
        is_bridge: (BRIDGE_EMOTIONS as readonly string[]).includes(e.name),
      })),
      paths: paths.map((p) => ({
        from: p.from.name,
        to: p.to.name,
        distance: p.total_distance,
        difficulty: p.difficulty,
        estimated_time: p.estimated_time,
        waypoints: p.waypoints.map((wp) => wp.emotion),
        requires_bridge: p.requires_bridge,
        bridge_emotions: p.bridge_emotions,
      })),
      summary: {
        total_emotions: selectedEmotions.length,
        total_paths: paths.length,
        bridge_count: selectedEmotions.filter((e) =>
          (BRIDGE_EMOTIONS as readonly string[]).includes(e.name)
        ).length,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soul-sphere-atlas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export path metrics as CSV
   */
  const exportCSV = () => {
    const paths = Array.from(computedPaths.values());



    const headers = [
      "From",
      "To",
      "Distance",
      "Difficulty",
      "Time",
      "Waypoints",
      "Requires Bridge",
      "Bridge Emotions",
    ];
    const rows = paths.map((p) => [
      p.from.name,
      p.to.name,
      p.total_distance.toFixed(3),
      p.difficulty,
      p.estimated_time,
      p.waypoints.length,
      p.requires_bridge ? "Yes" : "No",
      p.bridge_emotions?.join("; ") || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soul-sphere-paths-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Copy current state to clipboard
   */
  const copyToClipboard = async () => {
    const selectedEmotions = allEmotions.filter((e) => selectedIds.has(e.id));
    const paths = Array.from(computedPaths.values());

    const text = `Soul Sphere Atlas Export
━━━━━━━━━━━━━━━━━━━━━━

Selected Emotions (${selectedEmotions.length}):
${selectedEmotions.map((e, i) => `${i + 1}. ${e.name} [${e.vac.map((v) => v.toFixed(2)).join(", ")}]`).join("\n")}

Computed Paths (${paths.length}):
${paths.map((p, i) => `${i + 1}. ${p.from.name} → ${p.to.name} (${p.difficulty}, ${p.total_distance.toFixed(2)} distance)`).join("\n")}
`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (err) {
      logger.error("general", "Failed to copy to clipboard", err);
      alert("Failed to copy to clipboard");
    }
  };

  /**
   * Generate shareable URL with current state
   */
  const generateShareableURL = () => {
    const selectedEmotions = allEmotions.filter((e) => selectedIds.has(e.id));
    const emotionIds = selectedEmotions.map((e) => e.id).join(",");

    const url = new URL(window.location.href);
    url.searchParams.set("emotions", emotionIds);

    navigator.clipboard.writeText(url.toString());
    alert("Shareable URL copied to clipboard!");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Export</h3>

      <button
        onClick={exportJSON}
        disabled={selectedIds.size === 0}
        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition"
      >
        📥 Export JSON
      </button>

      <button
        onClick={exportCSV}
        disabled={computedPaths.size === 0}
        className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition"
      >
        📊 Export CSV
      </button>

      <button
        onClick={copyToClipboard}
        disabled={selectedIds.size === 0}
        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition"
      >
        📋 Copy to Clipboard
      </button>

      <button
        onClick={generateShareableURL}
        disabled={selectedIds.size === 0}
        className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition"
      >
        🔗 Copy Share Link
      </button>
    </div>
  );
}
