
import { render, screen, fireEvent } from "@testing-library/react";
import { RecommendationsPanel } from "@/components/admin/settings/RecommendationsPanel";

const mockRecommendations = {
  "chat_response": {
    recommended: ["llama3", "mistral"],
    not_recommended: ["gpt2"],
    reasoning: "Llama3 performs best for chat."
  },
  "sentiment_analysis": {
    recommended: ["bert"],
    not_recommended: [],
    reasoning: "BERT is specialized."
  }
};

const mockAssignments = {
  "chat_response": "gpt2", // Should be actionable (using not recommended)
  "sentiment_analysis": "bert" // Should be okay (using recommended)
};

describe("RecommendationsPanel", () => {
  const mockOnApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no recommendations", () => {
    render(
      <RecommendationsPanel
        recommendations={{}}
        currentAssignments={mockAssignments}
        onApplyRecommendation={mockOnApply}
      />
    );
    expect(screen.getByText("No recommendations available. Add more models to see suggestions.")).toBeInTheDocument();
  });

  it("renders recommendations correctly", () => {
    render(
      <RecommendationsPanel
        recommendations={mockRecommendations}
        currentAssignments={mockAssignments}
        onApplyRecommendation={mockOnApply}
      />
    );

    expect(screen.getByText("Chat Response")).toBeInTheDocument();
    expect(screen.getByText("Sentiment Analysis")).toBeInTheDocument();

    // Check for reasoning text
    expect(screen.getByText("Llama3 performs best for chat.")).toBeInTheDocument();
  });

  it("shows actionable items correctly", () => {
    render(
      <RecommendationsPanel
        recommendations={mockRecommendations}
        currentAssignments={mockAssignments}
        onApplyRecommendation={mockOnApply}
      />
    );

    // Chat Response is using "gpt2" which is in not_recommended
    // So it should show Action Recommended badge
    // We need to find the card container or context, but simple text check works for uniqueness here
    const chatHeader = screen.getAllByText("Chat Response")[0].closest('div')?.parentElement;
    expect(screen.getByText("Action Recommended")).toBeInTheDocument();

    // It should offer to switch to top recommendation (llama3)
    const switchButton = screen.getByRole("button", { name: "Switch to llama3" });
    expect(switchButton).toBeInTheDocument();
  });

  it("shows non-actionable items correctly", () => {
    render(
      <RecommendationsPanel
        recommendations={mockRecommendations}
        currentAssignments={mockAssignments}
        onApplyRecommendation={mockOnApply}
      />
    );

    // Sentiment Analysis is using "bert" which is recommended
    // Should NOT show switch button
    expect(screen.queryByRole("button", { name: "Switch to bert" })).not.toBeInTheDocument();

    // Should show success message
    expect(screen.getByText("✓ Already using recommended model")).toBeInTheDocument();
  });

  it("calls onApplyRecommendation when button clicked", () => {
    render(
      <RecommendationsPanel
        recommendations={mockRecommendations}
        currentAssignments={mockAssignments}
        onApplyRecommendation={mockOnApply}
      />
    );

    const switchButton = screen.getByRole("button", { name: "Switch to llama3" });
    fireEvent.click(switchButton);

    expect(mockOnApply).toHaveBeenCalledWith("chat_response", "llama3");
  });

  it("renders warning badges for not recommended models", () => {
    render(
      <RecommendationsPanel
        recommendations={mockRecommendations}
        currentAssignments={mockAssignments}
        onApplyRecommendation={mockOnApply}
      />
    );

    // "gpt2" is used and not recommended. It should have a warning icon or style.
    // The component renders "⚠" for current bad selection.
    // We can check for "gpt2 ⚠" text content
    const gpt2Badges = screen.getAllByText((content, element) => {
      return element?.textContent === "gpt2⚠";
    });
    expect(gpt2Badges.length).toBeGreaterThan(0);
  });
});
