
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/admin/settings/page";
import { useSettingsStore } from "@/stores/useSettingsStore";

// Mock child components
jest.mock("@/components/admin/settings/VisualSettings", () => ({ VisualSettings: () => <div data-testid="visual-settings">Visual Settings</div> }));
jest.mock("@/components/admin/settings/BehaviorSettings", () => ({ BehaviorSettings: () => <div data-testid="behavior-settings">Behavior Settings</div> }));
jest.mock("@/components/admin/settings/NetworkSettings", () => ({ NetworkSettings: () => <div data-testid="network-settings">Network Settings</div> }));
jest.mock("@/components/admin/settings/ChatSettings", () => ({ ChatSettings: () => <div data-testid="chat-settings">Chat Settings</div> }));
jest.mock("@/components/admin/settings/AccessibilitySettings", () => ({ AccessibilitySettings: () => <div data-testid="accessibility-settings">Accessibility Settings</div> }));
jest.mock("@/components/admin/settings/AIModelsSettings", () => ({ AIModelsSettings: () => <div data-testid="ai-models-settings">AI Models Settings</div> }));
jest.mock("@/components/admin/settings/DevelopmentSettings", () => ({ DevelopmentSettings: () => <div data-testid="development-settings">Development Settings</div> }));

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
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({ test: "settings" }));
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
        const inputFn = results.find(r => r.value instanceof HTMLInputElement && r.value.type === "file");
        const input = inputFn?.value as HTMLInputElement;

        expect(input).toBeDefined();

        // Create simple file
        const file = new File(['{"test": "settings"}'], "settings.json", { type: "application/json" });

        // Manually trigger the onchange handler directly if possible, or use fireEvent
        Object.defineProperty(input, 'files', { value: [file], writable: true });

        fireEvent.change(input);

        await waitFor(() => {
            expect(mockImportSettings).toHaveBeenCalledWith('{"test": "settings"}');
            expect(screen.getByText("Settings imported successfully!")).toBeInTheDocument();
        });

        // Cleanup
        Blob.prototype.text = originalText;
    });
});
