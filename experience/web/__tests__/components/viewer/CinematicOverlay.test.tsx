import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CinematicOverlay } from "@/components/viewer/CinematicOverlay";
import { Emotion } from "@/types";

const mockEmotions: Emotion[] = [
  {
    id: "1",
    name: "Joy",
    vac: [0.8, 0.5, 0.6],
    category: "Happiness",
    definition: "Def",
    quaternion: [0, 0, 0, 0],
  },
  {
    id: "2",
    name: "Trust",
    vac: [0.6, 0.3, 0.7],
    category: "Trust",
    definition: "Def",
    quaternion: [0, 0, 0, 0],
  },
];

describe("CinematicOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when invisible", () => {
    const { container } = render(
      <CinematicOverlay
        activeEmotions={[]}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={false}
      />
    );
    // It actually renders a div with opacity-0, checks if it has that class
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass("opacity-0");
  });

  it('renders "Connecting..." when not connected', () => {
    render(
      <CinematicOverlay
        activeEmotions={[]}
        isConnected={false}
        isWaiting={false} // Irrelevant if !isConnected
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    // Initial state might be empty or previous text.
    // The effect sets "Connecting..." after 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it('renders "Waiting for Session..." when connected but waiting', () => {
    render(
      <CinematicOverlay
        activeEmotions={[]}
        isConnected={true}
        isWaiting={true}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("Waiting for Session...")).toBeInTheDocument();
  });

  it("renders cinematic text for active emotions", () => {
    render(
      <CinematicOverlay
        activeEmotions={mockEmotions}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("Joy + Trust")).toBeInTheDocument();
    expect(screen.getByText("Current Connection")).toBeInTheDocument();
  });

  it("renders enable audio button when audio is disabled", () => {
    const onEnable = jest.fn();
    render(
      <CinematicOverlay
        activeEmotions={mockEmotions}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={false}
        onEnableAudio={onEnable}
        visible={true}
      />
    );

    const btn = screen.getByText("Enable Audio Experience");
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onEnable).toHaveBeenCalled();
  });

  it("switches to grid mode when many emotions are present", () => {
    const manyEmotions = Array.from(
      {
        length: 1, // less than 6?
      },
      (_, i) => ({ id: `${i}`, name: `Emo ${i}`, vac: [0, 0, 0], category: "Cat" })
    );

    // Threshold is 5.
    const fiveEmotions = [
      {
        id: "1",
        name: "E1",
        vac: [0, 0, 0],
        category: "C",
        definition: "D",
        quaternion: [0, 0, 0, 0],
      },
      {
        id: "2",
        name: "E2",
        vac: [0, 0, 0],
        category: "C",
        definition: "D",
        quaternion: [0, 0, 0, 0],
      },
      {
        id: "3",
        name: "E3",
        vac: [0, 0, 0],
        category: "C",
        definition: "D",
        quaternion: [0, 0, 0, 0],
      },
      {
        id: "4",
        name: "E4",
        vac: [0, 0, 0],
        category: "C",
        definition: "D",
        quaternion: [0, 0, 0, 0],
      },
      {
        id: "5",
        name: "E5",
        vac: [0, 0, 0],
        category: "C",
        definition: "D",
        quaternion: [0, 0, 0, 0],
      },
    ] as Emotion[];

    render(
      <CinematicOverlay
        activeEmotions={fiveEmotions}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    expect(screen.getByText("5 Active Emotions")).toBeInTheDocument();
    expect(screen.getByText("E1")).toBeInTheDocument();
    // Should NOT show cinematic text
    expect(screen.queryByText("E1 + E2 + E3 + E4 + E5")).not.toBeInTheDocument();

    // Check for VAC colors (negative/zero was default [0,0,0])
    // The rendered output for vac[0]<=0 is text-red-400
    const vSpan = screen.getAllByText("V0.0")[0];
    expect(vSpan).toHaveClass("text-red-400");
  });

  it("renders positive VAC colors in grid mode", () => {
    const positiveEmotions = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      name: `Pos ${i}`,
      vac: [0.5, 0.5, 0.5],
      category: "Cat",
      definition: "Def",
      quaternion: [0, 0, 0, 0],
    })) as Emotion[];

    render(
      <CinematicOverlay
        activeEmotions={positiveEmotions}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    const vSpan = screen.getAllByText("V0.5")[0];
    expect(vSpan).toHaveClass("text-green-400");

    const aSpan = screen.getAllByText("A0.5")[0];
    expect(aSpan).toHaveClass("text-yellow-400");

    const cSpan = screen.getAllByText("C0.5")[0];
    expect(cSpan).toHaveClass("text-purple-400");
  });

  it("handles emotion updates (text change)", () => {
    const { rerender } = render(
      <CinematicOverlay
        activeEmotions={[mockEmotions[0]]}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByText("Joy")).toBeInTheDocument();

    // Update emotions
    rerender(
      <CinematicOverlay
        activeEmotions={mockEmotions}
        isConnected={true}
        isWaiting={false}
        hasAudioEnabled={true}
        onEnableAudio={jest.fn()}
        visible={true}
      />
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByText("Joy + Trust")).toBeInTheDocument();
  });
});
