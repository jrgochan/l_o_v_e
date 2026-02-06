import React from 'react';
import { Strategy } from '../stores/useStrategyBrowserStore';

interface StrategyDetailsModalProps {
  strategy: Strategy;
  onClose: () => void;
}

export const StrategyDetailsModal: React.FC<StrategyDetailsModalProps> = ({ strategy, onClose }) => {
  if (!strategy) return null;

  // Helper for evidence colors
  const getEvidenceColor = (level: string) => {
    switch(level) {
        case 'meta_analysis': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'rct': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
        case 'clinical': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        default: return 'bg-white/10 text-white/50 border-white/10';
    }
  };

  // Helper for type label
  const formatType = (type: string) => type?.replace(/_/g, ' ').toUpperCase() || 'GENERAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-gray-900/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-white/40 tracking-widest">{formatType(strategy.type)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${getEvidenceColor(strategy.evidence_level)} font-medium`}>
                {strategy.evidence_level === 'meta_analysis' ? 'META-ANALYSIS' : strategy.evidence_level?.toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-light text-white tracking-tight">{strategy.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white p-2 transition-colors rounded-full hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Description */}
          <section>
            <p className="text-lg text-white/80 font-light leading-relaxed">
              {strategy.description}
            </p>
          </section>

          {/* Metrics Grid */}
          <section className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Time Required</div>
                <div className="text-white text-lg font-medium">{strategy.time_required || "N/A"}</div>
             </div>
             <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Difficulty</div>
                 <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-6 rounded-sm ${i < strategy.difficulty_level ? 'bg-cyan-500' : 'bg-white/10'}`}
                        />
                    ))}
                    <span className="ml-2 text-sm text-white/50">{strategy.difficulty_level}/5</span>
                </div>
             </div>
          </section>

          {/* Steps */}
          {strategy.steps && Array.isArray(strategy.steps) && strategy.steps.length > 0 && (
            <section>
               <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                 Implementation Steps
               </h3>
               <div className="space-y-4">
                  {strategy.steps.map((step: any, index: number) => (
                    <div key={index} className="flex gap-4 group">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-900/30 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-sm group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                        {index + 1}
                      </div>
                      <div className="pt-1">
                        <p className="text-white/80 font-light">{typeof step === 'string' ? step : step.description || JSON.stringify(step)}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          )}

          {/* Fallback if steps are missing but it's a known strategy type */}
          {(!strategy.steps || strategy.steps.length === 0) && (
              <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-200/80 text-sm italic">
                  Specific steps for this strategy are currently being digitized from the clinical protocol library.
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20 text-center">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium text-sm"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
