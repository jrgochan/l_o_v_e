
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiEmotionCard } from "@/components/admin/emotion-display/MultiEmotionCard";
import type { DetectedEmotion, EmotionRelationship, AggregateState } from "@/types/chat";

// Mock the store
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: (selector: any) => selector({
    settings: { pathAnimationMode: "subtle" }
  }),
}));

// Mock child components
jest.mock("@/components/admin/emotion-display/BaseEmotionChip", () => ({
  BaseEmotionChip: ({ emotion, onClick }: any) => (
    <div data-testid="mock-chip" onClick={onClick}>{emotion}</div>
  ),
}));

jest.mock("@/components/admin/emotion-display/EmotionMappingBadge", () => ({
  EmotionMappingBadge: () => <div data-testid="mock-mapping-badge" />
}));

jest.mock("@/components/admin/shared/RelationshipIndicator", () => ({
  RelationshipList: () => <div data-testid="mock-relationship-list" />
}));

jest.mock("@/components/admin/visualizations/EmotionRelationshipGraph", () => ({
  EmotionRelationshipGraph: ({ onEmotionClick }: any) => (
    <div
      data-testid="mock-relationship-graph"
      onClick={() => onEmotionClick({ emotion_name: "Joy" })}
    />
  )
}));

jest.mock("@/components/admin/spheres/AggregateSphere", () => ({
  AggregateSphere: () => <div data-testid="mock-aggregate-sphere" />
}));

jest.mock("@/components/admin/state-display/AggregateStateCard", () => ({
  AggregateStateCard: () => <div data-testid="mock-aggregate-state-card" />
}));

describe("MultiEmotionCard", () => {
  const mockEmotions: DetectedEmotion[] = [
    {
      id: "1",
      emotion_name: "Joy",
      category: "When Life Is Good",
      confidence: 0.9,
      intensity: 5,
      prominence: "primary",
      vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
      original_name: "Happy"
    },
    {
      id: "2",
      emotion_name: "Trust",
      category: "When Life Is Good",
      confidence: 0.8,
      intensity: 3,
      prominence: "secondary",
      vac: { valence: 0.5, arousal: 0.3, connection: 0.9 }
    },
    {
      id: "3",
      emotion_name: "Curiosity",
      category: "When Life Is Good",
      confidence: 0.4,
      intensity: 2,
      prominence: "underlying",
      vac: { valence: 0.2, arousal: 0.5, connection: 0.5 }
    },
  ];

  const mockRelationships: EmotionRelationship[] = [
    { id: "r1", emotion_a: "Joy", emotion_b: "Trust", type: "sequential", description: "Joy leads to trust", strength: 0.8 }
  ];

  const mockAggregate: AggregateState = {
    valence: 0.5,
    arousal: 0.5,
    connection: 0.5,
    overall_mood: "Positive"
  };

  it("renders primary emotion details", () => {
    render(<MultiEmotionCard emotions={mockEmotions} />);
    expect(screen.getByText("PRIMARY EMOTION")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument(); // 0.9 confidence
    expect(screen.getByText("0.800")).toBeInTheDocument(); // Valence
  });

  it("renders secondary emotions", () => {
    render(<MultiEmotionCard emotions={mockEmotions} />);
    expect(screen.getByText("Secondary Emotions")).toBeInTheDocument();
    expect(screen.getByText("Trust")).toBeInTheDocument();
  });

  it("handles empty state", () => {
    const { container } = render(<MultiEmotionCard emotions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("handles emotion selection click on secondary emotion", () => {
    const onSelect = jest.fn();
    render(<MultiEmotionCard emotions={mockEmotions} onEmotionClick={onSelect} />);

    // Find the secondary emotion container (it has an onClick)
    // We can find it by text "Trust" and clicking its parent
    const trustElement = screen.getByText("Trust");
    const container = trustElement.closest("div.cursor-pointer");
    fireEvent.click(container!);

    expect(onSelect).toHaveBeenCalledWith("Trust");
  });

  it("toggles underlying emotions", () => {
    render(<MultiEmotionCard emotions={mockEmotions} />);
    const toggleBtn = screen.getByText(/UNDERLYING EMOTIONS/);

    // Initially hidden (except button)
    expect(screen.queryByText("Curiosity*")).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);

    expect(screen.getByText("Curiosity*")).toBeInTheDocument();
  });

  it("renders relationships and toggles graph", () => {
    const onSelect = jest.fn();
    render(<MultiEmotionCard emotions={mockEmotions} relationships={mockRelationships} onEmotionClick={onSelect} />);
    expect(screen.getByText("🔗 Emotion Relationships")).toBeInTheDocument();
    expect(screen.getByTestId("mock-relationship-list")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show Graph"));
    expect(screen.getByTestId("mock-relationship-graph")).toBeInTheDocument();

    // Test graph click
    fireEvent.click(screen.getByTestId("mock-relationship-graph"));
    expect(onSelect).toHaveBeenCalledWith("Joy");
  });

  it("handles undefined onEmotionClick handler safely", () => {
    // Render without onEmotionClick
    render(<MultiEmotionCard emotions={mockEmotions} relationships={mockRelationships} />);

    // Click secondary emotion
    fireEvent.click(screen.getByText("Trust"));

    // Click graph node (toggle graph first)
    fireEvent.click(screen.getByText("Show Graph"));
    fireEvent.click(screen.getByTestId("mock-relationship-graph"));

    // Should not throw
  });

  it("renders aggregate state and toggles sphere", () => {
    render(<MultiEmotionCard emotions={mockEmotions} aggregate={mockAggregate} />);
    expect(screen.getByTestId("mock-aggregate-state-card")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show 3D Sphere"));
    expect(screen.getByTestId("mock-aggregate-sphere")).toBeInTheDocument();
  });
});
