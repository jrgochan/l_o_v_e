import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "@/components/input/Settings";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock the store
jest.mock("@/stores/useSettingsStore");

// Mock dependencies
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div>{children}</div>,
  useThree: () => ({ camera: { position: { x: 0, y: 0, z: 0 } } }),
  useFrame: () => {},
}));

jest.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Stats: () => null,
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();
// Mock alert and confirm
global.alert = jest.fn();
global.confirm = jest.fn();

describe("Settings Component", () => {
  const mockStore = {
    pollingEnabled: false,
    pollingInterval: 3000,
    userId: "web-user",
    setPollingEnabled: jest.fn(),
    setPollingInterval: jest.fn(),
    setUserId: jest.fn(),
    // Correct nested structure for API URLs
    network: {
      endpoints: {
        observer: "http://localhost:8000",
        listener: "http://localhost:8001",
        versor: "http://localhost:8002",
      },
    },
    layers: {
      cinematicOverlay: false,
      viewerShortcuts: false,
      vacDisplay: false,
    },
    showTransitionPath: false,
    autoRotate: false,
    showDebugInfo: false,
    animationSpeed: 1,
    renderQuality: "medium",
    sphereOpacity: 0.3,
    updateLayer: jest.fn(),
    setAnimationSpeed: jest.fn(),
    setRenderQuality: jest.fn(),
    setSphereOpacity: jest.fn(),
    toggleAutoRotate: jest.fn(),
    toggleDebugInfo: jest.fn(),
    setShowTransitionPath: jest.fn(),
    exportSettings: jest.fn(),
    importSettings: jest.fn(),
    resetToDefaults: jest.fn(),
    clearAllData: jest.fn(),
    reducedMotion: false,
    highContrast: false,
    screenReaderMode: false,
    setReducedMotion: jest.fn(),
    setHighContrast: jest.fn(),
    toggleScreenReaderMode: jest.fn(),
    testConnection: jest.fn(),
    setApiUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  const openSettings = async (user: any) => {
    render(<Settings />);
    await user.click(screen.getByText("⚙️"));
    await screen.findByTestId("tab-api", {}, { timeout: 3000 });
  };

  it("should open settings modal when gear icon is clicked", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should handle polling tab interactions", async () => {
    const user = userEvent.setup();
    await openSettings(user);

    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]); // Polling

    await screen.findByTestId("panel-polling", {}, { timeout: 3000 });

    const userIdInput = await screen.findByTestId("input-userid", {}, { timeout: 3000 });

    // Toggle Polling
    const enablePollingBtn = screen.getByTestId("btn-polling-toggle");
    await user.click(enablePollingBtn);
    expect(mockStore.setPollingEnabled).toHaveBeenCalledWith(true);

    // Interval slider
    const slider = screen.getByTestId("slider-polling-interval");
    fireEvent.change(slider, { target: { value: "5000" } });
    expect(mockStore.setPollingInterval).toHaveBeenCalledWith(5000);

    // User ID
    fireEvent.change(userIdInput, { target: { value: "new-user" } });
    expect(mockStore.setUserId).toHaveBeenCalledWith("new-user");
  });

  it("should handle visualization tab interactions", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[2]); // Visual

    await screen.findByTestId("panel-visual", {}, { timeout: 3000 });

    // Cinematic Overlay Toggle
    const cinematicBtn = screen.getByTestId("btn-toggle-cinematic");
    await user.click(cinematicBtn);
    expect(mockStore.updateLayer).toHaveBeenCalledWith("cinematicOverlay", true);

    // Animation Speed
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "1.5" } });
    expect(mockStore.setAnimationSpeed).toHaveBeenCalledWith(1.5);

    // Render Quality
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "high");
    expect(mockStore.setRenderQuality).toHaveBeenCalledWith("high");

    // Sphere Opacity
    fireEvent.change(sliders[1], { target: { value: "0.5" } });
    expect(mockStore.setSphereOpacity).toHaveBeenCalledWith(0.5);
  });

  it("should handle accessibility tab interactions", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[3]); // Access

    await screen.findByTestId("panel-access", {}, { timeout: 3000 });

    // Reduced Motion
    const reducedMotionBtn = screen.getByTestId("btn-toggle-reduced-motion");
    await user.click(reducedMotionBtn);
    expect(mockStore.setReducedMotion).toHaveBeenCalledWith(true);

    // High Contrast
    const highContrastBtn = screen.getByTestId("btn-toggle-high-contrast");
    await user.click(highContrastBtn);
    expect(mockStore.setHighContrast).toHaveBeenCalledWith(true);

    // Screen Reader
    const srBtn = screen.getByTestId("btn-toggle-screen-reader");
    await user.click(srBtn);
    expect(mockStore.toggleScreenReaderMode).toHaveBeenCalled();
  });

  it("should handle data tab interactions", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[4]); // Data

    await screen.findByTestId("panel-data", {}, { timeout: 3000 });

    // Export
    const exportBtn = screen.getByTestId("btn-export");
    await user.click(exportBtn);
    expect(mockStore.exportSettings).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Reset
    const resetBtn = screen.getByTestId("btn-reset");
    await user.click(resetBtn);
    expect(global.confirm).toHaveBeenCalled();
    expect(mockStore.resetToDefaults).toHaveBeenCalled();

    // Clear
    const clearBtn = screen.getByTestId("btn-clear");
    await user.click(clearBtn);
    expect(global.confirm).toHaveBeenCalled();
    expect(mockStore.clearAllData).toHaveBeenCalled();
  });

  it("should handle API tab interactions", async () => {
    mockStore.testConnection.mockResolvedValue({
      observer: { connected: true },
      listener: { connected: false },
      versor: { connected: false },
    });

    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[0]); // API (default, but precise click)

    await screen.findByTestId("panel-api", {}, { timeout: 3000 });

    // Input Change
    const input = screen.getByDisplayValue("http://localhost:8000");
    fireEvent.change(input, { target: { value: "http://api.test" } });
    expect(mockStore.setApiUrl).toHaveBeenCalledWith("observer", "http://api.test");

    // Test Connection
    const testBtn = screen.getByTestId("btn-test-observer");
    await user.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should handle import file selection", async () => {
    mockStore.importSettings.mockReturnValue(true);
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[4]); // Data

    await screen.findByTestId("panel-data", {}, { timeout: 3000 });

    const file = new File(['{"test":true}'], "settings.json", { type: "application/json" });

    const inputMock = { type: "", accept: "", onchange: null as any, click: jest.fn() };
    // @ts-ignore
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "input") return inputMock as any;
      return originalCreateElement(tagName);
    });

    try {
      const importBtn = screen.getByTestId("btn-import");
      await user.click(importBtn);

      expect(inputMock.click).toHaveBeenCalled();

      const event = { target: { files: [file] } };
      await act(async () => {
        inputMock.onchange(event);
      });

      await waitFor(() => {
        expect(mockStore.importSettings).toHaveBeenCalledWith('{"test":true}');
        expect(global.alert).toHaveBeenCalledWith("Settings imported successfully!");
      });
    } finally {
      createElementSpy.mockRestore();
    }
  });

  it("should reflect visual toggle states", async () => {
    const toggles = [
      { id: "btn-toggle-cinematic", key: "cinematicOverlay", isLayer: true },
      { id: "btn-toggle-shortcuts", key: "viewerShortcuts", isLayer: true },
      { id: "btn-toggle-vac", key: "vacDisplay", isLayer: true },
      { id: "btn-toggle-paths", key: "showTransitionPath", isLayer: false },
      { id: "btn-toggle-rotate", key: "autoRotate", isLayer: false },
      { id: "btn-toggle-debug", key: "showDebugInfo", isLayer: false },
    ];

    // 1. Initial State (All Off)
    {
      const user = userEvent.setup();
      const { unmount } = render(<Settings />);
      await user.click(screen.getByText("⚙️"));
      await screen.findByTestId("tab-api", {}, { timeout: 3000 });

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[2]); // Visual

      await screen.findByTestId("panel-visual", {}, { timeout: 3000 });

      for (const { id, key, isLayer } of toggles) {
        const toggle = screen.getByTestId(id);
        expect(toggle).toHaveClass("bg-gray-700");
        await user.click(toggle);

        if (isLayer) {
           expect(mockStore.updateLayer).toHaveBeenCalledWith(key, true);
        } else {
          if (key === "showTransitionPath") expect(mockStore.setShowTransitionPath).toHaveBeenCalledWith(true);
          if (key === "autoRotate") expect(mockStore.toggleAutoRotate).toHaveBeenCalled();
          if (key === "showDebugInfo") expect(mockStore.toggleDebugInfo).toHaveBeenCalled();
        }
      }
      unmount();
    }

    // 2. Enable State (All On)
    {
      const newStore = { ...mockStore };
      // @ts-ignore
      newStore.layers = {
        cinematicOverlay: true,
        viewerShortcuts: true,
        vacDisplay: true,
      };
      // @ts-ignore
      newStore.showTransitionPath = true;
      // @ts-ignore
      newStore.autoRotate = true;
      // @ts-ignore
      newStore.showDebugInfo = true;

      (useSettingsStore as unknown as jest.Mock).mockReturnValue(newStore);

      const user = userEvent.setup();
      const { unmount } = render(<Settings />);
      await user.click(screen.getByText("⚙️"));
      await screen.findByTestId("tab-api", {}, { timeout: 3000 });

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[2]); // Visual

      await screen.findByTestId("panel-visual", {}, { timeout: 3000 });

      for (const { id } of toggles) {
        const toggle = screen.getByTestId(id);
        expect(toggle).toHaveClass("bg-cyan-600");
      }
      unmount();
    }
  });

  it("should reflect connection failure states", async () => {
    mockStore.testConnection.mockResolvedValue({
      observer: { connected: false },
      listener: { connected: false },
      versor: { connected: false },
    });

    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[0]); // API

    await screen.findByTestId("panel-api", {}, { timeout: 3000 });

    const testBtn = screen.getByTestId("btn-test-observer");
    await user.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });
  });

  it("should show About tab details", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[5]); // About

    await screen.findByTestId("panel-about", {}, { timeout: 3000 });
    expect(screen.getByText("1.0.0-alpha")).toBeInTheDocument();
  });

  it("should handle failed import", async () => {
    mockStore.importSettings.mockReturnValue(false);
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[4]); // Data

    await screen.findByTestId("panel-data", {}, { timeout: 3000 });

    const file = new File(["invalid"], "settings.json", { type: "application/json" });
    const inputMock = { type: "", accept: "", onchange: null as any, click: jest.fn() };

    // @ts-ignore
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "input") return inputMock as any;
      return originalCreateElement(tagName);
    });

    try {
      const importBtn = screen.getByTestId("btn-import");
      await user.click(importBtn);

      const event = { target: { files: [file] } };
      await act(async () => {
        inputMock.onchange(event);
      });

      await waitFor(() => {
        expect(mockStore.importSettings).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith(
          "Failed to import settings. Please check the file format."
        );
      });
    } finally {
      createElementSpy.mockRestore();
    }
  });

  it("should handle confirm cancellation", async () => {
    (global.confirm as jest.Mock).mockReturnValue(false);
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[4]); // Data

    await screen.findByTestId("panel-data", {}, { timeout: 3000 });

    const resetBtn = screen.getByTestId("btn-reset");
    await user.click(resetBtn);
    expect(mockStore.resetToDefaults).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("btn-clear"));
    expect(mockStore.clearAllData).not.toHaveBeenCalled();

    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it("should show correct connection status in API tab", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[0]); // API

    await screen.findByTestId("panel-api", {}, { timeout: 3000 });
    expect(screen.getAllByText("Unknown")).toHaveLength(3);

    mockStore.testConnection.mockResolvedValue({
      observer: { connected: true },
      listener: { connected: false },
      versor: { connected: false },
    });

    const testBtn = screen.getByTestId("btn-test-observer");
    await user.click(testBtn);
    await waitFor(() => expect(screen.getByText("Connected")).toBeInTheDocument());

    expect(screen.getAllByText("Unknown")).toHaveLength(2);

    const testBtnListener = screen.getByTestId("btn-test-listener");
    await user.click(testBtnListener);

    await waitFor(() => expect(screen.getByText("Disconnected")).toBeInTheDocument());
  });

  it("should handle import cancellation (no file selected)", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[4]); // Data

    await screen.findByTestId("panel-data", {}, { timeout: 3000 });

    const inputMock = { type: "", accept: "", onchange: null as any, click: jest.fn() };
    // @ts-ignore
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "input") return inputMock as any;
      return originalCreateElement(tagName);
    });

    try {
      const importBtn = screen.getByTestId("btn-import");
      await user.click(importBtn);

      const event = { target: { files: [] } };
      await act(async () => {
        inputMock.onchange(event);
      });

      expect(mockStore.importSettings).not.toHaveBeenCalled();
    } finally {
      createElementSpy.mockRestore();
    }
  });
});
