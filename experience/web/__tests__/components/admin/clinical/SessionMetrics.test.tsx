import { render, screen } from "@testing-library/react";
import { SessionMetricsDisplay } from "@/components/admin/clinical/SessionMetrics";
import type { SessionMetrics } from "@/types/chat";

const MOCK_METRICS: SessionMetrics = {
    sessionId: "123",
    startTime: 1000,
    elapsedSeconds: 125, // 2:05
    emotionCount: 15,
    averageConfidence: 0.85,
    dominantCategory: "Positive",
    alertCount: { critical: 1, warning: 2, attention: 0 },
    emotionalShiftRate: 0.5
};

describe("SessionMetricsDisplay", () => {
    describe("Compact Mode", () => {
        it("should render summary metrics", () => {
            render(<SessionMetricsDisplay sessionMetrics={MOCK_METRICS} isExpanded={false} />);

            expect(screen.getByText("2:05")).toBeInTheDocument();
            expect(screen.getByText("15")).toBeInTheDocument();
            expect(screen.getByText("85%")).toBeInTheDocument();
            expect(screen.getByText("Positive")).toBeInTheDocument();
        });

        it("should not show alert badges in compact mode", () => {
            render(<SessionMetricsDisplay sessionMetrics={MOCK_METRICS} isExpanded={false} />);
            expect(screen.queryByText(/Critical/)).not.toBeInTheDocument();
        });
    });

    describe("Expanded Mode", () => {
        it("should render detailed metric blocks with labels", () => {
            render(<SessionMetricsDisplay sessionMetrics={MOCK_METRICS} isExpanded={true} />);

            expect(screen.getByText("Session Duration")).toBeInTheDocument();
            expect(screen.getByText("Emotions Analyzed")).toBeInTheDocument();
            expect(screen.getByText("Avg Confidence")).toBeInTheDocument();
            expect(screen.getByText("Primary Category")).toBeInTheDocument();
        });

        it("should display alert counts", () => {
            render(<SessionMetricsDisplay sessionMetrics={MOCK_METRICS} isExpanded={true} />);

            expect(screen.getByText(/1 Critical/)).toBeInTheDocument();
            expect(screen.getByText(/2 Warning/)).toBeInTheDocument();
            expect(screen.queryByText(/Attention/)).not.toBeInTheDocument(); // 0 count
        });

        it("should render confidence visualization bar", () => {
            const { container } = render(<SessionMetricsDisplay sessionMetrics={MOCK_METRICS} isExpanded={true} />);

            // Check for the progress bar element style
            // We can look for the style attribute directly or a class
            const bar = container.querySelector('.bg-green-500'); // 85% is green
            expect(bar).toBeInTheDocument();
            expect(bar).toHaveStyle({ width: '85%' });
        });

        it("should use correct colors for confidence levels", () => {
            // Yellow test
            const mediumMetrics = { ...MOCK_METRICS, averageConfidence: 0.65 };
            const { container: c1 } = render(<SessionMetricsDisplay sessionMetrics={mediumMetrics} isExpanded={true} />);
            expect(c1.querySelector('.bg-yellow-500')).toBeInTheDocument();

            // Red test
            const lowMetrics = { ...MOCK_METRICS, averageConfidence: 0.4 };
            const { container: c2 } = render(<SessionMetricsDisplay sessionMetrics={lowMetrics} isExpanded={true} />);
            expect(c2.querySelector('.bg-red-500')).toBeInTheDocument();
        });
    });
});
