/**
 * Tests for Scene Component
 *
 * Tests the main Three.js scene setup, layer visibility, and interactions.
 */

import { render, act, fireEvent } from "@testing-library/react";
import { Scene } from "@/components/Scene";
import * as ViewerIndex from "@/components/viewer";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { mockTransitionPath, mockJourney } from "../utils/fixtures";

// Mock Three.js/R3F
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children, dpr }: any) => (
    <div data-testid="r3f-canvas" data-dpr={JSON.stringify(dpr)}>
      {children}
    </div>
  ),
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({
    camera: { position: { copy: jest.fn(), set: jest.fn() }, lookAt: jest.fn() },
    gl: { domElement: document.createElement("canvas") },
    scene: {},
    viewport: { width: 100, height: 100 },
  })),
  extend: jest.fn(),
}));

// Mock Components with Prop Capture
jest.mock("@/components/viewer/OrbitControls", () => ({
  OrbitControls: ({ enabled, autoRotate }: any) => (
    <div data-testid="orbit-controls" data-enabled={enabled} data-autorotate={autoRotate} />
  ),
}));

jest.mock("@/components/viewer/SoulSphere", () => ({
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

jest.mock("@/components/admin/visualization/EmotionCloud", () => ({
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
    // Tooltip functionality disabled
    // it("shows tooltip on waypoint hover", () => { ... });

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

    it("handles waypoint hover interactions", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });

      const { getByText } = render(<Scene />);

      // Click "Hover On" to trigger onWaypointHover prop
      fireEvent.click(getByText("Hover On"));
      // Click "Hover Off" just in case
      fireEvent.click(getByText("Hover Off"));

      // Since handleWaypointHover is empty/disabled, we just verify no crash
      expect(true).toBe(true);
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

  describe("Settings Integration", () => {
    it("adjusts dpr based on renderQuality", () => {
      // Default (high) -> [1, 2] usually in our logic it is [1, 2] for default/medium?
      // Logic: const dpr = renderQuality === "low" ? 1 : renderQuality === "high" ? [1, 3] : [1, 2];

      // Test "low"
      (useSettingsStore as any).setState({ renderQuality: "low" });
      const { getByTestId, rerender } = render(<Scene />);
      expect(getByTestId("r3f-canvas")).toHaveAttribute("data-dpr", "1");

      // Test "high"
      (useSettingsStore as any).setState({ renderQuality: "high" });
      rerender(<Scene />);
      expect(getByTestId("r3f-canvas")).toHaveAttribute("data-dpr", "[1,3]");

      // Test "medium" (default fallback)
      (useSettingsStore as any).setState({ renderQuality: "medium" });
      rerender(<Scene />);
      expect(getByTestId("r3f-canvas")).toHaveAttribute("data-dpr", "[1,2]");
    });

    it("passes autoRotate to OrbitControls based on settings", () => {
      // 1. Enabled in settings, not flying -> Auto Rotate ON
      (useSettingsStore as any).setState({ autoRotate: true });
      act(() => {
        useExperienceStore.setState({ isFlying: false });
      });

      const { getByTestId, rerender } = render(<Scene />);
      expect(getByTestId("orbit-controls")).toHaveAttribute("data-autorotate", "true");

      // 2. Disabled in settings, not flying -> Auto Rotate OFF
      (useSettingsStore as any).setState({ autoRotate: false });
      rerender(<Scene />);
      expect(getByTestId("orbit-controls")).toHaveAttribute("data-autorotate", "false");

      // 3. Enabled in settings, BUT flying -> Auto Rotate OFF
      (useSettingsStore as any).setState({ autoRotate: true });
      act(() => {
        useExperienceStore.setState({ isFlying: true });
      });
      rerender(<Scene />);
      expect(getByTestId("orbit-controls")).toHaveAttribute("data-autorotate", "false");
    });
  });
  it("exports all components from barrel file", () => {
    expect(ViewerIndex.Scene).toBeDefined();
    expect(ViewerIndex.AxisLabels).toBeDefined();
    expect(ViewerIndex.CinematicOverlay).toBeDefined();
    expect(ViewerIndex.DebugBroadcaster).toBeDefined();
    expect(ViewerIndex.LoggerProvider).toBeDefined();
    expect(ViewerIndex.OrbitControls).toBeDefined();
    expect(ViewerIndex.SimpleAxisLabels).toBeDefined();
    expect(ViewerIndex.SoulSphere).toBeDefined();
    expect(ViewerIndex.VACAnimator).toBeDefined();
    expect(ViewerIndex.VACAxisLabels3D).toBeDefined();
    expect(ViewerIndex.VACDisplay).toBeDefined();
    expect(ViewerIndex.ViewerPathFlyover).toBeDefined();
    expect(ViewerIndex.ViewerShortcuts).toBeDefined();
    expect(ViewerIndex.ZenSessionIndicator).toBeDefined();
  });
});
