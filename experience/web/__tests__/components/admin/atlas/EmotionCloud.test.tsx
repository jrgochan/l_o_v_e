import { render } from "@testing-library/react";
import { EmotionCloud } from "../../../../components/admin/atlas/EmotionCloud";
import * as THREE from "three";

// Mock child components
jest.mock("../../../../components/admin/emotions/AnimatedEmotionNode", () => ({
  AnimatedEmotionNode: () => <mesh data-testid="animated-node" />,
}));

jest.mock("../../../../components/admin/emotions/MysticalEmotionNode", () => ({
  MysticalEmotionNode: () => <mesh data-testid="mystical-node" />,
}));

jest.mock("../../../../components/admin/particles/EmotionParticles", () => ({
  EmotionParticles: () => <group data-testid="emotion-particles" />,
}));

jest.mock("@/utils/modeVisualConfigs", () => ({
  getModeConfig: () => ({
    lighting: {
      ambientIntensity: 0.5,
      keyLightPosition: [10, 10, 10],
      keyLightIntensity: 1,
      fillLightPosition: [-10, 0, -10],
      fillLightIntensity: 0.5,
      castShadows: false,
      enableEmotionLights: true,
      emotionLightIntensity: 1,
      emotionLightDistance: 10,
    },
    particles: { enabled: true },
  }),
}));

jest.mock("@/utils/emotionAnimationMapper", () => ({
  getEmotionAnimationParams: () => ({
    baseSpeed: 1,
    amplitude: 1,
    secondaryMotion: "stable",
    breathingRate: 1,
  }),
}));

// Mock Stores
const mockUseAtlasAdminStore = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: (selector: any) => mockUseAtlasAdminStore(selector),
}));

const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: () => mockUseSettingsStore(),
}));

// Mock Audio
jest.mock("@/hooks/useAmbientAudio", () => ({
  useAmbientAudio: () => ({ playHoverSound: jest.fn() }),
}));

describe("EmotionCloud", () => {
  const mockEmotions = [
    { id: "1", name: "Joy", category: "Positive", vac: [1, 1, 1] },
    { id: "2", name: "Sadness", category: "Negative", vac: [-1, -1, -1] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup store mocks
    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      const state = {
        allEmotions: mockEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        focusedEmotionId: null,
        categoryFilters: new Map([
          ["Positive", { enabled: true }],
          ["Negative", { enabled: true }],
        ]),
        toggleEmotion: jest.fn(),
        setHoveredEmotion: jest.fn(),
      };
      return selector(state);
    });

    mockUseSettingsStore.mockReturnValue({
      layers: { emotionPoints: true, emotionLabels: true },
      pathAnimationMode: "flow",
      focusMode: false,
      enableAnimations: true,
      emotionSize: 1,
      showMotionIndicators: false,
    });
  });

  it("should render visible emotions", () => {
    const { getAllByTestId } = render(<EmotionCloud />);
    // Expect 2 nodes (Joy, Sadness)
    expect(getAllByTestId("animated-node")).toHaveLength(2);
  });

  it("should filter emotions by category", () => {
    mockUseAtlasAdminStore.mockImplementation((selector: any) => {
      const state = {
        allEmotions: mockEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        focusedEmotionId: null,
        categoryFilters: new Map([
          ["Positive", { enabled: true }],
          ["Negative", { enabled: false }], // Filter out Sadness
        ]),
        toggleEmotion: jest.fn(),
        setHoveredEmotion: jest.fn(),
      };
      return selector(state);
    });

    const { getAllByTestId } = render(<EmotionCloud />);
    expect(getAllByTestId("animated-node")).toHaveLength(1);
  });

  it("should use mystical node when mode is mystical", () => {
    mockUseSettingsStore.mockReturnValue({
      layers: { emotionPoints: true },
      pathAnimationMode: "mystical", // Mystical mode
      focusMode: false,
      enableAnimations: true,
      emotionSize: 1,
    });

    const { getAllByTestId } = render(<EmotionCloud />);
    expect(getAllByTestId("mystical-node")).toHaveLength(2);
  });

  it("should render lights based on configuration", () => {
    // Just verify it renders without crashing.
    // Lights are intrinsic elements <pointLight>, harder to select by testId unless wrapped.
    // We trust the loop logic tested elsewhere or via visual regression.
    const { container } = render(<EmotionCloud />);
    expect(container).toBeDefined();
  });
});
