import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BehaviorSettings } from "@/components/admin/settings/BehaviorSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock the dependencies
jest.mock("@/stores/useSettingsStore");

describe("BehaviorSettings", () => {
  const mockUpdateBehaviorSetting = jest.fn();
  const mockUpdateLayer = jest.fn();

  const defaultSettings = {
    computeMode: "cache-first",
    showAllPaths: true,
    focusMode: false,
    layers: {
      soulSphere: true,
      emotionPoints: true,
      emotionLabels: true,
      transitionPaths: true,
      waypoints: true,
      bridgeHighlight: true,
      legend: false,
    },
    updateBehaviorSetting: mockUpdateBehaviorSetting,
    updateLayer: mockUpdateLayer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(defaultSettings);
  });

  it("renders all sections correctly", () => {
    render(<BehaviorSettings />);

    expect(screen.getByText("Path Computation Mode")).toBeInTheDocument();
    expect(screen.getByText("Focus & Visibility")).toBeInTheDocument();
    expect(screen.getByText("Layer Visibility")).toBeInTheDocument();
  });

  it("handles path computation mode selection", () => {
    render(<BehaviorSettings />);

    // Check initial state (cache-first is default in our mock)
    // The active button has a specific class or we can just click another one.

    // Click "Manual Only"
    fireEvent.click(screen.getByText("🔴 Manual Only"));
    expect(mockUpdateBehaviorSetting).toHaveBeenCalledWith("computeMode", "manual");

    // Click "Always Compute"
    fireEvent.click(screen.getByText("🟢 Always Compute"));
    expect(mockUpdateBehaviorSetting).toHaveBeenCalledWith("computeMode", "always");
  });

  it("handles show all paths toggle", () => {
    render(<BehaviorSettings />);

    // Toggle constructs aria-label from both labels
    const toggle = screen.getByLabelText("Toggle between Selected Pairs Only and Show All Paths");
    fireEvent.click(toggle);

    expect(mockUpdateBehaviorSetting).toHaveBeenCalledWith("showAllPaths", false);
  });

  it("handles focus mode toggle", () => {
    render(<BehaviorSettings />);

    const toggle = screen.getByLabelText("Toggle between Show All and Focus Mode");
    fireEvent.click(toggle);

    expect(mockUpdateBehaviorSetting).toHaveBeenCalledWith("focusMode", true);
  });

  it("handles layer visibility toggles", () => {
    render(<BehaviorSettings />);

    // Test Soul Sphere toggle (Hidden / Soul Sphere)
    const soulSphereToggle = screen.getByLabelText("Toggle between Hidden and Soul Sphere");
    fireEvent.click(soulSphereToggle);
    expect(mockUpdateLayer).toHaveBeenCalledWith("soulSphere", false);

    // Test Legend toggle (Hidden / Legend)
    const legendToggle = screen.getByLabelText("Toggle between Hidden and Legend");
    fireEvent.click(legendToggle);
    expect(mockUpdateLayer).toHaveBeenCalledWith("legend", true);
  });

  it("highlights active compute mode", () => {
    render(<BehaviorSettings />);

    // "Cache First" is active
    const cacheFirstBtn = screen.getByText("🟡 Cache First").closest("button");
    expect(cacheFirstBtn).toHaveClass("border-cyan-500");

    const manualBtn = screen.getByText("🔴 Manual Only").closest("button");
    expect(manualBtn).toHaveClass("border-gray-700");
  });
});
