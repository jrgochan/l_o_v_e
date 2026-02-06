'use client';

import React from 'react';
import { usePathExplorerStore, Path } from '../stores/usePathExplorerStore';

export const PathComparisonView = () => {
    const { alternativePaths, setPrimaryPath, setAlternativePaths } = usePathExplorerStore();

    if (!alternativePaths || alternativePaths.length === 0) return null;

    const handleSelectPath = (path: Path) => {
        setPrimaryPath(path);
        // Clear alternatives to exit comparison mode
        setAlternativePaths([]);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="max-w-6xl w-full">
                <header className="text-center mb-12">
                    <h2 className="text-3xl font-thin tracking-widest text-white mb-2">CHOOSE YOUR PATH</h2>
                    <p className="text-white/50 text-sm font-light uppercase tracking-wider">
                        Multiple routes available for this transition
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {alternativePaths.map((path, index) => (
                        <div
                            key={index}
                            className="group relative bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-900/20"
                            onClick={() => handleSelectPath(path)}
                        >
                            <div className="absolute top-4 right-4 text-xs font-mono text-white/20 group-hover:text-cyan-400">
                                OPTION 0{index + 1}
                            </div>

                            {/* Visualization Placeholder */}
                            <div className="h-32 mb-6 w-full bg-black/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-tr from-cyan-500/10 to-transparent" />
                                <div className="flex items-center gap-2">
                                     {path.waypoints.map((_, i) => (
                                         <div key={i} className="w-2 h-2 rounded-full bg-white/30" />
                                     ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8">
                                <div>
                                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Duration</div>
                                    <div className="text-xl font-light text-white">{path.path_metrics?.estimated_time || "~30m"}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Difficulty</div>
                                    <div className={`text-xl font-light capitalize ${getDifficultyColor(path.path_metrics?.difficulty)}`}>
                                        {path.path_metrics.difficulty}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Steps</div>
                                    <div className="text-xl font-light text-white">{path.waypoints.length + 2}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Bridges</div>
                                    <div className="text-xl font-light text-white">{path.path_metrics?.requires_bridge ? path.path_metrics.bridge_emotions?.length : 0}</div>
                                </div>
                            </div>

                            {/* Key Feature Badge */}
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="text-center text-sm font-light text-white/60 group-hover:text-white transition-colors">
                                    {getPathSummary(path)}
                                </div>
                                <button className="w-full mt-4 py-3 border border-white/20 rounded-lg text-xs uppercase tracking-widest hover:bg-cyan-500 hover:border-cyan-500 hover:text-black transition-all">
                                    Select Path
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helpers
const getDifficultyColor = (diff: string) => {
    switch(diff) {
        case 'easy': return 'text-emerald-400';
        case 'moderate': return 'text-amber-400';
        case 'difficult': return 'text-rose-400';
        default: return 'text-white';
    }
}

const getPathSummary = (path: Path) => {
    if (path.path_metrics?.difficulty === 'easy') return "Gentle & Steady";
    if (path.path_metrics?.requires_bridge) return "Deep Transformation";
    if (path.path_metrics?.estimated_time?.includes("90")) return "Thorough Journey";
    return "Balanced Approach";
}
