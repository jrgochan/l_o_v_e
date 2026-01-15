import { renderHook } from "@testing-library/react";
import { useViewActions } from "@/hooks/navigation/actions/useViewActions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/utils/logger");

describe("useViewActions", () => {
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
      useViewActions({
        findEmotionByName: mockFindEmotionByName,
        onNavigate: mockOnNavigate,
        ...props,
      })
    );

  it("should view emotion in sphere", () => {
    const mockEmotion = { id: "e1", name: "Joy" };
    mockFindEmotionByName.mockReturnValue(mockEmotion);

    const { result } = getHook();
    const success = result.current.viewInSphere("Joy");

    expect(success).toBe(true);
    expect(mockSelectEmotion).toHaveBeenCalledWith("e1");
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("e1");
    expect(mockOnNavigate).toHaveBeenCalled();
  });

  it("should fail to view in sphere if emotion not found", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = getHook();
    const success = result.current.viewInSphere("Unknown");

    expect(success).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
    expect(mockSelectEmotion).not.toHaveBeenCalled();
  });

  it("should view multiple emotions in sphere", () => {
    mockFindEmotionByName.mockImplementation((name) => {
      if (name === "Joy") return { id: "e1", name: "Joy" };
      if (name === "Sadness") return { id: "e2", name: "Sadness" };
      return null;
    });

    const { result } = getHook();
    const success = result.current.viewMultipleInSphere(["Joy", "Sadness"]);

    expect(success).toBe(true);
    // selectMultiple is called via useSelectionActions internal call, verifying outcome:
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("e1"); // Focuses first
    expect(mockOnNavigate).toHaveBeenCalled();
    // note: useSelectionActions call to selectMultiple is internal, tested in useSelectionActions.test.ts
    // but we can verify it was likely called if the logic proceeded to focus and navigate
  });

  it("should fail validation if no emotions found for multiple view", () => {
    mockFindEmotionByName.mockReturnValue(null);

    const { result } = getHook();
    const success = result.current.viewMultipleInSphere(["Unknown"]);

    expect(success).toBe(false);
    // logger.warn called by useSelectionActions
    expect(mockOnNavigate).not.toHaveBeenCalled();
  });
});
