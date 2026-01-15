import { renderHook } from "@testing-library/react";
import { useEmotionNavigation } from "@/hooks/useEmotionNavigation";
import { useNavigationActions } from "@/hooks/navigation/useNavigationActions";
import { useEmotionResolution } from "@/hooks/navigation/useEmotionResolution";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

jest.mock("@/hooks/navigation/useNavigationActions");
jest.mock("@/hooks/navigation/useEmotionResolution");
jest.mock("@/stores/useAtlasAdminStore");

describe("useEmotionNavigation", () => {
  const mockFocus = jest.fn();
  const mockFind = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEmotionResolution as jest.Mock).mockReturnValue({ findEmotionByName: mockFind });
    (useNavigationActions as jest.Mock).mockReturnValue({
      focusEmotion: mockFocus,
      selectEmotionByName: jest.fn(),
      viewInSphere: jest.fn(),
      addToSelection: jest.fn(),
      viewMultipleInSphere: jest.fn(),
      autoFocusEmotion: jest.fn(),
    });
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      // Support function selectors
      const state = {
        getSelectedEmotions: jest.fn(() => []),
      };
      return selector(state);
    });
  });

  it("should compose resolution and actions", () => {
    const { result } = renderHook(() => useEmotionNavigation());

    expect(useEmotionResolution).toHaveBeenCalled();
    expect(useNavigationActions).toHaveBeenCalledWith(
      expect.objectContaining({ findEmotionByName: mockFind })
    );

    expect(result.current.focusEmotion).toBe(mockFocus);

    // Cover all exposed methods
    result.current.selectEmotionByName("Joy");
    expect(useNavigationActions({} as any).selectEmotionByName).toHaveBeenCalledWith("Joy");

    result.current.viewInSphere("id-1");
    expect(useNavigationActions({} as any).viewInSphere).toHaveBeenCalledWith("id-1");

    result.current.addToSelection("id-2");
    expect(useNavigationActions({} as any).addToSelection).toHaveBeenCalledWith("id-2");

    result.current.viewMultipleInSphere(["id-3"]);
    expect(useNavigationActions({} as any).viewMultipleInSphere).toHaveBeenCalledWith(["id-3"]);

    result.current.autoFocusEmotion("Sadness");
    expect(useNavigationActions({} as any).autoFocusEmotion).toHaveBeenCalledWith("Sadness");

    // Check findEmotionByName
    result.current.findEmotionByName("Joy");
    expect(mockFind).toHaveBeenCalledWith("Joy");
  });
});
