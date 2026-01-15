import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InsightCard } from "@/components/admin/shared/InsightCard";
import type { StructuredInsightData, InsightData } from "@/types/insights";

describe("InsightCard", () => {
  const mockStructuredInsights: StructuredInsightData = {
    structured: true,
    emotion: "Joy",
    opening: "You are feeling joy.",
    voice_observations: ["Calm tone", "Steady pace"],
    emotion_understanding: "Joy is a positive emotion.",
    vac_interpretation: {
      energy_state: "High energy",
      emotional_tone: "Positive tone",
      connection_quality: "Connected",
    },
    gentle_invitations: [
      { type: "reflection", text: "Reflect on this feeling." },
      { type: "action", text: "Feel warmth." },
    ],
    recommendations: [
      {
        type: "similar_emotions",
        title: "Related Emotions",
        items: [{ name: "Excitement" }, { name: "Hope" }],
      },
    ],
    // Clinical fields
    emotion_definition: "A state of happiness.",
    vac_assessment: {
      coordinates: {
        valence: { value: 0.8, label: "High" },
        arousal: { value: 0.6, label: "Medium" },
        connection: { value: 0.7, label: "High" },
      },
      quadrant: "Quadrant 1",
      clinical_note: "Stable state.",
      risk_indicators: ["Manic tendencies"],
    },
    voice_metrics: [
      { label: "Pitch", value: "High", status: "attention", interpretation: "Elevated" },
      { label: "Jitter", value: "Low", status: "stable", interpretation: "Stable" },
      { label: "Shimmer", value: "Med", status: "critical", interpretation: "Unstable" },
    ],
    clinical_recommendations: [
      { type: "intervention", title: "CBT", description: "Cognitive therapy." },
      { type: "observation", title: "Monitor", description: "Watch daily." },
    ],
    analysis_reasoning: "High valence indicates joy.",
    summary: "Validation summary.", // Required by base InsightData
    category: "Positive",
    vac: { valence: 0.8, arousal: 0.6, connection: 0.7 },
    confidence: 0.9,
    vac_analysis: {
      valence: { value: 0.8, interpretation: "High", percentile: 80 },
      arousal: { value: 0.6, interpretation: "Medium", percentile: 60 },
      connection: { value: 0.7, interpretation: "High", percentile: 70 },
      quadrant: "Quadrant 1",
    },
    guidance: "Guidance text",
  };

  const mockLegacyInsights: any = {
    summary: "Legacy summary text.",
    guidance: "Legacy guidance.",
    emotion: "Joy",
    confidence: 0.9,
  };

  beforeEach(() => {
    // Mock scrollHeight
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 500,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Legacy Mode", () => {
    it("renders legacy display when structured is false/missing", () => {
      render(<InsightCard insights={mockLegacyInsights} toneMode="warm" />);

      expect(screen.getByText("Legacy summary text.")).toBeInTheDocument();
      expect(screen.getByText("Legacy guidance.")).toBeInTheDocument();
    });

    it("applies warm styling in warm mode", () => {
      const { container } = render(<InsightCard insights={mockLegacyInsights} toneMode="warm" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("bg-amber-900/20");
    });

    it("applies clinical styling in clinical mode", () => {
      const { container } = render(
        <InsightCard insights={mockLegacyInsights} toneMode="clinical" />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("bg-gray-800");
    });
  });

  describe("Warm Mode", () => {
    it("renders full warm card content", () => {
      render(<InsightCard insights={mockStructuredInsights} toneMode="warm" />);

      // Check content presence
      expect(screen.getByText(/You are feeling joy/i)).toBeInTheDocument();
      expect(screen.getByText(/Calm tone/i)).toBeInTheDocument();
      expect(screen.getByText(/Joy is a positive emotion/i)).toBeInTheDocument();
      expect(screen.getByText(/High energy/i)).toBeInTheDocument(); // VAC interpretation
      expect(screen.getByText(/Reflect on this feeling/i)).toBeInTheDocument();
      expect(screen.getByText(/Excitement/i)).toBeInTheDocument();
    });

    it("handles truncation and read more", async () => {
      // Set scrollHeight > maxHeight (500 > 100)
      render(<InsightCard insights={mockStructuredInsights} toneMode="warm" maxHeight={100} />);

      expect(await screen.findByText(/Read more/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Read more/i));

      await waitFor(() => {
        expect(screen.queryByText(/Read more/i)).not.toBeInTheDocument();
      });
    });

    it("triggers emotion click callback", () => {
      const handleEmotionClick = jest.fn();
      render(
        <InsightCard
          insights={mockStructuredInsights}
          toneMode="warm"
          onEmotionClick={handleEmotionClick}
        />
      );

      fireEvent.click(screen.getByText("Excitement"));
      expect(handleEmotionClick).toHaveBeenCalledWith("Excitement");
    });
  });

  describe("Clinical Mode", () => {
    it("renders full clinical card content", () => {
      render(<InsightCard insights={mockStructuredInsights} toneMode="clinical" />);

      expect(screen.getByText(/You are feeling joy/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical Definition/i)).toBeInTheDocument();
      expect(screen.getByText(/A state of happiness/i)).toBeInTheDocument();

      // VAC Grid
      expect(screen.getAllByText(/valence/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/0.80/i)).toBeInTheDocument();

      // Risks
      expect(screen.getByText(/Manic tendencies/i)).toBeInTheDocument();

      // Voice metrics (check status colors via classes?)
      const pitch = screen.getByText("Pitch").closest("div.border-l-2");
      expect(pitch).toHaveClass("text-yellow-400"); // attention

      const shimmer = screen.getByText("Shimmer").closest("div.border-l-2");
      expect(shimmer).toHaveClass("text-red-400"); // critical

      // Recommendations
      expect(screen.getByText(/CBT/i)).toBeInTheDocument();
      expect(screen.getByText(/Cognitive therapy/i)).toBeInTheDocument();

      // Reasoning
      expect(screen.getByText(/High valence indicates joy/i)).toBeInTheDocument();
    });

    it("handles truncation and view full assessment", async () => {
      render(<InsightCard insights={mockStructuredInsights} toneMode="clinical" maxHeight={100} />);

      expect(await screen.findByText(/View Full Assessment/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/View Full Assessment/i));

      await waitFor(() => {
        expect(screen.queryByText(/View Full Assessment/i)).not.toBeInTheDocument();
      });
    });

    it("handles emotion clicks in clinical mode", () => {
      const handleEmotionClick = jest.fn();
      render(
        <InsightCard
          insights={mockStructuredInsights}
          toneMode="clinical"
          onEmotionClick={handleEmotionClick}
        />
      );

      fireEvent.click(screen.getByText("Excitement"));
      expect(handleEmotionClick).toHaveBeenCalledWith("Excitement");
    });

    it("checks status colors", () => {
      // Create insights with all status types
      const statusInsights: StructuredInsightData = {
        ...mockStructuredInsights,
        voice_metrics: [
          { label: "A", value: "1", status: "critical", interpretation: "" },
          { label: "B", value: "2", status: "warning", interpretation: "" },
          { label: "C", value: "3", status: "attention", interpretation: "" },
          { label: "D", value: "4", status: "stable", interpretation: "" },
        ],
      };

      render(<InsightCard insights={statusInsights} toneMode="clinical" />);

      // Critical
      const crit = screen.getByText("A").closest("div.border-l-2");
      expect(crit).toHaveClass("text-red-400");

      // Warning
      const warn = screen.getByText("B").closest("div.border-l-2");
      expect(warn).toHaveClass("text-orange-400");

      // Attention
      const attn = screen.getByText("C").closest("div.border-l-2");
      expect(attn).toHaveClass("text-yellow-400");

      // Normal/Default
      const norm = screen.getByText("D").closest("div.border-l-2");
      expect(norm).toHaveClass("text-cyan-400");
    });
  });
});
