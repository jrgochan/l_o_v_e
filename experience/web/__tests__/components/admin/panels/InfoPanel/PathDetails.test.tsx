
import { render, screen, fireEvent } from "@testing-library/react";
import { PathDetails } from "@/components/admin/panels/InfoPanel/PathDetails";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

jest.mock("@/stores/useAtlasAdminStore");

describe("PathDetails", () => {
  const mockSetHoveredEmotion = jest.fn();
  const mockSetIsFlying = jest.fn();
  const mockGetState = jest.fn(() => ({
    isFlying: false,
    setIsFlying: mockSetIsFlying
  }));

  const mockPath = {
    id: "p1",
    from: { id: "e1", name: "Joy" },
    to: { id: "e2", name: "Peace" },
    waypoints: [
      { emotion: "Wonder", strategies: [{ name: "Reflect" }], reasoning: "Why not?", estimated_time: "5m", difficulty: "Easy" }
    ],
    total_distance: 12.5,
    estimated_time: "10m",
    difficulty: "Moderate",
    requires_bridge: true,
    bridge_emotions: ["Vulnerability"]
  };

  const mockAllEmotions = [
    { id: "e1", name: "Joy" }, { id: "e2", name: "Peace" }, { id: "e3", name: "Wonder" }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue(mockAllEmotions); // Default selector returns allEmotions in component
    (useAtlasAdminStore as any).getState = mockGetState;
  });

  // Override mock implementation for useSelector vs useAtlasAdminStore(state => state.X)
  // The component does: const setHovered = useAtlasAdminStore(state => state.setHoveredEquation)
  // Detailed mock setup:
  beforeEach(() => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        setHoveredEmotion: mockSetHoveredEmotion,
        allEmotions: mockAllEmotions
      };
      return selector(state);
    });
  });

  it("renders path metrics and header", () => {
    render(<PathDetails path={mockPath as any} onWaypointClick={jest.fn()} />);
    expect(screen.getByText("Joy → Peace")).toBeInTheDocument();
    expect(screen.getByText("12.50")).toBeInTheDocument(); // Distance
    expect(screen.getByText("10m")).toBeInTheDocument(); // Time
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("renders waypoints and handles interactions", () => {
    const onWaypointClick = jest.fn();
    render(<PathDetails path={mockPath as any} onWaypointClick={onWaypointClick} />);

    expect(screen.getByText("Wonder")).toBeInTheDocument();
    expect(screen.getByText("💡 Why not?")).toBeInTheDocument();

    // Click waypoint
    fireEvent.click(screen.getByText("Wonder"));
    expect(onWaypointClick).toHaveBeenCalledWith(mockPath.waypoints[0], 0);

    // Hover Waypoint
    fireEvent.mouseEnter(screen.getByText("Wonder").closest("button")!);
    expect(mockSetHoveredEmotion).toHaveBeenCalledWith("e3"); // Wonder's ID
    fireEvent.mouseLeave(screen.getByText("Wonder").closest("button")!);
    expect(mockSetHoveredEmotion).toHaveBeenCalledWith(null);

    // Hover Start Node
    const startNode = screen.getByText("Joy").closest("div.cursor-pointer");
    fireEvent.mouseEnter(startNode!);
    expect(mockSetHoveredEmotion).toHaveBeenCalledWith("e1");
    fireEvent.mouseLeave(startNode!);

    // Hover Goal Node
    const goalNode = screen.getByText("Peace").closest("div.cursor-pointer");
    fireEvent.mouseEnter(goalNode!);
    expect(mockSetHoveredEmotion).toHaveBeenCalledWith("e2");
    fireEvent.mouseLeave(goalNode!);
  });

  it("renders bridge emotion warning", () => {
    render(<PathDetails path={mockPath as any} onWaypointClick={jest.fn()} />);
    expect(screen.getByText("Bridge Emotions Required")).toBeInTheDocument();
    const vulnerabilityElements = screen.getAllByText(/Vulnerability/);
    expect(vulnerabilityElements.length).toBeGreaterThan(0);
  });

  it("handles Play button", () => {
    render(<PathDetails path={mockPath as any} onWaypointClick={jest.fn()} />);
    fireEvent.click(screen.getByText("▶ Play"));
    expect(mockSetIsFlying).toHaveBeenCalledWith(true); // !false
  });
});
