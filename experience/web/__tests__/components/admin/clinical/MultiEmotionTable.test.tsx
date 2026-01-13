import { render, screen, fireEvent, within } from "@testing-library/react";
import { MultiEmotionTable } from "@/components/admin/clinical/MultiEmotionTable";
import { DetectedEmotion } from "@/types/chat";

// Mock child components
jest.mock("@/components/admin/emotion-display/EmotionMappingBadge", () => ({
  EmotionMappingBadge: () => <div data-testid="mapping-badge" />,
}));

// Mock URL.createObjectURL for export
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

const mockEmotions: DetectedEmotion[] = [
  {
    id: "e1",
    emotion_name: "Joy",
    confidence: 0.9,
    vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
    prominence: "primary",
    voice_alignment: 0.85,
    category: "Positive",
    match_method: "exact",
    match_confidence: 1.0,
    original_name: "Joy"
  },
  {
    id: "e2",
    emotion_name: "Sadness",
    confidence: 0.5,
    vac: { valence: -0.6, arousal: -0.4, connection: -0.2 },
    prominence: "secondary",
    voice_alignment: 0.4,
    category: "Negative",
  },
  {
    id: "e3",
    emotion_name: "Anger",
    confidence: 0.3,
    vac: { valence: -0.5, arousal: 0.8, connection: -0.6 },
    prominence: "underlying",
    voice_alignment: 0.7, // Medium (Yellow)
    category: "Negative",
  },
];

describe("MultiEmotionTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders table and basic empty state", () => {
    const { rerender } = render(<MultiEmotionTable emotions={[]} />);
    expect(screen.getByText("No multi-emotion data available")).toBeInTheDocument();

    rerender(<MultiEmotionTable emotions={mockEmotions} />);
    expect(screen.getByText("Multi-Emotion Analysis")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
  });

  describe("Sorting Logic", () => {
    // Helper to check row order by testing content of first non-header row
    const checkFirstRow = (text: string) => {
      const rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText(text)).toBeInTheDocument();
    };

    it("sorts by various columns", () => {
      render(<MultiEmotionTable emotions={mockEmotions} />);

      // Emotion Name Desc (Joy -> Sadness -> Anger)
      fireEvent.click(screen.getByText("Emotion")); // Asc: Anger
      checkFirstRow("Anger");
      fireEvent.click(screen.getByText("Emotion")); // Desc: Sadness
      checkFirstRow("Sadness");

      // Valence
      fireEvent.click(screen.getByText("VAC Coordinates")); // Nothing happens, not sortable directly? 
      // Wait, the header for VAC might not have a click handler or correct Label?
      // Looking at the code: "VAC Coordinates" header has NO onClick.
      // Correct. VAC sorting is not exposed in UI based on my previous read (Lines 292-297 in source).
      // Wait, sorting logic (lines 71-82 of source) exists for 'valence', 'arousal', 'connection' keys... but are they connected to header?
      // Source: <th ... onClick={() => handleSort("emotion")}>...
      // VAC header: <th ...> (No onClick). 
      // So VAC sorting logic is dead code or unreachable via UI? 
      // Ah, checking source lines 292-297: No click handler.
      // So I cannot test VAC sorting via UI.

      // Voice Match (key: voice_alignment)
      fireEvent.click(screen.getByText("Voice Match"));
      // Asc (0.4) -> Sadness
      checkFirstRow("Sadness");
      fireEvent.click(screen.getByText("Voice Match"));
      // Desc (0.85) -> Joy
      checkFirstRow("Joy");

      // Prominence
      // Order: primary(0), secondary(1), underlying(2)
      fireEvent.click(screen.getByText("Prominence"));
      // Asc: Primary (Joy)
      checkFirstRow("Joy");
      fireEvent.click(screen.getByText("Prominence"));
      // Desc: Underlying (Anger)
      checkFirstRow("Anger");
    });
    it("sorts by confidence", () => {
      render(<MultiEmotionTable emotions={mockEmotions} />);
      fireEvent.click(screen.getByText("Confidence"));
      // Asc (0.3) -> Anger
      checkFirstRow("Anger");
      fireEvent.click(screen.getByText("Confidence"));
      // Desc (0.9) -> Joy
      checkFirstRow("Joy");
    });
  });

  describe("Interactions", () => {
    it("calls onEmotionClick when row is clicked", () => {
      const handleClick = jest.fn();
      render(<MultiEmotionTable emotions={mockEmotions} onEmotionClick={handleClick} />);

      const joyRow = screen.getByText("Joy").closest("tr")!;
      fireEvent.click(joyRow);
      expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({ emotion_name: "Joy" }));
    });
  });

  describe("Filtering", () => {
    it("filters by prominence levels", () => {
      render(<MultiEmotionTable emotions={mockEmotions} />);
      const select = screen.getByRole("combobox");

      // Primary
      fireEvent.change(select, { target: { value: "primary" } });
      expect(screen.getByText("Joy")).toBeInTheDocument();
      expect(screen.queryByText("Sadness")).not.toBeInTheDocument();

      // Underlying
      fireEvent.change(select, { target: { value: "underlying" } });
      expect(screen.getByText("Anger")).toBeInTheDocument();
      expect(screen.queryByText("Joy")).not.toBeInTheDocument();

      // All
      fireEvent.change(select, { target: { value: "all" } });
      expect(screen.getAllByRole("row").length).toBe(4); // Header + 3 rows
    });
  });

  describe("Expansion and Details", () => {
    it("expands row to show detailed VAC interpretation and logic", () => {
      render(<MultiEmotionTable emotions={mockEmotions} />);
      const expandButtons = screen.getAllByText("⊕ Expand");

      // Expand Joy (e1) - High positive values
      fireEvent.click(expandButtons[0]);
      expect(screen.getByText("Very positive")).toBeInTheDocument(); // Valence 0.8 > 0.5
      expect(screen.getByText("Very high energy")).toBeInTheDocument(); // Arousal 0.6 > 0.5
      expect(screen.getByText("Strong connection")).toBeInTheDocument(); // Connection 0.7 > 0.5

      // Detailed fields
      expect(screen.getByText("Emotion ID:")).toBeInTheDocument();
      expect(screen.getByText("e1")).toBeInTheDocument();
      expect(screen.getByText("Match Method:")).toBeInTheDocument();
      expect(screen.getByText("exact")).toBeInTheDocument(); // Check value
    });

    it("collapses row", () => {
      render(<MultiEmotionTable emotions={mockEmotions} />);
      const expandButton = screen.getAllByText("⊕ Expand")[0];
      fireEvent.click(expandButton);
      expect(screen.getByText("Detailed Analysis")).toBeInTheDocument();

      const collapseButton = screen.getByText("⊖ Collapse");
      fireEvent.click(collapseButton);
      expect(screen.queryByText("Detailed Analysis")).not.toBeInTheDocument();
    });

    it("handles negative VAC interpretation", () => {
      // Expand Sadness (e2): V(-0.6), A(-0.4), C(-0.2)
      render(<MultiEmotionTable emotions={mockEmotions} />);
      const expandButtons = screen.getAllByText("⊕ Expand");
      fireEvent.click(expandButtons[1]); // Sadness is 2nd in default list? 
      // Default sort is Prominence (lines 45). primary(e1) -> secondary(e2) -> underlying(e3).
      // So index 1 is Sadness.

      // Val: -0.6 < -0.5 -> "Very negative"
      expect(screen.getByText("Very negative")).toBeInTheDocument();

      // Arousal: -0.4 > -0.5 -> "Low energy"
      expect(screen.getByText("Low energy")).toBeInTheDocument();

      // Connection: -0.2 < -0.1 (Wait: > -0.5) -> "Disconnected"
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });
  });

  describe("Visual Indicators", () => {
    it("renders correct voice alignment colors", () => {
      const { container } = render(<MultiEmotionTable emotions={mockEmotions} />);

      // Joy: 0.85 -> Green
      const joyRow = screen.getByText("Joy").closest("tr")!;
      // We can check text-green-400 class presence within this row for Voice Alignment column
      const greenIndicator = within(joyRow).getByText("✓").parentElement;
      expect(greenIndicator).toHaveClass("text-green-400");

      // Anger: 0.7 -> Yellow
      const angerRow = screen.getByText("Anger").closest("tr")!;
      const yellowIndicator = within(angerRow).getByText("~").parentElement;
      expect(yellowIndicator).toHaveClass("text-yellow-400");

      // Sadness: 0.4 -> Red
      const sadnessRow = screen.getByText("Sadness").closest("tr")!;
      const redIndicator = within(sadnessRow).getByText("⚠️").parentElement;
      expect(redIndicator).toHaveClass("text-red-400");
    });

    it("renders N/A for missing alignment", () => {
      const missingAlign = [{ ...mockEmotions[0], id: "e99", voice_alignment: undefined }];
      render(<MultiEmotionTable emotions={missingAlign as any} />);
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  it("exports CSV", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);
    const exportBtn = screen.getByText("Export CSV");
    fireEvent.click(exportBtn);
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
});
