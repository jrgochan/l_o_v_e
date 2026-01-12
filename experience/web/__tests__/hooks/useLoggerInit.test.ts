import { renderHook } from "@testing-library/react";
import { useLoggerInit } from "../../hooks/useLoggerInit";
import { logger, LogCategory } from "@/utils/logger";

// Mock store
const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
    useSettingsStore: (selector: any) => selector(mockUseSettingsStore())
}));

// Mock logger
jest.mock("@/utils/logger", () => ({
    logger: {
        setEnabled: jest.fn(),
        setLevel: jest.fn(),
        setCategory: jest.fn(),
        info: jest.fn(),
    },
    LogCategory: {
        GENERAL: "general"
    }
}));

describe("useLoggerInit", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should initialize logger with default settings", () => {
        mockUseSettingsStore.mockReturnValue({
            development: {
                enabled: true,
                frontendLogLevel: "info",
                frontendCategories: { general: true, network: false }
            }
        });

        renderHook(() => useLoggerInit());

        expect(logger.setEnabled).toHaveBeenCalledWith(true);
        expect(logger.setLevel).toHaveBeenCalledWith("info");
        expect(logger.setCategory).toHaveBeenCalledWith("general", true);
        expect(logger.setCategory).toHaveBeenCalledWith("network", false);
        expect(logger.info).toHaveBeenCalled();
    });

    it("should update logger when settings change", () => {
        mockUseSettingsStore.mockReturnValue({
            development: {
                enabled: false,
                frontendLogLevel: "error",
                frontendCategories: {}
            }
        });

        const { rerender } = renderHook(() => useLoggerInit());

        expect(logger.setEnabled).toHaveBeenCalledWith(false);
        expect(logger.setLevel).toHaveBeenCalledWith("error");

        // Simulate update
        mockUseSettingsStore.mockReturnValue({
            development: {
                enabled: true,
                frontendLogLevel: "debug",
                frontendCategories: {}
            }
        });

        rerender();

        expect(logger.setEnabled).toHaveBeenCalledWith(true);
        expect(logger.setLevel).toHaveBeenCalledWith("debug");
    });
});
