
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiEmotionTable } from "@/components/admin/clinical/MultiEmotionTable";
import type { DetectedEmotion, VAC } from "@/types/chat";

// Mock child components
jest.mock("@/components/admin/emotion-display/EmotionMappingBadge", () => ({
  EmotionMappingBadge: () => <div data-testid="mock-mapping-badge" />
}));

// Mock URL.createObjectURL for CSV export
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

describe("MultiEmotionTable", () => {
  const mockEmotions: DetectedEmotion[] = [
    {
      id: "1",
      emotion_name: "Joy",
      category: "Positive",
      confidence: 0.9,
      intensity: 0.8,
      prominence: "primary",
      vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
      voice_alignment: 0.85,
      original_name: "Ecstasy",
      match_method: "vector",
      match_confidence: 0.95
    },
    {
      id: "2",
      emotion_name: "Anxiety",
      category: "Negative",
      confidence: 0.6,
      intensity: 0.5,
      prominence: "secondary",
      vac: { valence: -0.4, arousal: 0.7, connection: -0.2 },
      voice_alignment: 0.4,
      original_name: null // Exact match case
    },
    {
      id: "3",
      emotion_name: "Sadness",
      category: "Negative",
      confidence: 0.4,
      intensity: 0.4,
      prominence: "underlying",
      vac: { valence: -0.8, arousal: -0.5, connection: -0.6 },
      match_method: "fuzzy"
      // undefined voice_alignment
    },
    {
      id: "4",
      emotion_name: "Interest",
      category: "Cognitive",
      confidence: 0.7,
      intensity: 0.6,
      prominence: "secondary",
      vac: { valence: 0.2, arousal: 0.4, connection: 0.3 },
      voice_alignment: 0.7 // Medium alignment (0.6 - 0.8)
    }
  ];

  it("renders empty state", () => {
    render(<MultiEmotionTable emotions={[]} />);
    expect(screen.getByText("No multi-emotion data available")).toBeInTheDocument();
  });

  it("renders table with correct headers", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);
    expect(screen.getByText("Multi-Emotion Analysis")).toBeInTheDocument();
    expect(screen.getByText("(4 emotions)")).toBeInTheDocument();

    // Headers
    expect(screen.getByText("Emotion")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("VAC Coordinates")).toBeInTheDocument();
    expect(screen.getByText("Voice Match")).toBeInTheDocument();
    expect(screen.getByText("Prominence")).toBeInTheDocument();
  });

  it("renders emotion rows correctly", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Check first emotion
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument(); // 0.9 confidence
    expect(screen.getByText("+0.800")).toBeInTheDocument(); // Valence
    expect(screen.getByText("✓")).toBeInTheDocument(); // Good voice alignment
    expect(screen.getByText("PRIMARY")).toBeInTheDocument();

    // Check second emotion
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
    expect(screen.getByText("~")).toBeInTheDocument(); // Moderate voice alignment
    // Use getAllByText because "Interest" is also secondary
    expect(screen.getAllByText("SECONDARY").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exact").length).toBeGreaterThan(0); // Multiple Exacts
  });

  it("handles sorting", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Default is sorted by prominence asc (primary -> secondary -> underlying)
    const rows = screen.getAllByRole("row");
    // Row 0 is header. Row 1 should be Joy (primary), Row 2 Anxiety (secondary), Row 3 Sadness (underlying)
    expect(rows[1]).toHaveTextContent("Joy");

    // Sort by Emotion Name
    fireEvent.click(screen.getByText("Emotion"));
    // A-Z: Anxiety, Joy, Sadness
    const rowsAsc = screen.getAllByRole("row");
    expect(rowsAsc[1]).toHaveTextContent("Anxiety");
    expect(rowsAsc[2]).toHaveTextContent("Interest"); // I before J
    expect(rowsAsc[3]).toHaveTextContent("Joy");

    // Toggle Sort (Desc)
    fireEvent.click(screen.getByText("Emotion"));
    // Z-A: Sadness, Joy, Interest, Anxiety
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1]).toHaveTextContent("Sadness");
    expect(rowsDesc[4]).toHaveTextContent("Anxiety");
  });

  it("handles numeric sorting", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Sort by Confidence
    fireEvent.click(screen.getByText("Confidence"));
    // Asc: 40, 60, 90 (Sadness, Anxiety, Joy)
    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Sadness");

    // Toggle (Desc)
    fireEvent.click(screen.getByText("Confidence"));
    // Desc: 90, 60, 40 (Joy, Anxiety, Sadness)
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Joy");
  });

  it("handles voice alignment sorting and rendering", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Sort by Voice Match
    fireEvent.click(screen.getByText("Voice Match"));
    // Asc: Sadness (-1/N/A), Anxiety (0.4), Interest (0.7), Joy (0.85)
    // Check rows
    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Sadness");

    // Check medium alignment rendering (~)
    expect(screen.getByText("~")).toBeInTheDocument();
    expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
  });

  it("handles prominence sorting", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Force deterministic state: Click Emotion first, then Prominence
    fireEvent.click(screen.getByText("Emotion"));
    fireEvent.click(screen.getByText("Prominence").closest("th")!);
    // Now it should be Prominence ASC (Joy/Primary first)

    const rowsAsc = screen.getAllByRole("row");
    expect(rowsAsc[1]).toHaveTextContent("Joy");

    // Toggle Desc (Underlying, Secondary, Primary) by clicking ONCE
    fireEvent.click(screen.getByText("Prominence").closest("th")!);

    const rowsDesc = screen.getAllByRole("row");
    // Row 1 should be Sadness (Underlying)
    expect(rowsDesc[1]).toHaveTextContent("Sadness");
  });

  it("handles filtering by prominence", () => {
    render(<MultiEmotionTable emotions={mockEmotions} showFilters={true} />);

    const filter = screen.getByRole("combobox");

    // Select Primary
    fireEvent.change(filter, { target: { value: "primary" } });
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.queryByText("Anxiety")).not.toBeInTheDocument();
    expect(screen.queryByText("Sadness")).not.toBeInTheDocument();

    // Select Secondary
    fireEvent.change(filter, { target: { value: "secondary" } });
    expect(screen.queryByText("Joy")).not.toBeInTheDocument();
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
  });

  it("expands row on click", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Click expand button for first row
    const expandBtns = screen.getAllByText("⊕ Expand");
    fireEvent.click(expandBtns[0]);

    // Check detailed view text
    expect(screen.getByText("Detailed Analysis")).toBeInTheDocument();
    expect(screen.getByText("Emotion ID:")).toBeInTheDocument();
    expect(screen.getByText("Ecstasy")).toBeInTheDocument(); // Original name
    expect(screen.getByText("vector")).toBeInTheDocument(); // Match method

    // Check collapse button
    expect(screen.getByText("⊖ Collapse")).toBeInTheDocument();

    // Click collapse
    fireEvent.click(screen.getByText("⊖ Collapse"));
    expect(screen.queryByText("Detailed Analysis")).not.toBeInTheDocument();
  });

  it("triggers emotion click callback", () => {
    const onEmotionClick = jest.fn();
    render(<MultiEmotionTable emotions={mockEmotions} onEmotionClick={onEmotionClick} />);

    // Click the row (not the button)
    // Find the cell containing "Joy"
    const joyCell = screen.getByText("Joy").closest("tr");
    fireEvent.click(joyCell!);

    expect(onEmotionClick).toHaveBeenCalledWith(mockEmotions[0]);
  });

  it("exports CSV", () => {
    render(<MultiEmotionTable emotions={mockEmotions} showExport={true} />);

    // Mock anchor click
    const link = { click: jest.fn(), href: "", download: "" };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") return link as any;
      return originalCreateElement(tag);
    });

    fireEvent.click(screen.getByText("Export CSV"));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(link.click).toHaveBeenCalled();
    expect(link.download).toContain("multi-emotion-analysis");
  });

  it("renders VAC interpretation labels correctly", () => {
    // We need to test various VAC ranges to hit all branches
    const vacEmotions: DetectedEmotion[] = [
      { ...mockEmotions[0], id: "v1", vac: { valence: 0.6, arousal: 0.6, connection: 0.6 }, emotion_name: "E1" }, // Very positive, Very high, Strong
      { ...mockEmotions[0], id: "v2", vac: { valence: 0.2, arousal: 0.2, connection: 0.2 }, emotion_name: "E2" }, // Somewhat positive, High, Connected
      { ...mockEmotions[0], id: "v3", vac: { valence: 0.0, arousal: 0.0, connection: 0.0 }, emotion_name: "E3" }, // Neutral, Moderate, Neutral
      { ...mockEmotions[0], id: "v4", vac: { valence: -0.2, arousal: -0.2, connection: -0.2 }, emotion_name: "E4" }, // Somewhat negative, Low, Disconnected
      { ...mockEmotions[0], id: "v5", vac: { valence: -0.6, arousal: -0.6, connection: -0.6 }, emotion_name: "E5" }, // Very negative, Very low, Strongly disconnected
    ];

    render(<MultiEmotionTable emotions={vacEmotions} />);

    // Expand all rows to show details
    const expandBtns = screen.getAllByText("⊕ Expand");
    expandBtns.forEach(btn => fireEvent.click(btn));

    // Verify labels exist (sampling a few key ones)
    expect(screen.getByText("Very positive")).toBeInTheDocument();
    expect(screen.getByText("Very high energy")).toBeInTheDocument();
    expect(screen.getByText("Strong connection")).toBeInTheDocument();

    expect(screen.getByText("Somewhat positive")).toBeInTheDocument();
    expect(screen.getByText("High energy")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();

    expect(screen.getAllByText("Neutral").length).toBeGreaterThan(0);
    expect(screen.getByText("Moderate")).toBeInTheDocument();

    expect(screen.getByText("Somewhat negative")).toBeInTheDocument();
    expect(screen.getByText("Low energy")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();

    expect(screen.getByText("Very negative")).toBeInTheDocument();
    expect(screen.getByText("Very low energy")).toBeInTheDocument();
    expect(screen.getByText("Strongly disconnected")).toBeInTheDocument();
  });
});
