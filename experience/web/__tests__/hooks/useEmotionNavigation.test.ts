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
    (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue(() => []);
  });

  it("should compose resolution and actions", () => {
    const { result } = renderHook(() => useEmotionNavigation());

    expect(useEmotionResolution).toHaveBeenCalled();
    expect(useNavigationActions).toHaveBeenCalledWith(
      expect.objectContaining({ findEmotionByName: mockFind })
    );

    expect(result.current.focusEmotion).toBe(mockFocus);
  });
});
