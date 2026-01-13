/**
 * Tests for JourneyProgress Component
 *
 * Tests the journey tracking UI that shows progress through emotional waypoints.
 */

import { render, screen, waitFor, act, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneyProgress } from "@/components/JourneyProgress";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { mockTransitionPath, mockJourney, mockCompletedJourney } from "../utils/fixtures";

// Mock dependencies
jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("@love/experience-shared", () => ({
  getObserverClient: jest.fn(() => ({
    config: { baseUrl: "http://api.test" },
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert and window.confirm
global.alert = jest.fn();
global.confirm = jest.fn();

// Re-write with mocked Child Component for robust testing of PARENT logic
jest.mock("@/components/StrategyFeedbackModal", () => ({
  StrategyFeedbackModal: ({ onSubmit, onSkip, onClose }: any) => (
    <div data-testid="feedback-modal">
      <button onClick={() => onSubmit([{ strategyId: "test", rating: 5, notes: "Good" }])}>
        Simulate Submit
      </button>
      <button onClick={onSkip}>Simulate Skip</button>
      <button onClick={onClose}>Simulate Close</button>
    </div>
  )
}));

describe("JourneyProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  describe("Rendering - No Journey", () => {
    it("renders nothing when no active journey", () => {
      const { container } = render(<JourneyProgress />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when journey exists but no path", () => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: null,
        });
      });

      const { container } = render(<JourneyProgress />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Rendering - Active Journey", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("renders journey title", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/Journey in Progress/i)).toBeInTheDocument();
    });

    it("displays progress percentage", () => {
      render(<JourneyProgress />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("displays progress bar", () => {
      const { container } = render(<JourneyProgress />);
      const progressBar = container.querySelector(".bg-gradient-to-r.from-purple-500.to-green-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("shows waypoints reached count", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/0 of 2 waypoints reached/i)).toBeInTheDocument();
    });
  });

  describe("Current Waypoint Display", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("shows current waypoint information", () => {
      render(<JourneyProgress />);
      expect(screen.getByText("Current Waypoint:")).toBeInTheDocument();
      expect(screen.getAllByText("Worry").length).toBeGreaterThanOrEqual(1);
    });

    it("shows mark as reached button", () => {
      render(<JourneyProgress />);
      expect(screen.getByRole("button", { name: /Mark as Reached/i })).toBeInTheDocument();
    });
  });

  describe("Mark Waypoint as Reached (Integration)", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("opens modal and handles skip functionality", async () => {
      const user = userEvent.setup();
      render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Mark as Reached/i });
      await user.click(button);

      const skipButton = screen.getByText("Simulate Skip");
      expect(skipButton).toBeInTheDocument();

      await user.click(skipButton);

      const store = useExperienceStore.getState();
      expect(store.activeJourney?.waypoints_reached).toContain(0);
      expect(store.activeJourney?.current_waypoint).toBe(1);
    });
  });

  describe("JourneyProgress Logic (Mocked Modal)", () => {
    beforeEach(() => {
      const { reset } = useExperienceStore.getState();
      act(() => reset());
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("submits feedback to API and updates store", async () => {
      // Use fireEvent for immediate/synchronous events with the mock
      render(<JourneyProgress />);

      // Open
      fireEvent.click(screen.getByRole("button", { name: /Mark as Reached/i }));

      // Submit via mock
      fireEvent.click(screen.getByText("Simulate Submit"));

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/observer/journey/journey-123/waypoint-reached"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("strategies_tried")
        })
      );

      // Verify Store updated
      await waitFor(() => {
        const store = useExperienceStore.getState();
        expect(store.activeJourney?.waypoints_reached).toContain(0);
      });
    });

    it("handles API failure gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("API Error"));
      const { logger } = require("@/utils/logger");

      render(<JourneyProgress />);

      // Open & Submit
      fireEvent.click(screen.getByRole("button", { name: /Mark as Reached/i }));

      await act(async () => {
        fireEvent.click(screen.getByText("Simulate Submit"));
      });

      // Verify error handling
      expect(logger.error).toHaveBeenCalledWith("api", "Failed to submit feedback", expect.any(Error));
      expect(screen.getByText(/Failed to submit feedback/i)).toBeInTheDocument();

      // Store NOT updated
      const store = useExperienceStore.getState();
      expect(store.activeJourney?.waypoints_reached).not.toContain(0);
    });

    it("completes journey on last waypoint submission", async () => {
      jest.useFakeTimers();

      // State: Last waypoint is current
      act(() => {
        useExperienceStore.setState({
          activeJourney: {
            ...mockJourney,
            current_waypoint: 1, // Last one (total 2)
            waypoints_reached: [0]
          },
        });
      });

      render(<JourneyProgress />);

      // Open & Submit
      fireEvent.click(screen.getByRole("button", { name: /Mark as Reached/i }));

      await act(async () => {
        fireEvent.click(screen.getByText("Simulate Submit"));
      });

      // Fast forward timeout
      act(() => {
        jest.runAllTimers();
      });

      // Verify Completion
      const store = useExperienceStore.getState();
      expect(store.activeJourney?.status).toBe("completed");
      expect(global.alert).toHaveBeenCalled();
    });

    it("completes journey on last waypoint skip", async () => {
      jest.useFakeTimers();

      act(() => {
        useExperienceStore.setState({
          activeJourney: {
            ...mockJourney,
            current_waypoint: 1,
            waypoints_reached: [0]
          },
        });
      });

      render(<JourneyProgress />);

      // Open & Skip
      fireEvent.click(screen.getByRole("button", { name: /Mark as Reached/i }));

      act(() => {
        fireEvent.click(screen.getByText("Simulate Skip"));
      });

      // Fast forward timeout
      act(() => {
        jest.runAllTimers();
      });

      // Verify Completion
      const store = useExperienceStore.getState();
      expect(store.activeJourney?.status).toBe("completed");
    });

    it("closes modal without action", () => {
      render(<JourneyProgress />);

      fireEvent.click(screen.getByRole("button", { name: /Mark as Reached/i }));
      expect(screen.getByTestId("feedback-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Simulate Close"));
      expect(screen.queryByTestId("feedback-modal")).not.toBeInTheDocument();
    });

    it("abandons journey", async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<JourneyProgress />);

      await user.click(screen.getByRole("button", { name: /Abandon Journey/i }));

      expect(useExperienceStore.getState().activeJourney).toBeNull();
    });

    it("does not abandon when cancelled", async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<JourneyProgress />);

      await user.click(screen.getByRole("button", { name: /Abandon Journey/i }));

      expect(useExperienceStore.getState().activeJourney).not.toBeNull();
    });
  });
});
