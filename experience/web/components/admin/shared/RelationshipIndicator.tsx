/**
 * Relationship Indicator Component
 *
 * Displays a single emotion relationship with icon, type, and strength
 */

"use client";

import type { EmotionRelationship } from "@/types/chat";

interface RelationshipIndicatorProps {
  relationship: EmotionRelationship;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  className?: string;
}

export function RelationshipIndicator({
  relationship,
  size = "medium",
  onClick,
  className = "",
}: RelationshipIndicatorProps) {
  // Get icon based on relationship type
  const getIcon = () => {
    switch (relationship.type) {
      case "complementary":
        return "🤝";
      case "contradicts":
        return "⟷";
      case "masking":
        return "→";
      case "amplifying":
        return "⬆️";
      case "sequential":
        return "⏭️";
      default:
        return "•";
    }
  };

  // Get color classes based on relationship type
  const getColorClasses = () => {
    switch (relationship.type) {
      case "complementary":
        return "bg-blue-900/30 border-blue-500/50 text-blue-300";
      case "contradicts":
        return "bg-orange-900/30 border-orange-500/50 text-orange-300";
      case "masking":
        return "bg-purple-900/30 border-purple-500/50 text-purple-300";
      case "amplifying":
        return "bg-green-900/30 border-green-500/50 text-green-300";
      case "sequential":
        return "bg-gray-900/30 border-gray-500/50 text-gray-300";
      default:
        return "bg-gray-900/30 border-gray-500/50 text-gray-300";
    }
  };

  // Size-based styles
  const sizeClasses = {
    small: "p-2 text-xs",
    medium: "p-3 text-sm",
    large: "p-4 text-base",
  };

  const iconSizes = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
  };

  const strengthBarHeight = {
    small: "h-1",
    medium: "h-2",
    large: "h-3",
  };

  return (
    <div
      className={`
        rounded-lg border-l-4
        ${getColorClasses()}
        ${sizeClasses[size]}
        ${onClick ? "cursor-pointer hover:brightness-125 transition" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <span className={iconSizes[size]}>{getIcon()}</span>
        <div className="flex-1 min-w-0">
          {/* Emotion names */}
          <div className="font-medium truncate">
            <span className="text-white">{relationship.emotion_a}</span>{" "}
            <span className="opacity-60">
              {relationship.type === "masking" ||
              relationship.type === "amplifying" ||
              relationship.type === "sequential"
                ? "→"
                : "⟷"}
            </span>{" "}
            <span className="text-white">{relationship.emotion_b}</span>
          </div>

          {/* Type label */}
          <div className="text-xs opacity-80 uppercase tracking-wide mt-1">
            {relationship.type}
            {relationship.strength !== undefined && (
              <span className="ml-2">({(relationship.strength * 100).toFixed(0)}%)</span>
            )}
          </div>

          {/* Strength bar */}
          {relationship.strength !== undefined && (
            <div
              className={`w-full bg-gray-800 rounded-full mt-2 overflow-hidden ${strengthBarHeight[size]}`}
            >
              <div
                className="h-full bg-current transition-all duration-300"
                style={{ width: `${relationship.strength * 100}%` }}
              />
            </div>
          )}

          {/* Description */}
          {relationship.description && (
            <div className="text-xs italic opacity-75 mt-2">
              &quot;{relationship.description}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// List component for multiple relationships
interface RelationshipListProps {
  relationships: EmotionRelationship[];
  groupByType?: boolean;
  onRelationshipClick?: (relationship: EmotionRelationship) => void;
  className?: string;
}

export function RelationshipList({
  relationships,
  groupByType = false,
  onRelationshipClick,
  className = "",
}: RelationshipListProps) {
  if (!relationships || relationships.length === 0) {
    return null;
  }

  if (groupByType) {
    // Group relationships by type
    const grouped = relationships.reduce(
      (acc, rel) => {
        if (!acc[rel.type]) {
          acc[rel.type] = [];
        }
        acc[rel.type].push(rel);
        return acc;
      },
      {} as Record<string, EmotionRelationship[]>
    );

    return (
      <div className={`space-y-4 ${className}`}>
        {Object.entries(grouped).map(([type, rels]) => (
          <div key={type}>
            <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              {type} ({rels.length})
            </h4>
            <div className="space-y-2">
              {rels.map((rel, index) => (
                <RelationshipIndicator
                  key={`${rel.emotion_a}-${rel.emotion_b}-${index}`}
                  relationship={rel}
                  onClick={() => onRelationshipClick?.(rel)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Simple list without grouping
  return (
    <div className={`space-y-2 ${className}`}>
      {relationships.map((rel, index) => (
        <RelationshipIndicator
          key={`${rel.emotion_a}-${rel.emotion_b}-${index}`}
          relationship={rel}
          onClick={() => onRelationshipClick?.(rel)}
        />
      ))}
    </div>
  );
}
