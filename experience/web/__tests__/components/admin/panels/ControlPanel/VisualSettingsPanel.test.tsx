import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { VisualSettingsPanel } from "@/components/admin/panels/ControlPanel/VisualSettingsPanel";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock Store
jest.mock("@/stores/useSettingsStore");

afterEach(cleanup);

describe("VisualSettingsPanel", () => {
  let mockSetSphereOpacity: jest.Mock;
  let mockSetAnimationSpeed: jest.Mock;
  let mockSetRenderQuality: jest.Mock;
  let mockToggleAutoRotate: jest.Mock;

  beforeEach(() => {
    mockSetSphereOpacity = jest.fn();
    mockSetAnimationSpeed = jest.fn();
    mockSetRenderQuality = jest.fn();
    mockToggleAutoRotate = jest.fn();

    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      sphereOpacity: 0.8,
      animationSpeed: 1.0,
      renderQuality: "medium",
      autoRotate: false,
      setSphereOpacity: mockSetSphereOpacity,
      setAnimationSpeed: mockSetAnimationSpeed,
      setRenderQuality: mockSetRenderQuality,
      toggleAutoRotate: mockToggleAutoRotate,
    });
  });

  it("renders all controls", () => {
    render(<VisualSettingsPanel />);

    expect(screen.getByText("🎛️ Soul Sphere DJ")).toBeInTheDocument();
    expect(screen.getByText("Transparency")).toBeInTheDocument();
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("Auto-Rotate")).toBeInTheDocument();
  });

  it("updates transparency", () => {
    render(<VisualSettingsPanel />);
    // The inputs don't have explicit labels, so we rely on role and order
    const inputs = screen.getAllByRole("slider");
    const transparencySlider = inputs[0]; // First slider is transparency

    fireEvent.change(transparencySlider, { target: { value: "0.5" } });
    // Component logic: value={1 - settings.sphereOpacity}
    // onChange: settings.setSphereOpacity(1 - parseFloat(e.target.value))
    // value 0.5 -> 1 - 0.5 = 0.5
    expect(mockSetSphereOpacity).toHaveBeenCalledWith(0.5);
  });

  it("updates animation speed", () => {
    render(<VisualSettingsPanel />);
    const inputs = screen.getAllByRole("slider");
    const speedSlider = inputs[1]; // Assuming order

    fireEvent.change(speedSlider, { target: { value: "2.0" } });
    expect(mockSetAnimationSpeed).toHaveBeenCalledWith(2.0);
  });

  it("updates render quality", () => {
    render(<VisualSettingsPanel />);

    const highBtn = screen.getByText("high");
    fireEvent.click(highBtn);
    expect(mockSetRenderQuality).toHaveBeenCalledWith("high");
  });

  it("toggles auto-rotate", () => {
    render(<VisualSettingsPanel />);

    const toggleBtn = screen.getByText("Auto-Rotate").closest("button")!;
    fireEvent.click(toggleBtn);
    expect(mockToggleAutoRotate).toHaveBeenCalled();
  });

  it("displays correct values", () => {
    // sphereOpacity 0.8 -> 1 - 0.8 = 0.2 -> 20%
    // Speed 1.0x
    render(<VisualSettingsPanel />);
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("1.0x")).toBeInTheDocument();
  });

  it("renders active auto-rotate state", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      sphereOpacity: 0.8,
      animationSpeed: 1.0,
      renderQuality: "medium",
      autoRotate: true, // Set to true
      setSphereOpacity: mockSetSphereOpacity,
      setAnimationSpeed: mockSetAnimationSpeed,
      setRenderQuality: mockSetRenderQuality,
      toggleAutoRotate: mockToggleAutoRotate,
    });

    render(<VisualSettingsPanel />);
    const toggleBtn = screen.getByText("Auto-Rotate").closest("button")!;
    // Check for active classes
    expect(toggleBtn).toHaveClass("bg-purple-900/30");
  });
});
