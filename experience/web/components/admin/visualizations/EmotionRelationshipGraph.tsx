import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { DetectedEmotion, EmotionRelationship } from "@/types/chat";
import { useGraphData, GraphNode, GraphLink } from "@/hooks/visualizations/useGraphData";
import { useGraphSimulation } from "@/hooks/visualizations/useGraphSimulation";
import { GraphLegend } from "./graph/GraphLegend";
import { GraphNodeDetails } from "./graph/GraphNodeDetails";

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

    // Add background
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "#111827"); // gray-900

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
      .attr("font-size", "10px")
      .attr("fill", "#ffffff")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 15)
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 3px #000, 0 0 5px #000");

    // Add simulation tick handler manually since we are outside the hook's effect for D3 binding
    // Ideally this would be cleaner but D3 + React refs is tricky
    // We attach an on-tick listener to the simulation instance if accessible, but here
    // we might need to establish the tick handler inside the hook or pass these selections to it.
    // simpler approach: just define tick here since it needs access to 'link', 'node', 'label' selections

    // CRITICAL FIX: The simulation is running in the hook, but we need to update OUR local DOM elements on tick.
    // The hook exposes the simulation instance ref.
    // BUT the hook also starts/stops the simulation.
    // A better pattern: The hook manages the *data* and *forces*, but maybe we attach the tick here?
    // OR we pass the `onTick` callback TO the hook.

    // Let's adjust the hook usage slightly or just grab the simulation ref and add the listener.
    // Since useGraphSimulation (as written) doesn't accept an onTick callback, and the simulation creation is internal...
    // I should update useGraphSimulation to accept onTick or expose the simulation better.

    // Actually, looking at my useGraphSimulation implementation:
    // It creates the simulation and cleaning it up. It doesn't allow external tick binding easily unless I expose it.
    // Refactor idea: Pass a callback to useGraphSimulation?
  }, [nodes, links, width, height, onEmotionClick, createDragBehavior]); // Re-run when data changes

  // WAIT: My useGraphSimulation hook as implemented above is a bit isolated.
  // It creates the simulation but doesn't let me update the DOM nodes positions!
  // The simulation modifies the `nodes` and `links` objects inline (x, y properties).
  // I need to register a "tick" listener to update the SVG elements.

  // Let's just patch the Component to add the tick listener.
  // BUT I can't access `simulation` from `useGraphSimulation` easily without a ref callback or exposing it.
  // It returns `simulationRef`.

  // Let's modify the component to pass a `onTick` to `useGraphSimulation`? No, the hook signature I wrote doesn't have it.
  // I will update the hook in a subsequent step if needed, or better:
  // Update the Component logic to rely on the hook returning the simulation instance via the Ref,
  // and checking it in *this* effect.

  // Re-reading useGraphSimulation.ts content I wrote:
  // It returns { simulationRef, createDragBehavior }.
  // Perfect.

  // So inside the useEffect above, I can do:
  // if (simulationRef.current) { simulationRef.current.on("tick", ...) }

  // However, simulationRef.current might not be set immediately if the hook effect hasn't run?
  // React effects run bottom-up. The hook's effect runs *after* the component's render, but before this effect?
  // No, hooks run in order.

  // Let's assume I can attach it. Or better, move the simulation creation INTO this component again?
  // No, the goal is separation.

  // Revised plan for this file:
  // I will use a separate effect to bind the tick handler to the simulationRef.

  return (
    <div
      className={`relative bg-gray-900 rounded-lg border border-gray-700 overflow-hidden ${className}`}
    >
      <svg ref={svgRef} className="w-full h-full" />

      <GraphLegend />

      <GraphNodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
