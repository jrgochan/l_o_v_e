
import { render, screen, fireEvent, act } from "@testing-library/react";
import { WaypointDetailModal } from "@/components/admin/shared/WaypointDetailModal";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { EmotionPath, AtlasEmotion } from "@/types/atlas-admin";

// Mock store
jest.mock("@/stores/useAtlasAdminStore");
const mockUseAtlasAdminStore = useAtlasAdminStore as unknown as jest.Mock;

const mockAllEmotions: AtlasEmotion[] = [
  { id: "e1", name: "Joy", vac: [0.8, 0.8, 0.8], category: "Happiness", definition: "A feeling of great pleasure and happiness.", quaternion: [0, 0, 0, 1] },
  { id: "e2", name: "Sadness", vac: [-0.8, -0.5, 0.0], category: "Sadness", definition: "Feeling sorrow or unhappiness.", quaternion: [0, 0, 0, 1] },
  { id: "e3", name: "Anger", vac: [-0.6, 0.9, -0.2], category: "Anger", definition: "A strong feeling of annoyance, displeasure, or hostility.", quaternion: [0, 0, 0, 1] },
];

const mockPath: EmotionPath = {
  id: "p1",
  name: "Joy to Sadness",
  from_id: "e1",
  to_id: "e2",
  from: { id: "e1", name: "Joy", vac: [0.8, 0.8, 0.8], category: "Happiness", definition: "Def", quaternion: [0, 0, 0, 1] },
  to: { id: "e2", name: "Sadness", vac: [-0.8, -0.5, 0.0], category: "Sadness", definition: "Def", quaternion: [0, 0, 0, 1] },
  waypoints: [
    {
      id: "w1",
      step_order: 1,
      emotion: "TestWaypoint",
      vac: [0.78, 0.2, 0.4],
      category: "Neutral",
      reasoning: "Transition point",
      explanation: {
        psychological_purpose: "Test purpose",
        vac_analysis: {
          valence_shift: { psychological_meaning: "Dropping", delta: -0.02, direction: "down", interpretation: "neutral" },
          arousal_shift: { psychological_meaning: "Dropping", delta: -0.6, direction: "down", interpretation: "calming" },
          connection_shift: { psychological_meaning: "Dropping", delta: -0.4, direction: "down", interpretation: "isolating" },
        },
        research_citations: [{ author: "Freud", year: "1900", work: "Dreams", key_finding: "Stuff" }],
        readiness_signs: ["Ready"],
        warning_signs: ["Not Ready"],
      },
      strategies: [
        { id: "s1", name: "Strat 1", evidence_level: "High", description: "Do this", time_commitment: "5m", category: "Action" }
      ],
    }
  ],
  metadata: {
    total_distance: 1,
    estimated_difficulty: "easy",
    rec_time_seconds: 60,
  }
};

describe("WaypointDetailModal", () => {
  const setFocusedEmotionMock = jest.fn();
  const onCloseMock = jest.fn();
  const onNavigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAtlasAdminStore.mockImplementation((selector: any) => selector({
      allEmotions: mockAllEmotions,
      setFocusedEmotion: setFocusedEmotionMock,
    }));
  });

  it("renders start step details correctly", () => {
    render(
      <WaypointDetailModal
        waypointIndex={0}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    expect(screen.getByRole("heading", { name: "Joy" })).toBeInTheDocument();
    expect(screen.getByText("ORIGIN")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3 in journey from/)).toBeInTheDocument();
    expect(screen.getByText("Psychological Purpose")).toBeInTheDocument();
    expect(screen.getByText("The starting point of your emotional journey.")).toBeInTheDocument();

    expect(setFocusedEmotionMock).toHaveBeenCalledWith("e1");
  });

  it("renders waypoint details correctly (vac neutral)", () => {
    render(
      <WaypointDetailModal
        waypointIndex={1}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    expect(screen.getByRole("heading", { name: "TestWaypoint" })).toBeInTheDocument();
    expect(screen.queryByText("ORIGIN")).not.toBeInTheDocument();
    expect(screen.getByText("Test purpose")).toBeInTheDocument();

    const vDelta = screen.getByText("-0.020");
    expect(vDelta).toBeInTheDocument();
    expect(vDelta).toHaveClass("text-gray-400"); // Neutral color
  });

  it("renders end step details correctly", () => {
    render(
      <WaypointDetailModal
        waypointIndex={2}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );
    expect(screen.getByRole("heading", { name: "Sadness" })).toBeInTheDocument();
    expect(screen.getByText("GOAL")).toBeInTheDocument();
    expect(setFocusedEmotionMock).toHaveBeenCalledWith("e2");
  });

  it("handles tab switching (including back to why)", () => {
    render(
      <WaypointDetailModal
        waypointIndex={1}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    expect(screen.getByText("Psychological Purpose")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/How to Transition/i));
    expect(screen.getByText("Recommended Strategies")).toBeInTheDocument();
    expect(screen.getByText("Strat 1")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Relation to Others/i));
    expect(screen.getByText("What Changed")).toBeInTheDocument();

    // This validates "onClick={() => setActiveTab('why')}" line (logic check)
    fireEvent.click(screen.getByText(/Why This Step/i));
    expect(screen.getByText("Psychological Purpose")).toBeInTheDocument();
  });

  it("handles navigation buttons", () => {
    render(
      <WaypointDetailModal
        waypointIndex={1} // Middle
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    fireEvent.click(screen.getByText("Next →"));
    expect(onNavigateMock).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByText("← Previous"));
    expect(onNavigateMock).toHaveBeenCalledWith(0);
  });

  it("handles clicking path node in visualization", () => {
    render(
      <WaypointDetailModal
        waypointIndex={1}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    fireEvent.click(screen.getByText(/Relation to Others/i));

    // This validates "onClick={() => onNavigate?.(i)}" line logic
    const joyBtn = screen.getByRole("button", { name: "Joy" });
    fireEvent.click(joyBtn);
    expect(onNavigateMock).toHaveBeenCalledWith(0);
  });

  it("disables navigation buttons at boundaries", () => {
    render(
      <WaypointDetailModal
        waypointIndex={0} // Start
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    const prevBtn = screen.getByText("← Previous").closest("button");
    expect(prevBtn).toBeDisabled();

    const nextBtn = screen.getByText("Next →").closest("button");
    expect(nextBtn).not.toBeDisabled();
  });

  it("handles keyboard navigation", () => {
    render(
      <WaypointDetailModal
        waypointIndex={1}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onNavigateMock).toHaveBeenCalledWith(0);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onNavigateMock).toHaveBeenCalledWith(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("clears focused emotion on unmount", () => {
    const { unmount } = render(
      <WaypointDetailModal
        waypointIndex={0}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    expect(setFocusedEmotionMock).toHaveBeenCalledWith("e1");
    unmount();
    expect(setFocusedEmotionMock).toHaveBeenCalledWith(null);
  });

  it("navigation via stepper dots", () => {
    const { container } = render(
      <WaypointDetailModal
        waypointIndex={1}
        path={mockPath}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );
    const dotButtons = container.querySelectorAll(".flex.gap-1.mt-1 button");
    expect(dotButtons.length).toBe(3);

    fireEvent.click(dotButtons[2]);
    expect(onNavigateMock).toHaveBeenCalledWith(2);
  });

  it("displays fallback text when no strategies provided", () => {
    const pathWithNoStrategies = {
      ...mockPath,
      waypoints: [{ ...mockPath.waypoints[0], strategies: [] }]
    } as EmotionPath;

    const { rerender } = render(
      <WaypointDetailModal
        waypointIndex={0} // Start
        path={pathWithNoStrategies}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );

    fireEvent.click(screen.getByText(/How to Transition/i));
    expect(screen.getByText("Begin by acknowledging your current emotional state.")).toBeInTheDocument();

    rerender(
      <WaypointDetailModal
        waypointIndex={1} // Waypoint (empty strategies)
        path={pathWithNoStrategies}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );
    expect(screen.getByText("No specific strategies provided for this waypoint.")).toBeInTheDocument();

    rerender(
      <WaypointDetailModal
        waypointIndex={2} // End
        path={pathWithNoStrategies}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    );
    expect(screen.getByText("You have reached your destination. Reflect on the journey.")).toBeInTheDocument();
  });
});
