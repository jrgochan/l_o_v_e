
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrategyCard } from "@/components/admin/chat/StrategyCard";
import { StrategyRecommendation } from "@/types/chat";

describe("StrategyCard", () => {
    const mockStrategies: StrategyRecommendation[] = [
        {
            strategy_id: "strat-1",
            name: "Deep Breathing",
            description: "Take slow deep breaths",
            difficulty_level: 1,
            rationale: "High arousal detected",
        },
        {
            strategy_id: "strat-2",
            name: "Cognitive Reframing",
            description: "Challenge negative thoughts",
            difficulty_level: 3,
            rationale: "Negative valence detected",
        },
    ];

    it("renders all strategies", () => {
        render(<StrategyCard strategies={mockStrategies} />);

        expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
        expect(screen.getByText("Cognitive Reframing")).toBeInTheDocument();
    });

    it("displays strategy details correcty", () => {
        render(<StrategyCard strategies={mockStrategies} />);

        expect(screen.getByText("Iv. 1")).toBeInTheDocument();
        expect(screen.getByText("Take slow deep breaths")).toBeInTheDocument();
        expect(screen.getByText('"High arousal detected"')).toBeInTheDocument();
    });

    it("does not render if strategies array is empty", () => {
        const { container } = render(<StrategyCard strategies={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it("should call onSelect when the button is clicked", () => {
        const mockOnSelect = jest.fn();
        render(<StrategyCard strategies={mockStrategies} onSelect={mockOnSelect} />);

        const buttons = screen.getAllByText("Apply Strategy");
        fireEvent.click(buttons[0]);

        expect(mockOnSelect).toHaveBeenCalledWith(mockStrategies[0]);
    });
});
