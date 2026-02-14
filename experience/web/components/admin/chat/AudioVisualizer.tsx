/**
 * Audio Visualizer Component
 *
 * Real-time waveform visualization for voice mode
 */

"use client";

import { useEffect, useRef } from "react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface AudioVisualizerProps {
  audioLevel: number; // 0-1
  isActive: boolean;
  personaColor: string;
}

export function AudioVisualizer({ audioLevel, isActive, personaColor }: AudioVisualizerProps) {
  const theme = useAdminTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw idle state - subtle pulse
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.5 + 0.5;

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 40 + pulse * 10, 0, Math.PI * 2);
        ctx.strokeStyle = `${personaColor}40`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);
        ctx.fillStyle = `${personaColor}20`;
        ctx.fill();

        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Active state - waveform visualization
      const bars = 64;
      const barWidth = width / bars;
      const centerY = height / 2;

      for (let i = 0; i < bars; i++) {
        // Simulate waveform based on audio level
        const time = Date.now() / 1000;
        // const frequency = (i / bars) * 8;
        const baseHeight = Math.sin(time * 4 + i / 4) * 20 + 30;
        const barHeight = baseHeight * (0.5 + audioLevel * 1.5);

        const x = i * barWidth;
        const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
        gradient.addColorStop(0, personaColor);
        gradient.addColorStop(0.5, `${personaColor}CC`);
        gradient.addColorStop(1, `${personaColor}66`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 2, barHeight);
      }

      // Central glow
      const glowSize = 60 + audioLevel * 40;
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        glowSize
      );
      gradient.addColorStop(0, `${personaColor}60`);
      gradient.addColorStop(1, `${personaColor}00`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isActive, personaColor]);

  return (
    <div className={`relative w-full max-w-2xl h-64 rounded-lg overflow-hidden backdrop-blur-sm ${theme.colors.background} border ${theme.colors.border}`}>
      <canvas ref={canvasRef} width={800} height={256} className="w-full h-full" />

      {/* Overlay text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isActive && (
          <p className={`text-sm uppercase tracking-wider ${theme.colors.text.muted}`}>Voice Mode Inactive</p>
        )}
      </div>
    </div>
  );
}
