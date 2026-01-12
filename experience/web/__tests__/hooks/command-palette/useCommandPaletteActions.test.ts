import { renderHook } from "@testing-library/react";
import { useCommandPaletteActions } from "@/hooks/command-palette/useCommandPaletteActions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock sub-hooks
jest.mock("@/hooks/command-palette/actions/useEmotionActions", () => ({
  useEmotionActions: () => ({ executeAction: "mockExecuteAction" }),
}));
jest.mock("@/hooks/command-palette/actions/useJourneyActions", () => ({
  useJourneyActions: () => ({
    executeJourneyCommand: "mockJourney",
    executeWaypointCommand: "mockWaypoint",
  }),
}));
jest.mock("@/hooks/command-palette/actions/useSessionActions", () => ({
  useSessionActions: () => ({ executeSessionCommand: "mockSession" }),
}));
jest.mock("@/hooks/command-palette/actions/useTemplateActions", () => ({
  useTemplateActions: () => ({ executeTemplateCommand: "mockTemplate" }),
}));
jest.mock("@/hooks/command-palette/actions/useQuickActions", () => ({
  useQuickActions: () => ({ executeQuickAction: "mockQuick" }),
}));

jest.mock("@/stores/useAtlasAdminStore");

describe("useCommandPaletteActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ selectMultiple: jest.fn() });
    });
  });

  it("should compose and return all actions", () => {
    const props = {
      close: jest.fn(),
      addToRecent: jest.fn(),
      setCurrentPage: jest.fn(),
      setSearch: jest.fn(),
    };

    const { result } = renderHook(() => useCommandPaletteActions(props));

    expect(result.current.executeAction).toBe("mockExecuteAction");
    expect(result.current.executeQuickAction).toBe("mockQuick");
  });
});
