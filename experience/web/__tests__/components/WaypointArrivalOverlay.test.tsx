import { render } from "@testing-library/react";
import { WaypointArrivalOverlay } from "../../components/WaypointArrivalOverlay";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock Store
const mockState = {
  isFlying: false,
  flyoverCurrentWaypointIndex: -1,
  transitionPath: null,
};

jest.mock("@/stores/useExperienceStore", () => ({
  useExperienceStore: jest.fn(),
}));

const setMockState = (updates: any) => {
  Object.assign(mockState, updates);
};

describe("WaypointArrivalOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset full state
    Object.assign(mockState, {
      isFlying: false,
      flyoverCurrentWaypointIndex: -1,
      transitionPath: null,
    });
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector ? selector(mockState) : mockState
    );
  });

  it("renders nothing when not flying", () => {
    setMockState({ isFlying: false });
    const { container } = render(<WaypointArrivalOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no path", () => {
    setMockState({ isFlying: true, transitionPath: null });
    const { container } = render(<WaypointArrivalOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when index is -1", () => {
    setMockState({
      isFlying: true,
      transitionPath: { waypoints: [] },
      flyoverCurrentWaypointIndex: -1,
    });
    const { container } = render(<WaypointArrivalOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Start Point correctly", () => {
    setMockState({
      isFlying: true,
      transitionPath: {
        current_state: { emotion: "Joy", category: "Happy" },
        waypoints: [],
        goal_state: { emotion: "Peace", category: "Calm" },
      },
      flyoverCurrentWaypointIndex: 0,
    });

    const { getByText } = render(<WaypointArrivalOverlay />);
    expect(getByText("Starting Point")).toBeInTheDocument();
    expect(getByText("Joy")).toBeInTheDocument();
    expect(getByText(/Leaving Happy/)).toBeInTheDocument();
  });

  it("renders Goal Point correctly", () => {
    const waypoints = [{ emotion: "Hope", category: "Happy", reasoning: "Reason" }];
    // totalPoints = 1 (start) + 1 (wp) + 1 (goal) = 3. Goal index is 2.
    setMockState({
      isFlying: true,
      transitionPath: {
        current_state: { emotion: "Joy", category: "Happy" },
        waypoints: waypoints,
        goal_state: { emotion: "Peace", category: "Calm" },
      },
      flyoverCurrentWaypointIndex: 2,
    });

    const { getByText } = render(<WaypointArrivalOverlay />);
    expect(getByText("Destination Reached")).toBeInTheDocument();
    expect(getByText("Peace")).toBeInTheDocument();
    expect(getByText(/Welcome to Calm/)).toBeInTheDocument();
  });

  it("renders Intermediate Waypoint correctly", () => {
    const waypoints = [
      {
        emotion: "Hope",
        category: "Happy",
        reasoning: "Keep going",
        strategies: [{ name: "Breathe" }],
      },
    ];
    // Start=0, Waypoint=1
    setMockState({
      isFlying: true,
      transitionPath: {
        current_state: { emotion: "Joy", category: "Happy" },
        waypoints: waypoints,
        goal_state: { emotion: "Peace", category: "Calm" },
      },
      flyoverCurrentWaypointIndex: 1,
    });

    const { getByText } = render(<WaypointArrivalOverlay />);
    expect(getByText("Waypoint 1 / 1")).toBeInTheDocument();
    expect(getByText("Hope")).toBeInTheDocument();
    expect(getByText(/Keep going/)).toBeInTheDocument();
    expect(getByText("Breathe")).toBeInTheDocument();
  });

  it("handles missing waypoint gracefully", () => {
    setMockState({
      isFlying: true,
      transitionPath: {
        current_state: { emotion: "Joy", category: "Happy" },
        waypoints: [], // Empty. Total=2
        goal_state: { emotion: "Peace", category: "Calm" },
      },
      // Index 2 is out of bounds (0=Start, 1=Goal)
      flyoverCurrentWaypointIndex: 2,
    });

    const { container } = render(<WaypointArrivalOverlay />);
    expect(container.firstChild).toBeNull();
  });
});
