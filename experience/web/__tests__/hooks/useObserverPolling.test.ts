import { renderHook } from "@testing-library/react";
import { useObserverPolling } from "@/hooks/useObserverPolling";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { createPollingManager } from "@love/experience-shared";

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

describe("useObserverPolling", () => {
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

  it("should start polling when enabled", () => {
    renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));

    expect(createPollingManager).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith("u1", expect.any(Function), expect.any(Function), 5000);
  });

  it("should stop polling when disabled", () => {
    const { rerender } = renderHook((props) => useObserverPolling(props), {
      initialProps: { userId: "u1", enabled: true },
    });

    expect(mockStart).toHaveBeenCalled();

    rerender({ userId: "u1", enabled: false });

    expect(mockStop).toHaveBeenCalled();
  });

  it("should update store on data received", () => {
    renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));

    const successCallback = mockStart.mock.calls[0][1];
    const mockData = {
      dominant_emotion: { name: "Joy" },
      vac_vector: [1, 1, 1],
      quaternion: [0, 0, 0, 1],
    };

    successCallback(mockData);

    expect(mockSetTarget).toHaveBeenCalledWith([1, 1, 1], [0, 0, 0, 1]);
  });

  it("should log error on polling failure", () => {
    // Import mocked logger to spy on it
    const { logger } = require("@/utils/logger");

    renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));
    const errorCallback = mockStart.mock.calls[0][2];
    const testError = new Error("Poll fail");

    errorCallback(testError);

    expect(logger.error).toHaveBeenCalledWith("api", "Observer polling error", testError);
  });

  it("provides manual stop function", () => {
    const { result } = renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));

    expect(mockStop).not.toHaveBeenCalled();
    result.current.stop();
    expect(mockStop).toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const { unmount } = renderHook(() => useObserverPolling({ userId: "u1", enabled: true }));
    expect(mockStop).not.toHaveBeenCalled();
    unmount();
    expect(mockStop).toHaveBeenCalled();
  });
  it("defaults to disabled", () => {
    // @ts-ignore
    const { result } = renderHook(() => useObserverPolling({ userId: "u1" }));
    expect(result.current.isPolling).toBe(false);
    expect(createPollingManager).not.toHaveBeenCalled();
  });
});
