import { renderHook } from "@testing-library/react";
import { useJourneyCommands } from "@/hooks/command-palette/actions/useJourneyCommands";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";

jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger");

describe("useJourneyCommands", () => {
  const mockClose = jest.fn();
  const mockStartJourney = jest.fn();
  const mockSetState = jest.fn();
  const mockCompleteJourney = jest.fn();
  const mockAbandonJourney = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useExperienceStore as unknown as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      completeJourney: mockCompleteJourney,
      abandonJourney: mockAbandonJourney,
      transitionPath: null,
      activeJourney: null,
    });
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      completeJourney: mockCompleteJourney,
      abandonJourney: mockAbandonJourney,
      transitionPath: null,
      activeJourney: null,
    });
    useExperienceStore.setState = mockSetState;
  });

  const getHook = () => renderHook(() => useJourneyCommands({ close: mockClose }));

  it("should start journey if path available", () => {
    const transitionPath = { path_id: "path-1", waypoints: [1, 2, 3] };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      transitionPath,
      activeJourney: null,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey start");

    expect(mockStartJourney).toHaveBeenCalledWith(expect.stringContaining("journey-"), "path-1", 3);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should generate path_id if missing in transitionPath", () => {
    const transitionPath = { waypoints: [1] }; // No path_id
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      transitionPath,
      activeJourney: null,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey start");

    expect(mockStartJourney).toHaveBeenCalledWith(
      expect.stringContaining("journey-"),
      expect.stringContaining("path-"), // Check fallback generated
      1
    );
  });

  it("should NOT start journey if no path", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      transitionPath: null,
      activeJourney: null,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey start");

    expect(mockStartJourney).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("user-interaction"),
      expect.stringContaining("No path available")
    );
  });

  it("should pause in-progress journey", () => {
    const activeJourney = { status: "in_progress" };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey pause");

    expect(mockSetState).toHaveBeenCalledWith({
      activeJourney: { ...activeJourney, status: "paused" },
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("should resume paused journey", () => {
    const activeJourney = { status: "paused" };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey resume");

    expect(mockSetState).toHaveBeenCalledWith({
      activeJourney: { ...activeJourney, status: "in_progress" },
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("should complete journey", () => {
    const activeJourney = { status: "in_progress" };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney,
      completeJourney: mockCompleteJourney,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey complete");

    expect(mockCompleteJourney).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should abandon journey if confirmed", () => {
    const activeJourney = { status: "in_progress" };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney,
      abandonJourney: mockAbandonJourney,
    });
    window.confirm = jest.fn(() => true);

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey abandon");

    expect(mockAbandonJourney).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should NOT abandon journey if canceled", () => {
    const activeJourney = { status: "in_progress" };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney,
      abandonJourney: mockAbandonJourney,
    });
    window.confirm = jest.fn(() => false);

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey abandon");

    expect(mockAbandonJourney).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should NOT start journey if already in progress", () => {
    const transitionPath = { path_id: "path-1", waypoints: [1, 2, 3] };
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      transitionPath,
      activeJourney: { status: "in_progress" },
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey start");

    expect(mockStartJourney).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("user-interaction"),
      expect.stringContaining("Journey already in progress")
    );
  });
  it("should warn if no path available for journey start", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      startJourney: mockStartJourney,
      transitionPath: null,
      activeJourney: null,
    });

    const { result } = getHook();
    result.current.executeJourneyCommand("/journey start");

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("user-interaction"),
      expect.stringContaining("No path available")
    );
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should ignore pause if journey not in progress", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney: { status: "paused" },
    });
    const { result } = getHook();

    result.current.executeJourneyCommand("/journey pause");
    expect(mockClose).not.toHaveBeenCalled();

    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney: null,
    });
    result.current.executeJourneyCommand("/journey pause");
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should ignore resume if journey not paused", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney: { status: "in_progress" },
    });
    const { result } = getHook();

    result.current.executeJourneyCommand("/journey resume");
    expect(mockClose).not.toHaveBeenCalled();

    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney: null,
    });
    result.current.executeJourneyCommand("/journey resume");
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should ignore complete/abandon if no active journey", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      activeJourney: null,
    });
    const { result } = getHook();

    result.current.executeJourneyCommand("/journey complete");
    expect(mockClose).not.toHaveBeenCalled();

    result.current.executeJourneyCommand("/journey abandon");
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should ignore unknown commands", () => {
    const { result } = getHook();
    result.current.executeJourneyCommand("/journey unknown_garbage");
    expect(mockStartJourney).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });
});
