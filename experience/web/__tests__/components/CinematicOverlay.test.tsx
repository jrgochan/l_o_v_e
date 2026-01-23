import { render, screen, act } from "@testing-library/react";
import { CinematicOverlay } from "../../components/CinematicOverlay";
import type { Emotion } from "@/types";

const mockEmotion = (name: string): Emotion => ({
  id: name.toLowerCase(),
  name,
  category: "Places We Go With Others",
  definition: "Definition",
  vac: [0.5, 0.5, 0.5],
  quaternion: [0, 0, 0, 1],
});

describe("CinematicOverlay", () => {
  const defaultProps = {
    activeEmotions: [mockEmotion("Joy")],
    isWaiting: false,
    hasAudioEnabled: true,
    onEnableAudio: jest.fn(),
    visible: true,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render active emotions", () => {
    render(<CinematicOverlay {...defaultProps} />);

    // Initial render logic triggers state update
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Current Connection")).toBeInTheDocument();
  });

  it("should display waiting message when waiting", () => {
    render(<CinematicOverlay {...defaultProps} isWaiting={true} activeEmotions={[]} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Waiting for Session...")).toBeInTheDocument();
    expect(screen.queryByText("Current Connection")).not.toBeInTheDocument();
  });

  it("should show audio enable button if audio disabled", () => {
    render(<CinematicOverlay {...defaultProps} hasAudioEnabled={false} />);

    const button = screen.getByRole("button", { name: /enable audio experience/i });
    expect(button).toBeInTheDocument();

    button.click();
    expect(defaultProps.onEnableAudio).toHaveBeenCalled();
  });

  it("should handle visibility prop", () => {
    const { container } = render(<CinematicOverlay {...defaultProps} visible={false} />);

    // Visibility is handled via opacity class
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("opacity-0");
  });

  it("should animate text changes", () => {
    const { rerender } = render(
      <CinematicOverlay {...defaultProps} activeEmotions={[mockEmotion("Calm")]} />
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Calm")).toBeInTheDocument();

    // Change text
    rerender(<CinematicOverlay {...defaultProps} activeEmotions={[mockEmotion("Excited")]} />);

    // Should fade out first (impl check: fadeState="out")
    // We can't easily check internal state, but we can check if text eventually updates

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Excited")).toBeInTheDocument();
  });
  it("should render grid mode with fallback color for unknown category", () => {
    const emotions = [
      mockEmotion("E1"),
      mockEmotion("E2"),
      mockEmotion("E3"),
      mockEmotion("E4"),
      { ...mockEmotion("E5"), category: "Unknown Category" },
      { ...mockEmotion("E6"), vac: [-0.5, -0.5, -0.5] as [number, number, number] }, // Negative VAC
    ];

    render(<CinematicOverlay {...defaultProps} activeEmotions={emotions} />);

    act(() => {
      jest.runAllTimers();
    });

    // Check for grid specific element
    expect(screen.getByText("6 Active Emotions")).toBeInTheDocument();
    expect(screen.getByText("E1")).toBeInTheDocument();
    expect(screen.getByText("E5")).toBeInTheDocument();

    // Check that E5 has the fallback color in its style
    // The component renders a circle with backgroundColor: color
    // and a border with borderColor: color + '40'
    const e5Text = screen.getByText("E5");
    // Navigate to parent or sibling to find the color indicators.
    // Structure:
    // <div className="group relative ... style={{ borderColor: ... }}">
    //   <div className="flex ...">
    //     <div className="w-2 h-2 ... style={{ backgroundColor: ... }}" />
    //     <span>E5</span>

    // Find the circle div
    // It's the previous sibling of the span containing "E5"
    const circle = e5Text.previousSibling as HTMLElement;
    expect(circle).toHaveStyle({ backgroundColor: "#888888" });
  });
});
