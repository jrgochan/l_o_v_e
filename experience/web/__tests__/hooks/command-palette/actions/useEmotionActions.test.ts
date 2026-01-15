import { renderHook } from "@testing-library/react";
import { useEmotionActions } from "@/hooks/command-palette/actions/useEmotionActions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import type { AtlasEmotion } from "@/types/atlas-admin";

// Mock stores
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger");

describe("useEmotionActions", () => {
  const mockAddToRecent = jest.fn();
  const mockClose = jest.fn();
  const mockSelectEmotion = jest.fn();
  const mockSelectMultiple = jest.fn();
  const mockToggleEmotion = jest.fn();
  const mockSetFocusedEmotion = jest.fn();
  const mockSetTarget = jest.fn();
  const mockSelectedEmotionIds = new Set<string>();

  const mockEmotion: AtlasEmotion = {
    id: "joy",
    name: "Joy",
    vac: [1, 1, 1],
    quaternion: [0, 0, 0, 1],
    definition: "Happy",
    category: "Positive",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectEmotion: mockSelectEmotion,
        selectMultiple: mockSelectMultiple,
        toggleEmotion: mockToggleEmotion,
        selectedEmotionIds: mockSelectedEmotionIds,
        setFocusedEmotion: mockSetFocusedEmotion,
      };
      return selector(state);
    });
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { setTarget: mockSetTarget };
      return selector(state);
    });
  });

  const getHook = () =>
    renderHook(() =>
      useEmotionActions({
        addToRecent: mockAddToRecent,
        close: mockClose,
      })
    );

  it("should handle 'select' action", () => {
    const { result } = getHook();
    const response = result.current.executeAction(mockEmotion, "select", {} as any);

    expect(mockSelectEmotion).toHaveBeenCalledWith("joy");
    expect(mockSetTarget).toHaveBeenCalledWith(mockEmotion.vac, mockEmotion.quaternion);
    expect(mockAddToRecent).toHaveBeenCalledWith("joy");
    expect(mockClose).toHaveBeenCalled();
    expect(response).toEqual({ success: true, action: "select", emotionId: "joy" });
  });

  it("should handle 'add' action (new selection)", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        selectEmotion: mockSelectEmotion,
        selectMultiple: mockSelectMultiple,
        toggleEmotion: mockToggleEmotion,
        selectedEmotionIds: new Set(["sadness"]),
        setFocusedEmotion: mockSetFocusedEmotion,
      })
    );

    const { result } = getHook();
    result.current.executeAction(mockEmotion, "add", {} as any);

    expect(mockSelectMultiple).toHaveBeenCalledWith(["sadness", "joy"]);
    expect(mockAddToRecent).toHaveBeenCalledWith("joy");
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle 'add' action (existing selection)", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        selectEmotion: mockSelectEmotion,
        selectMultiple: mockSelectMultiple,
        toggleEmotion: mockToggleEmotion,
        selectedEmotionIds: new Set(["joy"]),
        setFocusedEmotion: mockSetFocusedEmotion,
      })
    );

    const { result } = getHook();
    result.current.executeAction(mockEmotion, "add", {} as any);

    expect(mockSelectMultiple).not.toHaveBeenCalled();
    expect(mockAddToRecent).toHaveBeenCalledWith("joy");
  });

  it("should handle 'toggle' action", () => {
    const { result } = getHook();
    result.current.executeAction(mockEmotion, "toggle", {} as any);

    expect(mockToggleEmotion).toHaveBeenCalledWith("joy");
    expect(mockAddToRecent).toHaveBeenCalledWith("joy");
    expect(mockClose).not.toHaveBeenCalled(); // Toggle usually keeps open
  });

  it("should handle 'focus' action", () => {
    const { result } = getHook();
    result.current.executeAction(mockEmotion, "focus", {} as any);

    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("joy");
    expect(mockSetTarget).toHaveBeenCalledWith(mockEmotion.vac, mockEmotion.quaternion);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle 'isolate' action", () => {
    const { result } = getHook();
    result.current.executeAction(mockEmotion, "isolate", {} as any);

    expect(mockSelectEmotion).toHaveBeenCalledWith("joy");
    expect(mockSetFocusedEmotion).toHaveBeenCalledWith("joy");
    expect(mockSetTarget).toHaveBeenCalledWith(mockEmotion.vac, mockEmotion.quaternion);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle 'navigate' action", () => {
    const { result } = getHook();
    result.current.executeAction(mockEmotion, "navigate", {} as any);

    expect(mockSetTarget).toHaveBeenCalledWith(mockEmotion.vac, mockEmotion.quaternion);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle 'compute-paths' action", () => {
    const { result } = getHook();
    result.current.executeAction(mockEmotion, "compute-paths", {} as any);

    expect(mockSelectEmotion).toHaveBeenCalledWith("joy");
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle unknown action", () => {
    const { result } = getHook();
    // @ts-ignore - Testing invalid action
    const response = result.current.executeAction(mockEmotion, "unknown", {} as any);

    expect(response.success).toBe(false);
    expect(response.message).toBe("Unknown action");
  });

  it("should handle errors gracefully", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectEmotion: jest.fn().mockImplementation(() => {
          throw new Error("Store error");
        }),
        selectMultiple: mockSelectMultiple,
        toggleEmotion: mockToggleEmotion,
        selectedEmotionIds: mockSelectedEmotionIds,
        setFocusedEmotion: mockSetFocusedEmotion,
      };
      return selector(state);
    });

    const { result } = getHook();
    const response = result.current.executeAction(mockEmotion, "select", {} as any);

    expect(response.success).toBe(false);
    expect(response.message).toBe("Store error");
  });

  it("should handle non-Error objects thrown gracefully", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectEmotion: jest.fn().mockImplementation(() => {
          throw "String error";
        }),
        selectedEmotionIds: mockSelectedEmotionIds,
      };
      return selector(state);
    });

    const { result } = getHook();
    const response = result.current.executeAction(mockEmotion, "select", {} as any);

    expect(response.success).toBe(false);
    expect(response.message).toBe("Unknown error");
  });
});
