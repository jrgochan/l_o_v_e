import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings, ConceptTooltip, EmotionalControls, EmotionalInput } from "@/components/input";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

// Mock the stores
jest.mock("@/stores/useSettingsStore");
jest.mock("@/stores/useVisualizationStore");

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
  const mockSettingsStore = {
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

  const mockVisualizationStore = {
    collections: [],
    activeCollectionId: null,
    setActiveCollection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockSettingsStore);
    (useVisualizationStore as unknown as jest.Mock).mockReturnValue(mockVisualizationStore);
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
    expect(mockSettingsStore.setPollingEnabled).toHaveBeenCalledWith(true);

    // Interval slider
    const slider = screen.getByTestId("slider-polling-interval");
    fireEvent.change(slider, { target: { value: "5000" } });
    expect(mockSettingsStore.setPollingInterval).toHaveBeenCalledWith(5000);

    // User ID
    fireEvent.change(userIdInput, { target: { value: "new-user" } });
    expect(mockSettingsStore.setUserId).toHaveBeenCalledWith("new-user");
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
    expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith("cinematicOverlay", true);

    // Animation Speed
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "1.5" } });
    expect(mockSettingsStore.setAnimationSpeed).toHaveBeenCalledWith(1.5);

    // Render Quality
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "high");
    expect(mockSettingsStore.setRenderQuality).toHaveBeenCalledWith("high");

    // Sphere Opacity
    fireEvent.change(sliders[1], { target: { value: "0.5" } });
    expect(mockSettingsStore.setSphereOpacity).toHaveBeenCalledWith(0.5);
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
    expect(mockSettingsStore.setReducedMotion).toHaveBeenCalledWith(true);

    // High Contrast
    const highContrastBtn = screen.getByTestId("btn-toggle-high-contrast");
    await user.click(highContrastBtn);
    expect(mockSettingsStore.setHighContrast).toHaveBeenCalledWith(true);

    // Screen Reader
    const srBtn = screen.getByTestId("btn-toggle-screen-reader");
    await user.click(srBtn);
    expect(mockSettingsStore.toggleScreenReaderMode).toHaveBeenCalled();
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
    expect(mockSettingsStore.exportSettings).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Reset
    const resetBtn = screen.getByTestId("btn-reset");
    await user.click(resetBtn);
    expect(global.confirm).toHaveBeenCalled();
    expect(mockSettingsStore.resetToDefaults).toHaveBeenCalled();

    // Clear
    const clearBtn = screen.getByTestId("btn-clear");
    await user.click(clearBtn);
    expect(global.confirm).toHaveBeenCalled();
    expect(mockSettingsStore.clearAllData).toHaveBeenCalled();
  });

  it("should handle API tab interactions", async () => {
    mockSettingsStore.testConnection.mockResolvedValue({
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
    expect(mockSettingsStore.setApiUrl).toHaveBeenCalledWith("observer", "http://api.test");

    // Test Connection
    const testBtn = screen.getByTestId("btn-test-observer");
    await user.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should handle import file selection", async () => {
    mockSettingsStore.importSettings.mockReturnValue(true);
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
        expect(mockSettingsStore.importSettings).toHaveBeenCalledWith('{"test":true}');
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
          expect(mockSettingsStore.updateLayer).toHaveBeenCalledWith(key, true);
        } else {
          if (key === "showTransitionPath")
            expect(mockSettingsStore.setShowTransitionPath).toHaveBeenCalledWith(true);
          if (key === "autoRotate") expect(mockSettingsStore.toggleAutoRotate).toHaveBeenCalled();
          if (key === "showDebugInfo") expect(mockSettingsStore.toggleDebugInfo).toHaveBeenCalled();
        }
      }
      unmount();
    }

    // 2. Enable State (All On)
    {
      const newStore = { ...mockSettingsStore };
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
    mockSettingsStore.testConnection.mockResolvedValue({
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
    mockSettingsStore.importSettings.mockReturnValue(false);
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
        expect(mockSettingsStore.importSettings).toHaveBeenCalled();
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
    expect(mockSettingsStore.resetToDefaults).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("btn-clear"));
    expect(mockSettingsStore.clearAllData).not.toHaveBeenCalled();

    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it("should show correct connection status in API tab", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[0]); // API

    await screen.findByTestId("panel-api", {}, { timeout: 3000 });
    expect(screen.getAllByText("Unknown")).toHaveLength(3);

    mockSettingsStore.testConnection.mockResolvedValue({
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

      expect(mockSettingsStore.importSettings).not.toHaveBeenCalled();
    } finally {
      createElementSpy.mockRestore();
    }
  });

  it("closes settings modal", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByText("⚙️"));
    await screen.findByTestId("tab-api");

    // Find close button by lookin for the X icon or just the button in header
    const closeBtn = screen.getAllByRole("button").find((btn) => btn.querySelector("svg"));
    await user.click(closeBtn!);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes settings modal on escape key", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByText("⚙️"));
    await screen.findByTestId("tab-api");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("handles collection selection", async () => {
    const collections = [
      { id: "col1", name: "Collection 1", description: "Desc 1" },
      { id: "col2", name: "Collection 2", description: "Desc 2" },
    ];
    mockVisualizationStore.collections = collections as any;
    mockVisualizationStore.activeCollectionId = "col1";

    (useVisualizationStore as unknown as jest.Mock).mockReturnValue(mockVisualizationStore);

    const user = userEvent.setup();
    await openSettings(user);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[4]); // Data Data is index 4

    await screen.findByTestId("panel-data", {}, { timeout: 3000 });

    expect(screen.getByText("Collection 1")).toBeInTheDocument();
    expect(screen.getByText("Collection 2")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument(); // For col1

    // Click col2
    await user.click(screen.getByText("Collection 2"));
    expect(mockVisualizationStore.setActiveCollection).toHaveBeenCalledWith("col2");

    // Click col1 (already active) -> should not call setActiveCollection again with col1
    mockVisualizationStore.setActiveCollection.mockClear();
    await user.click(screen.getByText("Collection 1"));
    // Since col1 is active in mock state (we didn't update the actual store behavior, just the mock return),
    // the component sees it as active.
    expect(mockVisualizationStore.setActiveCollection).not.toHaveBeenCalled();
  });

  it("renders toggles in disabled/off states correctly", async () => {
    // Only need to verify classes for "false" states, which are defaults in mockStore
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByText("⚙️"));

    const tabs = screen.getAllByRole("tab");

    // Polling
    fireEvent.click(tabs[1]);
    await screen.findByTestId("panel-polling");
    const pollingBtn = screen.getByTestId("btn-polling-toggle");
    expect(pollingBtn).toHaveClass("bg-gray-700"); // false state

    // Accessibility
    fireEvent.click(tabs[3]);
    await screen.findByTestId("panel-access");
    const reducedMotionBtn = screen.getByTestId("btn-toggle-reduced-motion");
    expect(reducedMotionBtn).toHaveClass("bg-gray-700");
  });

  it("renders toggles in enabled/on states correctly", async () => {
    const newStore = { ...mockSettingsStore };
    // @ts-ignore
    newStore.pollingEnabled = true;
    // @ts-ignore
    newStore.reducedMotion = true;

    (useSettingsStore as unknown as jest.Mock).mockReturnValue(newStore);

    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByText("⚙️"));

    const tabs = screen.getAllByRole("tab");

    // Polling
    fireEvent.click(tabs[1]);
    await screen.findByTestId("panel-polling");
    const pollingBtn = screen.getByTestId("btn-polling-toggle");
    expect(pollingBtn).toHaveClass("bg-cyan-600"); // true state

    // Accessibility
    fireEvent.click(tabs[3]);
    await screen.findByTestId("panel-access");
    const reducedMotionBtn = screen.getByTestId("btn-toggle-reduced-motion");
    expect(reducedMotionBtn).toHaveClass("bg-cyan-600");
  });
  it("exports all components from barrel file", () => {
    expect(Settings).toBeDefined();
    expect(ConceptTooltip).toBeDefined();
    expect(EmotionalControls).toBeDefined();
    expect(EmotionalInput).toBeDefined();
  });
});
