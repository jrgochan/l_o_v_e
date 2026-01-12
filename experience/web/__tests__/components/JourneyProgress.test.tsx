/**
 * Tests for JourneyProgress Component
 *
 * Tests the journey tracking UI that shows progress through emotional waypoints.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneyProgress } from "@/components/JourneyProgress";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { act } from "@testing-library/react";
import { mockTransitionPath, mockJourney, mockCompletedJourney } from "../utils/fixtures";

// Mock window.alert and window.confirm
global.alert = jest.fn();
global.confirm = jest.fn();

describe("JourneyProgress", () => {
  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
    jest.clearAllMocks();
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
      expect(screen.getByText("Progress")).toBeInTheDocument();
    });

    it("displays progress bar", () => {
      const { container } = render(<JourneyProgress />);

      // Find progress bar
      const progressBar = container.querySelector(".bg-gradient-to-r.from-purple-500.to-green-500");
      expect(progressBar).toBeInTheDocument();
    });

    it("shows waypoints reached count", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/0 of 2 waypoints reached/i)).toBeInTheDocument();
    });

    it("displays time elapsed", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/min elapsed/i)).toBeInTheDocument();
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
      expect(screen.getByText(/Gradual reduction in arousal/i)).toBeInTheDocument();
    });

    it("shows waypoint time estimate", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/20-30 minutes/i)).toBeInTheDocument();
    });

    it("shows waypoint difficulty", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/moderate/i)).toBeInTheDocument();
    });

    it("shows mark as reached button", () => {
      render(<JourneyProgress />);
      expect(screen.getByRole("button", { name: /Mark as Reached/i })).toBeInTheDocument();
    });
  });

  describe("Mark Waypoint as Reached", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("marks waypoint when button clicked", async () => {
      const user = userEvent.setup();
      render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Mark as Reached/i });
      await user.click(button);

      // Click Skip Feedback in the modal
      const skipButton = screen.getByRole("button", { name: /Skip Feedback/i });
      await user.click(skipButton);

      const store = useExperienceStore.getState();
      expect(store.activeJourney?.waypoints_reached).toContain(0);
      expect(store.activeJourney?.current_waypoint).toBe(1);
    });

    it("updates progress bar when waypoint reached", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Mark as Reached/i });
      await user.click(button);

      // Click Skip Feedback in the modal
      const skipButton = screen.getByRole("button", { name: /Skip Feedback/i });
      await user.click(skipButton);

      rerender(<JourneyProgress />);
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 waypoints reached/i)).toBeInTheDocument();
    });

    it("shows alert when journey complete", async () => {
      const user = userEvent.setup();

      // Start with only one waypoint left
      act(() => {
        useExperienceStore.setState({
          activeJourney: {
            ...mockJourney,
            current_waypoint: 1,
            waypoints_reached: [0],
          },
          transitionPath: mockTransitionPath as any,
        });
      });

      render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Mark as Reached/i });
      await user.click(button);

      // Click Skip Feedback in the modal
      const skipButton = screen.getByRole("button", { name: /Skip Feedback/i });
      await user.click(skipButton);

      await waitFor(
        () => {
          expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("Journey Complete"));
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Waypoint List", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("displays all waypoints", () => {
      render(<JourneyProgress />);

      expect(screen.getAllByText("Worry").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Acceptance")).toBeInTheDocument();
    });

    it("shows current waypoint with special styling", () => {
      const { container } = render(<JourneyProgress />);

      // Current waypoint should have purple border
      const waypoints = container.querySelectorAll(".border-purple-500");
      expect(waypoints.length).toBeGreaterThan(0);
    });

    it("shows reached waypoints with checkmark", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Mark as Reached/i });
      await user.click(button);

      // Click Skip Feedback in the modal
      const skipButton = screen.getByRole("button", { name: /Skip Feedback/i });
      await user.click(skipButton);

      rerender(<JourneyProgress />);
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("shows locked icon for future waypoints", () => {
      render(<JourneyProgress />);

      // Second waypoint should be locked
      expect(screen.getByText("🔒")).toBeInTheDocument();
    });
  });

  describe("Completed Journey", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockCompletedJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("shows completion message", () => {
      render(<JourneyProgress />);

      expect(screen.getByText("Journey Complete!")).toBeInTheDocument();
      expect(screen.getByText("🎉")).toBeInTheDocument();
    });

    it("displays goal emotion in completion message", () => {
      render(<JourneyProgress />);
      expect(screen.getByText(/successfully reached Calm/i)).toBeInTheDocument();
    });

    it("does not show mark as reached button when complete", () => {
      render(<JourneyProgress />);
      expect(screen.queryByRole("button", { name: /Mark as Reached/i })).not.toBeInTheDocument();
    });

    it("does not show abandon button when complete", () => {
      render(<JourneyProgress />);
      expect(screen.queryByRole("button", { name: /Abandon Journey/i })).not.toBeInTheDocument();
    });
  });

  describe("Abandon Journey", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("shows abandon button for in-progress journey", () => {
      render(<JourneyProgress />);
      expect(screen.getByRole("button", { name: /Abandon Journey/i })).toBeInTheDocument();
    });

    it("confirms before abandoning", async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Abandon Journey/i });
      await user.click(button);

      expect(global.confirm).toHaveBeenCalledWith("Are you sure you want to abandon this journey?");
    });

    it("abandons journey when confirmed", async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Abandon Journey/i });
      await user.click(button);

      const store = useExperienceStore.getState();
      expect(store.activeJourney).toBeNull();
    });

    it("does not abandon when cancelled", async () => {
      const user = userEvent.setup();
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<JourneyProgress />);

      const button = screen.getByRole("button", { name: /Abandon Journey/i });
      await user.click(button);

      const store = useExperienceStore.getState();
      expect(store.activeJourney).not.toBeNull();
    });
  });

  describe("Progress Calculation", () => {
    it("shows 0% when no waypoints reached", () => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: { ...mockJourney, waypoints_reached: [] },
          transitionPath: mockTransitionPath as any,
        });
      });

      render(<JourneyProgress />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("shows 50% when halfway through", () => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: { ...mockJourney, waypoints_reached: [0], current_waypoint: 1 },
          transitionPath: mockTransitionPath as any,
        });
      });

      render(<JourneyProgress />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("shows 100% when all waypoints reached", () => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockCompletedJourney,
          transitionPath: mockTransitionPath as any,
        });
      });

      render(<JourneyProgress />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      act(() => {
        useExperienceStore.setState({
          activeJourney: mockJourney,
          transitionPath: mockTransitionPath as any,
        });
      });
    });

    it("has proper heading", () => {
      render(<JourneyProgress />);
      const heading = screen.getByRole("heading", { name: /Journey in Progress/i });
      expect(heading).toBeInTheDocument();
    });

    it("buttons are keyboard accessible", () => {
      render(<JourneyProgress />);

      const markButton = screen.getByRole("button", { name: /Mark as Reached/i });
      expect(markButton).not.toHaveAttribute("tabindex", "-1");

      const abandonButton = screen.getByRole("button", { name: /Abandon Journey/i });
      expect(abandonButton).not.toHaveAttribute("tabindex", "-1");
    });
  });
});
