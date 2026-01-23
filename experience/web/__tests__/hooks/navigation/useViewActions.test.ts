import { renderHook, act } from "@testing-library/react";
import { useViewActions } from "../../../hooks/navigation/actions/useViewActions";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

// Mock dependencies
const mockSelectEmotion = jest.fn();
const mockSetFocusedEmotion = jest.fn();

// Mock store
jest.mock("@/stores/useVisualizationStore", () => ({
  useVisualizationStore: (selector: any) => {
    const state = {
      selectEmotion: mockSelectEmotion,
      setFocusedEmotion: mockSetFocusedEmotion,
    };
    return selector(state);
  },
}));

// Mock sibling hook
jest.mock("../../../hooks/navigation/actions/useSelectionActions", () => ({
  useSelectionActions: () => ({
    selectMultipleEmotions: jest.fn((names) =>
      names.map((n: string) => (n === "Joy" ? "id-joy" : null)).filter(Boolean)
    ),
  }),
}));

describe("useViewActions", () => {
  const mockFindEmotionByName = jest.fn();
  const mockOnNavigate = jest.fn();
  const mockEmotion = { id: "id-joy", name: "Joy" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindEmotionByName.mockReturnValue(mockEmotion);
  });

  it("should view emotion in sphere", () => {
    const { result } = renderHook(() =>
      useViewActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
      })
    );

    const success = result.current.viewInSphere("Joy");

    expect(success).toBe(true);
    expect(mockFindEmotionByName).toHaveBeenCalledWith("Joy");
    expect(mockSelectEmotion).toHaveBeenCalledWith("id-joy");
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("id-joy");
    expect(mockOnNavigate).toHaveBeenCalled();
  });

  it("should handle emotion not found", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = renderHook(() =>
      useViewActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
      })
    );

    const success = result.current.viewInSphere("Unknown");

    expect(success).toBe(false);
    expect(mockOnNavigate).not.toHaveBeenCalled();
  });

  it("should view multiple emotions", () => {
    const { result } = renderHook(() =>
      useViewActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
      })
    );

    const success = result.current.viewMultipleInSphere(["Joy"]);

    expect(success).toBe(true);
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("id-joy");
    expect(mockOnNavigate).toHaveBeenCalled();
  });

  it("should fail to view multiple if no emotions found", () => {
    const { result } = renderHook(() =>
      useViewActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
      })
    );

    // Pass known bad name that our mock returns empty for
    const success = result.current.viewMultipleInSphere(["Unknown"]);

    expect(success).toBe(false);
    expect(mockOnNavigate).not.toHaveBeenCalled();
  });
});
