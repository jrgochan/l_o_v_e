import { render, screen } from "@testing-library/react";
import { EmotionMappingBadge } from "@/components/admin/emotion-display/EmotionMappingBadge";

describe("EmotionMappingBadge", () => {
  const defaultProps = {
    originalName: "happy",
    atlasName: "Joy",
    matchConfidence: 0.95,
  };

  it("returns null for exact match", () => {
    const { container } = render(
      <EmotionMappingBadge {...defaultProps} matchMethod="exact" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders correctly for fuzzy match", () => {
    render(<EmotionMappingBadge {...defaultProps} matchMethod="fuzzy" />);

    // Check text content
    expect(screen.getByText("happy")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("AI:")).toBeInTheDocument();
    expect(screen.getByText("Atlas:")).toBeInTheDocument();
    expect(screen.getByText("(95%)")).toBeInTheDocument();

    // Check icon for fuzzy (≈)
    expect(screen.getByText("≈")).toBeInTheDocument();

    // Check styling (fuzzy is yellow)
    const badge = screen.getByText("happy").closest("div");
    expect(badge).toHaveClass("bg-yellow-900/30");
    expect(badge).toHaveClass("text-yellow-300");
  });

  it("renders correctly for VAC-based match", () => {
    render(<EmotionMappingBadge {...defaultProps} matchMethod="vac" />);

    // Check icon for vac (📍)
    expect(screen.getByText("📍")).toBeInTheDocument();

    // Check styling (vac is orange)
    const badge = screen.getByText("happy").closest("div");
    expect(badge).toHaveClass("bg-orange-900/30");
    expect(badge).toHaveClass("text-orange-300");
  });

  it("renders correctly for unmapped/none match", () => {
    render(<EmotionMappingBadge {...defaultProps} matchMethod="none" />);

    // Check icon for none (⚠️)
    expect(screen.getByText("⚠️")).toBeInTheDocument();

    // Check styling (none is red)
    const badge = screen.getByText("happy").closest("div");
    expect(badge).toHaveClass("bg-red-900/30");
    expect(badge).toHaveClass("text-red-300");
  });

  it("uses fuzzy/default styling for unknown match method", () => {
    // @ts-ignore - Testing invalid prop for defensive coding/coverage
    render(<EmotionMappingBadge {...defaultProps} matchMethod="unknown" />);

    // Should fallback to fuzzy icon (≈) and styling
    expect(screen.getByText("≈")).toBeInTheDocument();

    const badge = screen.getByText("happy").closest("div");
    expect(badge).toHaveClass("bg-yellow-900/30");
  });

  it("renders tooltip with details", () => {
    render(<EmotionMappingBadge {...defaultProps} matchMethod="fuzzy" />);

    const badge = screen.getByText("happy").closest("div");
    expect(badge).toHaveAttribute(
      "title",
      'Fuzzy match: AI detected "happy", mapped to Atlas emotion "Joy" with 95% confidence'
    );
  });

  it("renders with default props (coverage)", () => {
    render(<EmotionMappingBadge originalName="DefOrig" atlasName="DefAtlas" />);
    // Defaults: method=fuzzy (≈), confidence=1.0 (100%)
    expect(screen.getByText("≈")).toBeInTheDocument();
    expect(screen.getByText("(100%)")).toBeInTheDocument();
  });
});
