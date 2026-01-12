import { renderHook } from "@testing-library/react";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

jest.mock("@/stores/useSettingsStore");
jest.mock("@/stores/useAtlasAdminStore");

describe("useSettingsSync", () => {
  const mockSetState = jest.fn();
  const mockSubscribe = jest.fn(() => jest.fn()); // returns unsubscribe
  const mockGetState = jest.fn(() => ({
    pathAnimationMode: "test",
    layers: {},
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    useAtlasAdminStore.setState = mockSetState;

    // Mock zustand store methods directly on the import
    (useSettingsStore as unknown as any).getState = mockGetState;
    (useSettingsStore as unknown as any).subscribe = mockSubscribe;
  });

  it("should sync settings on mount", () => {
    renderHook(() => useSettingsSync());

    expect(mockGetState).toHaveBeenCalled();
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should subscribe to settings changes", () => {
    renderHook(() => useSettingsSync());

    expect(mockSubscribe).toHaveBeenCalled();

    // Simulate change
    const subCallback = (mockSubscribe.mock.calls[0] as any[])[0];
    subCallback();

    expect(mockSetState).toHaveBeenCalledTimes(2); // Mount + Change
  });
});
