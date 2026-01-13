import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerControls } from "@/components/admin/panels/ControlPanel/LayerControls";
import { CategoryFilter, LayerVisibility, AtlasAdminSettings } from "@/types/atlas-admin";

// Mock ExportControls
jest.mock("@/components/admin/shared/ExportControls", () => ({
  ExportControls: () => <div data-testid="export-controls">Export Controls</div>,
}));

describe("LayerControls", () => {
  const mockToggleCategoryFilter = jest.fn();
  const mockToggleAllCategories = jest.fn();
  const mockUpdateSetting = jest.fn();
  const mockToggleLayer = jest.fn();

  const defaultProps = {
    categoryFilters: new Map<string, CategoryFilter>([
      ["Joy", { name: "Joy", enabled: true, color: "yellow" }],
      ["Sadness", { name: "Sadness", enabled: false, color: "blue" }],
    ]),
    layers: {
      soulSphere: true,
      emotionPoints: true,
      emotionLabels: true,
      transitionPaths: false,
      waypoints: false,
      legend: true,
    } as LayerVisibility,
    settings: {
      computeMode: "cache-first",
      enableAnimations: true,
      pathAnimationMode: "classic",
    } as unknown as AtlasAdminSettings,
    allCategoriesEnabled: false,
    onToggleCategoryFilter: mockToggleCategoryFilter,
    onToggleAllCategories: mockToggleAllCategories,
    onUpdateSetting: mockUpdateSetting,
    onToggleLayer: mockToggleLayer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders visibility filters", () => {
    render(<LayerControls {...defaultProps} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  it("toggles category filters", async () => {
    render(<LayerControls {...defaultProps} />);
    const joyCheckbox = screen.getByLabelText("Joy");
    await userEvent.click(joyCheckbox);
    expect(mockToggleCategoryFilter).toHaveBeenCalledWith("Joy");
  });

  it("toggles all categories button", async () => {
    render(<LayerControls {...defaultProps} />);
    const toggleBtn = screen.getByText("Show All");
    await userEvent.click(toggleBtn);
    expect(mockToggleAllCategories).toHaveBeenCalled();
  });

  it("renders correct Show/Hide All text", () => {
    const { rerender } = render(<LayerControls {...defaultProps} allCategoriesEnabled={true} />);
    expect(screen.getByText("Hide All")).toBeInTheDocument();

    rerender(<LayerControls {...defaultProps} allCategoriesEnabled={false} />);
    expect(screen.getByText("Show All")).toBeInTheDocument();
  });

  it("toggles settings: Auto-compute paths (Disable)", async () => {
    render(<LayerControls {...defaultProps} />);
    const autoCompute = screen.getByLabelText("Auto-compute paths");

    expect(autoCompute).toBeChecked(); // default is cache-first
    await userEvent.click(autoCompute);
    expect(mockUpdateSetting).toHaveBeenCalledWith("computeMode", "manual");
  });

  it("toggles settings: Auto-compute paths (Enable)", async () => {
    // Start with manual
    const props = {
      ...defaultProps,
      settings: { ...defaultProps.settings, computeMode: "manual" } as unknown as AtlasAdminSettings
    };

    render(<LayerControls {...props} />);
    const autoCompute = screen.getByLabelText("Auto-compute paths");

    expect(autoCompute).not.toBeChecked();
    await userEvent.click(autoCompute);
    expect(mockUpdateSetting).toHaveBeenCalledWith("computeMode", "cache-first");
  });

  it("toggles settings: Enable animations", async () => {
    render(<LayerControls {...defaultProps} />);
    const anim = screen.getByLabelText("Enable animations");

    expect(anim).toBeChecked();
    await userEvent.click(anim);
    expect(mockUpdateSetting).toHaveBeenCalledWith("enableAnimations", false);
  });

  it("toggles specific layers", async () => {
    render(<LayerControls {...defaultProps} />);

    // Soul Sphere
    await userEvent.click(screen.getByLabelText("Soul Sphere"));
    expect(mockToggleLayer).toHaveBeenCalledWith("soulSphere");

    // Emotion Points
    await userEvent.click(screen.getByLabelText("Emotion Points"));
    expect(mockToggleLayer).toHaveBeenCalledWith("emotionPoints");

    // Labels
    await userEvent.click(screen.getByLabelText("Labels"));
    expect(mockToggleLayer).toHaveBeenCalledWith("emotionLabels");

    // Paths
    await userEvent.click(screen.getByLabelText("Paths"));
    expect(mockToggleLayer).toHaveBeenCalledWith("transitionPaths");

    // Waypoints
    await userEvent.click(screen.getByLabelText("Waypoints"));
    expect(mockToggleLayer).toHaveBeenCalledWith("waypoints");

    // Legend
    await userEvent.click(screen.getByLabelText("Legend"));
    expect(mockToggleLayer).toHaveBeenCalledWith("legend");
  });

  it("renders export controls", () => {
    render(<LayerControls {...defaultProps} />);
    expect(screen.getByTestId("export-controls")).toBeInTheDocument();
  });

  it("renders shortcuts", () => {
    render(<LayerControls {...defaultProps} />);
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });
});
