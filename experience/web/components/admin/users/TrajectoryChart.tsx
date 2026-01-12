"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { VACHistoryPoint } from "@/types/chat";

interface TrajectoryChartProps {
  data: VACHistoryPoint[];
}

export function TrajectoryChart({ data }: TrajectoryChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || !containerRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Dimensions
    const containerWidth = containerRef.current.clientWidth;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3
      .select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parsedData = data
      .map((d) => ({
        ...d,
        date: new Date(d.timestamp),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(parsedData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([-1, 1]) // VAC space is usually -1 to 1
      .range([height - margin.top - margin.bottom, 0]);

    // Gridlines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => "")
      );

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr("color", "#9ca3af"); // gray-400

    svg.append("g").call(d3.axisLeft(y)).attr("color", "#9ca3af");

    // Line Generators
    const valenceLine = d3
      .line<(typeof parsedData)[0]>()
      .x((d) => x(d.date))
      .y((d) => y(d.vac.valence))
      .curve(d3.curveMonotoneX);

    const arousalLine = d3
      .line<(typeof parsedData)[0]>()
      .x((d) => x(d.date))
      .y((d) => y(d.vac.arousal))
      .curve(d3.curveMonotoneX);

    // Filter valid points (sometimes NaNs happen in ML)
    const validData = parsedData.filter((d) => !isNaN(d.vac.valence) && !isNaN(d.vac.arousal));

    // Draw Lines
    svg
      .append("path")
      .datum(validData)
      .attr("fill", "none")
      .attr("stroke", "#06b6d4") // cyan-500
      .attr("stroke-width", 2)
      .attr("d", valenceLine);

    svg
      .append("path")
      .datum(validData)
      .attr("fill", "none")
      .attr("stroke", "#a855f7") // purple-500
      .attr("stroke-width", 2)
      .attr("d", arousalLine);

    // Legend
    const legend = svg.append("g").attr("transform", `translate(${width - 150}, 0)`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "#06b6d4");

    legend
      .append("text")
      .attr("x", 15)
      .attr("y", 10)
      .text("Valence")
      .attr("fill", "#9ca3af")
      .style("font-size", "12px");

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 20)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "#a855f7");

    legend
      .append("text")
      .attr("x", 15)
      .attr("y", 30)
      .text("Arousal")
      .attr("fill", "#9ca3af")
      .style("font-size", "12px");
  }, [data]);

  return (
    <div ref={containerRef} className="w-full bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
        Emotional Trajectory (Time Series)
      </h3>
      <svg ref={svgRef} className="w-full overflow-visible"></svg>
    </div>
  );
}
