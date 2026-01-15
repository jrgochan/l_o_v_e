import { render, screen, fireEvent } from "@testing-library/react";
import { LayerControls } from "@/components/admin/panels/ControlPanel/LayerControls";
import { ExportControls } from "@/components/admin/shared/ExportControls";

// Mock ExportControls
jest.mock("@/components/admin/shared/ExportControls", () => ({
  ExportControls: () => <div data-testid="export-controls">Export Controls</div>,
}));

describe("LayerControls", () => {
  const mockCategoryFilters = new Map([
    ["joy", { name: "Joy", enabled: true, color: "#FFFF00", emotionCount: 10 }],
    ["sadness", { name: "Sadness", enabled: false, color: "#0000FF", emotionCount: 5 }],
  ]);

  const mockLayers = {
    soulSphere: true,
    emotionPoints: true,
    emotionLabels: true,
    transitionPaths: false,
    waypoints: false,
    legend: true,
    bridgeHighlight: false,
    cinematicOverlay: false,
    viewerShortcuts: true,
    vacDisplay: false,
  };

  const mockSettings = {
    computeMode: "manual",
    enableAnimations: true,
    // ... other settings
  } as any;

  const onToggleCategoryFilter = jest.fn();
  const onToggleAllCategories = jest.fn();
  const onUpdateSetting = jest.fn();
  const onToggleLayer = jest.fn();

  const defaultProps = {
    categoryFilters: mockCategoryFilters,
    layers: mockLayers,
    settings: mockSettings,
    allCategoriesEnabled: false,
    onToggleCategoryFilter,
    onToggleAllCategories,
    onUpdateSetting,
    onToggleLayer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders category filters", () => {
    render(<LayerControls {...defaultProps} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();

    // Assert checked state based on filter
    // We look for checkboxes associated with labels
    // Joy is enabled
    const joyCheckbox = screen.getByLabelText("Joy");
    expect(joyCheckbox).toBeChecked();

    // Sadness is disabled
    const sadnessCheckbox = screen.getByLabelText("Sadness");
    expect(sadnessCheckbox).not.toBeChecked();
  });

  it("toggles category filter", () => {
    render(<LayerControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Joy"));
    expect(onToggleCategoryFilter).toHaveBeenCalledWith("Joy");
  });

  it("toggles all categories", () => {
    render(<LayerControls {...defaultProps} />);
    fireEvent.click(screen.getByText("Show All"));
    expect(onToggleAllCategories).toHaveBeenCalled();
  });

  it("renders settings controls", () => {
    render(<LayerControls {...defaultProps} />);

    // Auto-compute settings
    const autoCompute = screen.getByLabelText("Auto-compute paths");
    expect(autoCompute).not.toBeChecked(); // manual mode

    // Animations
    const animations = screen.getByLabelText("Enable animations");
    expect(animations).toBeChecked();
  });

  it("toggles settings", () => {
    render(<LayerControls {...defaultProps} />);

    // Toggle auto-compute
    fireEvent.click(screen.getByLabelText("Auto-compute paths"));
    expect(onUpdateSetting).toHaveBeenCalledWith("computeMode", "cache-first");

    // Toggle animations
    fireEvent.click(screen.getByLabelText("Enable animations"));
    expect(onUpdateSetting).toHaveBeenCalledWith("enableAnimations", false); // toggle from true
  });

  it("handles auto-compute toggle off (negative branch)", () => {
    const props = {
      ...defaultProps,
      settings: { ...mockSettings, computeMode: "cache-first" },
    };
    render(<LayerControls {...props} />);

    // Toggle auto-compute (checked -> unchecked)
    const autoCompute = screen.getByLabelText("Auto-compute paths");
    expect(autoCompute).toBeChecked();

    fireEvent.click(autoCompute);
    expect(onUpdateSetting).toHaveBeenCalledWith("computeMode", "manual");
  });

  it("renders layer toggles", () => {
    render(<LayerControls {...defaultProps} />);
    expect(screen.getByLabelText("Soul Sphere")).toBeChecked();
    expect(screen.getByLabelText("Paths")).not.toBeChecked();
  });

  it("toggles all layer types", () => {
    render(<LayerControls {...defaultProps} />);

    const layers = [
      { label: "Soul Sphere", key: "soulSphere" },
      { label: "Emotion Points", key: "emotionPoints" },
      { label: "Labels", key: "emotionLabels" },
      { label: "Paths", key: "transitionPaths" },
      { label: "Waypoints", key: "waypoints" },
      { label: "Legend", key: "legend" },
    ];

    layers.forEach(({ label, key }) => {
      fireEvent.click(screen.getByLabelText(label));
      expect(onToggleLayer).toHaveBeenCalledWith(key);
    });
  });

  it("renders Hide All button when all categories enabled", () => {
    render(<LayerControls {...defaultProps} allCategoriesEnabled={true} />);
    expect(screen.getByText("Hide All")).toBeInTheDocument();
  });
});
