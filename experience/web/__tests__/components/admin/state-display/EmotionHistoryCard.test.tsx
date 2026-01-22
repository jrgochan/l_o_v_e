import { render, screen, fireEvent } from "@testing-library/react";
import { EmotionHistoryCard } from "@/components/admin/state-display/EmotionHistoryCard";
import type { EmotionHistoryEntry } from "@/stores/useEmotionHistoryStore";

// Mock the store
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: jest.fn(),
}));
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

describe("EmotionHistoryCard", () => {
  const mockEntry: EmotionHistoryEntry = {
    id: "1",
    emotion: "Joy",
    confidence: 0.95,
    timestamp: new Date("2024-01-01T12:00:00"),
    category: "joy",
    vac: { valence: 0.8, arousal: 0.5, connection: 0.7 },
    isVisibleInSphere: true,
    transcription: "I am so happy",
    messageId: "msg-1",
  };

  const onToggleVisibility = jest.fn();
  const onRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: [
          { name: "Joy", category: "joy", vac: [0.8, 0.5, 0.7] },
          { name: "Sadness", category: "sadness", vac: [-0.6, -0.4, -0.2] },
        ],
      };
      return selector(state);
    });
  });

  it("renders basic info", () => {
    render(
      <EmotionHistoryCard
        entry={mockEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("joy")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("12:00 PM")).toBeInTheDocument();
  });

  it("handles visibility toggle", () => {
    render(
      <EmotionHistoryCard
        entry={mockEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    const checkbox = screen.getByTitle("Toggle visibility in Soul Sphere");
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleVisibility).toHaveBeenCalledWith("1");
  });

  it("handles remove", () => {
    render(
      <EmotionHistoryCard
        entry={mockEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    const removeBtn = screen.getByTitle("Remove from history");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("expands to show details", () => {
    render(
      <EmotionHistoryCard
        entry={mockEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );

    // Initially details hidden
    expect(screen.queryByText("Valence")).not.toBeInTheDocument();

    // Click to expand (using button wrapping the title)
    fireEvent.click(screen.getByText("Joy"));

    expect(screen.getByText("Valence")).toBeInTheDocument();
    expect(screen.getByText("0.80")).toBeInTheDocument();
    expect(screen.getByText("Context:")).toBeInTheDocument();
    expect(screen.getByText('"I am so happy"')).toBeInTheDocument();
  });

  it("applies confidence colors correctly", () => {
    // High confidence (Green) is default mock
    const { rerender } = render(
      <EmotionHistoryCard
        entry={mockEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText("95%")).toHaveClass("text-green-400");

    // Medium
    rerender(
      <EmotionHistoryCard
        entry={{ ...mockEntry, confidence: 0.7 }}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText("70%")).toHaveClass("text-yellow-400");

    // Low
    rerender(
      <EmotionHistoryCard
        entry={{ ...mockEntry, confidence: 0.4 }}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText("40%")).toHaveClass("text-orange-400");
  });

  it("handles unknown category", () => {
    const unknownEntry = { ...mockEntry, id: "u1", category: "UnknownXYZ" };
    render(
      <EmotionHistoryCard
        entry={unknownEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    // Should render without error and fall back to default color
    // We can verify category text
    expect(screen.getByText("UnknownXYZ")).toBeInTheDocument();
  });

  it("applies correct border style based on visibility", () => {
    // Visible (mockEntry is visible=true)
    const { rerender, container } = render(
      <EmotionHistoryCard
        entry={mockEntry}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    expect(container.firstChild).toHaveClass("border-cyan-400");

    // Hidden
    rerender(
      <EmotionHistoryCard
        entry={{ ...mockEntry, isVisibleInSphere: false }}
        onToggleVisibility={onToggleVisibility}
        onRemove={onRemove}
      />
    );
    expect(container.firstChild).toHaveClass("border-gray-700");
  });
});
