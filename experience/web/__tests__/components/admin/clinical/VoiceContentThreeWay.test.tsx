import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceContentThreeWay } from "@/components/admin/clinical/VoiceContentThreeWay";
import type { ThreeWayAnalysis, DetectedEmotion } from "@/types/chat";

const mockEmotion: DetectedEmotion = {
  id: "e1",
  emotion_name: "Joy",
  confidence: 0.9,
  vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
  prominence: "primary",
  voice_alignment: 0.85,
  category: "Happiness",
};

const mockAnalysis: ThreeWayAnalysis = {
  content_only: {
    emotions: [mockEmotion],
    aggregate_vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
    complexity_score: 0.5,
    emotional_clarity: 0.8,
    reasoning: "Clear text",
    temporal_pattern: "concurrent",
  },
  voice_only: {
    emotions: [mockEmotion],
    aggregate_vac: { valence: 0.7, arousal: 0.6, connection: 0.7 },
    complexity_score: 0.6,
    emotional_clarity: 0.7,
    reasoning: "High pitch",
    temporal_pattern: "concurrent",
  },
  blended: {
    emotions: [mockEmotion],
    aggregate_vac: { valence: 0.75, arousal: 0.6, connection: 0.7 },
    complexity_score: 0.55,
    emotional_clarity: 0.75,
    reasoning: "Combined",
    temporal_pattern: "concurrent",
  },
  discrepancy: {
    content_voice_distance: 0.1,
    content_blended_distance: 0.05,
    voice_blended_distance: 0.05,
    interpretation: "Well aligned",
    flags: ["well_aligned"],
    content_primary: "Joy",
    voice_primary: "Joy",
    blended_primary: "Joy",
  },
};

describe("VoiceContentThreeWay", () => {
  it("renders three analysis columns", () => {
    render(<VoiceContentThreeWay analysis={mockAnalysis} />);
    expect(screen.getByText("Content-Only")).toBeInTheDocument();
    expect(screen.getByText("Voice-Only")).toBeInTheDocument();
    expect(screen.getByText("Blended")).toBeInTheDocument();
  });

  it("shows aligned status when distance is low", () => {
    render(<VoiceContentThreeWay analysis={mockAnalysis} />);
    expect(screen.getByText("Voice and Content Aligned")).toBeInTheDocument();
  });

  it("shows discrepancy alert when distance is high", () => {
    const discrepantAnalysis = {
      ...mockAnalysis,
      discrepancy: {
        ...mockAnalysis.discrepancy,
        content_voice_distance: 0.8,
        interpretation: "Mismatch",
        flags: ["significant_incongruence"],
      },
    };
    render(<VoiceContentThreeWay analysis={discrepantAnalysis} />);
    expect(screen.getByText("Significant Discrepancy Detected")).toBeInTheDocument();
    expect(
      screen.getByText(/Significant discrepancies between voice and content/)
    ).toBeInTheDocument();
  });

  it("handles empty data columns", () => {
    const emptyAnalysis = {
      ...mockAnalysis,
      voice_only: undefined,
    };
    // Type coercion for test
    render(<VoiceContentThreeWay analysis={emptyAnalysis as unknown as ThreeWayAnalysis} />);
    // Content should show "No data available" under Voice-Only?
    // The component checks (!data || !data.emotions).
    // It renders renderEmotionCard with undefined data.

    // Check specific text in the Voice column
    // The columns are rendered in order.
    // Finding specific column is hard without testId, but we can look for "No data available"
    // and verify "Voice-Only" header presence.
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("calls onEmotionClick when view button clicked", () => {
    const handleClick = jest.fn();
    render(<VoiceContentThreeWay analysis={mockAnalysis} onEmotionClick={handleClick} />);

    // There are 3 buttons (one per column). Click the first one.
    const buttons = screen.getAllByText("View in Sphere");
    fireEvent.click(buttons[0]);
    expect(handleClick).toHaveBeenCalledWith("Joy");
  });
});
