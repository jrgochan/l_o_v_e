import { render, screen } from "@testing-library/react";
import { ClinicalDashboard } from "@/components/admin/ClinicalDashboard";
import { SessionMetrics } from "@/types/chat";

// Mock child components to isolate Dashboard logic
jest.mock("@/components/admin/clinical/AlertBadge", () => ({
  AlertBadge: () => <div data-testid="alert-badge" />,
}));
jest.mock("@/components/admin/clinical/SessionMetrics", () => ({
  SessionMetricsDisplay: () => <div data-testid="session-metrics" />,
}));
jest.mock("@/components/admin/clinical/VACQuadrantViz", () => ({
  VACQuadrantViz: () => <div data-testid="vac-quadrant" />,
}));
jest.mock("@/components/admin/clinical/VoiceContentCorrelation", () => ({
  VoiceContentCorrelation: () => <div data-testid="voice-correlation" />,
}));
jest.mock("@/components/admin/clinical/SessionTimeline", () => ({
  SessionTimeline: () => <div data-testid="session-timeline" />,
}));
jest.mock("@/components/admin/clinical/VACTrajectoryPlot", () => ({
  VACTrajectoryPlot: () => <div data-testid="vac-trajectory" />,
}));
jest.mock("@/components/admin/clinical/ProsodyVisualization", () => ({
  ProsodyVisualization: () => <div data-testid="prosody-viz" />,
}));
jest.mock("@/components/admin/clinical/MultiEmotionTable", () => ({
  MultiEmotionTable: () => <div data-testid="multi-emotion-table" />,
}));
jest.mock("@/components/admin/clinical/VoiceContentThreeWay", () => ({
  VoiceContentThreeWay: () => <div data-testid="three-way-viz" />,
}));

const mockMetrics: SessionMetrics = {
  startTime: new Date(),
  elapsedSeconds: 120,
  emotionCount: 10,
  averageConfidence: 0.5,
  dominantCategory: "Happiness",
  alertCount: {
    critical: 0,
    warning: 0,
    attention: 0,
  },
};

describe("ClinicalDashboard", () => {
  const defaultProps = {
    emotion: "Joy",
    category: "Happiness",
    vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
    confidence: 0.9,
    prosody: null,
    insights: null,
    sessionMetrics: mockMetrics,
    expandState: "normal" as const,
    vacHistory: [],
    emotionTimeline: [],
    audioBlob: null,
  };

  it("renders empty state when no emotion", () => {
    // @ts-ignore - Partial props for testing
    render(<ClinicalDashboard {...defaultProps} emotion={null} />);
    expect(screen.getByText("Awaiting emotional analysis data...")).toBeInTheDocument();
  });

  it("renders compact view correctly", () => {
    render(<ClinicalDashboard {...defaultProps} />);

    // Check key components
    expect(screen.getByTestId("session-metrics")).toBeInTheDocument();

    // Check textual content
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Happiness")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument(); // Confidence

    // Check VAC values
    expect(screen.getByText("0.80")).toBeInTheDocument();
    expect(screen.getByText("0.60")).toBeInTheDocument();
  });

  it("renders expanded view correctly", () => {
    render(<ClinicalDashboard {...defaultProps} expandState="expanded" />);

    // Check expanded specific components
    expect(screen.getByTestId("vac-quadrant")).toBeInTheDocument();
    expect(screen.queryByTestId("vac-trajectory")).not.toBeInTheDocument(); // No history yet
  });

  it("renders advanced visualizations when data present", () => {
    render(
      <ClinicalDashboard
        {...defaultProps}
        expandState="expanded"
        vacHistory={[
          { timestamp: new Date(), vac: defaultProps.vac, emotion: "Joy", confidence: 0.9 } as any,
          {
            timestamp: new Date(),
            vac: defaultProps.vac,
            emotion: "Happy",
            confidence: 0.8,
          } as any,
        ]}
        prosody={{
          pitch_mean: 150,
          pitch_range: 50,
          pitch_std: 10,
          energy: 0.8,
          rate: 4,
          voice_quality: "good",
          duration: 2.5,
        }}
      />
    );

    expect(screen.getByTestId("vac-trajectory")).toBeInTheDocument();
    expect(screen.getByTestId("session-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("prosody-viz")).toBeInTheDocument();
  });
});
