import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphLink } from "./useGraphData";

interface UseGraphSimulationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  onTick?: () => void;
}

export function useGraphSimulation({
  nodes,
  links,
  width,
  height,
  onTick,
}: UseGraphSimulationProps) {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | undefined>(undefined);

  useEffect(() => {
    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    if (nodes.length === 0) return;

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => (d as GraphNode).radius + 10)
      );

    if (onTick) {
      simulation.on("tick", onTick);
    }

    simulationRef.current = simulation;

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onTick]);

  // Drag behavior factory
  const createDragBehavior = () => {
    const simulation = simulationRef.current;
    if (!simulation) {
      // Return no-op drag if simulation isn't ready
      return d3.drag<SVGCircleElement, GraphNode>();
    }

    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>) {
      if (!event.active) simulation?.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>) {
      if (!event.active) simulation?.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag<SVGCircleElement, GraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  return { simulationRef, createDragBehavior };
}
