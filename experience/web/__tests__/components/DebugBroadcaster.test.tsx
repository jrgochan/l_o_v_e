import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { DebugBroadcaster } from "@/components/DebugBroadcaster";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock dependencies
jest.mock("@/stores/useExperienceStore");
jest.mock("@/stores/useAtlasAdminStore");

describe("DebugBroadcaster", () => {
  const mockSelectedIds = new Set(["emotion-1"]);
  const mockTargetVAC = [0.5, 0.5, 0.5];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();

    (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue(mockSelectedIds);
    (useExperienceStore as unknown as jest.Mock).mockReturnValue(mockTargetVAC);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should render debug info", () => {
    render(<DebugBroadcaster />);
    expect(screen.getByText("Admin Broadcaster Debug")).toBeInTheDocument();
  });

  it("should force broadcast on click", () => {
    render(<DebugBroadcaster />);
    const btn = screen.getByText("FORCE BROADCAST NOW");
    fireEvent.click(btn);

    const stored = localStorage.getItem("love-sphere-sync");
    expect(stored).toContain("sphere_update");
  });

  it("should handle broadcast errors", async () => {
    // Override the instance method directly to ensure it works regardless of prototype chain
    const originalSetItem = window.localStorage.setItem;
    Object.defineProperty(window.localStorage, "setItem", {
      value: () => { throw new Error("Storage Full"); },
      writable: true
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

    try {
      render(<DebugBroadcaster />);
      const btn = screen.getByText("FORCE BROADCAST NOW");

      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByText("Error: Storage Full")).toBeInTheDocument();
      });
    } finally {
      // Restore original
      Object.defineProperty(window.localStorage, "setItem", {
        value: originalSetItem,
        writable: true
      });
      consoleSpy.mockRestore();
    }
  });

  it("should poll localStorage", async () => {
    window.localStorage.setItem("love-sphere-sync", "test-value");

    render(<DebugBroadcaster />);

    // Advance timers outside waitFor, wrapped in act
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(screen.getByText("test-value")).toBeInTheDocument();
    });
  });

  it("should handle localStorage polling errors", async () => {
    const originalGetItem = window.localStorage.getItem;
    Object.defineProperty(window.localStorage, "getItem", {
      value: () => { throw new Error("Read Error"); },
      writable: true
    });

    try {
      render(<DebugBroadcaster />);
      act(() => {
        jest.advanceTimersByTime(1100);
      });
      await waitFor(() => {
        expect(screen.getByText("Error reading LS")).toBeInTheDocument();
      });
    } finally {
      Object.defineProperty(window.localStorage, "getItem", {
        value: originalGetItem,
        writable: true
      });
    }
  });

  it("truncates long localStorage values", async () => {
    const longValue = "a".repeat(150);
    window.localStorage.setItem("love-sphere-sync", longValue);

    render(<DebugBroadcaster />);
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      // Should contain dots
      expect(screen.getByText((content) => content.includes("..."))).toBeInTheDocument();
    });
  });

  it("handles null targetVAC", () => {
    (useExperienceStore as unknown as jest.Mock).mockReturnValue(null);
    render(<DebugBroadcaster />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const { unmount } = render(<DebugBroadcaster />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("shows NULL style when localStorage is empty", async () => {
    window.localStorage.removeItem("love-sphere-sync");
    render(<DebugBroadcaster />);

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      const nullEl = screen.getByText("NULL");
      expect(nullEl).toHaveClass("text-red-500");
    });
  });

  it("updates origin after mount", async () => {
    render(<DebugBroadcaster />);
    act(() => {
      jest.advanceTimersByTime(10);
    });
    // Default JSDOM origin is http://localhost
    expect(screen.getByText("http://localhost")).toBeInTheDocument();
  });

  it("handles non-Error objects handling in broadcast", async () => {
    // Override setItem to throw a string
    const originalSetItem = window.localStorage.setItem;
    Object.defineProperty(window.localStorage, "setItem", {
      value: () => { throw "String Error"; }, // eslint-disable-line no-throw-literal
      writable: true
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

    try {
      render(<DebugBroadcaster />);
      const btn = screen.getByText("FORCE BROADCAST NOW");
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByText("Error: String Error")).toBeInTheDocument();
      });
    } finally {
      Object.defineProperty(window.localStorage, "setItem", {
        value: originalSetItem,
        writable: true
      });
      consoleSpy.mockRestore();
    }
  });
});
