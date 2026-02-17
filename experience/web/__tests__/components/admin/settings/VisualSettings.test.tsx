import { render, screen, fireEvent } from "@testing-library/react";
import { VisualSettings } from "@/components/admin/settings/VisualSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores/useSettingsStore");

describe("VisualSettings", () => {
  /*
   * Factory to create a fresh mock store state for each test,
   * allowing us to override specific properties to test conditional rendering.
   */
  const createMockStore = (overrides = {}) => {
    const defaultSettings = {
      pathAnimationMode: "subtle",
      colorScheme: "category",
      showMotionIndicators: true,
      showAxisLabels: true,
      enableAnimations: true,
      dataVisualizationMode: false,
      pathOpacity: 0.6,
      emotionSize: 1.0,
      animationSpeed: 1.0,
      sphereOpacity: 0.8,
      renderQuality: "high",
      autoRotate: true,
      updateVisualSetting: jest.fn(),
      setSphereOpacity: jest.fn(),
      setAnimationSpeed: jest.fn(),
      setRenderQuality: jest.fn(),
      toggleAutoRotate: jest.fn(),
    };
    return { ...defaultSettings, ...overrides };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(createMockStore());
  });

  it("renders all sections", () => {
    render(<VisualSettings />);
    expect(screen.getByText("Visual Mode")).toBeInTheDocument();
    expect(screen.getByText("Color Scheme")).toBeInTheDocument();
  });

  it("handles mode selection interaction", () => {
    const mockUpdate = jest.fn();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ updateVisualSetting: mockUpdate })
    );
    render(<VisualSettings />);

    fireEvent.click(screen.getByText("Dynamic - Living Energy"));
    expect(mockUpdate).toHaveBeenCalledWith("pathAnimationMode", "dynamic");
  });

  it("renders active state for selected mode", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ pathAnimationMode: "dynamic" })
    );
    render(<VisualSettings />);

    // Check for unique active class or indicator
    // The active button has "bg-cyan-900/30"
    // We can find the button by text and check class, or look for the checkmark
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("handles color scheme selection interaction", () => {
    const mockUpdate = jest.fn();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ updateVisualSetting: mockUpdate })
    );
    render(<VisualSettings />);

    fireEvent.click(screen.getByText("By Valence"));
    expect(mockUpdate).toHaveBeenCalledWith("colorScheme", "valence");
  });

  it("renders active state for selected color scheme", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ colorScheme: "valence" })
    );
    render(<VisualSettings />);

    // Valence button should have active class
    const button = screen.getByText("By Valence").closest("button");
    expect(button?.className).toContain("bg-cyan-900/30");
  });

  it("handles all visual option toggles individually", () => {
    const mockUpdate = jest.fn();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ updateVisualSetting: mockUpdate })
    );
    render(<VisualSettings />);

    // Motion Indicators
    const motionToggle = screen.getByLabelText(/motion indicators/i);
    fireEvent.click(motionToggle);
    expect(mockUpdate).toHaveBeenCalledWith("showMotionIndicators", false);

    // Axis Labels
    const axisToggle = screen.getByLabelText(/axis labels/i);
    fireEvent.click(axisToggle);
    expect(mockUpdate).toHaveBeenCalledWith("showAxisLabels", false);

    // Animations
    const animToggle = screen.getByLabelText(/animations/i);
    fireEvent.click(animToggle);
    expect(mockUpdate).toHaveBeenCalledWith("enableAnimations", false);

    // Data Viz Mode
    const dataToggle = screen.getByLabelText(/normal view/i);
    fireEvent.click(dataToggle);
    expect(mockUpdate).toHaveBeenCalledWith("dataVisualizationMode", true);
  });

  it("handles all sliders individually", () => {
    const mockUpdate = jest.fn();
    const mockSetSphereOpacity = jest.fn();
    const mockSetAnimationSpeed = jest.fn();

    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({
        updateVisualSetting: mockUpdate,
        setSphereOpacity: mockSetSphereOpacity,
        setAnimationSpeed: mockSetAnimationSpeed,
      })
    );
    render(<VisualSettings />);

    const sliders = screen.getAllByRole("slider");
    // 0: Path Opacity
    // 1: Emotion Size
    // 2: Sphere Transparency
    // 3: Animation Speed

    // Path Opacity
    fireEvent.change(sliders[0], { target: { value: "0.8" } });
    expect(mockUpdate).toHaveBeenCalledWith("pathOpacity", 0.8);

    // Emotion Size
    fireEvent.change(sliders[1], { target: { value: "1.5" } });
    expect(mockUpdate).toHaveBeenCalledWith("emotionSize", 1.5);

    // Sphere Transparency (inverted)
    fireEvent.change(sliders[2], { target: { value: "0.4" } });
    expect(mockSetSphereOpacity).toHaveBeenCalledWith(0.6); // 1 - 0.4

    // Animation Speed
    fireEvent.change(sliders[3], { target: { value: "2.5" } });
    expect(mockSetAnimationSpeed).toHaveBeenCalledWith(2.5);
  });

  it("handles render quality selection", () => {
    const mockSetRenderQuality = jest.fn();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ setRenderQuality: mockSetRenderQuality })
    );
    render(<VisualSettings />);

    fireEvent.click(screen.getByText("low"));
    expect(mockSetRenderQuality).toHaveBeenCalledWith("low");

    fireEvent.click(screen.getByText("medium"));
    expect(mockSetRenderQuality).toHaveBeenCalledWith("medium");

    fireEvent.click(screen.getByText("high"));
    expect(mockSetRenderQuality).toHaveBeenCalledWith("high");
  });

  it("handles auto-rotate toggle", () => {
    const mockToggleAutoRotate = jest.fn();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ toggleAutoRotate: mockToggleAutoRotate })
    );
    render(<VisualSettings />);

    const autoRotateToggle = screen.getByLabelText(/auto-rotate/i);
    fireEvent.click(autoRotateToggle);
    expect(mockToggleAutoRotate).toHaveBeenCalled();
  });

  it("renders active state for render quality", () => {
    // Test "high" (default)
    const { unmount } = render(<VisualSettings />);
    let highButton = screen.getByText("high").closest("button");
    expect(highButton?.className).toContain("bg-purple-900/40");
    unmount();

    // Test "low"
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(
      createMockStore({ renderQuality: "low" })
    );
    render(<VisualSettings />);
    const lowButton = screen.getByText("low").closest("button");
    expect(lowButton?.className).toContain("bg-purple-900/40");

    // High should now be inactive
    highButton = screen.getByText("high").closest("button");
    expect(highButton?.className).not.toContain("bg-purple-900/40");
  });
});
