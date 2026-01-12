interface GraphLegendProps {
  className?: string;
}

export function GraphLegend({ className = "" }: GraphLegendProps) {
  return (
    <div
      className={`absolute bottom-4 left-4 bg-gray-800/90 rounded-lg p-3 text-xs text-gray-300 space-y-1 ${className}`}
    >
      <div className="font-semibold mb-2">Relationship Types:</div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-blue-500"></div>
        <span>Complementary</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-orange-500"></div>
        <span>Contradictory</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-purple-500"></div>
        <span>Masking</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-green-500"></div>
        <span>Amplifying</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 bg-gray-500"></div>
        <span>Sequential</span>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 text-xs opacity-75">
        <div>Node size = Confidence</div>
        <div>Node color = VAC Valence</div>
        <div>Drag to reposition</div>
      </div>
    </div>
  );
}
