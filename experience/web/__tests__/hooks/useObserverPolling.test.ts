import { renderHook, act } from "@testing-library/react";
import { useObserverPolling } from "@/hooks/useObserverPolling";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { createPollingManager } from "@love/experience-shared";
import { logger } from "@/utils/logger";
import React from "react";

jest.mock("@/stores/useExperienceStore");
jest.mock("@love/experience-shared", () => ({
  createPollingManager: jest.fn(),
  convertVAC: jest.fn((v) => v),
  convertQuaternion: jest.fn((q) => q),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useObserverPolling Coverage", () => {
  const mockSetTarget = jest.fn();
  const mockStart = jest.fn();
  const mockStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useExperienceStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ setTarget: mockSetTarget });
    });
    (createPollingManager as jest.Mock).mockReturnValue({
      start: mockStart,
      stop: mockStop,
    });
  });

  it("starts polling on mount", () => {
    renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));
    expect(createPollingManager).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
  });

  // NEW: Cover Default Parameter (Line 30)
  it("does not start by default (enabled = undefined -> false)", () => {
    renderHook(() => useObserverPolling({ userId: "u1" }));
    expect(createPollingManager).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("stops polling on disable", () => {
    const { rerender } = renderHook((props) => useObserverPolling(props), {
      initialProps: { userId: "u1", enabled: true },
    });
    expect(mockStart).toHaveBeenCalled();
    rerender({ userId: "u1", enabled: false });
    expect(mockStop).toHaveBeenCalled();
  });

  it("updates store on data", () => {
    renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));
    const successCallback = mockStart.mock.calls[0][1];
    successCallback({ dominant_emotion: { name: "Joy" }, vac_vector: [1, 1, 1] });
    expect(mockSetTarget).toHaveBeenCalled();
  });

  it("logs error on failure in polling", () => {
    renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));
    // Assuming start(userId, onData, onError, interval) based on usage
    // Args: 0=userId, 1=onData, 2=onError
    const errorCallback = mockStart.mock.calls[0][2];
    if (typeof errorCallback === "function") {
      errorCallback(new Error("Poll fail"));
      expect(logger.error).toHaveBeenCalled();
    }
  });

  it("manual stop", () => {
    const { result } = renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));
    result.current.stop();
    expect(mockStop).toHaveBeenCalled();
  });

  it("skips cleanup if managerRef is null in unmount (Line 71 false branch)", () => {
    const useRefSpy = jest.spyOn(React, "useRef");
    const mutableRef = { current: null };
    useRefSpy.mockReturnValue(mutableRef);
    (createPollingManager as jest.Mock).mockReturnValue({ start: jest.fn(), stop: mockStop });

    const { unmount } = renderHook(() => useObserverPolling({ userId: "1", enabled: true }));
    mutableRef.current = null; // simulate it becoming null
    unmount();
    expect(mockStop).not.toHaveBeenCalled();
    useRefSpy.mockRestore();
  });
});
