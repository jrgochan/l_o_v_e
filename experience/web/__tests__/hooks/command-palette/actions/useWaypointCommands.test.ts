import { renderHook } from "@testing-library/react";
import { useWaypointCommands } from "@/hooks/command-palette/actions/useWaypointCommands";
import { useExperienceStore } from "@/stores/useExperienceStore";

jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger");

describe("useWaypointCommands", () => {
  const mockClose = jest.fn();
  const mockMarkWaypointReached = jest.fn();
  const mockSetState = jest.fn();

  const mockTransitionPath = {
    path_id: "path-1",
    waypoints: ["0", "1", "2", "3", "4"], // 5 waypoints
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useExperienceStore as unknown as jest.Mock).mockReturnValue({
      transitionPath: mockTransitionPath,
      activeJourney: {
        status: "in_progress",
        current_waypoint: 0,
        waypoints_reached: [],
      },
      markWaypointReached: mockMarkWaypointReached,
    });
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      transitionPath: mockTransitionPath,
      activeJourney: {
        status: "in_progress",
        current_waypoint: 0,
        waypoints_reached: [],
      },
      markWaypointReached: mockMarkWaypointReached,
    });
    useExperienceStore.setState = mockSetState;
  });

  const getHook = () => renderHook(() => useWaypointCommands({ close: mockClose }));

  it("should handle /next", () => {
    const { result } = getHook();
    // current 0 -> next calls markWaypointReached(0) because that marks 0 as "reached" and moves to 1?
    // Logic: const nextIndex = activeJourney.current_waypoint; markWaypointReached(nextIndex);
    result.current.executeWaypointCommand("/next");

    expect(mockMarkWaypointReached).toHaveBeenCalledWith(0);
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle /previous", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      transitionPath: mockTransitionPath,
      activeJourney: {
        status: "in_progress",
        current_waypoint: 2,
        waypoints_reached: [0, 1],
      },
    });

    const { result } = getHook();
    result.current.executeWaypointCommand("/previous");

    expect(mockSetState).toHaveBeenCalledWith({
      activeJourney: expect.objectContaining({
        current_waypoint: 1,
        waypoints_reached: [0],
      }),
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle /waypoint N", () => {
    (useExperienceStore.getState as jest.Mock).mockReturnValue({
      transitionPath: mockTransitionPath,
      activeJourney: {
        status: "in_progress",
        current_waypoint: 3,
        waypoints_reached: [0, 1, 2],
      },
    });

    const { result } = getHook();
    result.current.executeWaypointCommand("/waypoint 2"); // jump back to index 1

    expect(mockSetState).toHaveBeenCalledWith({
      activeJourney: expect.objectContaining({
        current_waypoint: 1, // /waypoint 2 => index 1
        waypoints_reached: [0],
      }),
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("should ignore invalid commands", () => {
    const { result } = getHook();
    result.current.executeWaypointCommand("/unknown");
    expect(mockMarkWaypointReached).not.toHaveBeenCalled();
  });
});
