
import { StrategyRecommendation } from "@/types/chat";

interface StrategyCardProps {
    strategies: StrategyRecommendation[];
    onSelect?: (strategy: StrategyRecommendation) => void;
}

export function StrategyCard({ strategies, onSelect }: StrategyCardProps) {
    if (!strategies || strategies.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mt-3">
            {strategies.map((strategy) => (
                <div
                    key={strategy.strategy_id}
                    className="bg-amber-900/10 border border-amber-500/30 rounded-lg p-3 hover:bg-amber-900/20 transition cursor-default"
                >
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="text-amber-200 font-medium text-sm flex items-center gap-2">
                            <span>💡</span>
                            {strategy.name}
                        </h4>
                        <span className="text-xs text-amber-500/70 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            Iv. {strategy.difficulty_level}
                        </span>
                    </div>

                    <p className="text-xs text-amber-100/80 mb-2">{strategy.description}</p>

                    <div className="text-xs text-amber-400/60 italic border-t border-amber-500/10 pt-2 mt-1">
                        "{strategy.rationale}"
                    </div>

                    {onSelect && (
                        <button
                            onClick={() => onSelect(strategy)}
                            className="mt-2 w-full text-center text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 py-1 rounded transition"
                        >
                            Apply Strategy
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
