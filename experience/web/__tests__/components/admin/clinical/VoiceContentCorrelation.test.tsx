
import { render, screen } from "@testing-library/react";
import { VoiceContentCorrelation } from "@/components/admin/clinical/VoiceContentCorrelation";
import type { VoiceContentCorrelation as VCCType } from "@/types/chat";

describe("VoiceContentCorrelation", () => {
  const alignedMetric: VCCType = {
    voice_energy: 0.8,
    content_arousal: 0.7,
    discrepancy: 0.1,
    aligned: true,
    interpretation: "Consistent expression"
  };

  const misalignedMetric: VCCType = {
    voice_energy: 0.2,
    content_arousal: 0.9,
    discrepancy: 0.7,
    aligned: false,
    interpretation: "Potential suppression detected"
  };

  it("renders aligned state correctly", () => {
    render(<VoiceContentCorrelation correlation={alignedMetric} />);
    expect(screen.getByText("✓ Aligned")).toBeInTheDocument();
    expect(screen.getByText("Consistent expression")).toBeInTheDocument();
    // Values
    expect(screen.getByText("0.800")).toBeInTheDocument(); // Voice
    expect(screen.getByText("0.700")).toBeInTheDocument(); // Content
    expect(screen.getByText("0.100")).toBeInTheDocument(); // Discrepancy
  });

  it("renders misaligned state with warnings", () => {
    render(<VoiceContentCorrelation correlation={misalignedMetric} />);
    expect(screen.getByText("⚠️ Discrepancy")).toBeInTheDocument();
    expect(screen.getByText("Potential suppression detected")).toBeInTheDocument();

    // Clinical Note check
    expect(screen.getByText(/Clinical Note:/)).toBeInTheDocument();
    expect(screen.getByText(/Significant mismatch/)).toBeInTheDocument();

    // High discrepancy styling check logic
    const discrepancyValue = screen.getByText("0.700");
    expect(discrepancyValue).toHaveClass("text-orange-300 font-bold");
  });
  it("renders medium discrepancy styling", () => {
    const mediumMetric: VCCType = {
      ...alignedMetric,
      discrepancy: 0.4, // Between 0.3 and 0.5 -> Yellow
      aligned: false
    };
    render(<VoiceContentCorrelation correlation={mediumMetric} />);

    const bar = screen.getByText("0.400").parentElement?.nextElementSibling?.firstChild;
    expect(bar).toHaveClass("bg-yellow-500");
  });
});
