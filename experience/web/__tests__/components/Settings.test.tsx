import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Settings } from "@/components/Settings";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock store
jest.mock("@/stores/useSettingsStore");

// Mock Three.js/R3F to prevent SIGSEGV
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ camera: { position: { set: jest.fn() } } })),
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Text: () => null,
}));
jest.mock("three", () => ({
  ...jest.requireActual("three"),
  WebGLRenderer: jest.fn(),
  Mesh: jest.fn(),
  Group: jest.fn(),
}));

// Mock URL
global.URL.createObjectURL = jest.fn(() => "blob:test");
global.URL.revokeObjectURL = jest.fn();

describe("Settings Component", () => {
  const mockStore = {
    // API
    observerApiUrl: "http://localhost:8000",
    listenerApiUrl: "http://localhost:8002",
    versorApiUrl: "http://localhost:8001",
    setApiUrl: jest.fn(),
    testConnection: jest.fn(),

    // Polling
    pollingEnabled: false,
    pollingInterval: 1000,
    userId: "web-user",
    setPollingEnabled: jest.fn(),
    setPollingInterval: jest.fn(),
    setUserId: jest.fn(),

    // Visual
    layers: {
      cinematicOverlay: false,
      viewerShortcuts: false,
      vacDisplay: false,
    },
    showTransitionPath: false,
    animationSpeed: 1.0,
    autoRotate: false,
    renderQuality: "medium",
    sphereOpacity: 0.8,
    showDebugInfo: false,
    updateLayer: jest.fn(),
    setShowTransitionPath: jest.fn(),
    setAnimationSpeed: jest.fn(),
    toggleAutoRotate: jest.fn(),
    setRenderQuality: jest.fn(),
    setSphereOpacity: jest.fn(),
    toggleDebugInfo: jest.fn(),

    // Accessibility
    reducedMotion: false,
    highContrast: false,
    screenReaderMode: false,
    setReducedMotion: jest.fn(),
    setHighContrast: jest.fn(),
    toggleScreenReaderMode: jest.fn(),

    // Data
    exportSettings: jest.fn(() => "{}"),
    importSettings: jest.fn(),
    resetToDefaults: jest.fn(),
    clearAllData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(mockStore);
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();

    // Suppress "Not implemented: navigation" error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args[0]?.toString() || "";
      if (msg.includes("Not implemented: navigation")) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  const openSettings = () => {
    render(<Settings />);
    fireEvent.click(screen.getByLabelText("Open Settings"));
  };

  it("should toggle modal visibility", () => {
    render(<Settings />);
    expect(screen.queryByText("⚙️ Settings")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open Settings"));
    expect(screen.getByText("⚙️ Settings")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close Settings"));
    expect(screen.queryByText("⚙️ Settings")).not.toBeInTheDocument();
  });

  it("should handle polling tab interactions", () => {
    openSettings();
    fireEvent.click(screen.getByText(/Polling/));

    // Toggle Polling
    const toggles = screen.getAllByRole("button");
    // Identify toggle by sibling/parent context if possible, or order.
    // In polling tab:
    // 1. Tab buttons (6)
    // 2. Polling Enable Toggle (index 6, if 0-indexed across modal)
    // Safer to look for specific visual cue or structure?
    // Test DOM structure:
    // <div class="flex items-center justify-between"><label>Enable Polling</label><button>...

    const enablePollingBtn = screen.getByText("Enable Polling").nextElementSibling;
    fireEvent.click(enablePollingBtn!);
    expect(mockStore.setPollingEnabled).toHaveBeenCalledWith(true);

    // Interval slider
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "5000" } });
    expect(mockStore.setPollingInterval).toHaveBeenCalledWith(5000);

    // User ID
    const input = screen.getByDisplayValue("web-user");
    fireEvent.change(input, { target: { value: "new-user" } });
    expect(mockStore.setUserId).toHaveBeenCalledWith("new-user");
  });

  it("should handle visualization tab interactions", () => {
    openSettings();
    fireEvent.click(screen.getByText(/Visual/));

    // Cinematic Overlay Toggle
    const cinematicBtn = screen.getByText("Cinematic Overlay").nextElementSibling;
    fireEvent.click(cinematicBtn!);
    expect(mockStore.updateLayer).toHaveBeenCalledWith("cinematicOverlay", true);

    // Animation Speed
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "1.5" } });
    expect(mockStore.setAnimationSpeed).toHaveBeenCalledWith(1.5);

    // Render Quality
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "high" } });
    expect(mockStore.setRenderQuality).toHaveBeenCalledWith("high");

    // Sphere Opacity
    fireEvent.change(sliders[1], { target: { value: "0.5" } });
    expect(mockStore.setSphereOpacity).toHaveBeenCalledWith(0.5);
  });

  it("should handle accessibility tab interactions", () => {
    openSettings();
    fireEvent.click(screen.getByText(/Access/));

    // Reduced Motion
    const reducedMotionBtn = screen.getByText("Reduced Motion").parentElement?.nextElementSibling;
    fireEvent.click(reducedMotionBtn!);
    expect(mockStore.setReducedMotion).toHaveBeenCalledWith(true);

    // High Contrast
    const highContrastBtn = screen.getByText("High Contrast").parentElement?.nextElementSibling;
    fireEvent.click(highContrastBtn!);
    expect(mockStore.setHighContrast).toHaveBeenCalledWith(true);

    // Screen Reader
    const srBtn = screen.getByText("Screen Reader Mode").parentElement?.nextElementSibling;
    fireEvent.click(srBtn!);
    expect(mockStore.toggleScreenReaderMode).toHaveBeenCalled();
  });

  it("should handle data tab interactions", () => {
    openSettings();
    fireEvent.click(screen.getByText(/Data/));

    // Export
    fireEvent.click(screen.getByText("📥 Export Settings"));
    expect(mockStore.exportSettings).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Reset
    fireEvent.click(screen.getByText("🔄 Reset to Defaults"));
    expect(global.confirm).toHaveBeenCalled();
    expect(mockStore.resetToDefaults).toHaveBeenCalled();

    // Clear
    fireEvent.click(screen.getByText("🗑️ Clear All Data"));
    expect(global.confirm).toHaveBeenCalled();
    expect(mockStore.clearAllData).toHaveBeenCalled();
  });

  it("should handle API tab interactions", async () => {
    mockStore.testConnection.mockResolvedValue({
      observer: { connected: true },
      listener: { connected: false },
      versor: { connected: false },
    });

    openSettings();
    // Default tab is API

    // Input Change
    const input = screen.getByDisplayValue("http://localhost:8000");
    fireEvent.change(input, { target: { value: "http://api.test" } });
    expect(mockStore.setApiUrl).toHaveBeenCalledWith("observer", "http://api.test");

    // Test Connection
    const testButtons = screen.getAllByText("Test");
    fireEvent.click(testButtons[0]); // Observer

    await waitFor(() => {
      expect(screen.getByText("🟢 Connected")).toBeInTheDocument();
    });
  });

  it("should handle import file selection", async () => {
    mockStore.importSettings.mockReturnValue(true);
    openSettings();
    fireEvent.click(screen.getByText(/Data/));

    const file = new File(['{"test":true}'], "settings.json", { type: "application/json" });

    // Mock file input click since it's hidden/created dynamically
    // The component creates input dynamically on click:
    // const input = document.createElement("input");
    // ...
    // input.click();

    // We need to intercept the input creation or simulate the change event directly?
    // Since input is created in handler, we can't easily query it.
    // Hack: mock document.createElement

    const inputMock = { type: "", accept: "", onchange: null as any, click: jest.fn() };
    const originalCreateElement = document.createElement;
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "input") return inputMock as any;
      return originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByText("📤 Import Settings"));

    // Determine onchange handler
    expect(inputMock.click).toHaveBeenCalled();

    // Trigger onchange manually
    const event = { target: { files: [file] } };
    await act(async () => {
      inputMock.onchange(event);
    });

    await waitFor(() => {
      expect(mockStore.importSettings).toHaveBeenCalledWith('{"test":true}');
      expect(global.alert).toHaveBeenCalledWith("Settings imported successfully!");
    });

    (document.createElement as jest.Mock).mockRestore();
  });

  it("should reflect visual toggle states", () => {
    // 1. Polling Enabled State
    const { unmount } = render(<Settings />);
    fireEvent.click(screen.getByText("⚙️"));
    fireEvent.click(screen.getByText(/Polling/));

    // Default false -> bg-gray-700
    const pollingToggle = screen.getByText("Enable Polling").nextElementSibling;
    expect(pollingToggle).toHaveClass("bg-gray-700");

    // Enable -> Re-render with new state
    unmount();
    mockStore.pollingEnabled = true; // Simulate store update
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({ ...mockStore });

    // Refresh component state from mock
    render(<Settings />);
    fireEvent.click(screen.getByText("⚙️"));
    fireEvent.click(screen.getByText(/Polling/));

    const pollingToggleActive = screen.getByText("Enable Polling").nextElementSibling;
    expect(pollingToggleActive).toHaveClass("bg-cyan-600");
  });

  it("should reflect connection failure states", async () => {
    mockStore.testConnection.mockResolvedValue({
      observer: { connected: false }, // Fail
      listener: { connected: false },
      versor: { connected: false },
    });

    openSettings();
    fireEvent.click(screen.getAllByText("Test")[0]);

    await waitFor(() => {
      expect(screen.getByText("🔴 Connection failed")).toBeInTheDocument();
    });
  });

  it("should show About tab details", () => {
    openSettings();
    fireEvent.click(screen.getByText(/About/));
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Web (Next.js)")).toBeInTheDocument();
  });

  it("should handle failed import", async () => {
    mockStore.importSettings.mockReturnValue(false);
    openSettings();
    fireEvent.click(screen.getByText(/Data/));

    const file = new File(["invalid"], "settings.json", { type: "application/json" });
    const inputMock = { type: "", accept: "", onchange: null as any, click: jest.fn() };

    // @ts-ignore
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "input") return inputMock as any;
      return document.createElement(tagName);
    });

    fireEvent.click(screen.getByText("📤 Import Settings"));

    // Trigger onchange manually
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

    (document.createElement as jest.Mock).mockRestore();
  });

  it("should reflect visualization toggle states", () => {
    const toggles = [
      { label: "Cinematic Overlay", key: "cinematicOverlay", isLayer: true },
      { label: "Keyboard Shortcuts", key: "viewerShortcuts", isLayer: true },
      { label: "VAC Metrics Display", key: "vacDisplay", isLayer: true },
      { label: "Show Transition Path", key: "showTransitionPath", isLayer: false },
      { label: "Auto-Rotate Camera", key: "autoRotate", isLayer: false },
      { label: "Show Debug Info", key: "showDebugInfo", isLayer: false },
    ];

    toggles.forEach(({ label, key, isLayer }) => {
      // 1. Initial State (off)
      const { unmount } = render(<Settings />);
      fireEvent.click(screen.getByText("⚙️"));
      fireEvent.click(screen.getByText(/Visual/));

      const toggle = screen.getByText(label).nextElementSibling;
      expect(toggle).toHaveClass("bg-gray-700");

      // Click to verify handler
      if (toggle) fireEvent.click(toggle);

      if (isLayer) {
        expect(mockStore.updateLayer).toHaveBeenCalledWith(key, true);
      } else {
        // Map key to setter if needed, or assume specific mocks called
        if (key === "showTransitionPath")
          expect(mockStore.setShowTransitionPath).toHaveBeenCalledWith(true);
        if (key === "autoRotate") expect(mockStore.toggleAutoRotate).toHaveBeenCalled();
        if (key === "showDebugInfo") expect(mockStore.toggleDebugInfo).toHaveBeenCalled();
      }

      unmount();

      // 2. Enable State
      const newStore = { ...mockStore };
      if (isLayer) {
        // @ts-ignore
        newStore.layers = { ...mockStore.layers, [key]: true };
      } else {
        // @ts-ignore
        newStore[key] = true;
      }
      (useSettingsStore as unknown as jest.Mock).mockReturnValue(newStore);

      const { unmount: unmount2 } = render(<Settings />);
      fireEvent.click(screen.getByText("⚙️"));
      fireEvent.click(screen.getByText(/Visual/));

      const toggleActive = screen.getByText(label).nextElementSibling;
      expect(toggleActive).toHaveClass("bg-cyan-600");
      unmount2();
    });
  });

  it("should handle confirm cancellation", () => {
    (global.confirm as jest.Mock).mockReturnValue(false);
    openSettings();
    fireEvent.click(screen.getByText(/Data/));

    fireEvent.click(screen.getByText("🔄 Reset to Defaults"));
    expect(mockStore.resetToDefaults).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("🗑️ Clear All Data"));
    expect(mockStore.clearAllData).not.toHaveBeenCalled();

    (global.confirm as jest.Mock).mockReturnValue(true); // Reset
  });

  it("should show correct connection status in About tab", async () => {
    // 1. Unknown (Default)
    openSettings();
    fireEvent.click(screen.getByText(/About/));
    expect(screen.getAllByText("⚪ Unknown")).toHaveLength(3);

    // 2. Connected/Disconnected Mixed
    mockStore.testConnection.mockResolvedValue({
      observer: { connected: true },
      listener: { connected: false },
      versor: { connected: false },
    });

    // Go to API tab to trigger test
    fireEvent.click(screen.getByText("🔌 API"));
    fireEvent.click(screen.getAllByText("Test")[0]);
    await waitFor(() => expect(screen.getByText("🟢 Connected")).toBeInTheDocument());

    // Go back to About
    fireEvent.click(screen.getByText(/About/));
    expect(screen.getByText("🟢 Online")).toBeInTheDocument(); // Observer
    // Listener/Versor might be unknown or disconnected depending on if test ran for them?
    // In logical flow, `testConnection(service)` only updates that service status.
    // My test triggered Observer.
    expect(screen.getAllByText("⚪ Unknown")).toHaveLength(2);

    // 3. Test Disconnected (Listener)
    // We need to switch back to API tab to trigger the test
    fireEvent.click(screen.getByText("🔌 API"));
    const testBtns = screen.getAllByText("Test");
    fireEvent.click(testBtns[1]); // Listener

    await waitFor(() => expect(screen.getByText("🔴 Connection failed")).toBeInTheDocument());

    // Verify in About tab
    fireEvent.click(screen.getByText("ℹ️ About"));
    expect(screen.getByText("🔴 Offline")).toBeInTheDocument();
  });
  it("should handle import cancellation (no file selected)", async () => {
    openSettings();
    fireEvent.click(screen.getByText(/Data/));

    const inputMock = { type: "", accept: "", onchange: null as any, click: jest.fn() };
    const originalCreateElement = document.createElement;
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "input") return inputMock as any;
      return originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByText("📤 Import Settings"));

    // Trigger onchange with no files
    const event = { target: { files: [] } };
    await act(async () => {
      inputMock.onchange(event);
    });

    expect(mockStore.importSettings).not.toHaveBeenCalled();

    (document.createElement as jest.Mock).mockRestore();
  });

  it("should reflect accessibility toggle states", () => {
    // 1. Initial State (off)
    const { unmount } = render(<Settings />);
    fireEvent.click(screen.getByText("⚙️"));
    fireEvent.click(screen.getByText(/Access/));

    const rmToggle = screen.getByText("Reduced Motion").parentElement?.nextElementSibling;
    const hcToggle = screen.getByText("High Contrast").parentElement?.nextElementSibling;
    const srToggle = screen.getByText("Screen Reader Mode").parentElement?.nextElementSibling;

    expect(rmToggle).toHaveClass("bg-gray-700");
    expect(hcToggle).toHaveClass("bg-gray-700");
    expect(srToggle).toHaveClass("bg-gray-700");

    unmount();

    // 2. Enable State
    const newStore = {
      ...mockStore,
      reducedMotion: true,
      highContrast: true,
      screenReaderMode: true,
    };
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(newStore);

    const { unmount: unmount2 } = render(<Settings />);
    fireEvent.click(screen.getByText("⚙️"));
    fireEvent.click(screen.getByText(/Access/));

    const rmToggleActive = screen.getByText("Reduced Motion").parentElement?.nextElementSibling;
    const hcToggleActive = screen.getByText("High Contrast").parentElement?.nextElementSibling;
    const srToggleActive = screen.getByText("Screen Reader Mode").parentElement?.nextElementSibling;

    expect(rmToggleActive).toHaveClass("bg-cyan-600");
    expect(hcToggleActive).toHaveClass("bg-cyan-600");
    expect(srToggleActive).toHaveClass("bg-cyan-600");

    unmount2();
  });
});
