import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { DetectedEmotion, EmotionRelationship } from "@/types/chat";
import { useGraphData, GraphNode, GraphLink } from "@/hooks/visualizations/useGraphData";
import { useGraphSimulation } from "@/hooks/visualizations/useGraphSimulation";
import { GraphLegend } from "./graph/GraphLegend";
import { GraphNodeDetails } from "./graph/GraphNodeDetails";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface EmotionRelationshipGraphProps {
  emotions: DetectedEmotion[];
  relationships: EmotionRelationship[];
  width?: number;
  height?: number;
  onEmotionClick?: (emotion: DetectedEmotion) => void;
  className?: string;
}

export function EmotionRelationshipGraph({
  emotions,
  relationships,
  width = 600,
  height = 400,
  onEmotionClick,
  className = "",
}: EmotionRelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const theme = useAdminTheme();

  // 1. Process Data
  const { nodes, links } = useGraphData({ emotions, relationships });

  // 2. Manage Simulation
  const { createDragBehavior } = useGraphSimulation({
    nodes,
    links,
    width,
    height,
    onTick: () => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);

      svg
        .selectAll<SVGLineElement, GraphLink>("line")
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      svg
        .selectAll<SVGCircleElement, GraphNode>("circle")
        .attr("cx", (d) => d.x || 0)
        .attr("cy", (d) => d.y || 0);

      svg
        .selectAll<SVGTextElement, GraphNode>("text")
        .attr("x", (d) => d.x || 0)
        .attr("y", (d) => d.y || 0);
    },
  });

  // 3. Render Graph (D3 Side Effects)
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Background handled by container div class

    // Create container groups
    const linkGroup = svg.append("g").attr("class", "links");
    const nodeGroup = svg.append("g").attr("class", "nodes");
    const labelGroup = svg.append("g").attr("class", "labels");

    // Draw links (edges)
    linkGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => d.width)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", (d) => {
        // Style based on strength
        if (d.relationship.strength > 0.7) return "0"; // solid
        if (d.relationship.strength > 0.4) return "5,5"; // short dashes
        return "10,5"; // long dashes
      });

    // Draw nodes (circles)
    nodeGroup
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => {
        // Border based on prominence
        if (d.emotion.prominence === "primary") return "#a855f7"; // purple-500
        if (d.emotion.prominence === "secondary") return "#6b7280"; // gray-500
        return "#4b5563"; // gray-600
      })
      .attr("stroke-width", (d) => {
        if (d.emotion.prominence === "primary") return 3;
        if (d.emotion.prominence === "secondary") return 2;
        return 1;
      })
      .attr("stroke-dasharray", (d) => (d.emotion.prominence === "underlying" ? "3,3" : "0"))
      .attr("opacity", (d) => (d.emotion.prominence === "underlying" ? 0.7 : 1))
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        onEmotionClick?.(d.emotion);
      })
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.radius * 1.2)
          .attr("stroke-width", (d.emotion.prominence === "primary" ? 3 : 2) * 1.5);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.radius)
          .attr(
            "stroke-width",
            d.emotion.prominence === "primary" ? 3 : d.emotion.prominence === "secondary" ? 2 : 1
          );
      })
      .call(createDragBehavior());

    // Draw labels
    labelGroup
      .selectAll<SVGTextElement, GraphNode>("text")
      .data(nodes)
      .join("text")
      .text((d) => d.emotion.emotion_name)
      .attr("class", theme.colors.text.primary) // Dynamic theme class
      .attr("fill", "currentColor") // Use the class color
      .attr("font-size", "11px")
      .attr("font-weight", 500)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 15)
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 4px rgba(0,0,0,0.8)"); // Ensure contrast on any background

  }, [nodes, links, width, height, onEmotionClick, createDragBehavior, theme]); // Added theme dependency

  return (
    <div
      className={`relative rounded-lg border overflow-hidden ${theme.colors.background} ${theme.colors.border} ${className}`}
    >
      <svg ref={svgRef} className="w-full h-full" />

      <GraphLegend />

      <GraphNodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
