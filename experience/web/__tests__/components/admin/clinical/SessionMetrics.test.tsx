
import { render, screen } from "@testing-library/react";
import { SessionMetricsDisplay } from "@/components/admin/clinical/SessionMetrics";
import type { SessionMetrics } from "@/types/chat";

describe("SessionMetricsDisplay", () => {
  const mockMetrics: SessionMetrics = {
    elapsedSeconds: 125, // 2:05
    emotionCount: 15,
    averageConfidence: 0.85,
    dominantCategory: "joy",
    alertCount: {
      critical: 1,
      warning: 2,
      attention: 0,
      stable: 12
    }
  };

  it("renders compact view correctly", () => {
    render(<SessionMetricsDisplay sessionMetrics={mockMetrics} isExpanded={false} />);
    expect(screen.getByText("2:05")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("joy")).toBeInTheDocument();
  });

  it("renders expanded view with details", () => {
    render(<SessionMetricsDisplay sessionMetrics={mockMetrics} isExpanded={true} />);
    expect(screen.getByText("Session Duration")).toBeInTheDocument();
    expect(screen.getByText("2:05")).toBeInTheDocument();

    expect(screen.getByText("Emotions Analyzed")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    expect(screen.getByText("Avg Confidence")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();

    expect(screen.getByText("Primary Category")).toBeInTheDocument();
    expect(screen.getByText("joy")).toBeInTheDocument();
  });

  it("renders alerts in expanded view", () => {
    render(<SessionMetricsDisplay sessionMetrics={mockMetrics} isExpanded={true} />);
    expect(screen.getByText(/1 Critical/)).toBeInTheDocument();
    expect(screen.getByText(/2 Warning/)).toBeInTheDocument();
    expect(screen.queryByText(/Attention/)).not.toBeInTheDocument();
  });

  it("handles empty metrics/defaults", () => {
    const emptyMetrics = {
      ...mockMetrics,
      averageConfidence: 0,
      dominantCategory: undefined,
      alertCount: { critical: 0, warning: 0, attention: 0, stable: 0 }
    };
    const { rerender } = render(<SessionMetricsDisplay sessionMetrics={emptyMetrics} isExpanded={false} />);
    // Compact checks
    expect(screen.queryByText("%")).not.toBeInTheDocument();

    rerender(<SessionMetricsDisplay sessionMetrics={emptyMetrics} isExpanded={true} />);
    // Expanded checks
    const placeholders = screen.getAllByText("--");
    expect(placeholders).toHaveLength(2); // Avg Confidence and Primary Category
    expect(screen.queryByText("Session Alerts:")).not.toBeInTheDocument();
  });
});
