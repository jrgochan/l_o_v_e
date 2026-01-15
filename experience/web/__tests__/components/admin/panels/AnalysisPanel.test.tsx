import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysisPanel } from "@/components/admin/panels/AnalysisPanel";
import { useEmotionNavigation } from "@/hooks/useEmotionNavigation";

// Mocks
jest.mock("@/hooks/useEmotionNavigation", () => ({
  useEmotionNavigation: jest.fn(),
}));

jest.mock("@/components/admin/ClinicalDashboard", () => ({
  ClinicalDashboard: ({ onEmotionClick }: any) => (
    <div data-testid="clinical-dashboard">
      <button onClick={() => onEmotionClick("Hope")}>Clinical Action</button>
    </div>
  ),
}));

jest.mock("@/components/admin/emotion-display/MultiEmotionCard", () => ({
  MultiEmotionCard: ({ onEmotionClick }: any) => (
    <div data-testid="multi-emotion-card">
      <button onClick={() => onEmotionClick("Joy")}>Multi Joy</button>
    </div>
  ),
}));

describe("AnalysisPanel", () => {
  const mockToggleExpansion = jest.fn();
  const mockViewInSphere = jest.fn();
  const mockAddToSelection = jest.fn();

  const defaultProps = {
    transcription: null,
    prosody: null,
    emotion: null,
    category: null,
    vac: null,
    confidence: null,
    insights: null,
    multiEmotionAnalysis: null,
    deepFeelingMode: false,
    expandState: "normal" as const,
    onToggleExpansion: mockToggleExpansion,
    sessionMetrics: {
      emotionCount: 0,
      averageConfidence: 0,
      alertCount: { warning: 0, critical: 0, attention: 0 },
      startTime: new Date(),
      elapsedSeconds: 0,
      dominantCategory: null,
    },
    vacHistory: [],
    emotionTimeline: [],
    audioBlob: null,
    threeWayAnalysis: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEmotionNavigation as jest.Mock).mockReturnValue({
      viewInSphere: mockViewInSphere,
      addToSelection: mockAddToSelection,
    });
  });

  it("renders empty state correctly", () => {
    render(<AnalysisPanel {...defaultProps} />);
    expect(
      screen.getByText("Send a message or voice recording to see analysis data here")
    ).toBeInTheDocument();
  });

  it("renders clinical dashboard and handles click", async () => {
    render(
      <AnalysisPanel
        {...defaultProps}
        emotion="Joy"
        vac={{ valence: 1, arousal: 0, connection: 0 }}
      />
    );

    expect(screen.getByTestId("clinical-dashboard")).toBeInTheDocument();

    const btn = screen.getByText("Clinical Action");
    await userEvent.click(btn);
    expect(mockViewInSphere).toHaveBeenCalledWith("Hope");
  });

  it("renders transcription when present", () => {
    render(<AnalysisPanel {...defaultProps} transcription="Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders prosody data when present", () => {
    const prosody = {
      pitch_mean: 150,
      energy: 0.8,
      rate: 4.5,
      interpretation: { pitch: "High" },
    };
    render(<AnalysisPanel {...defaultProps} prosody={prosody} />);

    expect(screen.getByText("150.0 Hz")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders single emotion analysis", async () => {
    render(
      <AnalysisPanel
        {...defaultProps}
        emotion="Joy"
        category="Positive"
        vac={{ valence: 1, arousal: 0.5, connection: 0.2 }}
        confidence={0.9}
      />
    );

    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("1.00")).toBeInTheDocument(); // Valence
    expect(screen.getByText("90%")).toBeInTheDocument(); // Confidence

    // Test actions
    const viewBtn = screen.getByTitle("View this emotion in the Soul Sphere");
    await userEvent.click(viewBtn);
    expect(mockViewInSphere).toHaveBeenCalledWith("Joy");

    const addBtn = screen.getByTitle("Add to multi-selection (keeps chat open)");
    await userEvent.click(addBtn);
    expect(mockAddToSelection).toHaveBeenCalledWith("Joy");
  });

  it("renders multi-emotion mode", async () => {
    const multiData = {
      emotions: [],
      relationships: [],
      aggregate: { vac: { valence: 0, arousal: 0, connection: 0 } },
    } as any;
    render(
      <AnalysisPanel {...defaultProps} deepFeelingMode={true} multiEmotionAnalysis={multiData} />
    );

    expect(screen.getByTestId("multi-emotion-card")).toBeInTheDocument();
    // Test interaction prop drill
    const btn = screen.getByText("Multi Joy");
    await userEvent.click(btn);
    expect(mockViewInSphere).toHaveBeenCalledWith("Joy");
  });

  it("renders insights", () => {
    render(
      <AnalysisPanel
        {...defaultProps}
        insights={{ summary: "Interesting thought", guidance: "Tips" } as any}
      />
    );
    expect(screen.getByText("Interesting thought")).toBeInTheDocument();
    expect(screen.getByText("Tips")).toBeInTheDocument();
  });

  it("handles expansion toggle", async () => {
    render(<AnalysisPanel {...defaultProps} expandState="normal" />);

    const toggleBtn = screen.getByLabelText(/Expand analysis/i);
    await userEvent.click(toggleBtn);
    expect(mockToggleExpansion).toHaveBeenCalled();
  });

  it("shows correct tooltip for expanded state", () => {
    render(<AnalysisPanel {...defaultProps} expandState="expanded" />);
    expect(screen.getByLabelText(/Fullscreen mode/i)).toBeInTheDocument();
  });

  it("shows correct tooltip for fullscreen state", () => {
    render(<AnalysisPanel {...defaultProps} expandState="fullscreen" />);
    expect(screen.getByLabelText(/Return to normal/i)).toBeInTheDocument();
  });
});
