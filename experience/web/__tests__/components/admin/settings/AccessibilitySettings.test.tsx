import { render, screen, fireEvent } from "@testing-library/react";
import { AccessibilitySettings } from "@/components/admin/settings/AccessibilitySettings";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores/useSettingsStore");

describe("AccessibilitySettings", () => {
  const mockUpdateAccessibilitySetting = jest.fn();
  const defaultSettings = {
    reducedMotion: false,
    highContrast: false,
    fontSize: "medium",
    screenReaderMode: false,
    updateAccessibilitySetting: mockUpdateAccessibilitySetting,
    updateVisualSetting: jest.fn(), // If used?
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(defaultSettings);
  });

  it("renders all options", () => {
    render(<AccessibilitySettings />);
    expect(screen.getByText("Reduced Motion")).toBeInTheDocument();
    expect(screen.getByText("High Contrast")).toBeInTheDocument();
    expect(screen.getByText("Screen Reader")).toBeInTheDocument();
    expect(screen.getByText("Font Size")).toBeInTheDocument();
  });

  it("handles reduced motion toggle", () => {
    render(<AccessibilitySettings />);
    // Left: "Full Motion", Right: "Reduced Motion"
    const toggle = screen.getByLabelText("Toggle between Full Motion and Reduced Motion");
    fireEvent.click(toggle);
    expect(mockUpdateAccessibilitySetting).toHaveBeenCalledWith("reducedMotion", true);
  });

  it("handles high contrast toggle", () => {
    render(<AccessibilitySettings />);
    // Left: "Normal Contrast", Right: "High Contrast"
    const toggle = screen.getByLabelText("Toggle between Normal Contrast and High Contrast");
    fireEvent.click(toggle);
    expect(mockUpdateAccessibilitySetting).toHaveBeenCalledWith("highContrast", true);
  });

  it("handles font size selection", () => {
    render(<AccessibilitySettings />);

    // Buttons for "Small", "Medium", "Large"
    fireEvent.click(screen.getByText("Small"));
    expect(mockUpdateAccessibilitySetting).toHaveBeenCalledWith("fontSize", "small");

    fireEvent.click(screen.getByText("Large"));
    expect(mockUpdateAccessibilitySetting).toHaveBeenCalledWith("fontSize", "large");
  });
});
