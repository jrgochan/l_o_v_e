import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PathComparisonView } from "@/components/journey/PathComparisonView";
import { usePathExplorerStore } from "@/stores/usePathExplorerStore";

// Mock the store
jest.mock("@/stores/usePathExplorerStore");

describe("PathComparisonView", () => {
  const mockSetPrimaryPath = jest.fn();
  const mockSetAlternativePaths = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathExplorerStore as unknown as jest.Mock).mockReturnValue({
      alternativePaths: [],
      setPrimaryPath: mockSetPrimaryPath,
      setAlternativePaths: mockSetAlternativePaths,
    });
  });

  const mockPath1 = {
    id: "path-1",
    waypoints: ["a", "b", "c"], // length 3
    path_metrics: {
      difficulty: "easy",
      estimated_time: "15m",
      requires_bridge: false,
      bridge_emotions: [],
    },
  };

  const mockPath2 = {
    id: "path-2",
    waypoints: ["x", "y", "z", "w"], // length 4
    path_metrics: {
      difficulty: "difficult",
      estimated_time: "45m",
      requires_bridge: true,
      bridge_emotions: ["fear"],
    },
  };

  it("renders nothing when no alternative paths", () => {
    const { container } = render(<PathComparisonView />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders paths when available", () => {
    (usePathExplorerStore as unknown as jest.Mock).mockReturnValue({
      alternativePaths: [mockPath1, mockPath2],
      setPrimaryPath: mockSetPrimaryPath,
      setAlternativePaths: mockSetAlternativePaths,
    });

    render(<PathComparisonView />);

    expect(screen.getByText("CHOOSE YOUR PATH")).toBeInTheDocument();
    expect(screen.getByText("OPTION 01")).toBeInTheDocument();
    expect(screen.getByText("OPTION 02")).toBeInTheDocument();

    // Check metrics for Path 1
    expect(screen.getByText("15m")).toBeInTheDocument();
    expect(screen.getByText("easy")).toBeInTheDocument();
    // Steps = waypoints.length + 2. Path 1: 3+2=5
    expect(screen.getByText("5")).toBeInTheDocument();

    // Check metrics for Path 2
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("difficult")).toBeInTheDocument();
    // Steps = 4+2=6
    expect(screen.getByText("6")).toBeInTheDocument();
    // Bridges = 1
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders default duration when estimated_time is missing", () => {
    const incompletePath = {
      ...mockPath1,
      path_metrics: { ...mockPath1.path_metrics, estimated_time: undefined },
    };

    (usePathExplorerStore as unknown as jest.Mock).mockReturnValue({
      alternativePaths: [incompletePath],
      setPrimaryPath: mockSetPrimaryPath,
      setAlternativePaths: mockSetAlternativePaths,
    });

    render(<PathComparisonView />);
    expect(screen.getByText("~30m")).toBeInTheDocument();
  });

  it("selects a path and clears alternatives", () => {
    (usePathExplorerStore as unknown as jest.Mock).mockReturnValue({
      alternativePaths: [mockPath1, mockPath2],
      setPrimaryPath: mockSetPrimaryPath,
      setAlternativePaths: mockSetAlternativePaths,
    });

    render(<PathComparisonView />); // Use debug() if needed to check DOM structure

    // Click on the first path card (or its button)
    // The onClick is on the card div, and there is also a button.
    // The card has class 'cursor-pointer' and onClick handler.
    // Let's click the "Select Path" button for the first path.

    const selectButtons = screen.getAllByText("Select Path");
    fireEvent.click(selectButtons[0]);

    expect(mockSetPrimaryPath).toHaveBeenCalledWith(mockPath1);
    expect(mockSetAlternativePaths).toHaveBeenCalledWith([]);
  });

  // Test difficulty colors and summaries
  it("displays correct difficulty colors and summaries", () => {
    const easyPath = {
      ...mockPath1,
      path_metrics: { ...mockPath1.path_metrics, difficulty: "easy" },
    };
    const moderatePath = {
      ...mockPath1,
      path_metrics: { ...mockPath1.path_metrics, difficulty: "moderate", estimated_time: "20m" },
    };
    const difficultPath = {
      ...mockPath1,
      path_metrics: { ...mockPath1.path_metrics, difficulty: "difficult", estimated_time: "90m" },
    }; // 90m triggers summary
    const bridgePath = {
      ...mockPath1,
      path_metrics: { ...mockPath1.path_metrics, difficulty: "custom", requires_bridge: true },
    };

    (usePathExplorerStore as unknown as jest.Mock).mockReturnValue({
      alternativePaths: [easyPath, moderatePath, difficultPath, bridgePath],
      setPrimaryPath: mockSetPrimaryPath,
      setAlternativePaths: mockSetAlternativePaths,
    });

    render(<PathComparisonView />);

    // Easy -> text-emerald-400
    const easyEl = screen.getByText("easy");
    expect(easyEl).toHaveClass("text-emerald-400");
    expect(screen.getByText("Gentle & Steady")).toBeInTheDocument();

    // Moderate -> text-amber-400
    const modEl = screen.getByText("moderate");
    expect(modEl).toHaveClass("text-amber-400");
    // Default summary "Balanced Approach"
    expect(screen.getByText("Balanced Approach")).toBeInTheDocument();

    // Difficult -> text-rose-400
    const diffEl = screen.getByText("difficult");
    expect(diffEl).toHaveClass("text-rose-400");
    // 90m -> "Thorough Journey"
    expect(screen.getByText("Thorough Journey")).toBeInTheDocument();

    // Bridge -> "Deep Transformation"
    expect(screen.getByText("Deep Transformation")).toBeInTheDocument();
    // Default color -> text-white (for 'custom' difficulty)
    const customEl = screen.getByText("custom");
    expect(customEl).toHaveClass("text-white");
  });
});
