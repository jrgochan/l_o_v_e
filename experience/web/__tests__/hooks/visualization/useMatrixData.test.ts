import { renderHook } from "@testing-library/react";
import { useMatrixData } from "@/hooks/visualization/useMatrixData";
import { useMatrixProcessing } from "@/hooks/visualization/matrix/useMatrixProcessing";
import { useMatrixStats } from "@/hooks/visualization/matrix/useMatrixStats";

jest.mock("@/hooks/visualization/matrix/useMatrixProcessing");
jest.mock("@/hooks/visualization/matrix/useMatrixStats");

describe("useMatrixData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMatrixProcessing as jest.Mock).mockReturnValue({
      sortedEmotions: ["Joy", "Sadness"],
      categories: ["positive", "negative"],
      getPathForPair: jest.fn(),
      getCellColor: jest.fn(),
      getCategoryAverageDifficulty: jest.fn(),
      getCategoryCellColor: jest.fn()
    });
    (useMatrixStats as jest.Mock).mockReturnValue({
      totalPaths: 10,
      avgCost: 0.5
    });
  });

  it("should aggregate data from processing and stats hooks", () => {
    const { result } = renderHook(() => useMatrixData({
      allEmotions: [],
      computedPaths: new Map()
    }));

    expect(result.current.sortedEmotions).toEqual(["Joy", "Sadness"]);
    expect(result.current.stats).toEqual({ totalPaths: 10, avgCost: 0.5 });
    expect(result.current.getPathForPair).toBeDefined();
  });
});
