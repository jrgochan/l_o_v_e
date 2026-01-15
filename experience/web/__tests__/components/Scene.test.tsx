/**
 * Tests for Scene Component
 *
 * Tests the main Three.js scene setup, layer visibility, and interactions.
 */

import { render, act, fireEvent } from "@testing-library/react";
import { Scene } from "@/components/Scene";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { mockTransitionPath, mockJourney } from "../utils/fixtures";

// Mock Three.js/R3F
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({
    camera: { position: { copy: jest.fn(), set: jest.fn() }, lookAt: jest.fn() },
    gl: { domElement: document.createElement("canvas") },
    scene: {},
    viewport: { width: 100, height: 100 },
  })),
}));

// Mock Components with Prop Capture
jest.mock("@/components/OrbitControls", () => ({
  OrbitControls: ({ enabled }: any) => <div data-testid="orbit-controls" data-enabled={enabled} />,
}));

jest.mock("@/components/SoulSphere", () => ({
  SoulSphere: () => <div data-testid="soul-sphere" />,
}));

jest.mock("@/components/TransitionPathRenderer", () => ({
  TransitionPathRenderer: ({ path, onWaypointHover, onWaypointClick }: any) => (
    <div data-testid="transition-path-renderer">
      <button onClick={() => onWaypointHover(0, { index: 0, emotion: "Joy", state: "reached" })}>
        Hover On
      </button>
      <button onClick={() => onWaypointHover(null, null)}>Hover Off</button>
      <button onClick={() => onWaypointClick(0)}>Click Waypoint</button>
    </div>
  ),
}));

// Mock Logger
jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
  },
}));

jest.mock("@/components/WaypointTooltip", () => ({
  WaypointTooltip: ({ waypoint }: any) => (
    <div data-testid="waypoint-tooltip">{waypoint.emotion}</div>
  ),
}));

jest.mock("@react-three/drei", () => ({
  Html: ({ children }: any) => <div data-testid="drei-html">{children}</div>,
  Stars: () => <div data-testid="drei-stars" />,
}));

jest.mock("@/components/ViewerPathFlyover", () => ({
  ViewerPathFlyover: () => <div data-testid="viewer-path-flyover" />,
}));

jest.mock("@/components/VACAnimator", () => ({
  VACAnimator: () => <div data-testid="vac-animator" />,
}));

jest.mock("@/components/admin/atlas/EmotionCloud", () => ({
  EmotionCloud: () => <div data-testid="emotion-cloud" />,
}));

jest.mock("@/components/VACAxisLabels3D", () => ({
  VACAxisLabels3D: () => <div data-testid="vac-axis-labels" />,
}));

// Mock Settings Store
jest.mock("@/stores/useSettingsStore", () => {
  // create a simple mock store
  let state = { layers: { soulSphere: true, transitionPaths: true } };
  const useSettingsStore = (selector?: any) => (selector ? selector(state) : state);
  useSettingsStore.setState = (newState: any) => {
    state = { ...state, ...newState };
  };
  return { useSettingsStore };
});

describe("Scene", () => {
  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
    // Reset defaults
    (useSettingsStore as any).setState({ layers: { soulSphere: true, transitionPaths: true } });
    const { logger } = require("@/utils/logger");
    logger.debug.mockClear();
  });

  describe("Rendering & Structure", () => {
    it("renders core components", () => {
      const { getByTestId } = render(<Scene />);
      expect(getByTestId("r3f-canvas")).toBeInTheDocument();
      expect(getByTestId("soul-sphere")).toBeInTheDocument();
      expect(getByTestId("orbit-controls")).toBeInTheDocument();
    });
  });

  describe("Layer Visibility", () => {
    it("hides SoulSphere when layer is disabled", () => {
      (useSettingsStore as any).setState({ layers: { soulSphere: false } });
      const { queryByTestId } = render(<Scene />);
      expect(queryByTestId("soul-sphere")).not.toBeInTheDocument();
    });

    it("hides TransitionPath when layer is disabled", () => {
      // Enable path in experience store
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });

      // Disable layer
      (useSettingsStore as any).setState({ layers: { transitionPaths: false } });

      const { queryByTestId } = render(<Scene />);
      expect(queryByTestId("transition-path-renderer")).not.toBeInTheDocument();
    });

    it("shows TransitionPath when enabled in both store and layers", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });
      (useSettingsStore as any).setState({ layers: { transitionPaths: true } });

      const { getByTestId } = render(<Scene />);
      expect(getByTestId("transition-path-renderer")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("shows tooltip on waypoint hover", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });

      const { getByText, getByTestId, queryByTestId } = render(<Scene />);

      // Tooltip hidden initially
      expect(queryByTestId("waypoint-tooltip")).not.toBeInTheDocument();

      // Trigger hover via mock button
      fireEvent.click(getByText("Hover On"));

      // Tooltip visible
      expect(getByTestId("waypoint-tooltip")).toBeInTheDocument();
      expect(getByText("Joy")).toBeInTheDocument(); // from mock data

      // Trigger unhover
      fireEvent.click(getByText("Hover Off"));
      expect(queryByTestId("waypoint-tooltip")).not.toBeInTheDocument();
    });

    it("logs debug info when waypoint is clicked", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });

      const { getByText } = render(<Scene />);
      const { logger } = require("@/utils/logger");

      fireEvent.click(getByText("Click Waypoint"));

      expect(logger.debug).toHaveBeenCalledWith("user-interaction", "Clicked waypoint", {
        index: 0,
      });
    });
  });

  describe("Flight Mode controls", () => {
    it("disables OrbitControls when flying", () => {
      act(() => {
        useExperienceStore.setState({ isFlying: true });
      });

      const { getByTestId } = render(<Scene />);
      const controls = getByTestId("orbit-controls");
      expect(controls).toHaveAttribute("data-enabled", "false");
    });

    it("enables OrbitControls when not flying", () => {
      act(() => {
        useExperienceStore.setState({ isFlying: false });
      });

      const { getByTestId } = render(<Scene />);
      const controls = getByTestId("orbit-controls");
      expect(controls).toHaveAttribute("data-enabled", "true");
    });
  });
});
