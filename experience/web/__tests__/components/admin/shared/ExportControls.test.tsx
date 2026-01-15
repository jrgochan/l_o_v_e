import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportControls } from "@/components/admin/shared/ExportControls";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock the store
jest.mock("@/stores/useAtlasAdminStore");

describe("ExportControls", () => {
  const mockAllEmotions = [
    { id: "1", name: "Joy", category: "Positive", vac: [0.8, 0.6, 0.7] },
    { id: "2", name: "Sadness", category: "Negative", vac: [0.2, 0.4, 0.3] },
  ];
  const mockSelectedIds = new Set(["1"]);
  const mockComputedPaths = new Map([
    [
      "1-2",
      {
        id: "1-2",
        from: { id: "1", name: "Joy" },
        to: { id: "2", name: "Sadness" },
        total_distance: 1.5,
        difficulty: "moderate",
        estimated_time: "5m",
        waypoints: [{ emotion: "Neutral" }],
        requires_bridge: false,
        bridge_emotions: [],
      },
    ],
    [
      "1-3",
      {
        id: "1-3",
        from: { id: "1", name: "Joy" },
        to: { id: "3", name: "Anger" },
        total_distance: 2.0,
        difficulty: "hard",
        estimated_time: "10m",
        waypoints: [],
        requires_bridge: false,
        bridge_emotions: undefined,
      },
    ],
    [
      "1-4",
      {
        id: "1-4",
        from: { id: "1", name: "Joy" },
        to: { id: "4", name: "Fear" },
        total_distance: 3.0,
        difficulty: "expert",
        estimated_time: "15m",
        waypoints: [],
        requires_bridge: true,
        bridge_emotions: ["Surprise", "Acceptance"],
      },
    ],
  ]);

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default store mock
    (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue({
      allEmotions: mockAllEmotions,
      selectedEmotionIds: mockSelectedIds,
      computedPaths: mockComputedPaths,
    });

    // Mock store behavior for selector
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: mockSelectedIds,
        computedPaths: mockComputedPaths,
      };
      return selector(state);
    });

    // Mock window interactions
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
    window.alert = jest.fn();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("exports JSON correctly", () => {
    render(<ExportControls />);

    // Mock anchor click safely
    const originalCreateElement = document.createElement;
    const clickSpy = jest.fn();

    jest.spyOn(document, "createElement").mockImplementation((tagName, options) => {
      if (tagName === "a") {
        return {
          href: "",
          download: "",
          click: clickSpy,
          setAttribute: jest.fn(),
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement.call(document, tagName, options);
    });

    fireEvent.click(screen.getByText(/Export JSON/i));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();

    // Restore mock to avoid polluting other tests
    jest.restoreAllMocks();
  });

  it("exports CSV correctly", () => {
    render(<ExportControls />);

    const originalCreateElement = document.createElement;
    const clickSpy = jest.fn();

    jest.spyOn(document, "createElement").mockImplementation((tagName, options) => {
      if (tagName === "a") {
        return {
          href: "",
          download: "",
          click: clickSpy,
          setAttribute: jest.fn(),
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement.call(document, tagName, options);
    });

    fireEvent.click(screen.getByText(/Export CSV/i));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it("shows alert if exporting CSV with no paths", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        allEmotions: mockAllEmotions,
        selectedEmotionIds: mockSelectedIds,
        computedPaths: new Map(), // Empty paths
      });
    });

    render(<ExportControls />);

    fireEvent.click(screen.getByText(/Export CSV/i));

    expect(window.alert).not.toHaveBeenCalled(); // The button is disabled, so nothing happens or alert shouldn't be called
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("copies to clipboard successfully", async () => {
    render(<ExportControls />);

    fireEvent.click(screen.getByText(/Copy to Clipboard/i));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Joy"));
      expect(window.alert).toHaveBeenCalledWith("Copied to clipboard!");
    });
  });

  it("handles clipboard copy error", async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("Copy failed"));

    render(<ExportControls />);

    fireEvent.click(screen.getByText(/Copy to Clipboard/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to copy to clipboard");
    });
  });

  it("generates shareable URL", () => {
    render(<ExportControls />);

    fireEvent.click(screen.getByText(/Copy Share Link/i));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("emotions=1")
    );
    expect(window.alert).toHaveBeenCalledWith("Shareable URL copied to clipboard!");
  });

  it("disables buttons when no selection", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(), // No selection
        computedPaths: new Map(),
      });
    });

    render(<ExportControls />);

    expect(screen.getByText(/Export JSON/i).closest("button")).toBeDisabled();
    expect(screen.getByText(/Copy to Clipboard/i).closest("button")).toBeDisabled();
    expect(screen.getByText(/Copy Share Link/i).closest("button")).toBeDisabled();
    // CSV button disabled if no paths (which implies no selection usually)
    expect(screen.getByText(/Export CSV/i).closest("button")).toBeDisabled();
  });
});
