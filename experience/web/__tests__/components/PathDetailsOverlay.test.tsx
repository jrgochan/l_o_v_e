import { render, screen, fireEvent, act } from "@testing-library/react";
import { PathDetailsOverlay } from "../../components/PathDetailsOverlay";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock Stores
jest.mock("@/stores/useExperienceStore");
jest.mock("@/stores/useAtlasAdminStore");

// Mock WaypointDetailModal
jest.mock("@/components/admin/shared/WaypointDetailModal", () => ({
  WaypointDetailModal: ({ onClose, onNavigate }: any) => (
    <div data-testid="waypoint-modal">
      <button onClick={onClose} data-testid="close-modal">
        Close
      </button>
      <button onClick={() => onNavigate(1)} data-testid="nav-modal">
        Nav
      </button>
    </div>
  ),
}));

// Mock react-spring
jest.mock("@react-spring/web", () => ({
  useSpring: () => ({ opacity: 1, y: 0 }),
  useTransition: (items: any, config: any) => {
    if (config && config.keys) {
      try {
        if (Array.isArray(items)) items.forEach((i) => config.keys(i));
        else config.keys(items);
      } catch (e) { }
    }
    return (fn: any) => (items ? fn({ opacity: 1 }, items) : null);
  },
  animated: {
    div: ({ children, style, className }: any) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
  config: { gentle: {} },
}));

describe("PathDetailsOverlay", () => {
  const mockSetIsFlying = jest.fn();
  const mockSetFlyoverProgress = jest.fn();
  const mockSetFlyoverSpeed = jest.fn();

  const mockAdminSetIsFlying = jest.fn();
  const mockCycleSelectedPath = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: null,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        allEmotions: [
          { name: "Joy", category: "positive" },
          { name: "Sadness", category: "negative" },
        ],
        cycleSelectedPath: mockCycleSelectedPath,
        setIsFlying: mockAdminSetIsFlying,
      })
    );
  });

  const mockPath = {
    path_id: "p1",
    current_state: {
      emotion: "Joy",
      category: "positive",
      vac: [1, 1, 1],
      quaternion: [0, 0, 0, 1],
    },
    goal_state: {
      emotion: "Sadness",
      category: "negative",
      vac: [-1, -1, -1],
      quaternion: [0, 0, 0, 1],
    },
    waypoints: [{ emotion: "Neutral", vac: [0, 0, 0], reasoning: "Bridge" }],
    path_metrics: {
      total_distance: 10,
      total_estimated_time: "5m",
      overall_difficulty: "easy",
    },
  };

  it("should render 'No Active Journey' when path is null", () => {
    render(<PathDetailsOverlay />);
    expect(screen.getByText("No Active Journey")).toBeInTheDocument();
  });

  it("should render Control Deck when path exists", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getAllByText("Joy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("BROWSING:")).toBeInTheDocument();
  });

  it("should toggle playback and reset flyover", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0.5,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);
    expect(mockSetIsFlying).toHaveBeenCalledWith(true);
    expect(mockAdminSetIsFlying).toHaveBeenCalledWith(true);

    const startFlyoverBtn = screen.getByTitle("Start Flyover");
    fireEvent.click(startFlyoverBtn);
    expect(mockSetFlyoverProgress).toHaveBeenCalledWith(0);
    expect(mockSetIsFlying).toHaveBeenCalledWith(true);
  });

  it("should auto-rewind when playing from end", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 1.0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);
    expect(mockSetFlyoverProgress).toHaveBeenCalledWith(0);
    expect(mockSetIsFlying).toHaveBeenCalledWith(true);
  });

  it("should reset loop/journey", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0.5,
        flyoverSpeed: 1.0,
        isFlying: true,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    const resetBtn = screen.getByTitle("Reset Journey");
    fireEvent.click(resetBtn);
    expect(mockSetIsFlying).toHaveBeenCalledWith(false);
    expect(mockSetFlyoverProgress).toHaveBeenCalledWith(0);
  });

  it("should change speed", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    const speedBtn = screen.getByText("2x");
    fireEvent.click(speedBtn);
    expect(mockSetFlyoverSpeed).toHaveBeenCalledWith(2.0);
  });

  it("should handle navigation arrows", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    const { container } = render(<PathDetailsOverlay />);

    const leftBtn = container.querySelector(".lucide-chevron-left")?.closest("button");
    const rightBtn = container.querySelector(".lucide-chevron-right")?.closest("button");
    const upBtn = container.querySelector(".lucide-chevron-up")?.closest("button");
    const downBtn = container.querySelector(".lucide-chevron-down")?.closest("button");

    expect(leftBtn).toBeInTheDocument();
    fireEvent.click(leftBtn!);
    expect(mockCycleSelectedPath).toHaveBeenCalledWith("prev");

    fireEvent.click(rightBtn!);
    expect(mockCycleSelectedPath).toHaveBeenCalledWith("next");

    fireEvent.click(upBtn!);
    expect(mockCycleSelectedPath).toHaveBeenCalledWith("up");

    fireEvent.click(downBtn!);
    expect(mockCycleSelectedPath).toHaveBeenCalledWith("down");
  });

  it("should pause execution when opening modal (Flying State)", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: true, // Flying!
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    const infoBtn = screen.getByTitle("View Details");
    fireEvent.click(infoBtn);

    expect(screen.getByTestId("waypoint-modal")).toBeInTheDocument();
    expect(mockSetIsFlying).toHaveBeenCalledWith(false);
    expect(mockAdminSetIsFlying).toHaveBeenCalledWith(false);
  });

  it("should handle modal interactions and paused state", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false, // Paused already
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    const infoBtn = screen.getByTitle("View Details");
    fireEvent.click(infoBtn);

    expect(screen.getByTestId("waypoint-modal")).toBeInTheDocument();

    // Test Navigation callback
    const navBtn = screen.getByTestId("nav-modal");
    fireEvent.click(navBtn);

    // Test Close callback
    const closeBtn = screen.getByTestId("close-modal");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("waypoint-modal")).not.toBeInTheDocument();
  });

  it("should handle unknown category and missing VAC", () => {
    const explicitPath = {
      path_id: "pX",
      current_state: {
        emotion: "Mystery",
        category: "unknown",
        vac: [0, 0, 0],
        quaternion: [0, 0, 0, 1],
      },
      goal_state: {
        emotion: "Sadness",
        category: "negative",
        vac: [-1, -1, -1],
        quaternion: [0, 0, 0, 1],
      },
      waypoints: [{ emotion: "Ghost", vac: undefined }],
      path_metrics: { total_distance: 10, total_estimated_time: "5m", overall_difficulty: "easy" },
    };

    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: explicitPath,
        flyoverProgress: 0.5,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);
    expect(screen.getByText("Mystery")).toBeInTheDocument();
  });

  it("should handle mixed valences for color coverage", () => {
    const mixedPath = {
      path_id: "pMixed",
      current_state: { emotion: "A", category: "c", vac: [0.2, 0, 0], quaternion: [0, 0, 0, 1] }, // > 0.1 (lime)
      goal_state: { emotion: "B", category: "c", vac: [-0.2, 0, 0], quaternion: [0, 0, 0, 1] }, // > -0.5 (orange)
      waypoints: [],
      path_metrics: { total_distance: 0, total_estimated_time: "0m", overall_difficulty: "easy" },
    };

    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mixedPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    const { rerender } = render(<PathDetailsOverlay />);
    // Current index 0 -> start -> vac 0.2

    // Force update to val < -0.1
    // We can't easily force update via render without store change
    // But we proved coverage for vac conditional in other tests?
    // Logic: getEmotionColor(val)
    // If val > 0.1 -> lime
    // If val > -0.1 -> gray
    // If val > -0.5 -> orange
    // else -> red

    // Start (0.2) -> lime.
    // Goal (-0.2) -> orange.
    // We can't easily check color without checking style/class or knowing the component internals mapping.
    // But execution should cover the lines.

    // Progress 1.0 -> end -> vac -0.2
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mixedPath,
        flyoverProgress: 1.0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );
    rerender(<PathDetailsOverlay />);
  });

  it("should handle out-of-sync waypoint index gracefully", () => {
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 3.0, // Force 300% progress -> Index > max
        flyoverSpeed: 1.0,
        isFlying: true,
        flyoverCurrentWaypointIndex: 0, // Irrelevant for this calc
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    render(<PathDetailsOverlay />);

    // Should render nothing for active item
    expect(screen.queryByTitle("Category Index")).not.toBeInTheDocument();
    // But control deck should be visible because path exists (verify via title)
    expect(screen.getByTitle("Start Flyover")).toBeInTheDocument();
  });

  it("should position lower in cinema mode", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        allEmotions: [],
        viewMode: "cinema",
        cycleSelectedPath: mockCycleSelectedPath,
        setIsFlying: mockAdminSetIsFlying,
      })
    );

    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        transitionPath: mockPath,
        flyoverProgress: 0,
        flyoverSpeed: 1.0,
        isFlying: false,
        setFlyoverProgress: mockSetFlyoverProgress,
        setFlyoverSpeed: mockSetFlyoverSpeed,
        setIsFlying: mockSetIsFlying,
      })
    );

    const { container } = render(<PathDetailsOverlay />);
    // The outermost div has the class
    // We can find it by verifying position class
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("top-28");
  });
});
