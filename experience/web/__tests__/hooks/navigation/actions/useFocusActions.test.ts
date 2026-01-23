import { renderHook } from "@testing-library/react";
import { useFocusActions } from "@/hooks/navigation/actions/useFocusActions";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useVisualizationStore");
jest.mock("@/utils/logger");

describe("useFocusActions", () => {
  const mockSetFocusedEmotion = jest.fn();
  const mockFindEmotionByName = jest.fn();
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ setFocusedEmotion: mockSetFocusedEmotion });
    });
  });

  const getHook = (props: any = {}) =>
    renderHook(() =>
      useFocusActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
        ...props,
      })
    );

  it("should focus emotion if found", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    const success = result.current.focusEmotion("Joy");

    expect(success).toBe(true);
    expect(mockFindEmotionByName).toHaveBeenCalledWith("Joy");
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("e1");
    expect(mockOnNavigate).not.toHaveBeenCalled(); // navigate false by default
  });

  it("should fail if emotion not found", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = getHook();
    const success = result.current.focusEmotion("Unknown");

    expect(success).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
    expect(mockSetFocusedEmotion).not.toHaveBeenCalled();
  });

  it("should trigger onNavigate if requested", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    result.current.focusEmotion("Joy", true);

    expect(mockOnNavigate).toHaveBeenCalled();
  });

  it("should auto-focus emotion", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    result.current.autoFocusEmotion("Joy");

    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("e1");
  });

  it("should fail auto-focus if emotion not found", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = getHook();
    const success = result.current.autoFocusEmotion("Unknown");

    expect(success).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
    expect(mockSetFocusedEmotion).not.toHaveBeenCalled();
  });
});
