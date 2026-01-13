/**
 * Tests for GoalSetting Component
 */

import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalSetting } from "@/components/GoalSetting";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { getObserverClient } from "@love/experience-shared";

// Mock dependencies
jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Robust mock for shared package to avoid undefined constants
jest.mock("@love/experience-shared", () => ({
  getObserverClient: jest.fn(),
  NEUTRAL_VAC: [0, 0, 0],
  IDENTITY_QUATERNION: [0, 0, 0, 1],
  vacToQuaternion: jest.fn().mockReturnValue([0, 0, 0, 1]),
  CANONICAL_EMOTIONS: []
}));

jest.mock("@/components/PersonalStrategies", () => ({
  PersonalStrategies: () => <div data-testid="personal-strategies">Strategies</div>,
}));

// Mock Data
const mockEmotions = [
  { id: "joy", name: "Joy", category: "Positive", vac: [0.8, 0.6, 0.7], definition: "Happiness" },
  { id: "sadness", name: "Sadness", category: "Negative", vac: [-0.6, -0.4, -0.2], definition: "Feeling down" }
];

const mockPath = {
  path_id: "path-123",
  current_state: { emotion: "Neutral" },
  goal_state: { emotion: "Joy" },
  waypoints: [
    { order: 1, emotion: "Contentment", reasoning: "Step 1", estimated_time: "5m", difficulty: "easy" },
    { order: 2, emotion: "Joy", reasoning: "Step 2", estimated_time: "5m", difficulty: "medium" }
  ],
  path_metrics: {
    overall_difficulty: "easy",
    total_estimated_time: "10m",
    success_probability: 0.9
  }
};

describe("GoalSetting", () => {
  const mockLoadEmotionAtlas = jest.fn();
  const mockGenerateTransitionPath = jest.fn();
  const mockStartJourney = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Properly reset store using store's reset action
    // This relies on NEUTRAL_VAC being defined in the mock above
    act(() => {
      useExperienceStore.getState().reset();
    });

    (getObserverClient as jest.Mock).mockReturnValue({
      loadEmotionAtlas: mockLoadEmotionAtlas,
      generateTransitionPath: mockGenerateTransitionPath,
      startJourney: mockStartJourney
    });

    mockLoadEmotionAtlas.mockResolvedValue({
      emotions: mockEmotions,
      total_count: 2
    });
  });

  it("renders trigger button initially", () => {
    render(<GoalSetting />);
    expect(screen.getByText(/Set Emotional Goal/i)).toBeInTheDocument();
  });

  it("opens modal and loads emotions", async () => {
    const user = userEvent.setup();
    render(<GoalSetting />);

    await user.click(screen.getByText(/Set Emotional Goal/i));

    expect(screen.getByText(/Set Your Emotional Goal/i)).toBeInTheDocument();
    expect(mockLoadEmotionAtlas).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("Joy")).toBeInTheDocument();
      expect(screen.getByText("Sadness")).toBeInTheDocument();
    });
  });

  it("filters emotions by search", async () => {
    const user = userEvent.setup();
    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Search emotions/i);
    await user.type(searchInput, "Sad");

    expect(screen.queryByText("Joy")).not.toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();
  });

  it("selects a goal and displays details", async () => {
    const user = userEvent.setup();
    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    await user.click(screen.getByText("Joy"));

    expect(screen.getByText(/Selected Goal/i)).toBeInTheDocument();
    // Check for distance (calculation check)
    // Current VAC defaults to [0,0,0], Joy is [0.8, 0.6, 0.7]
    // Dist = sqrt(0.8^2 + 0.6^2 + 0.7^2) = sqrt(0.64 + 0.36 + 0.49) = sqrt(1.49) ~= 1.22
    expect(screen.getByText(/1.22 units/i)).toBeInTheDocument();

    const generateBtn = screen.getByText(/Generate Transition Path/i);
    expect(generateBtn).toBeEnabled();
  });

  it("generates transition path", async () => {
    const user = userEvent.setup();
    mockGenerateTransitionPath.mockResolvedValue(mockPath);

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));

    await user.click(screen.getByText(/Generate Transition Path/i));

    expect(mockGenerateTransitionPath).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Your Transition Path/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 1/i)).toBeInTheDocument();
    });

    // Check global store update
    expect(useExperienceStore.getState().transitionPath).toEqual(mockPath);
  });

  it("starts journey from generated path", async () => {
    const user = userEvent.setup();
    mockGenerateTransitionPath.mockResolvedValue(mockPath);
    mockStartJourney.mockResolvedValue({ journey_id: "journey-1" });

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));
    await user.click(screen.getByText(/Generate Transition Path/i));
    await waitFor(() => expect(screen.getByText(/Your Transition Path/i)).toBeInTheDocument());

    await user.click(screen.getByText(/Start Journey/i));

    expect(mockStartJourney).toHaveBeenCalled();

    // Check store update
    expect(useExperienceStore.getState().activeJourney).toBeTruthy();
  });

  it("handles API errors gracefully", async () => {
    const user = userEvent.setup();
    mockLoadEmotionAtlas.mockRejectedValue(new Error("Network Error"));
    const { logger } = require("@/utils/logger");

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));

    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  it("toggles strategy details", async () => {
    const user = userEvent.setup();
    const pathWithStrategies = {
      ...mockPath,
      waypoints: [{
        ...mockPath.waypoints[0],
        strategies: [{
          strategy_id: "strat-1",
          name: "Deep Breathing",
          description: "Breathe deeply",
          difficulty_level: 1,
          time_required: "2m",
          steps: ["Inhale", "Exhale"],
          evidence_level: "High",
          type: "Somatic"
        }]
      }]
    };
    mockGenerateTransitionPath.mockResolvedValue(pathWithStrategies);

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));
    await user.click(screen.getByText(/Generate Transition Path/i));

    await waitFor(() => expect(screen.getByText("Deep Breathing")).toBeInTheDocument());

    // Expand
    await user.click(screen.getByText("Deep Breathing"));
    expect(screen.getByText("Breathe deeply")).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByText("Deep Breathing"));
    expect(screen.queryByText("Breathe deeply")).not.toBeInTheDocument();
  });

  it("handles path generation failure", async () => {
    const user = userEvent.setup();
    mockGenerateTransitionPath.mockRejectedValue(new Error("Generation Failed"));
    const { logger } = require("@/utils/logger");

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));

    await user.click(screen.getByText(/Generate Transition Path/i));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith("api", "Path generation error", expect.any(Error));
      expect(screen.getByText(/Generation Failed/i)).toBeInTheDocument();
    });
  });

  it("handles journey start failure", async () => {
    const user = userEvent.setup();
    mockGenerateTransitionPath.mockResolvedValue(mockPath);
    mockStartJourney.mockRejectedValue(new Error("Start Failed"));
    const { logger } = require("@/utils/logger");

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));
    await user.click(screen.getByText(/Generate Transition Path/i));
    await waitFor(() => expect(screen.getByText(/Your Transition Path/i)).toBeInTheDocument());

    await user.click(screen.getByText(/Start Journey/i));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith("general", "Failed to start journey", expect.any(Error));
      expect(screen.getByText(/Failed to start journey/i)).toBeInTheDocument();
    });
  });

  it("resets generated path on Try Again", async () => {
    const user = userEvent.setup();
    mockGenerateTransitionPath.mockResolvedValue(mockPath);

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));
    await user.click(screen.getByText(/Generate Transition Path/i));
    await waitFor(() => expect(screen.getByText(/Your Transition Path/i)).toBeInTheDocument());

    await user.click(screen.getByText("Try Again"));

    expect(screen.queryByText(/Your Transition Path/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Generate Transition Path/i)).toBeInTheDocument();
  });

  it("hides results when no search matches", async () => {
    const user = userEvent.setup();
    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Search emotions/i);
    await user.type(searchInput, "XYZ123");

    expect(screen.getByText("No emotions found")).toBeInTheDocument();
  });

  it("closes modal when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText(/Set Your Emotional Goal/i)).toBeInTheDocument());

    await user.click(screen.getByText("✕"));

    expect(screen.queryByText(/Set Your Emotional Goal/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Set Emotional Goal/i)).toBeInTheDocument();
  });

  it("handles non-Error objects in API failure", async () => {
    const user = userEvent.setup();
    mockLoadEmotionAtlas.mockRejectedValue("String Error");

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));

    await waitFor(() => {
      expect(screen.getByText(/Failed to load emotions/i)).toBeInTheDocument();
    });
  });

  it("handles non-Error objects in path generation failure", async () => {
    const user = userEvent.setup();
    mockGenerateTransitionPath.mockRejectedValue("String Error");

    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());
    await user.click(screen.getByText("Joy"));

    await user.click(screen.getByText(/Generate Transition Path/i));

    await waitFor(() => {
      expect(screen.getByText(/Failed to generate path/i)).toBeInTheDocument();
    });
  });

  it("disables generate button when no goal is selected and guards execution", async () => {
    const user = userEvent.setup();
    render(<GoalSetting />);
    await user.click(screen.getByText(/Set Emotional Goal/i));
    await waitFor(() => expect(screen.getByText("Joy")).toBeInTheDocument());

    const generateBtn = screen.getByText(/Generate Transition Path/i);
    expect(generateBtn).toBeDisabled();

    // Force click to test guard clause
    fireEvent.click(generateBtn);
    expect(mockGenerateTransitionPath).not.toHaveBeenCalled();
  });
});
