import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Settings } from "@/components/Settings";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock dependencies
jest.mock("@/stores/useSettingsStore");

// Mock URL for export
global.URL.createObjectURL = jest.fn(() => "blob:test");
global.URL.revokeObjectURL = jest.fn();
global.confirm = jest.fn(() => true);

describe("Settings Component", () => {
  const mockExportSettings = jest.fn();
  const mockImportSettings = jest.fn();
  const mockTestConnection = jest.fn();
  const mockSetApiUrl = jest.fn();
  const mockUpdateLayer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      exportSettings: mockExportSettings,
      importSettings: mockImportSettings,
      testConnection: mockTestConnection,
      setApiUrl: mockSetApiUrl,
      updateLayer: mockUpdateLayer,
      layers: { cinematicOverlay: false },
      observerApiUrl: "http://localhost:8000",
      animationSpeed: 1.0,
      showDebugInfo: false,
      setAnimationSpeed: jest.fn(),
      toggleDebugInfo: jest.fn(),
      resetToDefaults: jest.fn(),
      clearAllData: jest.fn()
    });
  });

  it("should toggle modal visibility", () => {
    render(<Settings />);
    fireEvent.click(screen.getByLabelText("Open Settings"));
    expect(screen.getByText("⚙️ Settings")).toBeInTheDocument();
  });

  it("should switch tabs", () => {
    render(<Settings />);
    fireEvent.click(screen.getByLabelText("Open Settings"));

    expect(screen.getByText("API Configuration")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Visual/));
    expect(screen.getByText("Visualization Options")).toBeInTheDocument();
  });

  it("should handle API connection test", async () => {
    mockTestConnection.mockResolvedValue({
      observer: { connected: true },
      listener: { connected: false },
      versor: { connected: false }
    });

    render(<Settings />);
    fireEvent.click(screen.getByLabelText("Open Settings"));

    const testBtns = screen.getAllByText("Test");
    fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("🟢 Connected")).toBeInTheDocument();
    });
  });

  it("should update animation speed", () => {
    const mockSetSpeed = jest.fn();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...useSettingsStore(),
      setAnimationSpeed: mockSetSpeed
    });

    render(<Settings />);
    fireEvent.click(screen.getByLabelText("Open Settings"));
    fireEvent.click(screen.getByText(/Visual/));

    // Select logic: Looking for range inputs
    // There are 2 range inputs on this page: animation speed, sphere opacity
    // Animation speed is the first one based on component source order
    const sliders = screen.getAllByRole("slider");
    const animationSpeedSlider = sliders[0];

    fireEvent.change(animationSpeedSlider, { target: { value: "1.5" } });
    expect(mockSetSpeed).toHaveBeenCalledWith(1.5);
  });
});
