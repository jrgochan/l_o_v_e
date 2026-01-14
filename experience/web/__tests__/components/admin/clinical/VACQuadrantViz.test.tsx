
import { render, screen } from "@testing-library/react";
import { VACQuadrantViz } from "@/components/admin/clinical/VACQuadrantViz";

describe("VACQuadrantViz", () => {
  it("renders Quadrant I (Calm/Content) correctly", () => {
    const vac = { valence: 0.5, arousal: -0.5, connection: 0.2 };
    render(<VACQuadrantViz vac={vac} />);

    expect(screen.getByText("Quadrant I")).toBeInTheDocument();
    expect(screen.getByText("Calm/Content")).toBeInTheDocument();

    // Axis labels
    expect(screen.getByText("V+")).toBeInTheDocument();
    expect(screen.getByText("A-")).toBeInTheDocument();

    // Coordinates display
    expect(screen.getByText("(0.50, -0.50)")).toBeInTheDocument();
  });

  it("renders Quadrant II (Sad/Depressed) correctly", () => {
    const vac = { valence: -0.5, arousal: -0.5, connection: 0.2 };
    render(<VACQuadrantViz vac={vac} />);

    expect(screen.getByText("Quadrant II")).toBeInTheDocument();
    expect(screen.getByText("Sad/Depressed")).toBeInTheDocument();
  });

  it("renders Quadrant III (Anxious/Angry) correctly", () => {
    const vac = { valence: -0.5, arousal: 0.5, connection: 0.2 };
    render(<VACQuadrantViz vac={vac} />);

    expect(screen.getByText("Quadrant III")).toBeInTheDocument();
    expect(screen.getByText("Anxious/Angry")).toBeInTheDocument();
  });

  it("renders Quadrant IV (Excited/Joyful) correctly", () => {
    const vac = { valence: 0.5, arousal: 0.5, connection: 0.2 };
    render(<VACQuadrantViz vac={vac} />);

    expect(screen.getByText("Quadrant IV")).toBeInTheDocument();
    expect(screen.getByText("Excited/Joyful")).toBeInTheDocument();
  });

  it("renders Connection info and color coding", () => {
    // High connection (Green)
    const { rerender } = render(<VACQuadrantViz vac={{ valence: 0, arousal: 0, connection: 0.8 }} />);
    expect(screen.getByText("0.80")).toHaveClass("text-green-400");

    // Low connection (Red)
    rerender(<VACQuadrantViz vac={{ valence: 0, arousal: 0, connection: -0.8 }} />);
    expect(screen.getByText("-0.80")).toHaveClass("text-red-400");

    // Neutral connection
    rerender(<VACQuadrantViz vac={{ valence: 0, arousal: 0, connection: 0.2 }} />);
    expect(screen.getByText("0.20")).toHaveClass("text-gray-300");
  });
});
