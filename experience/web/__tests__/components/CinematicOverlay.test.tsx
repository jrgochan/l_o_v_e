import { render, screen, act } from "@testing-library/react";
import { CinematicOverlay } from "../../components/CinematicOverlay";
import type { AtlasEmotion } from "@/types";

const mockEmotion = (name: string): AtlasEmotion => ({
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
    expect(screen.getByText("Current State")).toBeInTheDocument();
  });

  it("should display waiting message when waiting", () => {
    render(<CinematicOverlay {...defaultProps} isWaiting={true} activeEmotions={[]} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Waiting for Session...")).toBeInTheDocument();
    expect(screen.queryByText("Current State")).not.toBeInTheDocument();
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
});
