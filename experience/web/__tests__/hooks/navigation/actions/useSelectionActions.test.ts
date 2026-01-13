import { renderHook } from "@testing-library/react";
import { useSelectionActions } from "@/hooks/navigation/actions/useSelectionActions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/utils/logger");

describe("useSelectionActions", () => {
  const mockSelectEmotion = jest.fn();
  const mockSetFocusedEmotion = jest.fn();
  const mockSelectMultiple = jest.fn();
  const mockFindEmotionByName = jest.fn();
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        selectEmotion: mockSelectEmotion,
        setFocusedEmotion: mockSetFocusedEmotion,
        selectMultiple: mockSelectMultiple,
      });
    });
  });

  const getHook = (props: any = {}) =>
    renderHook(() =>
      useSelectionActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
        ...props,
      })
    );

  it("should select emotion by name", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    const success = result.current.selectEmotionByName("Joy");

    expect(success).toBe(true);
    expect(mockSelectEmotion).toHaveBeenCalledWith("e1");
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("e1");
  });

  it("should navigate after selection if requested", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    result.current.selectEmotionByName("Joy", true);

    expect(mockOnNavigate).toHaveBeenCalled();
  });

  it("should fail selection if emotion not found", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = getHook();
    const success = result.current.selectEmotionByName("Unknown");

    expect(success).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should add to selection", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    result.current.addToSelection("Joy");

    expect(mockSelectEmotion).toHaveBeenCalledWith("e1");
    // addToSelection does NOT modify focus in implementation
    expect(mockSetFocusedEmotion).not.toHaveBeenCalled();
  });

  it("should fail to add to selection if emotion not found", () => {
    mockFindEmotionByName.mockReturnValue(null);
    const { result } = getHook();
    const success = result.current.addToSelection("Unknown");

    expect(success).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
    expect(mockSelectEmotion).not.toHaveBeenCalled();
  });

  it("should select multiple emotions", () => {
    mockFindEmotionByName.mockImplementation((name) => {
      if (name === "Joy") return { id: "e1", name: "Joy" };
      if (name === "Sadness") return { id: "e2", name: "Sadness" };
      return null;
    });

    const { result } = getHook();
    const emotionIds = result.current.selectMultipleEmotions(["Joy", "Sadness", "Unknown"]);

    expect(emotionIds).toEqual(["e1", "e2"]);
    expect(mockSelectMultiple).toHaveBeenCalledWith(["e1", "e2"]);
  });

  it("should warn if no valid emotions for multiple selection", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = getHook();
    const resultVal = result.current.selectMultipleEmotions(["Unknown"]);

    expect(resultVal).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
    expect(mockSelectMultiple).not.toHaveBeenCalled();
  });
});
