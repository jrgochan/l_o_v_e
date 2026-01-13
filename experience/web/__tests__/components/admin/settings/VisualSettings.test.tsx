
import { render, screen, fireEvent } from "@testing-library/react";
import { VisualSettings } from "@/components/admin/settings/VisualSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores/useSettingsStore");

describe("VisualSettings", () => {
  const mockUpdateVisualSetting = jest.fn();
  const defaultSettings = {
    pathAnimationMode: "subtle",
    colorScheme: "category",
    showMotionIndicators: true,
    showAxisLabels: true,
    enableAnimations: true,
    dataVisualizationMode: false,
    pathOpacity: 0.6,
    emotionSize: 1.0,
    updateVisualSetting: mockUpdateVisualSetting,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(defaultSettings);
  });

  it("renders all sections", () => {
    render(<VisualSettings />);
    expect(screen.getByText("Visual Mode")).toBeInTheDocument();
    expect(screen.getByText("Color Scheme")).toBeInTheDocument();
    expect(screen.getByText("Visual Options")).toBeInTheDocument();
    expect(screen.getByText("Display Sizes")).toBeInTheDocument();
  });

  it("handles mode selection", () => {
    render(<VisualSettings />);

    // Click "Dynamic - Living Energy"
    fireEvent.click(screen.getByText("Dynamic - Living Energy"));
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "dynamic");
  });

  it("handles color scheme selection", () => {
    render(<VisualSettings />);

    // Click "By Valence"
    fireEvent.click(screen.getByText("By Valence"));
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("colorScheme", "valence");
  });

  it("handles visual option toggles", () => {
    render(<VisualSettings />);

    // Motion Indicators: "Motion Indicators Off" / "Motion Indicators On"
    const motionToggle = screen.getByLabelText("Toggle between Motion Indicators Off and Motion Indicators On");
    fireEvent.click(motionToggle);
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("showMotionIndicators", false);

    // Axis Labels: "Axis Labels Off" / "Axis Labels On"
    const axisToggle = screen.getByLabelText("Toggle between Axis Labels Off and Axis Labels On");
    fireEvent.click(axisToggle);
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("showAxisLabels", false);

    // Animations: "Animations Off" / "Animations On"
    const animToggle = screen.getByLabelText("Toggle between Animations Off and Animations On");
    fireEvent.click(animToggle);
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("enableAnimations", false);

    // Data Viz: "Normal View" / "Data Viz Mode"
    const dataToggle = screen.getByLabelText("Toggle between Normal View and Data Viz Mode");
    fireEvent.click(dataToggle);
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("dataVisualizationMode", true);
  });

  it("handles sliders", () => {
    render(<VisualSettings />);

    // Path Opacity range input
    // The label is "Path Opacity" but it wraps a span with percentage.
    // The input is a sibling or inside. 
    // Usually getByLabelText works if there's a label for id or wrapping.
    // In VisualSettings.tsx: 
    // <label ...><span>Path Opacity</span>... </label> <input ... />
    // It is NOT wrapping the input. The input is a sibling to the label? No, code says:
    // <div> <label ...>...</label> <input ... /> </div>
    // The label does NOT have htmlFor. So getByLabelText won't work unless I add aria-label or use test-id.
    // Looking at code:
    // <input ... className="..." />
    // No aria-label.
    // I need to use getByRole("slider") but there are two.

    const sliders = screen.getAllByRole("slider");
    // 0: Path Opacity
    // 1: Emotion Size

    fireEvent.change(sliders[0], { target: { value: "0.8" } });
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathOpacity", 0.8);

    fireEvent.change(sliders[1], { target: { value: "1.5" } });
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("emotionSize", 1.5);
  });
});
