import type { GraphNode } from "@/hooks/visualizations/useGraphData";

interface GraphNodeDetailsProps {
  node: GraphNode | null;
  onClose: () => void;
  className?: string;
}

export function GraphNodeDetails({ node, onClose, className = "" }: GraphNodeDetailsProps) {
  if (!node) return null;

  return (
    <div
      className={`absolute top-4 right-4 bg-gray-800/90 rounded-lg p-3 text-sm max-w-xs ${className}`}
    >
      <div className="font-semibold text-white mb-2">{node.emotion.emotion_name}</div>
      <div className="space-y-1 text-xs text-gray-300">
        <div className="flex justify-between">
          <span>Category:</span>
          <span className="text-white">{node.emotion.category}</span>
        </div>
        <div className="flex justify-between">
          <span>Confidence:</span>
          <span className="text-white">{(node.emotion.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Prominence:</span>
          <span className="text-white capitalize">{node.emotion.prominence}</span>
        </div>
        <div className="text-xs mt-2 font-mono text-gray-400">
          VAC: ({node.emotion.vac.valence.toFixed(2)}, {node.emotion.vac.arousal.toFixed(2)},{" "}
          {node.emotion.vac.connection.toFixed(2)})
        </div>
      </div>
      <button onClick={onClose} className="mt-2 text-xs text-cyan-400 hover:text-cyan-300">
        Close
      </button>
    </div>
  );
}
