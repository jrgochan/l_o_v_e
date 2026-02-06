import React, { useState, useEffect } from 'react';
import { therapeuticService } from '../services/therapeuticService';
import { usePathExplorerStore, Waypoint } from '../stores/usePathExplorerStore';

interface StepAlternativeSelectorProps {
  currentEmotionId: string;
  goalEmotionId: string;
  currentStepIndex: number; // Index in the waypoints array
  onClose: () => void;
}

export const StepAlternativeSelector: React.FC<StepAlternativeSelectorProps> = ({
  currentEmotionId,
  goalEmotionId,
  currentStepIndex,
  onClose
}) => {
  const { updateWaypoint } = usePathExplorerStore();
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlternatives = async () => {
      try {
        setIsLoading(true);
        const data = await therapeuticService.getStepAlternatives(currentEmotionId, goalEmotionId);
        setAlternatives(data.alternatives || []);
      } catch (err) {
        setError("Could not load alternatives");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlternatives();
  }, [currentEmotionId, goalEmotionId]);

  const handleSelect = (alt: any) => {
    // Construct new waypoint object matching store interface
    const newWaypoint: Waypoint = {
        order: currentStepIndex + 1,
        emotion: alt.name,
        category: alt.category,
        vac: alt.vac,
        reasoning: "User selected alternative",
        estimated_time: "Recalculating...",
        difficulty: "moderate"
    };

    updateWaypoint(currentStepIndex, newWaypoint);
    onClose();
  };

  return (
    <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/10 animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-white">Select Alternative Step</h4>
        <button onClick={onClose} className="text-xs text-white/50 hover:text-white">Cancel</button>
      </div>

      {isLoading && <div className="text-xs text-white/40 text-center py-4">Finding valid paths...</div>}

      {error && <div className="text-xs text-red-400 text-center py-2">{error}</div>}

      {!isLoading && !error && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {alternatives.map((alt) => (
            <button
              key={alt.id}
              onClick={() => handleSelect(alt)}
              className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all group"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-cyan-300 group-hover:text-cyan-200">{alt.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/30">{alt.category}</span>
              </div>
              <p className="text-xs text-white/50 mt-1 line-clamp-2 font-light">
                {alt.description}
              </p>
            </button>
          ))}

          {alternatives.length === 0 && (
             <div className="text-xs text-white/30 text-center italic">No valid alternatives found for this specific transition.</div>
          )}
        </div>
      )}
    </div>
  );
};
