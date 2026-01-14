
import { render, screen, fireEvent } from "@testing-library/react";
import { ActiveJourneyStatus } from "@/components/command-palette/ActiveJourneyStatus";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock store
jest.mock("@/stores/useExperienceStore");
const mockUseExperienceStore = useExperienceStore as unknown as jest.Mock;

describe("ActiveJourneyStatus", () => {
    const mockOnAction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockTransitionPath = {
        current_state: { emotion: "Joy" },
        goal_state: { emotion: "Awe" },
        waypoints: [{}, {}, {}], // 3 waypoints
    };

    it("renders nothing if no active journey or transition path", () => {
        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: null,
            transitionPath: null,
        }));
        const { container } = render(<ActiveJourneyStatus onAction={mockOnAction} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders in_progress status correctly", () => {
        const mockJourney = {
            status: "in_progress",
            current_waypoint: 1,
            total_waypoints: 3,
            waypoints_reached: ["reached_1", "reached_2"],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath,
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        expect(screen.getByText("🛤️")).toBeInTheDocument();
        expect(screen.getByText("Active Journey")).toBeInTheDocument();
        expect(screen.getByText("Joy → Awe")).toBeInTheDocument();
        expect(screen.getByText("Waypoint 2 of 3")).toBeInTheDocument();
        expect(screen.getByTitle("Next waypoint")).toBeInTheDocument();
    });

    it("renders paused status correctly", () => {
        const mockJourney = {
            status: "paused",
            current_waypoint: 1,
            total_waypoints: 3,
            waypoints_reached: ["reached_1"],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath,
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        expect(screen.getByText("⏸️")).toBeInTheDocument();
        expect(screen.getByText("Journey Paused")).toBeInTheDocument();
        expect(screen.getByTitle("Resume journey")).toBeInTheDocument();
    });

    it("renders completed status correctly", () => {
        const mockJourney = {
            status: "completed",
            current_waypoint: 3,
            total_waypoints: 3,
            waypoints_reached: ["reached_1", "reached_2", "reached_3"],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath,
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        expect(screen.getByText("✅")).toBeInTheDocument();
        expect(screen.getByText("Journey Complete")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders default status fallback", () => {
        const mockJourney = {
            status: "unknown",
            current_waypoint: 0,
            total_waypoints: 3,
            waypoints_reached: [],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath,
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        expect(screen.getByText("🚶")).toBeInTheDocument();
        expect(screen.getByText("Journey")).toBeInTheDocument();
    });

    it("handles next action click", () => {
        const mockJourney = {
            status: "in_progress",
            current_waypoint: 1,
            total_waypoints: 3,
            waypoints_reached: ["reached_1", "reached_2"],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath,
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        fireEvent.click(screen.getByTitle("Next waypoint"));
        expect(mockOnAction).toHaveBeenCalledWith("/next");
    });

    it("handles resume action click", () => {
        const mockJourney = {
            status: "paused",
            current_waypoint: 1,
            total_waypoints: 3,
            waypoints_reached: ["reached_1"],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath,
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        fireEvent.click(screen.getByTitle("Resume journey"));
        expect(mockOnAction).toHaveBeenCalledWith("/journey resume");
    });

    it("does not show Next button if on last waypoint of transition path logic check", () => {
        // Logic in component: activeJourney.current_waypoint < transitionPath.waypoints.length
        // If activeJourney.current_waypoint is 3 and waypoints length is 3, it should hide?
        // Wait, current_waypoint is 0-indexed usually? "Waypoint {activeJourney.current_waypoint + 1}" implies 0-indexed.
        // If we are at the last one, current_waypoint = 2 (for length 3). 2 < 3 is true.
        // If we are finished? usually status changes.

        const mockJourney = {
            status: "in_progress",
            current_waypoint: 3, // Beyond or at end
            total_waypoints: 3,
            waypoints_reached: ["1", "2", "3"],
        };

        mockUseExperienceStore.mockImplementation((selector: any) => selector({
            activeJourney: mockJourney,
            transitionPath: mockTransitionPath, // length 3
        }));

        render(<ActiveJourneyStatus onAction={mockOnAction} />);

        // Condition: activeJourney.current_waypoint < transitionPath.waypoints.length
        // 3 < 3 is false -> button hidden
        expect(screen.queryByTitle("Next waypoint")).not.toBeInTheDocument();
    });
});
