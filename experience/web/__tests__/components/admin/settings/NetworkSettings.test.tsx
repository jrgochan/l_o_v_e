
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NetworkSettings } from "@/components/admin/settings/NetworkSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useSettingsStore");
jest.mock("@/utils/logger");

describe("NetworkSettings", () => {
  const mockUpdateNetworkSetting = jest.fn();
  const mockSwitchNetworkMode = jest.fn();
  const mockTestConnection = jest.fn();

  const defaultSettings = {
    network: {
      mode: "local",
      customEndpoints: false,
      endpoints: {
        observer: "http://localhost:8000",
        listener: "http://localhost:8002",
        versor: "http://localhost:8001",
      },
    },
    updateNetworkSetting: mockUpdateNetworkSetting,
    switchNetworkMode: mockSwitchNetworkMode,
    testConnection: mockTestConnection,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(defaultSettings);
  });

  it("renders all sections", () => {
    render(<NetworkSettings />);
    expect(screen.getByText("Connection Mode")).toBeInTheDocument();
    expect(screen.getByText("API Endpoints")).toBeInTheDocument();
    expect(screen.getByText("Connection Status")).toBeInTheDocument();
  });

  it("handles mode toggle", () => {
    render(<NetworkSettings />);
    // Toggle: "🏠 Local" / "🌐 Network" -> "Toggle between 🏠 Local and 🌐 Network"
    const toggle = screen.getByLabelText("Toggle between 🏠 Local and 🌐 Network");
    fireEvent.click(toggle);
    expect(mockSwitchNetworkMode).toHaveBeenCalledWith("network");
  });

  it("handles mode toggle back to local", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...defaultSettings,
      network: { ...defaultSettings.network, mode: "network" },
    });
    render(<NetworkSettings />);
    // Toggle is checked (Network). Click to switch to Local.
    const toggle = screen.getByLabelText("Toggle between 🏠 Local and 🌐 Network");
    fireEvent.click(toggle);
    expect(mockSwitchNetworkMode).toHaveBeenCalledWith("local");
  });

  it("handles custom endpoints toggle", () => {
    render(<NetworkSettings />);
    // Toggle: "Default Endpoints" / "Custom Endpoints" -> "Toggle between Default Endpoints and Custom Endpoints"
    const toggle = screen.getByLabelText("Toggle between Default Endpoints and Custom Endpoints");
    fireEvent.click(toggle);
    expect(mockUpdateNetworkSetting).toHaveBeenCalledWith({ customEndpoints: true });
  });

  it("allows editing endpoints when in local mode", () => {
    render(<NetworkSettings />); // Default is local, so inputs enabled

    const observerInput = screen.getByDisplayValue("http://localhost:8000");
    fireEvent.change(observerInput, { target: { value: "http://custom:8000" } });

    expect(mockUpdateNetworkSetting).toHaveBeenCalledWith({
      endpoints: expect.objectContaining({ observer: "http://custom:8000" }),
    });

    const listenerInput = screen.getByDisplayValue("http://localhost:8002");
    fireEvent.change(listenerInput, { target: { value: "http://custom:8002" } });
    expect(mockUpdateNetworkSetting).toHaveBeenCalledWith({
      endpoints: expect.objectContaining({ listener: "http://custom:8002" }),
    });

    const versorInput = screen.getByDisplayValue("http://localhost:8001");
    fireEvent.change(versorInput, { target: { value: "http://custom:8001" } });
    expect(mockUpdateNetworkSetting).toHaveBeenCalledWith({
      endpoints: expect.objectContaining({ versor: "http://custom:8001" }),
    });
  });

  it("handles connection testing success", async () => {
    mockTestConnection.mockResolvedValue({
      observer: { connected: true, latency: 50 },
      listener: { connected: true, latency: 40 },
      versor: { connected: false, error: "Failed" },
    });

    render(<NetworkSettings />);

    fireEvent.click(screen.getByText("🔍 Test Connection"));
    expect(screen.getByText("Testing...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("50ms")).toBeInTheDocument();
      expect(screen.getByText("40ms")).toBeInTheDocument();
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });

  it("handles connection testing failure", async () => {
    mockTestConnection.mockRejectedValue(new Error("Network Error"));

    render(<NetworkSettings />);
    fireEvent.click(screen.getByText("🔍 Test Connection"));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith("api", "Connection test failed", expect.any(Error));
    });
  });

  it("displays explicit connection error message", async () => {
    mockTestConnection.mockResolvedValue({
      observer: { connected: false, error: "Custom Timeout" },
    });
    render(<NetworkSettings />);
    fireEvent.click(screen.getByText("🔍 Test Connection"));

    await waitFor(() => {
      expect(screen.getByText("Custom Timeout")).toBeInTheDocument();
    });
  });

  it("displays default 'Failed' message when no error string provided", async () => {
    mockTestConnection.mockResolvedValue({
      observer: { connected: false }, // no error string
    });
    render(<NetworkSettings />);
    fireEvent.click(screen.getByText("🔍 Test Connection"));

    await waitFor(() => {
      // Should fallback to "Failed"
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });
  it("allows editing endpoints in network mode with custom endpoints enabled", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...defaultSettings,
      network: {
        mode: "network",
        customEndpoints: true,
        endpoints: defaultSettings.network.endpoints,
      },
    });
    render(<NetworkSettings />);

    const versorInput = screen.getByDisplayValue("http://localhost:8001");
    // Should not be disabled
    expect(versorInput).not.toBeDisabled();

    fireEvent.change(versorInput, { target: { value: "http://network-custom:8001" } });
    expect(mockUpdateNetworkSetting).toHaveBeenCalledWith({
      endpoints: expect.objectContaining({ versor: "http://network-custom:8001" }),
    });
  });
});
