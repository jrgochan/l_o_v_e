/**
 * Tests for GoalSetting Component
 *
 * Tests the complex goal-setting UI with emotion atlas loading,
 * search, selection, path generation, and journey starting.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalSetting } from "@/components/GoalSetting";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { act } from "@testing-library/react";
import * as SharedAPI from "@love/experience-shared";

// Mock Observer API client
jest.mock("@love/experience-shared", () => ({
  ...jest.requireActual("@love/experience-shared"),
  getObserverClient: jest.fn(),
}));

const mockGetObserverClient = SharedAPI.getObserverClient as jest.MockedFunction<
  typeof SharedAPI.getObserverClient
>;

// Mock data
const mockEmotions = [
  {
    id: 1,
    name: "Joy",
    category: "Places We Go When Life Is Good",
    vac: [0.9, 0.7, 0.8] as [number, number, number],
    definition: "A feeling of great pleasure and happiness",
  },
  {
    id: 2,
    name: "Calm",
    category: "Places We Go When Life Is Good",
    vac: [0.7, -0.5, 0.6] as [number, number, number],
    definition: "A state of tranquility and peace",
  },
  {
    id: 3,
    name: "Anxiety",
    category: "Places We Go When Things Are Uncertain",
    vac: [-0.5, 0.7, -0.4] as [number, number, number],
    definition: "A feeling of worry and unease",
  },
];

const mockGeneratedPath = {
  path_id: "path-123",
  current_state: { emotion: "Anxiety", vac: [-0.5, 0.7, -0.4] },
  goal_state: { emotion: "Calm", vac: [0.7, -0.5, 0.6] },
  waypoints: [
    {
      order: 1,
      emotion: "Worry",
      vac: [-0.4, 0.5, -0.3],
      reasoning: "Gradual reduction in arousal",
      estimated_time: "20-30 minutes",
      difficulty: "moderate",
      strategies: [
        {
          strategy_id: "strat-1",
          name: "4-7-8 Breathing",
          description: "A breathing technique to reduce anxiety",
          steps: ["Exhale completely", "Inhale for 4 counts", "Hold for 7 counts"],
          time_required: "5-10 minutes",
          difficulty_level: 1,
          evidence_level: "RCT",
          type: "Attentional Deployment",
        },
      ],
    },
  ],
  path_metrics: {
    total_distance: 2.5,
    overall_difficulty: "moderate",
    total_estimated_time: "40-60 minutes",
    success_probability: 0.75,
  },
};

describe("GoalSetting", () => {
  let mockClient: any;

  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });

    // Setup mock client
    mockClient = {
      loadEmotionAtlas: jest.fn(),
      generateTransitionPath: jest.fn(),
      startJourney: jest.fn(),
    };

    mockGetObserverClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State - Collapsed", () => {
    it("renders collapsed button initially", () => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });

      render(<GoalSetting />);
      expect(screen.getByRole("button", { name: /Set Emotional Goal/i })).toBeInTheDocument();
    });

    it("opens when button clicked", async () => {
      const user = userEvent.setup();
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });

      render(<GoalSetting />);

      const button = screen.getByRole("button", { name: /Set Emotional Goal/i });
      await user.click(button);

      expect(screen.getByText("Set Your Emotional Goal")).toBeInTheDocument();
    });
  });

  describe("Loading Emotions", () => {
    it("loads emotion atlas when opened", async () => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });

      render(<GoalSetting />);

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      await waitFor(() => {
        expect(mockClient.loadEmotionAtlas).toHaveBeenCalled();
      });
    });

    it("displays loading state", async () => {
      mockClient.loadEmotionAtlas.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ emotions: mockEmotions, total_count: 3 }), 100)
          )
      );

      const { getAllByText } = render(<GoalSetting />);

      // Open first
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      // May appear multiple times (modal + bottom text)
      const loadingTexts = getAllByText(/Loading emotional atlas/i);
      expect(loadingTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("displays emotions after loading", async () => {
      const user = userEvent.setup();
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });

      render(<GoalSetting />);
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      await waitFor(() => {
        expect(screen.getByText("Joy")).toBeInTheDocument();
        expect(screen.getByText("Calm")).toBeInTheDocument();
        expect(screen.getByText("Anxiety")).toBeInTheDocument();
      });
    });

    it("displays error on API failure", async () => {
      const user = userEvent.setup();
      mockClient.loadEmotionAtlas.mockRejectedValue(new Error("API Error"));

      render(<GoalSetting />);
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    beforeEach(async () => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
    });

    it("filters emotions by name", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Search emotions/i);
      await user.type(searchInput, "joy");

      expect(screen.getByText("Joy")).toBeInTheDocument();
      expect(screen.queryByText("Anxiety")).not.toBeInTheDocument();
    });

    it("filters emotions by category", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Search emotions/i);
      await user.type(searchInput, "uncertain");

      expect(screen.getByText("Anxiety")).toBeInTheDocument();
      expect(screen.queryByText("Joy")).not.toBeInTheDocument();
    });

    it("shows no results message when no match", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Search emotions/i);
      await user.type(searchInput, "nonexistent");

      expect(screen.getByText(/No emotions found/i)).toBeInTheDocument();
    });

    it("updates filtered count in label", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      // Should show all initially
      expect(screen.getByText(/3 of 3/)).toBeInTheDocument();

      // Filter
      const searchInput = screen.getByPlaceholderText(/Search emotions/i);
      await user.type(searchInput, "joy");

      // Should show filtered count
      expect(screen.getByText(/1 of 3/)).toBeInTheDocument();
    });
  });

  describe("Goal Selection", () => {
    beforeEach(() => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
    });

    it("selects goal when emotion clicked", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );

      await user.click(joyButton!);

      expect(screen.getByText("Selected Goal")).toBeInTheDocument();
    });

    it("displays selected goal details", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);

      expect(screen.getByText(/A feeling of great pleasure/i)).toBeInTheDocument();
      expect(screen.getByText(/Emotional Distance:/i)).toBeInTheDocument();
    });

    it("highlights selected emotion", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);

      expect(joyButton?.className).toContain("bg-purple-600");
    });
  });

  describe("Path Generation", () => {
    beforeEach(() => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
      mockClient.generateTransitionPath.mockResolvedValue(mockGeneratedPath);
    });

    it("generate button disabled when no goal selected", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const generateButton = screen.getByRole("button", { name: /Generate Transition Path/i });
      expect(generateButton).toBeDisabled();
    });

    it("generates path when goal selected", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      // Select goal
      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);

      // Generate path
      const generateButton = screen.getByRole("button", { name: /Generate Transition Path/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockClient.generateTransitionPath).toHaveBeenCalled();
      });
    });

    it("displays path metrics after generation", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);

      const generateButton = screen.getByRole("button", { name: /Generate Transition Path/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Your Transition Path/i)).toBeInTheDocument();
        // "moderate" appears multiple times, so check it exists
        expect(screen.getAllByText(/moderate/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/75%/i)).toBeInTheDocument(); // Success rate
      });
    });

    it("displays waypoints", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);

      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() => {
        expect(screen.getByText("Worry")).toBeInTheDocument();
        expect(screen.getByText(/Gradual reduction in arousal/i)).toBeInTheDocument();
      });
    });

    it("shows loading state during generation", async () => {
      const user = userEvent.setup();
      mockClient.generateTransitionPath.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockGeneratedPath), 100))
      );

      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);

      const generateButton = screen.getByRole("button", { name: /Generate Transition Path/i });
      await user.click(generateButton);

      expect(screen.getByText("Generating Path...")).toBeInTheDocument();
    });
  });

  describe("Strategy Expansion", () => {
    beforeEach(() => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
      mockClient.generateTransitionPath.mockResolvedValue(mockGeneratedPath);
    });

    it("shows strategy list", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);
      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() => {
        expect(screen.getByText(/4-7-8 Breathing/i)).toBeInTheDocument();
      });
    });

    it("expands strategy when clicked", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);
      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() => expect(screen.getByText(/4-7-8 Breathing/i)).toBeInTheDocument());

      const strategyButtons = screen.getAllByRole("button");
      const strategyButton = strategyButtons.find((btn) =>
        btn.textContent?.includes("4-7-8 Breathing")
      );
      await user.click(strategyButton!);

      expect(screen.getByText("Exhale completely")).toBeInTheDocument();
      expect(screen.getByText(/RCT/i)).toBeInTheDocument();
    });
  });

  describe("Journey Starting", () => {
    beforeEach(() => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
      mockClient.generateTransitionPath.mockResolvedValue(mockGeneratedPath);
      mockClient.startJourney.mockResolvedValue({
        journey_id: "journey-123",
      });
    });

    it("shows start journey button after path generation", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);
      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Start Journey/i })).toBeInTheDocument();
      });
    });

    it("starts journey when button clicked", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);
      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Start Journey/i })).toBeInTheDocument()
      );

      await user.click(screen.getByRole("button", { name: /Start Journey/i }));

      await waitFor(() => {
        expect(mockClient.startJourney).toHaveBeenCalled();
      });
    });

    it("updates store when journey started", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);
      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Start Journey/i })).toBeInTheDocument()
      );

      await user.click(screen.getByRole("button", { name: /Start Journey/i }));

      await waitFor(() => {
        const store = useExperienceStore.getState();
        expect(store.activeJourney).not.toBeNull();
      });
    });
  });

  describe("UI Interactions", () => {
    beforeEach(() => {
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
    });

    it("closes modal when X clicked", async () => {
      const user = userEvent.setup();
      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Set Your Emotional Goal")).toBeInTheDocument());

      const closeButton = screen.getByText("✕");
      await user.click(closeButton);

      expect(screen.queryByText("Set Your Emotional Goal")).not.toBeInTheDocument();
    });

    it("displays current VAC state", async () => {
      const user = userEvent.setup();
      act(() => {
        useExperienceStore.setState({
          currentVAC: [0.5, 0.3, 0.7] as [number, number, number],
        });
      });

      render(<GoalSetting />);
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      await waitFor(() => {
        expect(screen.getByText(/\[0\.50, 0\.30, 0\.70\]/)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles path generation error", async () => {
      const user = userEvent.setup();
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });
      mockClient.generateTransitionPath.mockRejectedValue(new Error("Path error"));

      render(<GoalSetting />);

      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));
      await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

      const joyButtons = screen.getAllByRole("button");
      const joyButton = joyButtons.find(
        (btn) => btn.textContent?.includes("Joy") && btn.textContent?.includes("VAC:")
      );
      await user.click(joyButton!);
      await user.click(screen.getByRole("button", { name: /Generate Transition Path/i }));

      await waitFor(() => {
        expect(screen.getByText(/Path error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper headings", async () => {
      const user = userEvent.setup();
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });

      render(<GoalSetting />);
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      await waitFor(() => {
        const heading = screen.getByRole("heading", { name: /Set Your Emotional Goal/i });
        expect(heading).toBeInTheDocument();
      });
    });

    it("search input is labeled", async () => {
      const user = userEvent.setup();
      mockClient.loadEmotionAtlas.mockResolvedValue({
        emotions: mockEmotions,
        total_count: mockEmotions.length,
      });

      render(<GoalSetting />);
      await user.click(screen.getByRole("button", { name: /Set Emotional Goal/i }));

      await waitFor(() => {
        expect(screen.getByText(/Choose Goal Emotion/i)).toBeInTheDocument();
      });
    });
  });
});
