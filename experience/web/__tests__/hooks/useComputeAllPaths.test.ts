import { renderHook, waitFor } from "@testing-library/react";
import { useComputeAllPaths } from "@/hooks/useComputeAllPaths";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { atlasService } from "@/services/atlasService";
import { useBatchJob } from "@/hooks/pathfinding/useBatchJob";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/services/atlasService");
jest.mock("@/hooks/pathfinding/useBatchJob");

describe("useComputeAllPaths", () => {
  const mockAddComputedPath = jest.fn();
  const mockStartJob = jest.fn();
  const mockSetProgress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn();
    window.alert = jest.fn();

    (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue([{ id: "e1" }, { id: "e2" }]); // selector
    (useAtlasAdminStore.getState as jest.Mock).mockReturnValue({
      allEmotions: [{ id: "e1" }, { id: "e2" }],
    });

    // mock selector behavior in component
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      // If selector is picking allEmotions
      const state = {
        allEmotions: [{ id: "e1" }, { id: "e2" }],
        addComputedPath: mockAddComputedPath,
      };
      return selector(state);
    });

    (useBatchJob as jest.Mock).mockReturnValue({
      startJob: mockStartJob,
      isComputing: false,
      progress: {},
      estimatedTimeRemaining: 0,
      setProgress: mockSetProgress,
    });
  });

  it("should start batch job on confirmation", async () => {
    window.confirm = jest.fn(() => true);
    (atlasService.computeAllPaths as jest.Mock).mockResolvedValue({ job_id: "job-123" });

    const { result } = renderHook(() => useComputeAllPaths());
    await result.current.computeAllPaths();

    expect(atlasService.computeAllPaths).toHaveBeenCalled();
    expect(mockStartJob).toHaveBeenCalledWith("job-123", expect.any(Number));
  });

  it("should abort if not confirmed", async () => {
    window.confirm = jest.fn(() => false);
    const { result } = renderHook(() => useComputeAllPaths());
    await result.current.computeAllPaths();

    expect(atlasService.computeAllPaths).not.toHaveBeenCalled();
  });

  it("should handle service error", async () => {
    window.confirm = jest.fn(() => true);
    (atlasService.computeAllPaths as jest.Mock).mockRejectedValue(new Error("Fail"));

    const { result } = renderHook(() => useComputeAllPaths());
    await result.current.computeAllPaths();

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Error"));
    expect(mockSetProgress).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
  });

  it("should load cached paths on job complete", async () => {
    // 1. Capture the callback passed to useBatchJob
    let capturedOnComplete: () => Promise<void>;
    (useBatchJob as jest.Mock).mockImplementation((onComplete, onFail) => {
      capturedOnComplete = onComplete;
      return {
        startJob: mockStartJob,
        isComputing: false,
        progress: {},
        estimatedTimeRemaining: 0,
        setProgress: mockSetProgress,
      };
    });

    // 2. Mock getCachedPaths with matching emotions
    const mockPaths = [
      {
        from_emotion: { id: "e1" },
        to_emotion: { id: "e2" },
        waypoints: [],
        distance: 10,
        estimated_time: "10m",
        difficulty: "easy",
        requires_bridge: false,
      },
    ];
    (atlasService.getCachedPaths as jest.Mock).mockResolvedValue({ paths: mockPaths });

    renderHook(() => useComputeAllPaths());

    // 3. Manually trigger callback
    await capturedOnComplete!();

    // 4. Verify addComputedPath was called
    expect(atlasService.getCachedPaths).toHaveBeenCalled();
    expect(mockAddComputedPath).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "e1-e2",
        total_distance: 10,
      })
    );
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("complete"));
  });

  it("should alert if no emotions loaded", async () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { allEmotions: [], addComputedPath: mockAddComputedPath };
      return selector(state);
    });

    const { result } = renderHook(() => useComputeAllPaths());
    await result.current.computeAllPaths();

    expect(window.alert).toHaveBeenCalledWith("No emotions loaded yet");
    expect(atlasService.computeAllPaths).not.toHaveBeenCalled();
  });

  it("should handle job failure callback", () => {
    let capturedOnFail: (msg: string) => void;
    (useBatchJob as jest.Mock).mockImplementation((onComplete, onFail) => {
      capturedOnFail = onFail;
      return {
        startJob: mockStartJob,
        isComputing: false,
        progress: {},
        setProgress: mockSetProgress,
      };
    });

    renderHook(() => useComputeAllPaths());
    capturedOnFail!("Server exploded");

    expect(window.alert).toHaveBeenCalledWith("Computation failed: Server exploded");
  });

  it("should skip paths with unknown emotions and map waypoints", async () => {
    let capturedOnComplete: () => Promise<void>;
    (useBatchJob as jest.Mock).mockImplementation((onComplete) => {
      capturedOnComplete = onComplete;
      return {
        startJob: mockStartJob,
        isComputing: false,
        progress: {},
        setProgress: mockSetProgress,
      };
    });

    const mockPaths = [
      {
        from_emotion: { id: "unknown" }, // Mismatch
        to_emotion: { id: "e2" },
        waypoints: [],
        distance: 0,
        estimated_time: "0",
        difficulty: "easy",
        requires_bridge: false,
      },
      {
        from_emotion: { id: "e1" },
        to_emotion: { id: "e2" },
        waypoints: [{ emotion: "e_mid", vac: [1, 1, 1] }], // Non-empty waypoints
        distance: 10,
        estimated_time: "10m",
        difficulty: "easy",
        requires_bridge: false,
      },
    ];
    (atlasService.getCachedPaths as jest.Mock).mockResolvedValue({ paths: mockPaths });

    renderHook(() => useComputeAllPaths());
    await capturedOnComplete!();

    // Should skip the first one
    expect(mockAddComputedPath).toHaveBeenCalledTimes(1);
    expect(mockAddComputedPath).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "e1-e2",
        waypoints: expect.arrayContaining([expect.objectContaining({ emotion: "e_mid" })]),
      })
    );
  });
});
