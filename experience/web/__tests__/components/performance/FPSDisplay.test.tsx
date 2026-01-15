import { render, screen } from "@testing-library/react";
import { FPSDisplay } from "@/components/performance/FPSDisplay";

describe("FPSDisplay", () => {
  const mockMetrics = {
    fps: 60,
    averageFps: 58,
    minFps: 55,
    maxFps: 62,
    frameTime: 16.67,
    qualityRecommendation: "high" as const,
    isStable: true,
  };

  it("renders all metrics correctly", () => {
    render(<FPSDisplay metrics={mockMetrics} />);
    expect(screen.getByText("FPS:")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("Avg:")).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
    expect(screen.getByText("Min/Max:")).toBeInTheDocument();
    expect(screen.getByText("55/62")).toBeInTheDocument();
    expect(screen.getByText("Frame:")).toBeInTheDocument();
    expect(screen.getByText("16.67ms")).toBeInTheDocument();
    expect(screen.getByText("Quality:")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("Stable:")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument(); // Stable check
  });

  it("applies correct color classes based on FPS", () => {
    const { rerender } = render(<FPSDisplay metrics={{ ...mockMetrics, fps: 60 }} />);
    expect(screen.getByText("60")).toHaveClass("text-green-400"); // >= 55

    rerender(<FPSDisplay metrics={{ ...mockMetrics, fps: 50 }} />);
    expect(screen.getByText("50")).toHaveClass("text-yellow-400"); // >= 45

    rerender(<FPSDisplay metrics={{ ...mockMetrics, fps: 35 }} />);
    expect(screen.getByText("35")).toHaveClass("text-orange-400"); // >= 30

    rerender(<FPSDisplay metrics={{ ...mockMetrics, fps: 20 }} />);
    expect(screen.getByText("20")).toHaveClass("text-red-400"); // < 30
  });

  it("applies correct color classes based on Quality", () => {
    const { rerender } = render(
      <FPSDisplay metrics={{ ...mockMetrics, qualityRecommendation: "ultra" }} />
    );
    expect(screen.getByText("ULTRA")).toHaveClass("text-cyan-400");

    rerender(<FPSDisplay metrics={{ ...mockMetrics, qualityRecommendation: "high" }} />);
    expect(screen.getByText("HIGH")).toHaveClass("text-green-400");

    rerender(<FPSDisplay metrics={{ ...mockMetrics, qualityRecommendation: "medium" }} />);
    expect(screen.getByText("MEDIUM")).toHaveClass("text-yellow-400");

    rerender(<FPSDisplay metrics={{ ...mockMetrics, qualityRecommendation: "low" }} />);
    expect(screen.getByText("LOW")).toHaveClass("text-red-400");
  });

  it("renders unstable indicator correctly", () => {
    render(<FPSDisplay metrics={{ ...mockMetrics, isStable: false }} />);
    expect(screen.getByText("○")).toBeInTheDocument();
  });
});
