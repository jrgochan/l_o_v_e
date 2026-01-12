import { renderHook, act } from "@testing-library/react";
import { usePerformanceMonitor } from "@/hooks/performance/usePerformanceMonitor";

// Mock useFrame from @react-three/fiber
jest.mock("@react-three/fiber", () => ({
    useFrame: jest.fn((callback) => {
        // Expose callback for testing
        (global as any).mockFrameCallback = callback;
    })
}));

describe("usePerformanceMonitor", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).mockFrameCallback = null;
    });

    it("should initialize with defaults", () => {
        const { result } = renderHook(() => usePerformanceMonitor());
        expect(result.current.fps).toBe(60);
        expect(result.current.qualityRecommendation).toBe("ultra");
    });

    it("should calculate metrics on frame updates", () => {
        const onQualityChange = jest.fn();

        // Mock performance.now
        let currentTime = 1000;
        jest.spyOn(performance, 'now').mockImplementation(() => currentTime);

        const { result } = renderHook(() => usePerformanceMonitor({
            sampleSize: 5,
            onQualityChange,
            targetFps: 60
        }));

        const frameCallback = (global as any).mockFrameCallback;
        expect(frameCallback).toBeDefined();

        act(() => {
            // Simulate 35 frames (metrics update every 30)
            // Frame time 16ms ~ 62.5 FPS
            for (let i = 0; i < 35; i++) {
                currentTime += 16;
                frameCallback();
            }
        });

        // 1000 / 16 = 62.5 FPS
        expect(result.current.fps).toBeGreaterThanOrEqual(60);
        expect(result.current.fps).toBeLessThanOrEqual(63);
        expect(result.current.qualityRecommendation).toBe("ultra");
    });

    it("should recommend lower quality on low FPS", () => {
        const onQualityChange = jest.fn();
        let currentTime = 1000;
        jest.spyOn(performance, 'now').mockImplementation(() => currentTime);

        const { result } = renderHook(() => usePerformanceMonitor({
            sampleSize: 5,
            onQualityChange,
            targetFps: 60
        }));

        const frameCallback = (global as any).mockFrameCallback;

        act(() => {
            // Simulate 35 frames with 33ms delta (~30 FPS)
            for (let i = 0; i < 35; i++) {
                currentTime += 33;
                frameCallback();
            }
        });

        expect(result.current.fps).toBeLessThan(35);
        expect(result.current.qualityRecommendation).toMatch(/medium|low/);
        expect(onQualityChange).toHaveBeenCalled();
    });
});
