import { render, screen, fireEvent } from "@testing-library/react";
import { EmotionCluster, EmotionList } from "@/components/admin/emotion-display/EmotionCluster";
import type { DetectedEmotion } from "@/types/chat";

describe("EmotionCluster", () => {
  const mockEmotions: DetectedEmotion[] = [
    {
      id: "1",
      emotion_name: "Joy",
      category: "Joy",
      confidence: 0.9,
      vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
      prominence: "primary",
    },
    {
      id: "2",
      emotion_name: "Trust",
      category: "Trust",
      confidence: 0.8,
      vac: { valence: 0.5, arousal: 0.3, connection: 0.9 },
      prominence: "secondary",
    },
  ];

  it("renders list of emotions in flow layout", () => {
    const { container } = render(<EmotionCluster emotions={mockEmotions} layout="flow" />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Trust")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("flex flex-wrap gap-2");
  });

  it("renders list of emotions in grid layout", () => {
    const { container } = render(<EmotionCluster emotions={mockEmotions} layout="grid" />);
    expect(container.firstChild).toHaveClass("grid grid-cols-2 gap-2");
  });

  it("renders empty state", () => {
    render(<EmotionCluster emotions={[]} />);
    expect(screen.getByText(/No emotions detected/i)).toBeInTheDocument();
  });

  it("handles emotion click", () => {
    const onClick = jest.fn();
    render(<EmotionCluster emotions={mockEmotions} onEmotionClick={onClick} />);
    fireEvent.click(screen.getByText("Joy"));
    expect(onClick).toHaveBeenCalledWith(mockEmotions[0]);
  });

  it("toggles category display", () => {
    render(<EmotionCluster emotions={mockEmotions} showCategory={true} />);
    // Check for category label (impl specific selector)
    expect(screen.getAllByText("Joy")[1]).toBeInTheDocument(); // Name + Category
  });

  it("handles emotions without IDs (fallback key)", () => {
    const noIdEmotions: DetectedEmotion[] = [{ ...mockEmotions[0], id: undefined as any }];
    render(<EmotionCluster emotions={noIdEmotions} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("hides confidence when showConfidence is false", () => {
    render(<EmotionCluster emotions={mockEmotions} showConfidence={false} />);
    // Confidence 90%
    expect(screen.queryByText("90%")).not.toBeInTheDocument();
  });
});

describe("EmotionList", () => {
  const mockEmotions: DetectedEmotion[] = [
    {
      id: "1",
      emotion_name: "Joy",
      category: "Joy",
      confidence: 0.9,
      vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
      prominence: "primary",
    },
  ];

  it("handles emotions without IDs (fallback key)", () => {
    const noIdEmotions: DetectedEmotion[] = [{ ...mockEmotions[0], id: undefined as any }];
    render(<EmotionList emotions={noIdEmotions} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("renders emotions in list format", () => {
    render(<EmotionList emotions={mockEmotions} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("handles empty state", () => {
    render(<EmotionList emotions={[]} />);
    expect(screen.getByText(/No emotions detected/i)).toBeInTheDocument();
  });

  it("handles click interaction", () => {
    const onClick = jest.fn();
    render(<EmotionList emotions={mockEmotions} onEmotionClick={onClick} />);
    // EmotionList wraps chip in a div div, the click is on the CHIP
    fireEvent.click(screen.getByText("Joy"));
    expect(onClick).toHaveBeenCalledWith(mockEmotions[0]);
  });
});
