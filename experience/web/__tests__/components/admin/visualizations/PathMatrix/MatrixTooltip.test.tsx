import { render, screen } from "@testing-library/react";
import { MatrixTooltip } from "@/components/admin/visualizations/PathMatrix/MatrixTooltip";
import { DIFFICULTY_COLORS } from "@/types/atlas-admin";

describe("MatrixTooltip", () => {
  const mockFromEmotion = {
    id: "1",
    name: "Joy",
    category: "Happy",
    definition: "Happy def",
    vac: [0.8, 0.5, 0.6] as [number, number, number]
  };

  const mockToEmotion = {
    id: "2",
    name: "Sadness",
    category: "Sad",
    definition: "Sad def",
    vac: [-0.5, -0.2, 0.3] as [number, number, number]
  };

  const mockPath = {
    path_id: "path-1",
    total_distance: 1.2345,
    difficulty: "expert" as const,
    estimated_time: "5 mins",
    waypoints: [mockFromEmotion, mockToEmotion],
    requires_bridge: false,
    bridge_emotions: []
  };

  it("renders basic path details when path is provided", () => {
    render(
      <MatrixTooltip
        fromEmotion={mockFromEmotion}
        toEmotion={mockToEmotion}
        path={mockPath}
      />
    );

    expect(screen.getByText("Joy → Sadness")).toBeInTheDocument();
    expect(screen.getByText("Happy → Sad")).toBeInTheDocument();
    expect(screen.getByText("1.234")).toBeInTheDocument(); // 1.2345 toFixed(3) can be 1.234 due to precision
    expect(screen.getByText("2")).toBeInTheDocument(); // Waypoints length
    expect(screen.getByText("5 mins")).toBeInTheDocument();
    expect(screen.getByText("EXPERT")).toBeInTheDocument();
  });

  it("renders bridge requirements warning", () => {
    const bridgePath = {
      ...mockPath,
      requires_bridge: true,
      bridge_emotions: ["Neutral"]
    };

    render(
      <MatrixTooltip
        fromEmotion={mockFromEmotion}
        toEmotion={mockToEmotion}
        path={bridgePath}
      />
    );

    expect(screen.getByText("Requires Bridge Emotions:")).toBeInTheDocument();
    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });

  it("renders difficulty colors correctly", () => {
    // Check if the color style is applied (indirectly by style attribute)
    // We can just verify it renders without crashing for now, 
    // or inspect style prop if necessary.
    const { container } = render(
      <MatrixTooltip
        fromEmotion={mockFromEmotion}
        toEmotion={mockToEmotion}
        path={mockPath}
      />
    );

    // Difficulty 'expert' -> red-500 usually in the map (or whatever constant is)
    // We import constant to verify
    const expectedColor = DIFFICULTY_COLORS["expert"];
    // The bar
    const bar = container.querySelector('.rounded-full.shadow-lg');
    expect(bar).toHaveStyle({ backgroundColor: expectedColor });
  });

  it("renders empty state when path is undefined", () => {
    render(
      <MatrixTooltip
        fromEmotion={mockFromEmotion}
        toEmotion={mockToEmotion}
        path={undefined}
      />
    );

    expect(screen.getByText("Path not computed yet")).toBeInTheDocument();
  });
});
