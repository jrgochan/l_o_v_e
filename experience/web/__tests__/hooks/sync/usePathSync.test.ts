import { renderHook } from "@testing-library/react";
import { usePathSync } from "@/hooks/sync/usePathSync";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");

describe("usePathSync", () => {
  const mockSetTransitionPath = jest.fn();
  const mockSetShowPath = jest.fn();

  const mockPath = {
    id: "e1-e2",
    from: { id: "e1", name: "Joy", category: "Positive", vac: [1, 0, 0], quaternion: [0, 0, 0, 1] },
    to: {
      id: "e2",
      name: "Sadness",
      category: "Negative",
      vac: [-1, 0, 0],
      quaternion: [0, 0, 0, 1],
    },
    waypoints: [{ emotion: "Neutral", vac: [0, 0, 0], reasoning: "Bridge" }],
    total_distance: 10,
    estimated_time: "5m",
    difficulty: "moderate",
  };

  const mockEmotions = [
    { id: "e1", name: "Joy" },
    { id: "e2", name: "Sadness" },
    { id: "n1", name: "Neutral", category: "Neutral", quaternion: [0, 0, 0, 1] }, // For waypoint lookup
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Experience Store
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        setTransitionPath: mockSetTransitionPath,
        setShowPath: mockSetShowPath,
      });
    });
  });

  it("should sync selected path to experience store", () => {
    // Mock Atlas Store with selected path
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedPathId: "e1-e2",
        computedPaths: { get: (id: string) => (id === "e1-e2" ? mockPath : undefined) },
        allEmotions: mockEmotions,
      };
      return selector(state);
    });

    renderHook(() => usePathSync());

    expect(mockSetShowPath).toHaveBeenCalledWith(true);
    expect(mockSetTransitionPath).toHaveBeenCalledWith(
      expect.objectContaining({
        path_id: "e1-e2",
        current_state: expect.objectContaining({ emotion: "Joy" }),
        goal_state: expect.objectContaining({ emotion: "Sadness" }),
        waypoints: expect.arrayContaining([
          expect.objectContaining({ emotion: "Neutral", category: "Neutral" }),
        ]),
      })
    );
  });

  it("should clear path if no selection", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedPathId: null, // No selection
        computedPaths: { get: jest.fn() },
        allEmotions: mockEmotions,
      };
      return selector(state);
    });

    renderHook(() => usePathSync());

    expect(mockSetShowPath).toHaveBeenCalledWith(false);
    expect(mockSetTransitionPath).toHaveBeenCalledWith(null);
  });

  it("should clear path if selection invalid", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedPathId: "invalid",
        computedPaths: { get: () => undefined },
        allEmotions: mockEmotions,
      };
      return selector(state);
    });

    renderHook(() => usePathSync());

    expect(mockSetShowPath).toHaveBeenCalledWith(false);
    expect(mockSetTransitionPath).toHaveBeenCalledWith(null);
  });
});
