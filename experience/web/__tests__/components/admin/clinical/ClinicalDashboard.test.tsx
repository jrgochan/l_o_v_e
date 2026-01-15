import { render, screen, fireEvent } from "@testing-library/react";
import { ClinicalDashboard } from "@/components/admin/ClinicalDashboard";
import type {
  VAC,
  InsightData,
  SessionMetrics,
  VACHistoryPoint,
  EmotionTimelineEvent,
  ProsodyData,
  DetectedEmotion,
} from "@/types/chat";

// Mock child components
jest.mock("@/components/admin/clinical/AlertBadge", () => ({
  AlertBadge: ({ alerts, overallStatus }: any) => (
    <div data-testid="mock-alert-badge">
      Alerts: {alerts.length}, Status: {overallStatus}
    </div>
  ),
}));

jest.mock("@/components/admin/clinical/SessionMetrics", () => ({
  SessionMetricsDisplay: () => <div data-testid="mock-session-metrics" />,
}));

jest.mock("@/components/admin/clinical/VACQuadrantViz", () => ({
  VACQuadrantViz: ({ vac }: any) => <div data-testid="mock-vac-quadrant">V:{vac.valence}</div>,
}));

jest.mock("@/components/admin/clinical/VoiceContentCorrelation", () => ({
  VoiceContentCorrelation: () => <div data-testid="mock-voice-correlation" />,
}));

jest.mock("@/components/admin/clinical/SessionTimeline", () => ({
  SessionTimeline: ({ emotionTimeline }: any) => (
    <div data-testid="mock-session-timeline">Timeline:{emotionTimeline.length}</div>
  ),
}));

jest.mock("@/components/admin/clinical/VACTrajectoryPlot", () => ({
  VACTrajectoryPlot: ({ vacHistory }: any) => (
    <div data-testid="mock-vac-trajectory">History:{vacHistory.length}</div>
  ),
}));

jest.mock("@/components/admin/clinical/ProsodyVisualization", () => ({
  ProsodyVisualization: () => <div data-testid="mock-prosody-viz" />,
}));

jest.mock("@/components/admin/clinical/MultiEmotionTable", () => ({
  MultiEmotionTable: ({ emotions }: any) => (
    <div data-testid="mock-multi-emotion-table">Emotions:{emotions.length}</div>
  ),
}));

jest.mock("@/components/admin/clinical/VoiceContentThreeWay", () => ({
  VoiceContentThreeWay: () => <div data-testid="mock-three-way" />,
}));

describe("ClinicalDashboard", () => {
  const mockVAC: VAC = { valence: 0.5, arousal: 0.3, connection: 0.8 };
  const mockMetrics: any = {
    duration: 300,
    turnCount: 15,
    userTalkTime: 60,
    averageResponseTime: 2.5,
    emotionsDetected: 10,
    dominanceScore: 0.4,
  };
  const mockTimeline: any[] = [
    {
      timestamp: new Date(),
      emotion: "Joy",
      category: "Positive",
      confidence: 0.9,
      vac: mockVAC,
      intensity: 0.8,
      trigger: "context",
    },
  ];
  const mockHistory: any[] = [{ timestamp: new Date(), vac: mockVAC, emotion: "Joy" }];
  const mockInsights: any = {
    clinical_alerts: [],
    overall_status: "stable",
  };

  const defaultProps = {
    emotion: "Joy",
    category: "Positive",
    vac: mockVAC,
    confidence: 0.9,
    prosody: null,
    insights: mockInsights,
    sessionMetrics: mockMetrics,
    expandState: "normal" as const,
    vacHistory: mockHistory,
    emotionTimeline: mockTimeline,
    audioBlob: null,
    multiEmotionData: null,
    threeWayAnalysis: null,
  };

  it("renders empty state when no emotion is present", () => {
    render(<ClinicalDashboard {...defaultProps} emotion={null} />);
    expect(screen.getByText("Awaiting emotional analysis data...")).toBeInTheDocument();
  });

  describe("Compact View (Normal)", () => {
    it("renders basic metrics in compact mode", () => {
      render(<ClinicalDashboard {...defaultProps} />);

      // Emotion State
      expect(screen.getByText("Joy")).toBeInTheDocument();
      expect(screen.getByText("Positive")).toBeInTheDocument();
      expect(screen.getByText("90%")).toBeInTheDocument();

      // VAC Card
      expect(screen.getByText("0.50")).toBeInTheDocument(); // V
      expect(screen.getByText("0.30")).toBeInTheDocument(); // A
      expect(screen.getByText("0.80")).toBeInTheDocument(); // C

      // Session Metrics
      expect(screen.getByTestId("mock-session-metrics")).toBeInTheDocument();

      // Alert Bar (none initially)
      expect(screen.queryByTestId("mock-alert-badge")).not.toBeInTheDocument();
    });

    it("renders prosody summary card when available", () => {
      const prosody: ProsodyData = {
        pitch_mean: 200,
        pitch_range: 50,
        pitch_std: 10,
        pitch_min: 100,
        pitch_max: 300,
        energy: 0.8, // High
        energy_std: 0.1,
        energy_max: 0.9,
        rate: 4.5,
        duration: 5,
        voice_quality: "good",
        hnr: 20,
        jitter: 0.5,
        shimmer: 1.5,
      };

      render(<ClinicalDashboard {...defaultProps} prosody={prosody} />);

      expect(screen.getByText("Voice")).toBeInTheDocument();
      expect(screen.getByText("🟢")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument(); // Energy
      expect(screen.getByText("200Hz")).toBeInTheDocument(); // Pitch
      expect(screen.getByText("4.5")).toBeInTheDocument(); // Rate
      expect(screen.getByText("20.0dB")).toBeInTheDocument(); // HNR
    });

    it("renders voice quality indicators correctly", () => {
      const baseProsody: any = {
        pitch_mean: 200,
        pitch_range: 50,
        pitch_std: 10,
        pitch_min: 100,
        pitch_max: 300,
        energy: 0.8,
        energy_std: 0.1,
        energy_max: 0.9,
        rate: 4.5,
        duration: 5,
        voice_quality: "good",
        hnr: 20,
        jitter: 0.5,
        shimmer: 1.5,
      };

      const prosodyModerate: ProsodyData = {
        ...baseProsody,
        voice_quality: "moderate",
        hnr: 12,
      };
      const { rerender } = render(
        <ClinicalDashboard {...defaultProps} prosody={prosodyModerate} />
      );
      expect(screen.getByText("🟡")).toBeInTheDocument();

      const prosodyPoor: ProsodyData = { ...baseProsody, voice_quality: "poor", hnr: 5 };
      rerender(<ClinicalDashboard {...defaultProps} prosody={prosodyPoor} />);
      expect(screen.getByText("🔴")).toBeInTheDocument();
    });

    it("renders status card correctly for different statuses", () => {
      // Critical
      const criticalInsights: any = {
        clinical_alerts: ["Alert"],
        overall_status: "critical",
      };
      const { rerender } = render(
        <ClinicalDashboard {...defaultProps} insights={criticalInsights} />
      );
      expect(screen.getByText("🔴 Critical")).toBeInTheDocument();
      expect(screen.getByText("1 alert")).toBeInTheDocument(); // Singular

      // Warning
      const warningInsights: any = {
        clinical_alerts: ["A1", "A2"],
        overall_status: "warning",
      };
      rerender(<ClinicalDashboard {...defaultProps} insights={warningInsights} />);
      expect(screen.getByText("⚠️ Warning")).toBeInTheDocument();
      expect(screen.getByText("2 alerts")).toBeInTheDocument(); // Plural

      // Attention
      const attentionInsights: any = { clinical_alerts: [], overall_status: "attention" };
      rerender(<ClinicalDashboard {...defaultProps} insights={attentionInsights} />);
      expect(screen.getByText("🟡 Attention")).toBeInTheDocument();

      // Stable
      const stableInsights: any = { clinical_alerts: [], overall_status: "stable" };
      rerender(<ClinicalDashboard {...defaultProps} insights={stableInsights} />);
      expect(screen.getByText("🟢 Stable")).toBeInTheDocument();
    });
  });

  describe("Expanded View", () => {
    const expandedProps = { ...defaultProps, expandState: "fullscreen" as const };

    it("renders expanded core metrics", () => {
      render(<ClinicalDashboard {...expandedProps} />);

      expect(screen.getByText("Emotional State")).toBeInTheDocument();
      expect(screen.getByTestId("mock-vac-quadrant")).toBeInTheDocument();
    });

    it("renders enhanced voice profile", () => {
      const prosody: ProsodyData = {
        pitch_mean: 200,
        pitch_range: 40, // Narrow < 50
        pitch_std: 10,
        pitch_min: 150,
        pitch_max: 250,
        energy: 0.8,
        energy_std: 0.1,
        energy_max: 0.9,
        rate: 6.0, // Fast > 5
        duration: 5,
        voice_quality: "good",
        hnr: 20,
        jitter: 0.5,
        shimmer: 1.5,
      };

      render(<ClinicalDashboard {...expandedProps} prosody={prosody} />);

      expect(screen.getByText("Voice Profile")).toBeInTheDocument();
      expect(screen.getByText("🟢 Good")).toBeInTheDocument();

      // Quality
      expect(screen.getByText("HNR (Clarity)")).toBeInTheDocument();
      expect(screen.getByText("Jitter")).toBeInTheDocument();
      expect(screen.getByText("Shimmer")).toBeInTheDocument();

      // Pitch
      expect(screen.getByText("200.0 Hz")).toBeInTheDocument();
      expect(screen.getByText(/narrow/)).toBeInTheDocument(); // Range check

      // Energy
      expect(screen.getByText("Vocal Energy")).toBeInTheDocument();

      // Rate
      expect(screen.getByText(/fast/)).toBeInTheDocument();
    });

    it("renders pitch range wide and rate slow labels", () => {
      const prosody: ProsodyData = {
        pitch_mean: 200,
        pitch_range: 160, // Wide > 150
        pitch_std: 10,
        pitch_min: 100,
        pitch_max: 300,
        energy: 0.5,
        energy_std: 0.1,
        energy_max: 0.6,
        rate: 2.0, // Slow < 3
        duration: 5,
        voice_quality: "moderate",
        hnr: 10,
        jitter: 2.0,
        shimmer: 4.0,
      };
      render(<ClinicalDashboard {...expandedProps} prosody={prosody} />);
      expect(screen.getByText(/wide/)).toBeInTheDocument();
      expect(screen.getByText(/slow/)).toBeInTheDocument();
      expect(screen.getByText(/Moderate/)).toBeInTheDocument();
    });

    it("renders voice quality poor indicators", () => {
      const prosody: ProsodyData = {
        pitch_mean: 200,
        pitch_range: 100,
        pitch_std: 10,
        pitch_min: 100,
        pitch_max: 300,
        energy: 0.5,
        energy_std: 0.1,
        energy_max: 0.6,
        rate: 4.0,
        duration: 5,
        voice_quality: "poor",
        hnr: 5, // Red
        jitter: 4.0, // Red
        shimmer: 7.0, // Red
      };
      render(<ClinicalDashboard {...expandedProps} prosody={prosody} />);
      expect(screen.getByText("🔴 Poor")).toBeInTheDocument();
    });

    it("renders multi-emotion table if data present", () => {
      const multiEmotionData = {
        emotions: [{ emotion_name: "Joy", confidence: 0.9 } as DetectedEmotion],
        relationships: [],
        aggregate: { valence: 0.5, arousal: 0.5, connection: 0.5, overall_mood: "Pos" },
      } as any;

      render(<ClinicalDashboard {...expandedProps} multiEmotionData={multiEmotionData} />);
      expect(screen.getByText("Deep Feeling Mode: Multi-Emotion Analysis")).toBeInTheDocument();
      expect(screen.getByTestId("mock-multi-emotion-table")).toHaveTextContent("Emotions:1");
    });

    it("renders 3-way analysis if present", () => {
      const threeWayAnalysis = {
        voice: { emotion: "Joy", confidence: 0.8 },
        text: { emotion: "Joy", confidence: 0.9 },
        facial: { emotion: "Joy", confidence: 0.7 },
        coherence: 0.85,
      };

      render(<ClinicalDashboard {...expandedProps} threeWayAnalysis={threeWayAnalysis as any} />);
      expect(screen.getByText("3-Way Voice-Content Analysis")).toBeInTheDocument();
      expect(screen.getByTestId("mock-three-way")).toBeInTheDocument();
    });

    it("renders voice content correlation if present", () => {
      const insightWithCorr: InsightData = {
        ...mockInsights,
        voice_content_correlation: {
          aligned: true,
          score: 0.9,
          description: "Good match",
        } as any,
      };
      render(<ClinicalDashboard {...expandedProps} insights={insightWithCorr} />);
      expect(screen.getByTestId("mock-voice-correlation")).toBeInTheDocument();
    });

    it("renders history plots when enough history exists", () => {
      // Need > 1 history point
      const history = [mockHistory[0], { ...mockHistory[0], timestamp: new Date() }];
      render(<ClinicalDashboard {...expandedProps} vacHistory={history} />);

      expect(screen.getByTestId("mock-vac-trajectory")).toHaveTextContent("History:2");
      expect(screen.getByTestId("mock-session-timeline")).toHaveTextContent("Timeline:1");
    });

    it("does not render history plots when insufficient history", () => {
      render(<ClinicalDashboard {...expandedProps} vacHistory={[mockHistory[0]]} />);
      expect(screen.queryByTestId("mock-vac-trajectory")).not.toBeInTheDocument();
    });
  });
});
