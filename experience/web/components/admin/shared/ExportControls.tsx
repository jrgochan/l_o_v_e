/**
 * Export Controls — Compact Icon Row
 *
 * 4 small icon buttons in a single row with tooltips.
 * Saves ~120px vs the previous full-width button stack.
 */

"use client";

import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";
import { BRIDGE_EMOTIONS } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function ExportControls() {
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const selectedIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const theme = useAdminTheme();

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

  const exportCSV = () => {
    const paths = Array.from(computedPaths.values());

    const headers = [
      "From", "To", "Distance", "Difficulty", "Time", "Waypoints",
      "Requires Bridge", "Bridge Emotions",
    ];
    const rows = paths.map((p) => [
      p.from.name, p.to.name, p.total_distance.toFixed(3), p.difficulty,
      p.estimated_time, p.waypoints.length,
      p.requires_bridge ? "Yes" : "No", p.bridge_emotions?.join("; ") || "",
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

  const generateShareableURL = () => {
    const selectedEmotions = allEmotions.filter((e) => selectedIds.has(e.id));
    const emotionIds = selectedEmotions.map((e) => e.id).join(",");

    const url = new URL(window.location.href);
    url.searchParams.set("emotions", emotionIds);

    navigator.clipboard.writeText(url.toString());
    alert("Shareable URL copied to clipboard!");
  };

  const hasSelection = selectedIds.size > 0;
  const hasPaths = computedPaths.size > 0;

  const actions = [
    { icon: "📥", label: "Export JSON", onClick: exportJSON, disabled: !hasSelection },
    { icon: "📊", label: "Export CSV", onClick: exportCSV, disabled: !hasPaths },
    { icon: "📋", label: "Copy to Clipboard", onClick: copyToClipboard, disabled: !hasSelection },
    { icon: "🔗", label: "Copy Share Link", onClick: generateShareableURL, disabled: !hasSelection },
  ];

  return (
    <div className="flex gap-1.5">
      {actions.map(({ icon, label, onClick, disabled }) => (
        <button
          key={label}
          onClick={onClick}
          disabled={disabled}
          title={label}
          className={`
            flex-1 flex items-center justify-center
            px-2 py-2 rounded-lg border text-sm
            transition-all duration-200
            ${disabled
              ? `bg-black/10 border-white/5 ${theme.colors.text.muted} opacity-40 cursor-not-allowed`
              : `bg-black/20 border-white/10 ${theme.colors.text.secondary} hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95`
            }
          `}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
