
import { render, screen, fireEvent } from "@testing-library/react";
import { DevelopmentSettings } from "@/components/admin/settings/DevelopmentSettings";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useSettingsStore");
jest.mock("@/utils/logger", () => ({
  logger: {
    exportLogs: jest.fn(() => "mock logs"),
    getBuffer: jest.fn(() => []),
    clearBuffer: jest.fn(),
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});
// Mock alert
window.alert = jest.fn();

describe("DevelopmentSettings", () => {
  const mockUpdateDevelopmentSetting = jest.fn();
  const mockUpdateDevelopmentCategory = jest.fn();
  const defaultSettings = {
    development: {
      enabled: true,
      frontendLogLevel: "info",
      frontendCategories: {
        websocket: false,
        api: false,
        hooks: false,
        rendering: false,
        state: false,
        "user-interaction": true,
        general: false,
      },
      backendLogLevel: "WARNING",
    },
    updateDevelopmentSetting: mockUpdateDevelopmentSetting,
    updateDevelopmentCategory: mockUpdateDevelopmentCategory,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettingsStore as unknown as jest.Mock).mockReturnValue(defaultSettings);
  });

  it("renders all sections when enabled", () => {
    render(<DevelopmentSettings />);
    expect(screen.getByText("🔧 Development Settings")).toBeInTheDocument();
    expect(screen.getByText("📱 Frontend Logging")).toBeInTheDocument();
    expect(screen.getByText("🖥️ Backend Logging")).toBeInTheDocument();
    expect(screen.getByText("🛠️ Tools")).toBeInTheDocument();
  });

  it("renders disabled state correctly", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...defaultSettings,
      development: { ...defaultSettings.development, enabled: false },
    });
    render(<DevelopmentSettings />);

    expect(screen.getByText("Development Mode Disabled")).toBeInTheDocument();
    expect(screen.queryByText("📱 Frontend Logging")).not.toBeInTheDocument();
  });

  it("handles master toggle", () => {
    render(<DevelopmentSettings />);
    // Toggle: "OFF" / "ON" -> "Toggle between OFF and ON"
    const toggle = screen.getByLabelText("Toggle between OFF and ON");
    fireEvent.click(toggle);
    // Was enabled (true), so click shouldn't necessarily toggle it directly in the mock,
    // but the click handler calls updateDevelopmentSetting({ enabled: ... }).
    // The toggle component logic: if checked is true, clicking sends false?
    // Let's assume standard toggle behavior.
    expect(mockUpdateDevelopmentSetting).toHaveBeenCalledWith({ enabled: false });
  });

  it("handles log level changes", () => {
    render(<DevelopmentSettings />);

    // Frontend Log Level
    // The select is labeled "Log Level" but there are two "Log Level" texts (one for frontend, one for backend).
    // The frontend one is inside the "Frontend Logging" section.
    // We can use getAllByLabelText or just look for the select associated with the text.
    // Or simpler: display value.

    // Frontend select
    const frontendSelect = screen.getAllByRole("combobox")[0]; // Assuming order
    fireEvent.change(frontendSelect, { target: { value: "debug" } });
    expect(mockUpdateDevelopmentSetting).toHaveBeenCalledWith({ frontendLogLevel: "debug" });

    // Backend select
    const backendSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(backendSelect, { target: { value: "ERROR" } });
    expect(mockUpdateDevelopmentSetting).toHaveBeenCalledWith({ backendLogLevel: "ERROR" });
  });

  it("displays correct description for each log level", () => {
    const { rerender } = render(<DevelopmentSettings />);
    // Default is info
    expect(screen.getByText("Informational messages, warnings, and errors")).toBeInTheDocument();

    const levels = {
      debug: "All logs including detailed debug information",
      warn: "Warnings and errors only",
      error: "Errors only"
    };

    Object.entries(levels).forEach(([level, text]) => {
      (useSettingsStore as unknown as jest.Mock).mockReturnValue({
        ...defaultSettings,
        development: { ...defaultSettings.development, frontendLogLevel: level },
      });
      rerender(<DevelopmentSettings />);
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  it("handles category toggles", () => {
    render(<DevelopmentSettings />);

    // Checkbox for "WebSocket Communications"
    const wsCheckbox = screen.getByLabelText(/WebSocket Communications/); // Valid via htmlFor
    fireEvent.click(wsCheckbox);
    expect(mockUpdateDevelopmentCategory).toHaveBeenCalledWith("websocket", true);
  });

  it("handles tool buttons", () => {
    render(<DevelopmentSettings />);

    // Copy Logs
    fireEvent.click(screen.getByText("Copy Recent Logs"));
    expect(logger.exportLogs).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("mock logs");

    // Clear Console
    const consoleSpy = jest.spyOn(console, "clear").mockImplementation(() => { });
    fireEvent.click(screen.getByText("Clear Console"));
    expect(consoleSpy).toHaveBeenCalled();
    expect(logger.clearBuffer).toHaveBeenCalled();
  });
});
