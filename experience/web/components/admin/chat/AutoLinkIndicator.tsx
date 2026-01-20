
import { MessageRelationship } from "@/types/chat";

interface AutoLinkIndicatorProps {
    relationships: MessageRelationship[];
    onRelationshipClick: (relationship: MessageRelationship) => void;
}

export function AutoLinkIndicator({
    relationships,
    onRelationshipClick,
}: AutoLinkIndicatorProps) {
    if (!relationships || relationships.length === 0) return null;

    return (
        <div className="flex gap-1 mt-1">
            {relationships.map((rel) => (
                <button
                    key={rel.id}
                    onClick={() => onRelationshipClick(rel)}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition bg-cyan-900/20 px-2 py-0.5 rounded-full border border-cyan-800/50"
                    title={`Linked via ${rel.relationship_type}`}
                >
                    <span>🔗</span>
                    {rel.metadata && rel.metadata.score && (
                        <span className="opacity-75">
                            {(rel.metadata.score * 100).toFixed(0)}%
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
