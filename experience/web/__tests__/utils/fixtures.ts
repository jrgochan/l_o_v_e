/**
 * Test Fixtures
 * Common test data used across multiple test files
 */

// Sample VAC vectors for testing
export const mockVACVectors = {
  joy: { valence: 0.9, arousal: 0.7, connection: 0.8 },
  calm: { valence: 0.7, arousal: -0.5, connection: 0.6 },
  anxiety: { valence: -0.5, arousal: 0.7, connection: -0.4 },
  grief: { valence: -0.9, arousal: -0.4, connection: 0.5 },
  neutral: { valence: 0.0, arousal: 0.0, connection: 0.0 },
  shame: { valence: -0.9, arousal: -0.1, connection: -1.0 },
  compassion: { valence: -0.3, arousal: -0.2, connection: 0.8 },
};

// Sample emotions from atlas
export const mockEmotions = [
  {
    id: 1,
    name: "Joy",
    category: "Places We Go When Life Is Good",
    vac: mockVACVectors.joy,
    definition: "A feeling of great pleasure and happiness.",
  },
  {
    id: 2,
    name: "Calm",
    category: "Places We Go When Life Is Good",
    vac: mockVACVectors.calm,
    definition: "A state of tranquility and peace.",
  },
  {
    id: 3,
    name: "Anxiety",
    category: "Places We Go When Things Are Uncertain",
    vac: mockVACVectors.anxiety,
    definition: "A feeling of worry, nervousness, or unease.",
  },
];

// Sample transition path
export const mockTransitionPath = {
  from_emotion: mockEmotions[2], // Anxiety
  to_emotion: mockEmotions[1], // Calm
  goal_state: { emotion: "Calm", vac: { valence: 0.7, arousal: -0.5, connection: 0.6 } },
  waypoints: [
    {
      emotion: "Worry",
      order: 1,
      vac: { valence: -0.4, arousal: 0.5, connection: -0.3 },
      reasoning: "Gradual reduction in arousal",
      estimated_time: "20-30 minutes",
      difficulty: "moderate",
      strategies: [],
    },
    {
      emotion: "Acceptance",
      order: 2,
      vac: { valence: 0.0, arousal: 0.0, connection: 0.3 },
      reasoning: "Moving toward neutral before positive",
      estimated_time: "15-20 minutes",
      difficulty: "easy",
      strategies: [],
    },
  ],
  strategies: [
    {
      id: 1,
      name: "4-7-8 Breathing",
      description: "A breathing technique to reduce anxiety",
      steps: [
        "Exhale completely",
        "Inhale for 4 counts",
        "Hold for 7 counts",
        "Exhale for 8 counts",
      ],
      evidence_level: "RCT",
      type: "Attentional Deployment",
    },
  ],
  metrics: {
    total_distance: 2.5,
    estimated_time_minutes: 60,
    difficulty: "moderate",
    success_rate: 0.75,
  },
};

// Sample journey (matching store structure)
export const mockJourney = {
  journey_id: "journey-123",
  path_id: "path-456",
  current_waypoint: 0,
  total_waypoints: 2,
  status: "in_progress" as const,
  started_at: new Date("2025-12-04T20:00:00Z").toISOString(),
  waypoints_reached: [] as number[],
};

// Sample completed journey
export const mockCompletedJourney = {
  ...mockJourney,
  current_waypoint: 2,
  waypoints_reached: [0, 1],
  status: "completed" as const,
};
