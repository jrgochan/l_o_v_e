import { render, screen, fireEvent } from "@testing-library/react";
import { EmotionTimeline } from "@/components/admin/visualizations/EmotionTimeline";
import { EmotionHistoryEntry } from "@/stores/useEmotionHistoryStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

jest.mock("@/hooks/admin/useAdminTheme");

const mockEntries: EmotionHistoryEntry[] = [
  {
    id: "1",
    emotion: "Joy",
    category: "Happy",
    timestamp: new Date("2024-01-01T10:00:00"),
    isVisibleInSphere: true,
    vac: { valence: 0.8, arousal: 0.5, connection: 0.6 },
    confidence: 1,
    messageId: "msg-1",
  },
  {
    id: "2",
    emotion: "Sadness",
    category: "Sad",
    timestamp: new Date("2024-01-01T10:05:00"),
    isVisibleInSphere: false,
    vac: { valence: -0.5, arousal: 0.2, connection: 0.3 },
    confidence: 0.8,
    messageId: "msg-1",
  },
];

describe("EmotionTimeline", () => {
  beforeEach(() => {
    (useAdminTheme as jest.Mock).mockReturnValue({
      colors: {
        border: "border-white/20",
        background: "bg-black",
        text: { primary: "text-white", secondary: "text-gray", muted: "text-gray-500" },
      },
    });
  });

  it("renders nothing when entries are empty", () => {
    const { container } = render(<EmotionTimeline entries={[]} onToggleVisibility={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders entries correctly", () => {
    render(<EmotionTimeline entries={mockEntries} onToggleVisibility={jest.fn()} />);

    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();
  });

  it("handles visibility toggle", () => {
    const onToggleMock = jest.fn();
    render(<EmotionTimeline entries={mockEntries} onToggleVisibility={onToggleMock} />);

    // Find toggle buttons
    const buttons = screen.getAllByRole("button");
    // Button 1 (Joy) is visible
    expect(buttons[0]).toHaveAttribute("title", "Hide from sphere");
    fireEvent.click(buttons[0]);
    expect(onToggleMock).toHaveBeenCalledWith("1");

    // Button 2 (Sadness) is hidden
    expect(buttons[1]).toHaveAttribute("title", "Show in sphere");
    fireEvent.click(buttons[1]);
    expect(onToggleMock).toHaveBeenCalledWith("2");
  });

  it("renders VAC bars with correct colors (including negative)", () => {
    const mixedEntries: EmotionHistoryEntry[] = [
      ...mockEntries,
      {
        id: "3",
        emotion: "Hostility",
        category: "Anger",
        timestamp: new Date(),
        isVisibleInSphere: true,
        vac: { valence: -0.8, arousal: 0.9, connection: -0.7 }, // Negative Connection
        confidence: 0.9,
        messageId: "msg-2",
      },
    ];

    render(<EmotionTimeline entries={mixedEntries} onToggleVisibility={jest.fn()} />);

    // We expect "bg-pink-400" to be present for negative connection
    const pinkBars = document.getElementsByClassName("bg-pink-400");
    expect(pinkBars.length).toBeGreaterThan(0);
  });

  it("uses fallback color for connecting line when theme border is missing", () => {
    (useAdminTheme as jest.Mock).mockReturnValue({
      colors: {
        border: "", // Empty border to trigger fallback
        background: "bg-black",
        text: { primary: "text-white", secondary: "text-gray" },
      },
    });

    render(<EmotionTimeline entries={mockEntries} onToggleVisibility={jest.fn()} />);
    // The connecting line should have bg-gray-600
    // It's the div with absolute positioning
    // We can verify this by checking if any div has class bg-gray-600 (that isn't in default theme)
    // Actually the fallback is 'bg-gray-600'
    const fallbackLines = document.getElementsByClassName("bg-gray-600");
    expect(fallbackLines.length).toBeGreaterThan(0);
  });
});
