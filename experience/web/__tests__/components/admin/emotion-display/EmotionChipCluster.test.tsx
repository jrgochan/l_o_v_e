import { render, screen, fireEvent } from "@testing-library/react";
import {
  EmotionChipCluster,
  SimpleEmotionChipCluster,
} from "@/components/admin/emotion-display/EmotionChipCluster";
import { EmotionBadge } from "@/components/admin/emotion-display/EmotionBadge";
import type { DetectedEmotion } from "@/types/chat";

// Mock EmotionBadge to verify props
jest.mock("@/components/admin/emotion-display/EmotionBadge", () => ({
  EmotionBadge: jest.fn(({ emotion, prominence, size, onClick }) => (
    <div
      data-testid="emotion-badge"
      data-prominence={prominence}
      data-size={size}
      onClick={onClick}
    >
      {emotion}
    </div>
  )),
}));

describe("EmotionChipCluster", () => {
  const mockEmotions: DetectedEmotion[] = [
    {
      id: "1",
      emotion_name: "Joy",
      confidence: 0.9,
      prominence: "primary",
      vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },

      category: "Positive",
    },
    {
      id: "2",
      emotion_name: "Excitement",
      confidence: 0.7,
      prominence: "secondary",
      vac: { valence: 0.7, arousal: 0.8, connection: 0.6 },

      category: "Positive",
    },
    {
      id: "3",
      emotion_name: "Hope",
      confidence: 0.5,
      prominence: "underlying",
      vac: { valence: 0.5, arousal: 0.4, connection: 0.5 },

      category: "Positive",
    },
  ];

  it("returns null if emotions array is empty or undefined", () => {
    const { container } = render(<EmotionChipCluster emotions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders primary, secondary, and underlying emotions with correct sizes", () => {
    render(<EmotionChipCluster emotions={mockEmotions} />);

    // Check Primary
    const primary = screen.getByText("Joy");
    expect(primary).toHaveAttribute("data-prominence", "primary");
    expect(primary).toHaveAttribute("data-size", "large");

    // Check Secondary
    const secondary = screen.getByText("Excitement");
    expect(secondary).toHaveAttribute("data-prominence", "secondary");
    expect(secondary).toHaveAttribute("data-size", "medium");

    // Check Underlying
    const underlying = screen.getByText("Hope");
    expect(underlying).toHaveAttribute("data-prominence", "underlying");
    expect(underlying).toHaveAttribute("data-size", "small");
  });

  it("passes click handler to badges", () => {
    const handleClick = jest.fn();
    render(<EmotionChipCluster emotions={mockEmotions} onEmotionClick={handleClick} />);

    fireEvent.click(screen.getByText("Joy"));
    expect(handleClick).toHaveBeenCalledWith("Joy");

    fireEvent.click(screen.getByText("Excitement"));
    expect(handleClick).toHaveBeenCalledWith("Excitement");

    fireEvent.click(screen.getByText("Hope"));
    expect(handleClick).toHaveBeenCalledWith("Hope");
  });

  it("renders correctly without click handler", () => {
    render(<EmotionChipCluster emotions={mockEmotions} />);
    // Check that at least one call has onClick undefined
    expect(EmotionBadge).toHaveBeenCalledWith(
      expect.objectContaining({ onClick: undefined }),
      undefined // Context is undefined
    );
  });
});

describe("SimpleEmotionChipCluster", () => {
  const mockSimpleEmotions = [
    { name: "Fear", confidence: 0.8 }, // Defaults to primary
    { name: "Anxiety", confidence: 0.6, prominence: "secondary" as const },
    { name: "Worry", confidence: 0.4, prominence: "underlying" as const },
  ];

  it("returns null if emotions array is empty", () => {
    const { container } = render(<SimpleEmotionChipCluster emotions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders emotions with correct size logic", () => {
    render(<SimpleEmotionChipCluster emotions={mockSimpleEmotions} />);

    // Fear (default primary)
    const fear = screen.getByText("Fear");
    expect(fear).toHaveAttribute("data-prominence", "primary");
    expect(fear).toHaveAttribute("data-size", "large");

    // Anxiety (secondary)
    const anxiety = screen.getByText("Anxiety");
    expect(anxiety).toHaveAttribute("data-prominence", "secondary");
    expect(anxiety).toHaveAttribute("data-size", "medium");

    // Worry (underlying)
    const worry = screen.getByText("Worry");
    expect(worry).toHaveAttribute("data-prominence", "underlying");
    expect(worry).toHaveAttribute("data-size", "small");
  });

  it("handles click interaction", () => {
    const handleClick = jest.fn();
    render(<SimpleEmotionChipCluster emotions={mockSimpleEmotions} onEmotionClick={handleClick} />);

    fireEvent.click(screen.getByText("Fear"));
    expect(handleClick).toHaveBeenCalledWith("Fear");
  });
});
