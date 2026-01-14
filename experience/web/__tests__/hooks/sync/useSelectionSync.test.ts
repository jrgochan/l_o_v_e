import { renderHook } from "@testing-library/react";
import { useSelectionSync } from "@/hooks/sync/useSelectionSync";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger");

// Mock shared
jest.mock("@love/experience-shared", () => ({
  getCanonicalEmotion: jest.fn((id) => {
    if (id === "Fallback") return { vac: [0.5, 0.5, 0.5] };
    return null;
  }),
}));

describe("useSelectionSync", () => {
  const mockSetTarget = jest.fn();

  const mockEmotions = [
    { id: "e1", name: "Joy", vac: [1, 1, 1] },
    { id: "e2", name: "Sadness", vac: [-1, -1, -1] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ setTarget: mockSetTarget });
    });
  });

  it("should calculate average VAC for selected emotions", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["e1", "e2"]),
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    // Avg of [1,1,1] and [-1,-1,-1] is [0,0,0]
    expect(mockSetTarget).toHaveBeenCalledWith([0, 0, 0]);
    expect(logger.debug).toHaveBeenCalled();
  });

  it("should handle single selection", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["e1"]),
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    expect(mockSetTarget).toHaveBeenCalledWith([1, 1, 1]);
  });

  it("should use fallback for missing emotions", () => {
    // ID "Fallback" is not in allEmotions, but is in getCanonicalEmotion mock
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["Fallback"]),
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    expect(logger.warn).toHaveBeenCalledWith(
      "hooks",
      expect.stringContaining("Canonical Fallback"),
      expect.any(Object)
    );
    expect(mockSetTarget).toHaveBeenCalledWith([0.5, 0.5, 0.5]);
  });

  it("should reset to neutral if no selection", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(),
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    expect(mockSetTarget).toHaveBeenCalledWith([0, 0, 0]);
  });

  it("should robust match by name if ID fails", () => {
    // select by name "Joy" instead of id "e1"
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["Joy"]),
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    expect(mockSetTarget).toHaveBeenCalledWith([1, 1, 1]);
  });

  it("should match by case-insensitive ID", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["E1"]), // Uppercase ID
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    expect(mockSetTarget).toHaveBeenCalledWith([1, 1, 1]);
  });

  it("should match by case-insensitive Name", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["joy"]), // Lowercase Name
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    expect(mockSetTarget).toHaveBeenCalledWith([1, 1, 1]);
  });

  it("should handle totally invalid ID (no internal, no canonical)", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectedEmotionIds: new Set(["InvalidID"]),
        allEmotions: mockEmotions,
      });
    });

    renderHook(() => useSelectionSync());

    // Should effectively map to nothing, so reset to neutral
    expect(mockSetTarget).toHaveBeenCalledWith([0, 0, 0]);
    // Should NOT warn about canonical use (since none found)
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
