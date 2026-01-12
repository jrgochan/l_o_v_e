import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DebugBroadcaster } from "@/components/DebugBroadcaster";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock dependencies
jest.mock("@/stores/useExperienceStore");
jest.mock("@/stores/useAtlasAdminStore");

describe("DebugBroadcaster", () => {
    const mockSelectedIds = new Set(["emotion-1"]);
    const mockTargetVAC = [0.5, 0.5, 0.5];

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        jest.useFakeTimers();

        (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue(mockSelectedIds);
        (useExperienceStore as unknown as jest.Mock).mockReturnValue(mockTargetVAC);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("should render debug info", () => {
        render(<DebugBroadcaster />);
        expect(screen.getByText("Admin Broadcaster Debug")).toBeInTheDocument();
    });

    it("should force broadcast on click", () => {
        render(<DebugBroadcaster />);
        const btn = screen.getByText("FORCE BROADCAST NOW");
        fireEvent.click(btn);

        const stored = localStorage.getItem("love-sphere-sync");
        expect(stored).toContain("sphere_update");
    });

    // TODO: Fix localStorage mock behavior in JSDOM
    it.skip("should handle broadcast errors", async () => {
        // Direct prototype assignment to ensure it works
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = jest.fn(() => {
            throw new Error("Storage Full");
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        try {
            render(<DebugBroadcaster />);
            const btn = screen.getByText("FORCE BROADCAST NOW");

            fireEvent.click(btn);

            await waitFor(() => {
                expect(screen.getByText("Error: Storage Full")).toBeInTheDocument();
            });
        } finally {
            Storage.prototype.setItem = originalSetItem;
            consoleSpy.mockRestore();
        }
    });
});
