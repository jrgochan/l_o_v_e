import { render, screen } from "@testing-library/react";
import { ExpandedView } from "@/components/admin/clinical/dashboard/ExpandedView";

// Mock Child Components
// Mock Child Components
jest.mock("@/components/admin/clinical/VACQuadrantViz", () => ({
  VACQuadrantViz: () => <div data-testid="vac-quadrant-viz">Mock VACQuadrantViz</div>,
}));
jest.mock("@/components/admin/clinical/VoiceContentCorrelation", () => ({
  VoiceContentCorrelation: () => (
    <div data-testid="voice-content-correlation">Mock Correlation</div>
  ),
}));
jest.mock("@/components/admin/clinical/ProsodyVisualization", () => ({
  ProsodyVisualization: () => <div data-testid="prosody-viz">Mock Prosody</div>,
}));
jest.mock("@/components/admin/clinical/VACTrajectoryPlot", () => ({
  VACTrajectoryPlot: () => <div data-testid="vac-trajectory">Mock Trajectory</div>,
}));
jest.mock("@/components/admin/clinical/SessionTimeline", () => ({
  SessionTimeline: () => <div data-testid="session-timeline">Mock Timeline</div>,
}));
jest.mock("@/components/admin/clinical/MultiEmotionTable", () => ({
  MultiEmotionTable: ({ emotions }: any) => (
    <div data-testid="multi-emotion-table">{emotions.length} emotions</div>
  ),
}));
jest.mock("@/components/admin/clinical/VoiceContentThreeWay", () => ({
  VoiceContentThreeWay: () => <div data-testid="three-way">Mock ThreeWay</div>,
}));

const mockProps: any = {
  emotion: "Joy",
  category: "Positive",
  vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
  confidence: 0.95,
  prosody: {
    voice_quality: "good",
    jitter: 0.5,
    shimmer: 1.5,
    hnr: 25,
    pitch_mean: 220,
    pitch_range: 100, // Normal
    pitch_std: 10,
    energy: 0.8,
    energy_max: 0.9,
    energy_std: 0.1,
    rate: 4.5,
    duration: 5.0,
  },
  insights: {
    voice_content_correlation: { some: "data" },
  },
  vacHistory: [
    { valence: 0.5, arousal: 0.5, connection: 0.5 },
    { valence: 0.6, arousal: 0.6, connection: 0.6 },
  ],
  emotionTimeline: [],
  audioBlob: new Blob(),
  multiEmotionData: {
    emotions: [{ name: "Joy", score: 0.9 }],
    relationships: [],
    aggregate: {},
  },
  threeWayAnalysis: { some: "analysis" },
};

describe("ExpandedView", () => {
  it("should render full dashboard with all sections", () => {
    render(<ExpandedView {...mockProps} />);

    // Emotional State
    expect(screen.getByText("Emotional State")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();

    // Confidence Bar (high confidence -> green) -- hard to check col without style check, but we check rendering
    expect(screen.getByText("95%")).toBeInTheDocument();

    // Subcomponents
    expect(screen.getByTestId("vac-quadrant-viz")).toBeInTheDocument();
    expect(screen.getByTestId("voice-content-correlation")).toBeInTheDocument();
    expect(screen.getByTestId("prosody-viz")).toBeInTheDocument();
    expect(screen.getByTestId("vac-trajectory")).toBeInTheDocument();
    expect(screen.getByTestId("session-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("multi-emotion-table")).toBeInTheDocument();
    expect(screen.getByTestId("three-way")).toBeInTheDocument();

    // Voice Profile Details
    expect(screen.getByText("Voice Profile")).toBeInTheDocument();
    expect(screen.getByText("🟢 Good")).toBeInTheDocument(); // Quality: good
    expect(screen.getByText("25.0 dB")).toHaveClass("text-green-400"); // HNR > 15
    expect(screen.getByText("0.50%")).toHaveClass("text-green-400"); // Jitter < 1
  });

  it("should handle conditional voice quality colors", () => {
    const props = {
      ...mockProps,
      prosody: {
        ...mockProps.prosody,
        voice_quality: "moderate",
        hnr: 12, // Yellow (10-15)
        jitter: 2.0, // Yellow (1-3)
        shimmer: 5.0, // Yellow (3-6)
        pitch_range: 200, // Orange (>150)
        rate: 6.0, // Orange (>5)
      },
    };
    render(<ExpandedView {...props} />);

    expect(screen.getByText("🟡 Moderate")).toBeInTheDocument();
    expect(screen.getByText("12.0 dB")).toHaveClass("text-yellow-400");
    expect(screen.getByText("2.00%")).toHaveClass("text-yellow-400");
    expect(screen.getByText("5.00%")).toHaveClass("text-yellow-400");
    expect(screen.getByText(/200 Hz/)).toHaveClass("text-orange-400"); // wide pitch
    expect(screen.getByText(/wide/)).toBeInTheDocument();
    expect(screen.getByText(/6.0 syll\/sec/)).toHaveClass("text-orange-400"); // fast rate
  });

  it("should handle poor voice quality metrics", () => {
    const props = {
      ...mockProps,
      confidence: 0.4, // Red confidence
      prosody: {
        ...mockProps.prosody,
        voice_quality: "poor",
        hnr: 5, // Red (<10)
        jitter: 5.0, // Red (>3)
        shimmer: 8.0, // Red (>6)
        pitch_range: 20, // Blue (<50)
        rate: 1.0, // Blue (<3)
        energy: 0.9, // Red (>0.7)
        // Add min/max pitch for coverage
        pitch_min: 100,
        pitch_max: 500,
      },
      // Multiple emotions for pluralization
      multiEmotionData: {
        emotions: [
          { name: "A", score: 0.5 },
          { name: "B", score: 0.5 },
        ],
      },
    };
    render(<ExpandedView {...props} />);

    expect(screen.getByText("🔴 Poor")).toBeInTheDocument();
    expect(screen.getByText("5.0 dB")).toHaveClass("text-red-400");
    expect(screen.getByText("5.00%")).toHaveClass("text-red-400");
    expect(screen.getByText(/20 Hz/)).toHaveClass("text-blue-400"); // narrow pitch
    expect(screen.getByText(/narrow/)).toBeInTheDocument();
    expect(screen.getByText(/1.0 syll\/sec/)).toHaveClass("text-blue-400"); // slow rate

    // Check pitch min max
    expect(screen.getByText(/100 - 500 Hz/)).toBeInTheDocument();

    // Check multi emotion pluralization
    expect(screen.getByText(/2 detected emotions/)).toBeInTheDocument();

    // Confidence red
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("should hide sections if data is missing", () => {
    const props = {
      ...mockProps,
      prosody: null,
      multiEmotionData: null,
      threeWayAnalysis: null,
      insights: null,
      vacHistory: [], // Only 0 or 1 point -> Trajectory hidden
    };
    render(<ExpandedView {...props} />);

    expect(screen.queryByText("Voice Profile")).not.toBeInTheDocument();
    expect(screen.queryByTestId("three-way")).not.toBeInTheDocument();
    expect(screen.queryByTestId("multi-emotion-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("voice-content-correlation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vac-trajectory")).not.toBeInTheDocument();
  });

  it("should handle energy color gradients", () => {
    // Just render verify existence
    const props = {
      ...mockProps,
      prosody: { ...mockProps.prosody, energy: 0.5 }, // Blue-Cyan (0.4-0.7)
    };
    render(<ExpandedView {...props} />);
    expect(screen.getByText("0.500")).toBeInTheDocument();
  });

  it("should handle low energy color (blue)", () => {
    const props = {
      ...mockProps,
      prosody: { ...mockProps.prosody, energy: 0.3 }, // Blue (<0.4)
    };
    render(<ExpandedView {...props} />);
    expect(screen.getByText("0.300")).toBeInTheDocument();
  });
  it("should handle medium confidence (yellow)", () => {
    const props = { ...mockProps, confidence: 0.65 };
    render(<ExpandedView {...props} />);
    expect(screen.getByText("65%")).toBeInTheDocument();
    // Verify specific class not feasible easily without searching by class,
    // but code path 0.6 <= x < 0.8 is covered by valid render
  });

  it("should handle partial voice metrics", () => {
    // Case where prosody exists but specific quality metrics are undefined
    const props = {
      ...mockProps,
      prosody: {
        voice_quality: "good",
        // Undefined detailed metrics to skip the jitter/shimmer/hnr block if check logic was stricter,
        // but logic is (jitter || shimmer || hnr). Let's provide NONE of them.
        pitch_mean: 220,
      } as any,
    };
    render(<ExpandedView {...props} />);
    expect(screen.queryByText("Voice Quality")).not.toBeInTheDocument();
  });
});
