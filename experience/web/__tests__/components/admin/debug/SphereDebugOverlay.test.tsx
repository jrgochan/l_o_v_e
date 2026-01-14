import { render, screen, fireEvent, act } from "@testing-library/react";
import { SphereDebugOverlay } from "@/components/admin/debug/SphereDebugOverlay";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock store
jest.mock("@/stores/useExperienceStore", () => ({
    useExperienceStore: jest.fn(),
}));

describe("SphereDebugOverlay", () => {
    const mockProps = {
        isConnected: true,
        isWaiting: false,
        targetVAC: [0.5, 0.5, 0.5],
        activeEmotions: [{
            id: "e1",
            name: "Joy",
            category: "Joy",
            vac: [1, 1, 1] as [number, number, number],
            definition: "Test definition",
            quaternion: [0, 0, 0, 1] as [number, number, number, number]
        }],
        debugLog: [
            { timestamp: 1000, type: "test", vac: [0, 0, 0] },
            { timestamp: 2000, type: "test2" }
        ],
    };

    beforeEach(() => {
        (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) => selector({
            currentVAC: [0.1, 0.2, 0.3]
        }));
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("renders status and metrics", () => {
        render(<SphereDebugOverlay {...mockProps} />);
        expect(screen.getByText("CONNECTED")).toBeInTheDocument();
        expect(screen.getByText("1 active")).toBeInTheDocument();
        expect(screen.getByText(/\[0.50,0.50,0.50\]/)).toBeInTheDocument(); // Target
        expect(screen.getByText(/\[0.10,0.20,0.30\]/)).toBeInTheDocument(); // Current
    });

    it("renders disconnected state", () => {
        render(<SphereDebugOverlay {...mockProps} isConnected={false} />);
        expect(screen.getByText("DISCONNECTED")).toBeInTheDocument();
    });

    it("renders waiting state", () => {
        render(<SphereDebugOverlay {...mockProps} isWaiting={true} />);
        expect(screen.getByText("YES")).toBeInTheDocument(); // Waiting: YES
    });

    it("renders logs", () => {
        render(<SphereDebugOverlay {...mockProps} />);
        expect(screen.getByText("test")).toBeInTheDocument();
        expect(screen.getByText("test2")).toBeInTheDocument();
    });

    it("renders empty logs message", () => {
        render(<SphereDebugOverlay {...mockProps} debugLog={[]} />);
        expect(screen.getByText("No messages received yet")).toBeInTheDocument();
    });

    it("renders None for missing VACs", () => {
        (useExperienceStore as unknown as jest.Mock).mockImplementation((selector: any) => selector({
            currentVAC: null
        }));

        render(<SphereDebugOverlay {...mockProps} targetVAC={null} />);

        // Should find 2 "None" texts (Target VAC and Current VAC)
        const noneElements = screen.getAllByText("None");
        expect(noneElements.length).toBeGreaterThanOrEqual(2);
    });

    describe("RawStorageMonitor", () => {
        // Mock localStorage
        let store: any = {};
        const mockLocalStorage = {
            getItem: jest.fn((key) => store[key] || null),
            setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
            clear: jest.fn(() => { store = {}; })
        };
        Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

        it("displays valid storage data", () => {
            const data = { timestamp: Date.now(), vac: [1, 2, 3] };
            store["love-sphere-sync"] = JSON.stringify(data);

            render(<SphereDebugOverlay {...mockProps} />);

            // Wait for interval
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            expect(screen.getByText(/\[1.00,2.00,3.00\]/)).toBeInTheDocument();
        });

        it("displays correct age", () => {
            const data = { timestamp: Date.now() - 5000, vac: [1, 1, 1] }; // 5s ago
            store["love-sphere-sync"] = JSON.stringify(data);
            render(<SphereDebugOverlay {...mockProps} />);
            act(() => {
                jest.advanceTimersByTime(1000); // Trigger interval
            });
            expect(screen.getByText(/Age: 6s ago/)).toBeInTheDocument();
        });

        it("displays invalid JSON error", async () => {
            store["love-sphere-sync"] = "{ invalid json";

            render(<SphereDebugOverlay {...mockProps} />);

            act(() => {
                jest.advanceTimersByTime(1000);
            });

            // State update is async
            expect(await screen.findByText("Invalid JSON")).toBeInTheDocument();
        });

        it("displays NULL when empty", () => {
            store = {}; // Clear
            render(<SphereDebugOverlay {...mockProps} />);

            act(() => {
                jest.advanceTimersByTime(1000);
            });

            expect(screen.getByText("NULL")).toBeInTheDocument();
        });

        it("displays No VAC when vac missing in storage", () => {
            const data = { timestamp: Date.now(), type: "test" }; // No vac
            store["love-sphere-sync"] = JSON.stringify(data);
            render(<SphereDebugOverlay {...mockProps} />);

            act(() => {
                jest.advanceTimersByTime(1000);
            });

            expect(screen.getByText(/No VAC/)).toBeInTheDocument();
        });

        it("handles storage access error", () => {
            // Use mockImplementation to persist across multiple interval calls if needed
            mockLocalStorage.getItem.mockImplementation(() => { throw new Error("Access Denied"); });

            render(<SphereDebugOverlay {...mockProps} />);

            act(() => {
                jest.advanceTimersByTime(1000);
            });

            expect(screen.getByText("Storage Access Error")).toBeInTheDocument();

            // Restore default implementation
            mockLocalStorage.getItem.mockImplementation((key) => store[key] || null);
        });

        it("force refresh updates data", () => {
            store = {};
            render(<SphereDebugOverlay {...mockProps} />);

            const btn = screen.getByText("Force Refresh Storage");

            // Update storage externaly
            const data = { timestamp: Date.now(), vac: [9, 9, 9] };
            store["love-sphere-sync"] = JSON.stringify(data);

            act(() => {
                btn.click();
            });

            expect(screen.getByText(/\[9.00,9.00,9.00\]/)).toBeInTheDocument();
        });
    });
});
