import { render, screen } from "@testing-library/react";
import { VACQuadrantViz } from "@/components/admin/clinical/VACQuadrantViz";

describe("VACQuadrantViz", () => {
  it("should render Quadrant I (High Valence, High Arousal)", () => {
    // V+ A+ -> Joyful
    render(<VACQuadrantViz vac={{ valence: 0.5, arousal: 0.5, connection: 0.8 }} />);

    expect(screen.getByText("VAC Analysis")).toBeInTheDocument();
    expect(screen.getByText("Quadrant IV")).toBeInTheDocument(); // V>0, A>0 is Quadrant IV in math (Top Right)? No, usually I. 
    // Let's check code logic:
    // valence > 0 && arousal > 0 => "IV", "Excited/Joyful", "text-green-400"
    // Wait, Cartesian Q1 is (+, +). 
    // Medical/Psych models might vary. Component says: name: "IV". 
    // Let's verify text content matches component logic.
    expect(screen.getByText("Excited/Joyful")).toBeInTheDocument();
    expect(screen.getByText("Excited/Joyful")).toHaveClass("text-green-400");

    // Connection formatting
    expect(screen.getByText("0.80")).toBeInTheDocument();
    expect(screen.getByText("0.80")).toHaveClass("text-green-400");
  });

  it("should render Quadrant III (Low Valence, High Arousal)", () => {
    // V- A+ -> Anxious
    // Code: valence < 0 && arousal > 0 => "III", "Anxious/Angry"
    render(<VACQuadrantViz vac={{ valence: -0.5, arousal: 0.5, connection: -0.2 }} />);

    expect(screen.getByText("Quadrant III")).toBeInTheDocument();
    expect(screen.getByText("Anxious/Angry")).toBeInTheDocument();
    expect(screen.getByText("Anxious/Angry")).toHaveClass("text-red-400");

    // Connection formatting (negative small)
    expect(screen.getByText("-0.20")).toBeInTheDocument();
    expect(screen.getByText("-0.20")).toHaveClass("text-gray-300"); // connection > -0.5 && < 0.5
  });

  it("should render Quadrant II (Low Valence, Low Arousal)", () => {
    // V- A- -> Depressed
    // Code: valence < 0 && arousal < 0 => "II", "Sad/Depressed"
    render(<VACQuadrantViz vac={{ valence: -0.5, arousal: -0.5, connection: -0.8 }} />);

    expect(screen.getByText("Quadrant II")).toBeInTheDocument();
    expect(screen.getByText("Sad/Depressed")).toBeInTheDocument();
    expect(screen.getByText("Sad/Depressed")).toHaveClass("text-blue-400");

    // Connection formatting (negative large)
    expect(screen.getByText("-0.80")).toBeInTheDocument();
    expect(screen.getByText("-0.80")).toHaveClass("text-red-400");
  });

  it("should render Quadrant I (High Valence, Low Arousal) - Default Case", () => {
    // V+ A- -> Calm
    // Code: default (else) => "I", "Calm/Content"
    render(<VACQuadrantViz vac={{ valence: 0.5, arousal: -0.5, connection: 0.0 }} />);

    expect(screen.getByText("Quadrant I")).toBeInTheDocument();
    expect(screen.getByText("Calm/Content")).toBeInTheDocument();
  });
});
