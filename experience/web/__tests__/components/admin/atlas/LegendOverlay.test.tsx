import { render, screen, fireEvent } from "@testing-library/react";
import { LegendOverlay } from "../../../../components/admin/visualization/LegendOverlay";

// Mock store
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useVisualizationStore", () => ({
  useVisualizationStore: (selector: any) => selector(mockUseAtlasAdminStore()),
}));

describe("LegendOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAtlasAdminStore.mockReturnValue({
      categoryFilters: new Map([
        ["Joy", { enabled: true, color: "#FF0000", name: "Joy" }],
        ["Sadness", { enabled: false, color: "#0000FF", name: "Sadness" }],
      ]),
    });
  });

  it("should render collapsed by default", () => {
    render(<LegendOverlay />);

    expect(screen.getByText("Legend")).toBeInTheDocument();
    expect(screen.queryByText("Path Difficulty")).not.toBeInTheDocument();
  });

  it("should expand on click", () => {
    render(<LegendOverlay />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("Path Difficulty")).toBeInTheDocument();
    expect(screen.getByText("Categories (1)")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.queryByText("Sadness")).not.toBeInTheDocument(); // Disabled
  });

  it("should collapse on second click", () => {
    render(<LegendOverlay />);

    const button = screen.getByRole("button");
    fireEvent.click(button); // Expand
    expect(screen.getByText("Path Difficulty")).toBeInTheDocument();

    fireEvent.click(button); // Collapse
    expect(screen.queryByText("Path Difficulty")).not.toBeInTheDocument();
  });
});
