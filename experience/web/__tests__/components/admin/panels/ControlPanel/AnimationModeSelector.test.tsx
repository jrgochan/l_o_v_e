import { render, screen, fireEvent } from "@testing-library/react";
import { AnimationModeSelector } from "@/components/admin/panels/ControlPanel/AnimationModeSelector";
import { PathAnimationMode } from "@/types/visualization";

describe("AnimationModeSelector", () => {
  const mockOnModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all animation modes", () => {
    render(<AnimationModeSelector currentMode="subtle" onModeChange={mockOnModeChange} />);
    expect(screen.getByText(/Path Animation/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtle/i)).toBeInTheDocument();
    expect(screen.getByText(/Glitch/i)).toBeInTheDocument();
  });

  it.each([
    ["Subtle", "subtle"],
    ["Dynamic", "dynamic"],
    ["Mystical", "mystical"],
    ["Crystalline", "crystalline"],
    ["Luminous", "luminous"],
    ["Liquid", "liquid"],
    ["Glitch", "glitch"],
  ])("calls onModeChange when %s is clicked", (text, mode) => {
    render(<AnimationModeSelector currentMode="subtle" onModeChange={mockOnModeChange} />);
    const button = screen.getByText(new RegExp(text, "i"));
    fireEvent.click(button);
    expect(mockOnModeChange).toHaveBeenCalledWith(mode);
  });

  it.each([
    ["subtle", "bg-blue-600"],
    ["dynamic", "bg-orange-600"],
    ["mystical", "bg-purple-600"],
    ["crystalline", "bg-cyan-600"],
    ["luminous", "bg-yellow-600"],
    ["liquid", "bg-blue-500"],
    ["glitch", "bg-green-700"],
  ] as const)("highlights active mode %s with correct color", (mode, expectedClass) => {
    render(<AnimationModeSelector currentMode={mode} onModeChange={mockOnModeChange} />);

    // Find the button for the mode (by text inside it, simplified)
    // We map mode to text snippet
    const modeTextMap: Record<PathAnimationMode, string> = {
      subtle: "Subtle",
      dynamic: "Dynamic",
      mystical: "Mystical",
      crystalline: "Crystalline",
      luminous: "Luminous",
      liquid: "Liquid",
      glitch: "Glitch",
    };

    const button = screen.getByText(new RegExp(modeTextMap[mode], "i")).closest("button");
    expect(button).toHaveClass(expectedClass);
    expect(button).toHaveClass("text-white");
  });

  it("renders non-active modes with default style", () => {
    // Render with 'glitch' active, so 'subtle' should be inactive
    render(<AnimationModeSelector currentMode="glitch" onModeChange={mockOnModeChange} />);

    const subtleButton = screen.getByText(/Subtle/i).closest("button");
    expect(subtleButton).toHaveClass("bg-gray-800");
    expect(subtleButton).toHaveClass("text-gray-300");
  });
});
