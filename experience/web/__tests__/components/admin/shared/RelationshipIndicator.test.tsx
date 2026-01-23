import { render, screen, fireEvent } from "@testing-library/react";
import {
  RelationshipIndicator,
  RelationshipList,
} from "@/components/admin/shared/RelationshipIndicator";
import { EmotionRelationship } from "@/types/chat";

const mockRelationship: EmotionRelationship = {
  id: "rel-1",
  emotion_a: "Joy",
  emotion_b: "Sadness",
  type: "contradicts",
  strength: 0.8,
  description: "They are opposites",
};

const mockRelationships: EmotionRelationship[] = [
  mockRelationship,
  {
    id: "rel-2",
    emotion_a: "Joy",
    emotion_b: "Excitement",
    type: "amplifying",
    strength: 0.9,
    description: "Boosts intensity",
  },
  {
    id: "rel-3",
    emotion_a: "Fear",
    emotion_b: "Anxiety",
    type: "sequential",
    strength: 0.7,
    description: "Leads to",
  },
  {
    id: "rel-4",
    emotion_a: "A",
    emotion_b: "B",
    type: "complementary",
    strength: 0.6,
    description: "Pairs well",
  },
  {
    id: "rel-5",
    emotion_a: "C",
    emotion_b: "D",
    type: "masking",
    strength: 0.5,
    description: "Hides it",
  },
  // Add another contradictory relationship to test grouping reduction (append to existing array)
  {
    id: "rel-6",
    emotion_a: "Anger",
    emotion_b: "Calm",
    type: "contradicts",
    strength: 0.85,
    description: "Opposites attract",
  },
];

describe("RelationshipIndicator", () => {
  it("renders correctly with default props", () => {
    render(<RelationshipIndicator relationship={mockRelationship} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();
    expect(screen.getByText(/contradicts/i)).toBeInTheDocument();
    expect(screen.getByText("(80%)")).toBeInTheDocument();
    expect(screen.getByText(/"They are opposites"/)).toBeInTheDocument();
    // Icon for contradictory
    expect(screen.getAllByText("⟷").length).toBeGreaterThan(0);
  });

  it("handles click events", () => {
    const handleClick = jest.fn();
    render(<RelationshipIndicator relationship={mockRelationship} onClick={handleClick} />);

    // Find the clickable container - assuming closest div to text
    const container = screen.getByText("Joy").closest("div.cursor-pointer");
    expect(container).toBeInTheDocument();
    if (container) fireEvent.click(container);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders different sizes", () => {
    const { rerender, container } = render(
      <RelationshipIndicator relationship={mockRelationship} size="small" />
    );
    // Check for size classes
    expect(container.firstChild).toHaveClass("p-2", "text-xs");

    rerender(<RelationshipIndicator relationship={mockRelationship} size="large" />);
    expect(container.firstChild).toHaveClass("p-4", "text-base");
  });

  it("renders varied relationship types correctly", () => {
    const types = ["complementary", "masking", "amplifying", "sequential", "unknown"] as const;

    types.forEach((type) => {
      const rel = { ...mockRelationship, type: type as any };
      const { unmount } = render(<RelationshipIndicator relationship={rel} />);
      // Just verifying it renders without error
      expect(screen.getByText(rel.emotion_a)).toBeInTheDocument();
      unmount();
    });
  });
});

describe("RelationshipList", () => {
  it("renders a list of relationships", () => {
    render(<RelationshipList relationships={mockRelationships} />);
    // Should see all emotion names
    expect(screen.getAllByText("Joy").length).toBeGreaterThan(0);
    expect(screen.getByText("Sadness")).toBeInTheDocument();
  });

  it("groups relationships by type", () => {
    render(<RelationshipList relationships={mockRelationships} groupByType={true} />);

    // Should see headers
    // Contradictory should have 2 items now
    expect(screen.getByText(/contradicts \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/amplifying \(1\)/i)).toBeInTheDocument();
  });

  it("handles empty list", () => {
    const { container } = render(<RelationshipList relationships={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("handles interaction in list", () => {
    const handleClick = jest.fn();
    render(
      <RelationshipList relationships={[mockRelationship]} onRelationshipClick={handleClick} />
    );

    fireEvent.click(screen.getByText("Joy"));
    expect(handleClick).toHaveBeenCalledWith(mockRelationship);
  });

  it("handles interaction in grouped list", () => {
    const handleClick = jest.fn();
    render(
      <RelationshipList
        relationships={[mockRelationship]}
        groupByType={true}
        onRelationshipClick={handleClick}
      />
    );

    const joyText = screen.getAllByText("Joy")[0];
    fireEvent.click(joyText);
    expect(handleClick).toHaveBeenCalledWith(mockRelationship);
  });
});
