import { render, screen, fireEvent } from "@testing-library/react";
import { EmotionBadge, EmotionBadgeList } from "@/components/admin/emotion-display/EmotionBadge";
import type { VAC } from "@/types/chat";

describe("EmotionBadge", () => {
  const defaultProps = {
    emotion: "Joy",
    confidence: 0.856,
    vac: { valence: 0.8, arousal: 0.5, connection: 0.3 } as VAC,
  };

  it("renders emotion name and formatted confidence", () => {
    render(<EmotionBadge {...defaultProps} />);
    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
  });

  it("renders correctly without VAC data", () => {
    // Should fallback to gray
    render(<EmotionBadge emotion="Neutral" confidence={0.5} />);
    const badge = screen.getByText("Neutral").closest("div");
    expect(badge).toHaveClass("bg-gray-600");
  });

  it("hides confidence when showConfidence is false", () => {
    render(<EmotionBadge {...defaultProps} showConfidence={false} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("handles onClick callback", () => {
    const handleClick = jest.fn();
    render(<EmotionBadge {...defaultProps} onClick={handleClick} />);

    // The div itself is clickable
    fireEvent.click(screen.getByText("Joy")); // Clicking text bubbles up
    expect(handleClick).toHaveBeenCalledTimes(1);

    const badge = screen.getByText("Joy").closest("div");
    expect(badge).toHaveClass("cursor-pointer");
  });

  describe("Color Logic (Valence)", () => {
    it("renders red for very negative valence (< -0.5)", () => {
      render(<EmotionBadge {...defaultProps} vac={{ ...defaultProps.vac!, valence: -0.6 }} />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("bg-red-600/90");
    });

    it("renders orange for negative valence (< -0.1)", () => {
      render(<EmotionBadge {...defaultProps} vac={{ ...defaultProps.vac!, valence: -0.2 }} />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("bg-orange-600/90");
    });

    it("renders amber for neutral valence (< 0.1)", () => {
      render(<EmotionBadge {...defaultProps} vac={{ ...defaultProps.vac!, valence: 0.0 }} />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("bg-amber-500/90");
    });

    it("renders lime for positive valence (< 0.5)", () => {
      render(<EmotionBadge {...defaultProps} vac={{ ...defaultProps.vac!, valence: 0.4 }} />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("bg-lime-500/90");
    });

    it("renders green for very positive valence (>= 0.5)", () => {
      render(<EmotionBadge {...defaultProps} vac={{ ...defaultProps.vac!, valence: 0.6 }} />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("bg-green-600/90");
    });
  });

  describe("Prominence Styling", () => {
    it("renders primary styling", () => {
      render(<EmotionBadge {...defaultProps} prominence="primary" />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("font-bold");
      expect(badge).toHaveClass("border-2");
    });

    it("renders secondary styling", () => {
      render(<EmotionBadge {...defaultProps} prominence="secondary" />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("font-medium");
    });

    it("renders underlying styling with asterisk", () => {
      render(<EmotionBadge {...defaultProps} prominence="underlying" />);
      const badge = screen.getByText("Joy").closest("div");
      expect(badge).toHaveClass("opacity-60");
      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  it("shows VAC tooltip when VAC is provided", () => {
    render(<EmotionBadge {...defaultProps} />);
    const badge = screen.getByText("Joy").closest("div");
    expect(badge).toHaveAttribute("title", expect.stringContaining("VAC: (0.80, 0.50, 0.30)"));
  });
});

describe("EmotionBadgeList", () => {
  const mockEmotions = [
    { emotion: "Sadness", confidence: 0.4, prominence: "secondary" as const },
    { emotion: "Joy", confidence: 0.8, prominence: "primary" as const },
    { emotion: "Anger", confidence: 0.2, prominence: "underlying" as const },
  ];

  it("returns null if list is empty", () => {
    const { container } = render(<EmotionBadgeList emotions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders sorted list by prominence (primary -> secondary -> underlying)", () => {
    render(<EmotionBadgeList emotions={mockEmotions} />);

    const badges = screen.getAllByText(/Joy|Sadness|Anger/).map((el) => el.textContent);
    // Note: The Badge component renders text in a span, so getAllByText gets those spans
    // Order should be Joy (primary), Sadness (secondary), Anger (underlying)
    expect(badges).toEqual(["Joy", "Sadness", "Anger"]);
  });

  it("assigns correct sizes based on prominence in list", () => {
    render(<EmotionBadgeList emotions={mockEmotions} />);

    const joyBadge = screen.getByText("Joy").closest("div");
    expect(joyBadge).toHaveClass("text-base"); // Large for primary

    const sadBadge = screen.getByText("Sadness").closest("div");
    expect(sadBadge).toHaveClass("text-sm"); // Medium for secondary

    const angerBadge = screen.getByText("Anger").closest("div");
    expect(angerBadge).toHaveClass("text-xs"); // Small for underlying
  });

  it("handles onEmotionClick from list", () => {
    const handleEmotionClick = jest.fn();
    render(<EmotionBadgeList emotions={mockEmotions} onEmotionClick={handleEmotionClick} />);

    fireEvent.click(screen.getByText("Joy"));
    expect(handleEmotionClick).toHaveBeenCalledWith("Joy");
  });

  it("defaults to secondary prominence for sorting if undefined", () => {
    const mixedEmotions = [
      { emotion: "Undefined", confidence: 0.5 }, // Should be treated as secondary
      { emotion: "Primary", confidence: 0.8, prominence: "primary" as const },
    ];

    render(<EmotionBadgeList emotions={mixedEmotions} />);

    const badges = screen.getAllByText(/Primary|Undefined/).map((el) => el.textContent);
    // Primary (0) comes before Secondary (1)
    expect(badges).toEqual(["Primary", "Undefined"]);

    // Verify fallback styling
    // Note: List treats it as 'secondary' for sorting/sizing, but Badge component defaults to 'primary' for styling if prop is undefined.
    const secondaryBadge = screen.getByText("Undefined").closest("div");
    expect(secondaryBadge).toHaveClass("font-bold");
  });

  it("handles explicit undefined prominence", () => {
    const startEmotions = [
      { emotion: "A", confidence: 0.5, prominence: undefined },
      { emotion: "B", confidence: 0.5, prominence: "primary" as const },
    ];
    render(<EmotionBadgeList emotions={startEmotions} />);
    const texts = screen.getAllByText(/A|B/).map((e) => e.textContent);
    // B (primary=0) -> A (undefined->secondary=1)
    expect(texts).toEqual(["B", "A"]);
  });

  it("handles null prominence gracefully", () => {
    const startEmotions = [
      { emotion: "A", confidence: 0.5, prominence: null as any },
      { emotion: "B", confidence: 0.5, prominence: "primary" as const },
    ];
    render(<EmotionBadgeList emotions={startEmotions} />);
    const texts = screen.getAllByText(/A|B/).map((e) => e.textContent);
    // B (primary) -> A (null->secondary)
    expect(texts).toEqual(["B", "A"]);
  });

  it("handles null prominence gracefully", () => {
    const startEmotions = [
      { emotion: "A", confidence: 0.5, prominence: null as any },
      { emotion: "B", confidence: 0.5, prominence: "primary" as const },
    ];
    render(<EmotionBadgeList emotions={startEmotions} />);
    const texts = screen.getAllByText(/A|B/).map((e) => e.textContent);
    // B (primary) -> A (null->secondary)
    expect(texts).toEqual(["B", "A"]);
  });
});
