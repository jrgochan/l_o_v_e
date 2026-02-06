'use client';

import React, { useState } from 'react';
import { usePathExplorerStore } from '../stores/usePathExplorerStore';
import { StepAlternativeSelector } from './StepAlternativeSelector';
import { PathfindingInsights } from './PathfindingInsights';

export const PathExplanationPanel = () => {
    const { primaryPath, selectedStepIndex, showExplanation, toggleExplanation, selectStep } = usePathExplorerStore();
    const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

    if (!primaryPath || !showExplanation) return null;

    return (
        <div
            className="fixed right-0 top-0 h-full w-96 bg-black/80 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto z-50 transition-transform duration-300 ease-out"
        >
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-black/80 backdrop-blur-xl -mx-6 px-6 py-4 border-b border-white/5 z-10">
                <h2 className="text-xl font-light text-white tracking-wide">Journey Details</h2>
                <button
                  onClick={() => toggleExplanation(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  ✕
                </button>
            </div>

            <div className="space-y-4 pb-20">
                {primaryPath.steps?.map((step: any, index: number) => (
                    <div
                        key={index}
                        className={`p-4 rounded-xl transition-all cursor-pointer border ${selectedStepIndex === index ? 'bg-white/10 border-white/30 shadow-lg shadow-white/5' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                        onClick={() => selectStep(index)}
                    >
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs uppercase tracking-wider text-cyan-400 font-medium">Step {index + 1}</span>
                             {step.clinical_rationale && <span className="text-[10px] uppercase tracking-wider text-amber-400/80 border border-amber-400/30 px-1.5 py-0.5 rounded">Clinical Note</span>}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <span className="font-light text-lg text-white">{step.from_emotion}</span>
                            <span className="text-white/30 text-sm">→</span>
                            <span className="font-medium text-lg text-emerald-300">{step.to_emotion}</span>
                        </div>

                        <p className="text-white/70 text-sm leading-relaxed mb-3 font-light">
                            {step.summary}
                        </p>

                        {selectedStepIndex === index && (
                             <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/40 space-y-2 font-mono">
                                 <div className="flex justify-between">
                                    <span>VAC Distance</span>
                                    <span>{step.vac_change?.distance}</span>
                                 </div>
                                 {step.is_bridge && (
                                     <div className="flex justify-between text-amber-300/80">
                                        <span>Bridge Category</span>
                                        <span>{step.category_transition?.to_category}</span>
                                     </div>
                                 )}
                                 {step.clinical_rationale && (
                                     <div className="pt-2 text-white/60 italic font-sans border-t border-white/5 mt-2 leading-relaxed">
                                         "{step.clinical_rationale}"
                                     </div>
                                 )}

                                 {/* Modify Button - Only if we have IDs available (check store update) */}
                                 {/* For now, assuming we might not implement full "Modify" until IDs are passed.
                                     But providing the UI hook.
                                  */}
                                 <div className="pt-4 flex justify-end">
                                    <button
                                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStepIndex(index);
                                        }}
                                    >
                                        ✎ Modify Step
                                    </button>
                                 </div>

                                 {editingStepIndex === index && (
                                     <StepAlternativeSelector
                                        currentEmotionId={(primaryPath.waypoints[index] as any).emotion_id || ""}
                                        goalEmotionId={(primaryPath.goal_state as any).emotion_id || ""}
                                        currentStepIndex={index}
                                        onClose={() => setEditingStepIndex(null)}
                                     />
                                 )}
                             </div>
                        )}
                    </div>
                ))}
            </div>



            {/* Algorithm Insights Block */}
            {(primaryPath as any).search_metadata && (
                <div className="px-6 pb-24">
                    <PathfindingInsights metrics={(primaryPath as any).search_metadata} />
                </div>
            )}

            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-12 border-t border-white/10">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Total Time</div>
                        <div className="text-xl font-light text-white/90">{primaryPath.path_metrics?.estimated_time || "15-30m"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-white/30 uppercase tracking-widest mb-1 text-right">Difficulty</div>
                        <div className="text-xl font-light text-white/90 capitalize text-right">{primaryPath.path_metrics?.difficulty || "Moderate"}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
