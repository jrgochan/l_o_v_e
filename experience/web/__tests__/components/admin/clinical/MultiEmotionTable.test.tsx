import { render, screen, fireEvent } from "@testing-library/react";
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
    voice_alignment: 0.6,
    category: "Negative",
  },
];

describe("MultiEmotionTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders table with correct headers and rows", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    expect(screen.getByText("Multi-Emotion Analysis")).toBeInTheDocument();
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();
    expect(screen.getByText("Anger")).toBeInTheDocument();
  });

  it("handles empty state", () => {
    render(<MultiEmotionTable emotions={[]} />);
    expect(screen.getByText("No multi-emotion data available")).toBeInTheDocument();
  });

  it("filters emotions by prominence", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    const filterSelect = screen.getByRole("combobox");

    // Default: All (3 rows)
    expect(screen.getAllByRole("row").length).toBe(4); // 3 data + 1 header

    // Filter: Primary
    fireEvent.change(filterSelect, { target: { value: "primary" } });
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.queryByText("Sadness")).not.toBeInTheDocument();

    // Filter: Secondary
    fireEvent.change(filterSelect, { target: { value: "secondary" } });
    expect(screen.getByText("Sadness")).toBeInTheDocument();
    expect(screen.queryByText("Joy")).not.toBeInTheDocument();
  });

  it("sorts emotions by name", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Click header to sort by 'Emotion'
    fireEvent.click(screen.getByText("Emotion"));

    const rows = screen.getAllByRole("row");
    // Row 1 is header. Row 2 should be 'Anger' (A first)
    expect(rows[1]).toHaveTextContent("Anger");
    expect(rows[3]).toHaveTextContent("Sadness"); // S last

    // Click again for descending
    fireEvent.click(screen.getByText("Emotion"));
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1]).toHaveTextContent("Sadness");
  });

  it("sorts emotions by confidence", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Click header to sort by 'Confidence'
    fireEvent.click(screen.getByText("Confidence"));

    const rows = screen.getAllByRole("row");
    // Asc sorting (lowest first): Anger (0.3)
    expect(rows[1]).toHaveTextContent("Anger");

    // Desc sorting (highest first)
    fireEvent.click(screen.getByText("Confidence"));
    const rowsDesc = screen.getAllByRole("row");
    expect(rowsDesc[1]).toHaveTextContent("Joy"); // 0.9
  });

  it("expands row on click", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    // Expand Joy
    const expandButtons = screen.getAllByText("⊕ Expand");
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText("Detailed Analysis")).toBeInTheDocument();
    expect(screen.getByText("VAC Interpretation:")).toBeInTheDocument();
    expect(screen.getByText("Very positive")).toBeInTheDocument(); // Validation for Joy
  });

  it("exports CSV on button click", () => {
    render(<MultiEmotionTable emotions={mockEmotions} />);

    fireEvent.click(screen.getByText("Export CSV"));

    expect(mockCreateObjectURL).toHaveBeenCalled();
    // Since we mock download behavior, we just ensure blob was created
    const blob = mockCreateObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/csv");
  });
});
