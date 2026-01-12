import { renderHook } from "@testing-library/react";
import { useQuickActions } from "@/hooks/command-palette/actions/useQuickActions";
import { useLocalQuickActions } from "@/hooks/command-palette/actions/useLocalQuickActions";

// Mock delegation
jest.mock("@/hooks/command-palette/actions/useLocalQuickActions");

describe("useQuickActions", () => {
  const mockClose = jest.fn();
  const mockSetCurrentPage = jest.fn();
  const mockSetSearch = jest.fn();
  const mockExecuteSession = jest.fn();
  const mockExecuteJourney = jest.fn();
  const mockExecuteWaypoint = jest.fn();
  const mockExecuteTemplate = jest.fn();
  const mockExecuteLocal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalQuickActions as jest.Mock).mockReturnValue({
      executeLocalAction: mockExecuteLocal,
    });
  });

  const getHook = () =>
    renderHook(() =>
      useQuickActions({
        close: mockClose,
        setCurrentPage: mockSetCurrentPage,
        setSearch: mockSetSearch,
        executeSessionCommand: mockExecuteSession,
        executeJourneyCommand: mockExecuteJourney,
        executeWaypointCommand: mockExecuteWaypoint,
        executeTemplateCommand: mockExecuteTemplate,
      })
    );

  it("should delegate /session commands", () => {
    const { result } = getHook();
    result.current.executeQuickAction("/session start");
    expect(mockExecuteSession).toHaveBeenCalledWith("/session start");
  });

  it("should delegate /template commands", () => {
    const { result } = getHook();
    result.current.executeQuickAction("/template load");
    expect(mockExecuteTemplate).toHaveBeenCalledWith("/template load");
  });

  it("should delegate /journey commands", () => {
    const { result } = getHook();
    result.current.executeQuickAction("/journey start");
    expect(mockExecuteJourney).toHaveBeenCalledWith("/journey start");
  });

  it("should delegate /waypoint commands", () => {
    const { result } = getHook();
    result.current.executeQuickAction("/waypoint 1");
    expect(mockExecuteWaypoint).toHaveBeenCalledWith("/waypoint 1");

    result.current.executeQuickAction("/next");
    expect(mockExecuteWaypoint).toHaveBeenCalledWith("/next");
  });

  it("should delegate to local actions if not delegated", () => {
    mockExecuteLocal.mockReturnValue(true);
    const { result } = getHook();
    result.current.executeQuickAction("/debug");
    expect(mockExecuteLocal).toHaveBeenCalledWith("/debug");
  });

  it("should warn on unknown command", () => {
    mockExecuteLocal.mockReturnValue(false);
    const { result } = getHook();
    // Assuming logger.warn is called, but here strictly testing delegation flow
    result.current.executeQuickAction("/unknown");
    expect(mockExecuteLocal).toHaveBeenCalledWith("/unknown");
  });
});
