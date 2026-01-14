
import { render, screen } from "@testing-library/react";
import { SessionMetricsDisplay } from "@/components/admin/clinical/SessionMetrics";
import { SessionMetrics } from "@/types/chat";

describe("SessionMetricsDisplay", () => {
  const mockMetrics: SessionMetrics = {
    elapsedSeconds: 125, // 2:05
    emotionCount: 5,
    averageConfidence: 0.85,
    dominantCategory: "Anxiety",
    alertCount: {
      critical: 0,
      warning: 0,
      attention: 0
    },
    // Adding minimal fields to satisfy type if needed, or assuming SessionMetrics matches this.
    // Based on usage in component, this seems sufficient.
  } as SessionMetrics; // using cast if type has more fields not used by component

  it("renders compact view correctly", () => {
    render(<SessionMetricsDisplay sessionMetrics={mockMetrics} isExpanded={false} />);

    // Check duration format 2:05
    expect(screen.getByText("2:05")).toBeInTheDocument();
    // Check emotion count
    expect(screen.getByText("5")).toBeInTheDocument();
    // Check confidence percentage
    expect(screen.getByText("85%")).toBeInTheDocument();
    // Check category
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
  });

  it("renders expanded view correctly", () => {
    render(<SessionMetricsDisplay sessionMetrics={mockMetrics} isExpanded={true} />);

    expect(screen.getByText("Session Duration")).toBeInTheDocument();
    expect(screen.getByText("2:05")).toBeInTheDocument();

    expect(screen.getByText("Emotions Analyzed")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Avg Confidence")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();

    expect(screen.getByText("Primary Category")).toBeInTheDocument();
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
  });

  it("handles missing expanded data (e.g. no confidence)", () => {
    const emptyMetrics = { ...mockMetrics, averageConfidence: 0, dominantCategory: null };
    render(<SessionMetricsDisplay sessionMetrics={emptyMetrics} isExpanded={true} />);

    // dominantCategory fallback is also "--" line 97
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders confidence bar colors correctly", () => {
    const { rerender } = render(
      <SessionMetricsDisplay
        sessionMetrics={{ ...mockMetrics, averageConfidence: 0.9 }}
        isExpanded={true}
      />
    );
    // 0.9 >= 0.8 -> bg-green-500
    // We can't easily check class names on the dynamic div without a testId, 
    // but we can query by style width or look for the class in the container
    // Let's rely on standard rendering. We can check if the class exists in the DOM snippet.
    // But testing-library prefers visible things.
    // We'll trust the logic if we can't select it easily, or use container selector.

    const barContainer = screen.getByText("90%").parentElement?.querySelector('.bg-green-500');
    expect(barContainer).toBeInTheDocument();

    rerender(
      <SessionMetricsDisplay
        sessionMetrics={{ ...mockMetrics, averageConfidence: 0.7 }}
        isExpanded={true}
      />
    );
    // 0.7 >= 0.6 -> bg-yellow-500
    expect(screen.getByText("70%").parentElement?.querySelector('.bg-yellow-500')).toBeInTheDocument();

    rerender(
      <SessionMetricsDisplay
        sessionMetrics={{ ...mockMetrics, averageConfidence: 0.4 }}
        isExpanded={true}
      />
    );
    // < 0.6 -> bg-red-500
    expect(screen.getByText("40%").parentElement?.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it("renders alert summary correctly", () => {
    const alertMetrics = {
      ...mockMetrics,
      alertCount: {
        critical: 1,
        warning: 2,
        attention: 3
      }
    };
    render(<SessionMetricsDisplay sessionMetrics={alertMetrics} isExpanded={true} />);

    expect(screen.getByText("Session Alerts:")).toBeInTheDocument();
    expect(screen.getByText(/1 Critical/)).toBeInTheDocument();
    expect(screen.getByText(/2 Warning/)).toBeInTheDocument();
    expect(screen.getByText(/3 Attention/)).toBeInTheDocument();
  });

  it("renders partial alert summary", () => {
    const alertMetrics = {
      ...mockMetrics,
      alertCount: {
        critical: 1,
        warning: 0,
        attention: 0
      }
    };
    render(<SessionMetricsDisplay sessionMetrics={alertMetrics} isExpanded={true} />);

    expect(screen.getByText(/1 Critical/)).toBeInTheDocument();
    expect(screen.queryByText(/Warning/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Attention/)).not.toBeInTheDocument();
  });
});
