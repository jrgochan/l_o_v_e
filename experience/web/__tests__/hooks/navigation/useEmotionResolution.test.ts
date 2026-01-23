import { renderHook } from "@testing-library/react";
import { useEmotionResolution } from "@/hooks/navigation/useEmotionResolution";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

jest.mock("@/stores/useVisualizationStore");

describe("useEmotionResolution", () => {
  // Use distinct names that don't overlap partially in reverse
  const mockEmotions = [
    { id: "1", name: "Happy" },
    { id: "2", name: "Enjoyment" },
  ];

  beforeEach(() => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((cb) =>
      cb({ allEmotions: mockEmotions })
    );
  });

  it("should find exact match", () => {
    const { result } = renderHook(() => useEmotionResolution());
    expect(result.current.findEmotionByName("Happy")).toEqual(mockEmotions[0]);
  });

  it("should find partial match", () => {
    const { result } = renderHook(() => useEmotionResolution());

    expect(result.current.findEmotionByName("happ")).toEqual(mockEmotions[0]);
    expect(result.current.findEmotionByName("enjoy")).toEqual(mockEmotions[1]);
  });

  it("should return null for no match", () => {
    const { result } = renderHook(() => useEmotionResolution());
    expect(result.current.findEmotionByName("Sadness")).toBeNull();
  });

  it("should handle empty input", () => {
    const { result } = renderHook(() => useEmotionResolution());
    expect(result.current.findEmotionByName("")).toBeNull();
  });
});
