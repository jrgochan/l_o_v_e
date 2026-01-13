import { render, screen } from "@testing-library/react";
import { VoiceContentCorrelation } from "@/components/admin/clinical/VoiceContentCorrelation";

describe("VoiceContentCorrelation", () => {
  it("should render aligned state", () => {
    const correlation = {
      voice_energy: 0.8,
      content_arousal: 0.8,
      discrepancy: 0.0,
      aligned: true,
      interpretation: "Voice and content match.",
    };

    render(<VoiceContentCorrelation correlation={correlation} />);

    expect(screen.getByText("Voice-Content Correlation")).toBeInTheDocument();
    expect(screen.getByText("✓ Aligned")).toBeInTheDocument();
    expect(screen.getByText("✓ Aligned")).toHaveClass("text-green-300");

    // Check interpretation
    expect(screen.getByText("Voice and content match.")).toBeInTheDocument();

    // Check missing discrepancy note
    expect(screen.queryByText("Clinical Note:")).not.toBeInTheDocument();
  });

  it("should render discrepancy state", () => {
    const correlation = {
      voice_energy: 0.9,
      content_arousal: -0.2, // High discrepancy
      discrepancy: 0.6,
      aligned: false,
      interpretation: "Potential suppression.",
    };

    render(<VoiceContentCorrelation correlation={correlation} />);

    expect(screen.getByText("⚠️ Discrepancy")).toBeInTheDocument();
    expect(screen.getByText("⚠️ Discrepancy")).toHaveClass("text-orange-300");

    // Discrepancy Level High styling
    expect(screen.getByText("0.600")).toBeInTheDocument();
    expect(screen.getByText("Discrepancy Level")).toHaveClass("text-orange-300");

    // Clinical Note
    expect(screen.getByText("Clinical Note:")).toBeInTheDocument();
    expect(screen.getByText(/Significant mismatch between vocal/)).toBeInTheDocument();
  });

  it("should render medium discrepancy styling", () => {
    const correlation = {
      voice_energy: 0.5,
      content_arousal: 0.2,
      discrepancy: 0.35, // Medium discrepancy (0.3-0.5)
      aligned: false,
    };

    render(<VoiceContentCorrelation correlation={correlation} />);

    // Check progress bar color logic (we can't easily check bg color of nested div without test-id, 
    // but we can check if the high-discrepancy classes are ABSENT)

    // Discrepancy Level Text shouldn't be orange bold if < 0.5 (logic: discrepancy > 0.5 ? ... : "text-white")
    // Wait, let's check code:
    // row 76: discrepancy > 0.5 ? "text-orange-300 font-bold" : "text-white"

    expect(screen.getByText("0.350")).toHaveClass("text-white");
    expect(screen.queryByText("Clinical Note:")).not.toBeInTheDocument();
  });
});
