import { render, screen, fireEvent } from "@testing-library/react";
import { ZenHUD } from "../../../../components/admin/visualization/ZenHUD";

// Mock Store
const mockUseAtlasAdminStore = jest.fn();
const mockSetIsFlying = jest.fn();

jest.mock("@/stores/useVisualizationStore", () => ({
  useVisualizationStore: (selector: any) => selector(mockUseAtlasAdminStore()),
}));

describe("ZenHUD", () => {
  const mockEmotion = { id: "e1", name: "Peace", vac: [0.1, -0.2, 0.3], category: "Positive" };
  const mockPath = {
    id: "p1",
    from: { name: "Start" },
    to: { name: "End" },
    difficulty: "easy",
    waypoints: ["wp1", "wp2"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing if idle", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      hoveredPathId: null,
      selectedPathId: null,
      computedPaths: new Map(),
      isFlying: false,
      setIsFlying: mockSetIsFlying,
      hoveredEmotionId: null,
      allEmotions: [],
    });

    const { container } = render(<ZenHUD />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render hovered emotion details", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      hoveredPathId: null,
      selectedPathId: null,
      computedPaths: new Map(),
      isFlying: false,
      hoveredEmotionId: "e1",
      allEmotions: [mockEmotion],
    });

    render(<ZenHUD />);
    expect(screen.getByText("Peace")).toBeInTheDocument();
    expect(screen.getByText("V: 0.10")).toBeInTheDocument();
  });

  it("should render active path details", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      hoveredPathId: null,
      selectedPathId: "p1",
      computedPaths: new Map([["p1", mockPath]]),
      isFlying: false,
      setIsFlying: mockSetIsFlying,
      hoveredEmotionId: null,
      allEmotions: [],
    });

    render(<ZenHUD />);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("⟶")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByText("easy Journey")).toBeInTheDocument();
  });

  it("should toggle flight mode", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      hoveredPathId: null,
      selectedPathId: "p1",
      computedPaths: new Map([["p1", mockPath]]),
      isFlying: false,
      setIsFlying: mockSetIsFlying,
      hoveredEmotionId: null,
      allEmotions: [],
    });

    render(<ZenHUD />);
    const button = screen.getByRole("button", { name: /play journey/i });
    fireEvent.click(button);
    expect(mockSetIsFlying).toHaveBeenCalledWith(true);
  });

  it("should render stop button when flying", () => {
    mockUseAtlasAdminStore.mockReturnValue({
      hoveredPathId: null,
      selectedPathId: "p1",
      computedPaths: new Map([["p1", mockPath]]),
      isFlying: true, // Flying
      setIsFlying: mockSetIsFlying,
      hoveredEmotionId: null,
      allEmotions: [],
    });

    render(<ZenHUD />);
    expect(screen.getByText("Stop Journey")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /stop journey/i });
    expect(button.className).toContain("bg-red-500/20");
  });
});
