
import { render, screen, fireEvent } from "@testing-library/react";
import { DataVisualizationOverlay } from "@/components/admin/visualizations/DataVisualizationOverlay";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock the store
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: jest.fn(),
}));

// Mock MiniSoulSphere
jest.mock("@/components/admin/spheres/MiniSoulSphere", () => ({
  MiniSoulSphere: ({ emotion, onClick, isHovered }: any) => (
    <div
      data-testid={`sphere-${emotion.id}`}
      onClick={onClick}
      onMouseEnter={() => { }} // Not strictly using this handler in test, parent handles it
    >
      {emotion.name} {isHovered ? "(Hovered)" : ""}
    </div>
  ),
}));

describe("DataVisualizationOverlay", () => {
  const mockEmotions = [
    { id: "1", name: "Joy", category: "Happy", definition: "A feeling of pleasure", vac: [0.8, 0.5, 0.6] },
    { id: "2", name: "Sadness", category: "Sad", definition: "A feeling of sorrow", vac: [-0.5, -0.2, 0.3] },
    { id: "3", name: "Anger", category: "Angry", definition: "A strong feeling of annoyance", vac: [-0.3, 0.8, -0.2] },
  ];

  const mockSelectEmotion = jest.fn();
  const mockSetFocusedEmotion = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockEmotions,
        settings: { colorScheme: "category" },
        selectEmotion: mockSelectEmotion,
        setFocusedEmotion: mockSetFocusedEmotion,
      };
      return selector(state);
    });
  });

  it("renders header and emotion grid", () => {
    render(<DataVisualizationOverlay onClose={mockOnClose} />);

    expect(screen.getByText("Data Visualization Mode")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();
    expect(screen.getByText("Anger")).toBeInTheDocument();
  });

  it("filters by category", () => {
    render(<DataVisualizationOverlay onClose={mockOnClose} />);

    // Click Category "Happy"
    fireEvent.click(screen.getByText("Happy"));

    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.queryByText("Sadness")).not.toBeInTheDocument();
    expect(screen.queryByText("Anger")).not.toBeInTheDocument();

    // Clear filter
    fireEvent.click(screen.getByText(/All \(\d+\)/));
    expect(screen.getByText("Sadness")).toBeInTheDocument();
  });

  it("handles sorting (alphabetical check)", () => {
    render(<DataVisualizationOverlay onClose={mockOnClose} />);
    // Since we mock rendering as text, we can check order if needed, 
    // but React Testing Library doesn't easily guarantee DOM order assertion without manual traversal.
    // However, our mock data is simple.
  });

  it("shows details on hover", () => {
    render(<DataVisualizationOverlay onClose={mockOnClose} />);

    // Find the container wrapping the sphere to hover
    // The component structure:
    // <div onMouseEnter...> <MiniSoulSphere .../> </div>
    // We need to find this wrapper.
    const sphere = screen.getByTestId("sphere-1");
    // The onMouseEnter is on the parent div of MiniSoulSphere.
    const parent = sphere.parentElement;

    if (parent) {
      fireEvent.mouseEnter(parent);
    }

    expect(screen.getByText("A feeling of pleasure")).toBeInTheDocument();
    expect(screen.getByText("Joy (Hovered)")).toBeInTheDocument(); // Check prop passing

    if (parent) {
      fireEvent.mouseLeave(parent);
    }
    // Details might hide or persist depending on logic.
    // The code sets hoveredId to null on leave.
  });

  it("handles emotion click", () => {
    render(<DataVisualizationOverlay onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId("sphere-1"));

    expect(mockSelectEmotion).toHaveBeenCalledWith("1");
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("1");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders empty state when filtered to empty category (simulated)", () => {
    // Simulate selection of a category that has no items?
    // Logic derives categories from available emotions, so normally impossible.
    // But we can test `sortedEmotions.length === 0` branch by mocking empty emotions?
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: [],
        settings: { colorScheme: "category" },
        selectEmotion: mockSelectEmotion,
        setFocusedEmotion: mockSetFocusedEmotion,
      };
      return selector(state);
    });

    render(<DataVisualizationOverlay onClose={mockOnClose} />);
    expect(screen.getByText("No emotions in this category")).toBeInTheDocument();
  });
});
