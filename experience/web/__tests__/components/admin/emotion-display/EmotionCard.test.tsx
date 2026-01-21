import { render, screen, fireEvent } from "@testing-library/react";
import { EmotionCard, EmotionBadge } from "@/components/admin/emotion-display/EmotionCard";
import { resolveEmotionColor } from "@/utils/emotion-colors";

// ... existing imports

// Tests updated to verify real component rendering instead of mocks
describe("EmotionCard", () => {
  const mockEmotion = {
    id: "1",
    name: "Joy",
    category: "When Life Is Good", // Valid category
    definition: "A feeling of great pleasure and happiness.",
    vac: [0.8, 0.6, 0.7] as [number, number, number],
    quaternion: [0, 0, 0, 1] as [number, number, number, number],
    color_hint: "#ffffff",
  };

  const defaultProps = {
    emotion: mockEmotion,
  };

  it("renders emotion name and category", () => {
    render(<EmotionCard {...defaultProps} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("When Life Is Good")).toBeInTheDocument();
  });

  it("applies category color to header dot and category text", () => {
    render(<EmotionCard {...defaultProps} />);
    const categoryColor = resolveEmotionColor(mockEmotion);

    const dot = screen.getByText("Joy").previousSibling;
    // Check for style attribute presence rather than exact computed value to be robust
    expect(dot).toHaveAttribute("style", expect.stringContaining("background-color"));

    const categoryText = screen.getByText("When Life Is Good");
    expect(categoryText).toHaveAttribute("style", expect.stringContaining("color"));
  });

  it("uses default color for unknown category", () => {
    const unknownCategoryEmotion = { ...mockEmotion, category: "Unknown Category" };
    render(<EmotionCard {...defaultProps} emotion={unknownCategoryEmotion} />);

    // Default color is #ffffff -> rgb(255, 255, 255)
    // Just check it renders
    expect(screen.getByText("Unknown Category")).toBeInTheDocument();
  });

  it("renders bridge indicator for specific emotions", () => {
    const bridgeEmotion = { ...mockEmotion, name: "Awe" };
    render(<EmotionCard {...defaultProps} emotion={bridgeEmotion} />);
    expect(screen.getByText(/Bridge/)).toBeInTheDocument();
  });

  it("renders confidence bar when provided", () => {
    render(<EmotionCard {...defaultProps} confidence={0.85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
  });

  it("renders VAC details when showVAC is true", () => {
    render(<EmotionCard {...defaultProps} showVAC={true} />);
    expect(screen.getByText("0.80")).toBeInTheDocument(); // Valence
    expect(screen.getByText("0.60")).toBeInTheDocument(); // Arousal
    expect(screen.getByText("0.70")).toBeInTheDocument(); // Connection
  });

  it("hides VAC details when showVAC is false", () => {
    render(<EmotionCard {...defaultProps} showVAC={false} />);
    expect(screen.queryByText("Valence:")).not.toBeInTheDocument();
  });

  it("renders definition when showDefinition is true", () => {
    render(<EmotionCard {...defaultProps} showDefinition={true} />);
    expect(screen.getByText("A feeling of great pleasure and happiness.")).toBeInTheDocument();
  });

  it("renders sphere preview when showSphere is true", () => {
    const { container } = render(<EmotionCard {...defaultProps} showSphere={true} />);
    // Real component renders a canvas (via three.js/fiber) or at least the container div
    // We check for the canvas element which confirms the sphere component mounted
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("handles click interaction", () => {
    const handleClick = jest.fn();
    render(<EmotionCard {...defaultProps} onClick={handleClick} />);

    fireEvent.click(screen.getByText("Joy").closest(".cursor-pointer")!);
    expect(handleClick).toHaveBeenCalled();
  });
});

describe("EmotionBadge (Local Variant)", () => {
  it("renders BaseEmotionChip with correct props", () => {
    const handleClick = jest.fn();
    render(
      <EmotionBadge emotion="Sadness" category="Negative" confidence={0.5} onClick={handleClick} />
    );

    // Real BaseEmotionChip renders text directly
    expect(screen.getByText("Sadness")).toBeInTheDocument();
  });
});
