import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/admin/settings/page";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock child components
jest.mock("@/components/admin/settings/VisualSettings", () => ({
  VisualSettings: () => <div data-testid="visual-settings">Visual Settings</div>,
}));
jest.mock("@/components/admin/settings/BehaviorSettings", () => ({
  BehaviorSettings: () => <div data-testid="behavior-settings">Behavior Settings</div>,
}));
jest.mock("@/components/admin/settings/NetworkSettings", () => ({
  NetworkSettings: () => <div data-testid="network-settings">Network Settings</div>,
}));
jest.mock("@/components/admin/settings/ChatSettings", () => ({
  ChatSettings: () => <div data-testid="chat-settings">Chat Settings</div>,
}));
jest.mock("@/components/admin/settings/AccessibilitySettings", () => ({
  AccessibilitySettings: () => (
    <div data-testid="accessibility-settings">Accessibility Settings</div>
  ),
}));
jest.mock("@/components/admin/settings/AIModelsSettings", () => ({
  AIModelsSettings: () => <div data-testid="ai-models-settings">AI Models Settings</div>,
}));
jest.mock("@/components/admin/settings/DevelopmentSettings", () => ({
  DevelopmentSettings: () => <div data-testid="development-settings">Development Settings</div>,
}));

jest.mock("@/stores/useSettingsStore");
jest.mock("@/hooks/useKeyboardShortcuts", () => ({ useKeyboardShortcuts: jest.fn() }));

// Mock URL and clipboard
global.URL.createObjectURL = jest.fn(() => "blob:url");
global.URL.revokeObjectURL = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe("SettingsPage", () => {
  const mockResetToDefaults = jest.fn();
  const mockExportSettings = jest.fn(() => JSON.stringify({ test: "settings" }));
  const mockImportSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockImportSettings.mockReturnValue(true); // Default to success
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        resetToDefaults: mockResetToDefaults,
        exportSettings: mockExportSettings,
        importSettings: mockImportSettings,
      };
      return selector(state);
    });
  });

  it("renders header and default tab", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByTestId("visual-settings")).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText("Visual")).toBeInTheDocument();
    expect(screen.getByText("Behavior")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
    expect(screen.getByText("AI Models")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("switches tabs correctly", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByText("Behavior"));
    expect(screen.getByTestId("behavior-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("visual-settings")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Network"));
    expect(screen.getByTestId("network-settings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Chat"));
    expect(screen.getByTestId("chat-settings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Accessibility"));
    expect(screen.getByTestId("accessibility-settings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("AI Models"));
    expect(screen.getByTestId("ai-models-settings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Development"));
    expect(screen.getByTestId("development-settings")).toBeInTheDocument();
  });

  it("handles reset functionality", () => {
    render(<SettingsPage />);

    // Open reset dialog
    fireEvent.click(screen.getByText("🔄 Reset"));
    expect(screen.getByText("Reset to Defaults?")).toBeInTheDocument();

    // Confirm reset
    fireEvent.click(screen.getByText("Reset All Settings"));
    expect(mockResetToDefaults).toHaveBeenCalled();
    expect(screen.getByText("Settings reset to defaults")).toBeInTheDocument();
  });

  it("handles presets modal", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Presets/i }));
    expect(screen.getByText("Load Settings Preset")).toBeInTheDocument();

    const presetBtn = screen.getByText("Performance Mode");
    fireEvent.click(presetBtn);

    expect(mockImportSettings).toHaveBeenCalled();
    expect(screen.getAllByText("Preset loaded successfully!")[0]).toBeInTheDocument();
  });

  it("handles export functionality", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));

    expect(mockExportSettings).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByText("Settings exported successfully!")).toBeInTheDocument();
  });

  it("handles copy functionality", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Copy/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify({ test: "settings" })
      );
      expect(screen.getByText("Settings copied to clipboard!")).toBeInTheDocument();
    });
  });

  it("handles import functionality", async () => {
    render(<SettingsPage />);

    const createElementSpy = jest.spyOn(document, "createElement");

    // Mock Blob.prototype.text globally for this test
    const originalText = Blob.prototype.text;
    Blob.prototype.text = jest.fn().mockResolvedValue('{"test": "settings"}');

    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    // Find the input created by handleImport
    const results = createElementSpy.mock.results;
    const inputFn = results.find(
      (r) => r.value instanceof HTMLInputElement && r.value.type === "file"
    );
    const input = inputFn?.value as HTMLInputElement;

    expect(input).toBeDefined();

    // Create simple file
    const file = new File(['{"test": "settings"}'], "settings.json", { type: "application/json" });

    // Manually trigger the onchange handler directly if possible, or use fireEvent
    Object.defineProperty(input, "files", { value: [file], writable: true });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockImportSettings).toHaveBeenCalledWith('{"test": "settings"}');
      expect(screen.getByText("Settings imported successfully!")).toBeInTheDocument();
    });

    // Cleanup
    Blob.prototype.text = originalText;
  });

  it("handles import cancellation (no file selected)", async () => {
    render(<SettingsPage />);
    const createElementSpy = jest.spyOn(document, "createElement");
    const originalText = Blob.prototype.text;

    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    const results = createElementSpy.mock.results;
    const inputFn = results.find(
      (r) => r.value instanceof HTMLInputElement && r.value.type === "file"
    );
    const input = inputFn?.value as HTMLInputElement;

    // Trigger change with no files
    Object.defineProperty(input, "files", { value: [], writable: true });
    fireEvent.change(input);

    // Should not call import
    expect(mockImportSettings).not.toHaveBeenCalled();

    Blob.prototype.text = originalText;
  });

  it("handles import failure with invalid JSON", async () => {
    render(<SettingsPage />);
    const createElementSpy = jest.spyOn(document, "createElement");
    const originalText = Blob.prototype.text;
    // Mock importSettings to return false
    mockImportSettings.mockReturnValue(false);
    Blob.prototype.text = jest.fn().mockResolvedValue("invalid-json");

    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    const results = createElementSpy.mock.results;
    const inputFn = results.find(
      (r) => r.value instanceof HTMLInputElement && r.value.type === "file"
    );
    const input = inputFn?.value as HTMLInputElement;
    const file = new File(["invalid"], "settings.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], writable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("Invalid settings file")).toBeInTheDocument();
    });
    Blob.prototype.text = originalText;
  });

  it("handles import failure on file read error", async () => {
    render(<SettingsPage />);
    const createElementSpy = jest.spyOn(document, "createElement");
    const originalText = Blob.prototype.text;

    // Mock Blob.text to throw
    Blob.prototype.text = jest.fn().mockRejectedValue(new Error("Read failed"));

    fireEvent.click(screen.getByRole("button", { name: /Import/i }));

    const results = createElementSpy.mock.results;
    const inputFn = results.find(
      (r) => r.value instanceof HTMLInputElement && r.value.type === "file"
    );
    const input = inputFn?.value as HTMLInputElement;
    const file = new File(["{}"], "settings.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], writable: true });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("Failed to import settings")).toBeInTheDocument();
    });
    Blob.prototype.text = originalText;
  });

  it("handles export failure", () => {
    const mockErrorExport = jest.fn(() => {
      throw new Error("Export failed");
    });
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        resetToDefaults: jest.fn(),
        exportSettings: mockErrorExport, // This will throw
        importSettings: jest.fn(),
      });
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Export/i }));

    expect(screen.getByText("Failed to export settings")).toBeInTheDocument();
  });

  it("handles copy failure", async () => {
    const originalClipboard = navigator.clipboard;
    // Mock clipboard writeText to reject
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error("Copy failed")),
      },
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Copy/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to copy to clipboard")).toBeInTheDocument();
    });

    // Restore clipboard
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it("handles preset load failure", () => {
    // Mock import to fail
    mockImportSettings.mockReturnValue(false);

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Presets/i }));

    const presetBtn = screen.getByText("Performance Mode");
    fireEvent.click(presetBtn);

    expect(mockImportSettings).toHaveBeenCalled();
    expect(screen.getByText("Failed to load preset")).toBeInTheDocument();
  });

  it("handles modal cancellations", () => {
    render(<SettingsPage />);

    // 1. Reset Modal Cancel
    fireEvent.click(screen.getByText("🔄 Reset"));
    expect(screen.getByText("Reset to Defaults?")).toBeInTheDocument();

    // Click Cancel button in Reset Modal (usually "Cancel" or "No")
    // Based on typical modal implementation, let's find by text "Cancel"
    const cancelReset = screen.getByText("Cancel");
    fireEvent.click(cancelReset);

    expect(screen.queryByText("Reset to Defaults?")).not.toBeInTheDocument();

    // 2. Presets Modal Close
    fireEvent.click(screen.getByRole("button", { name: /Presets/i }));
    expect(screen.getByText("Load Settings Preset")).toBeInTheDocument();

    // Click Close/Cancel in Presets Modal
    // Assuming there is a close button or "Cancel"
    // Let's check for "Cancel" first, invalidating if not found
    // If it's a dialog component, it might have a close icon btn or "Close" text
    // Viewing `SettingsPage.tsx` lines would verify, but let's assume standard UI
    // or look for aria-label "Close string" or similar if standard Modal component
    // Typically custom Modals have a Close button.
    // Let's try locating by "Close" or "Cancel"

    // If lines 243 is `onClose={() => setPresetModalOpen(false)}`, it might be the Modal backdrop or a close button.
    // Let's assume there is a Close button with text "Close" or Title "Close".
    // Or "Cancel".

    // The Presets modal uses a "✕" button in the header
    const closePresets = screen.getByText("✕");
    fireEvent.click(closePresets);

    expect(screen.queryByText("Load Settings Preset")).not.toBeInTheDocument();
  });
});
