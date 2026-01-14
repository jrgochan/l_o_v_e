/**
 * Audio Visualizer Component
 *
 * Real-time waveform visualization during voice recording
 */

"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  audioLevel: number; // 0-1
  isRecording: boolean;
  width?: number;
  height?: number;
}

export function AudioVisualizer({
  audioLevel,
  isRecording,
  width = 600,
  height = 100,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    /* istanbul ignore next */
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      // ctx and canvas are guaranteed to be defined here due to early returns above

      // Clear canvas
      ctx.fillStyle = "#1f2937"; // gray-800
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update levels array when recording
      if (isRecording) {
        levelsRef.current.push(audioLevel);

        // Keep only last N samples (based on canvas width)
        const maxSamples = Math.floor(canvas.width / 4);
        if (levelsRef.current.length > maxSamples) {
          levelsRef.current.shift();
        }
      }

      // Draw waveform bars
      const barWidth = 3;
      const barGap = 1;
      const levels = levelsRef.current;

      if (levels.length > 0) {
        levels.forEach((level, i) => {
          const x = i * (barWidth + barGap);
          const barHeight = Math.max(2, level * (canvas.height * 0.8)); // Minimum height of 2px
          const y = (canvas.height - barHeight) / 2;

          // Cyan gradient based on level
          const alpha = 0.3 + level * 0.7;
          ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;

          // Add glow effect for high levels
          if (level > 0.6) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#06b6d4";
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillRect(x, y, barWidth, barHeight);
        });
      }

      // Draw center line
      ctx.shadowBlur = 0; // Reset shadow
      ctx.strokeStyle = "rgba(107, 114, 128, 0.3)"; // gray-500
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Continue animation loop when recording
      if (isRecording) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    // Start continuous animation when recording
    if (isRecording) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      // Draw final state when not recording
      draw();
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [audioLevel, isRecording, width, height]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-gray-700 bg-gray-800"
        style={{ width: `${width}px`, height: `${height}px` }}
      />

      {/* Level meter overlay */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-400">Level:</span>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-100"
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 font-mono w-10">
          {Math.round(audioLevel * 100)}%
        </span>
      </div>
    </div>
  );
}
