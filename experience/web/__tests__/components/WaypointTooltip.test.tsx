import { render, screen } from "@testing-library/react";
import { WaypointTooltip } from "../../components/WaypointTooltip";

describe("WaypointTooltip", () => {
    const mockWaypoint = {
        emotion: "Hope",
        reasoning: "A good start",
        estimated_time: "2m",
        difficulty: "easy",
        vac: [0.5, 0.5, 0.5] as [number, number, number],
        strategies: [
            { name: "Breathe", time_required: "30s" }
        ]
    };

    const defaultProps = {
        waypoint: mockWaypoint,
        position: { x: 100, y: 100 },
        waypointState: "current" as const
    };

    it("should render waypoint details", () => {
        render(<WaypointTooltip {...defaultProps} />);

        expect(screen.getByText("Hope")).toBeInTheDocument();
        expect(screen.getByText("A good start")).toBeInTheDocument();
        expect(screen.getByText("2m")).toBeInTheDocument();
        expect(screen.getByText("easy")).toBeInTheDocument();
        expect(screen.getByText("Current Step")).toBeInTheDocument();
    });

    it("should render strategies details", () => {
        render(<WaypointTooltip {...defaultProps} />);

        expect(screen.getByText((content) => content.includes("1") && content.includes("Strategy Available"))).toBeInTheDocument();
        expect(screen.getByText("Breathe")).toBeInTheDocument();
        expect(screen.getByText("(30s)")).toBeInTheDocument();
    });

    it("should position correctly", () => {
        const { container } = render(<WaypointTooltip {...defaultProps} />);
        const tooltip = container.firstChild as HTMLElement;

        expect(tooltip).toHaveStyle({ left: "120px", top: "40px" }); // x+20, y-60
    });

    it("should handle different states", () => {
        const { rerender } = render(<WaypointTooltip {...defaultProps} waypointState="locked" />);
        expect(screen.getByText("Locked")).toBeInTheDocument();

        rerender(<WaypointTooltip {...defaultProps} waypointState="goal" />);
        expect(screen.getByText("Goal")).toBeInTheDocument();
    });
});
