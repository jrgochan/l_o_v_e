import { render, screen } from "@testing-library/react";
import { CompactView } from "@/components/admin/clinical/dashboard/CompactView";

// Mock data based on types
const mockProps = {
  emotion: "Joy",
  category: "Positive",
  vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
  confidence: 0.95,
  prosody: {
    voice_quality: "good" as const,
    energy: 0.8,
    pitch_mean: 220,
    pitch_std: 10,
    rate: 4.5,
    hnr: 20,
  },
  overallStatus: "stable",
  alertCount: 0,
};

describe("CompactView", () => {
  it("should handle low energy and medium HNR", () => {
    const props = {
      ...mockProps,
      prosody: { ...mockProps.prosody!, energy: 0.1, hnr: 12 },
    };
    render(<CompactView {...props} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("12.0dB")).toHaveClass("text-yellow-400");
  });

  it("should handle single alert pluralization", () => {
    const props = { ...mockProps, overallStatus: "critical", alertCount: 1 };
    render(<CompactView {...props} />);

    expect(screen.getByText("1 alert")).toBeInTheDocument();
    expect(screen.queryByText("alerts")).not.toBeInTheDocument();
  });
  it("should render all cards with full data", () => {
    render(<CompactView {...mockProps} />);

    // Emotion Card
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();

    // VAC Card
    expect(screen.getByText("V:")).toBeInTheDocument();
    expect(screen.getByText("0.80")).toBeInTheDocument();

    // Voice Card
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("220Hz")).toBeInTheDocument();
    expect(screen.getByText("20.0dB")).toBeInTheDocument(); // HNR

    // Status Card
    expect(screen.getByText("🟢 Stable")).toBeInTheDocument();
  });

  it("should handle missing voice data", () => {
    const props = { ...mockProps, prosody: null };
    render(<CompactView {...props} />);

    expect(screen.queryByText("Voice")).not.toBeInTheDocument();
  });

  it("should render critical status with alerts", () => {
    const props = { ...mockProps, overallStatus: "critical", alertCount: 3 };
    render(<CompactView {...props} />);

    expect(screen.getByText("🔴 Critical")).toBeInTheDocument();
    expect(screen.getByText("3 alerts")).toBeInTheDocument();
  });

  it("should render warning status", () => {
    const props = {
      ...mockProps,
      overallStatus: "warning",
      prosody: { ...mockProps.prosody!, voice_quality: "moderate" as const },
    };
    render(<CompactView {...props} />);

    expect(screen.getByText("⚠️ Warning")).toBeInTheDocument();
    expect(screen.getByText("🟡")).toBeInTheDocument(); // Moderate voice quality
  });

  it("should render attention status", () => {
    const props = { ...mockProps, overallStatus: "attention" };
    render(<CompactView {...props} />);
    expect(screen.getByText("🟡 Attention")).toBeInTheDocument();
  });

  it("should render voice quality error (red)", () => {
    const props = {
      ...mockProps,
      prosody: { ...mockProps.prosody!, voice_quality: "poor" as const, hnr: 5 },
    };
    render(<CompactView {...props} />);
    expect(screen.getByText("🔴")).toBeInTheDocument(); // Poor voice quality icon
    expect(screen.getByText("5.0dB")).toHaveClass("text-red-400");
  });
  it("should render medium energy label", () => {
    const props = {
      ...mockProps,
      prosody: { ...mockProps.prosody!, energy: 0.5 }, // Med (0.3 - 0.7)
    };
    render(<CompactView {...props} />);
    expect(screen.getByText("Med")).toBeInTheDocument();
  });
});
