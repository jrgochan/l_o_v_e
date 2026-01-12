/**
 * Tests for Scene Component (Three.js Container)
 *
 * Tests the main Three.js scene setup. Since actual WebGL rendering
 * cannot be tested in Jest, we focus on component structure, props,
 * and conditional rendering based on store state.
 */

import { render } from "@testing-library/react";
import { Scene } from "@/components/Scene";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { act } from "@testing-library/react";
import { mockTransitionPath, mockJourney } from "../utils/fixtures";

// Mock Three.js components
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

jest.mock("@/components/OrbitControls", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

jest.mock("@/components/SoulSphere", () => ({
  SoulSphere: () => <div data-testid="soul-sphere" />,
}));

jest.mock("@/components/TransitionPathRenderer", () => ({
  TransitionPathRenderer: ({ path }: any) => (
    <div data-testid="transition-path-renderer" data-path-id={path?.path_id} />
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

describe("Scene", () => {
  beforeEach(() => {
    const { reset } = useExperienceStore.getState();
    act(() => {
      reset();
    });
  });

  describe("Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<Scene />);
      expect(container).toBeInTheDocument();
    });

    it("renders Canvas component", () => {
      const { getByTestId } = render(<Scene />);
      expect(getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    it("renders SoulSphere", () => {
      const { getByTestId } = render(<Scene />);
      expect(getByTestId("soul-sphere")).toBeInTheDocument();
    });

    it("renders OrbitControls", () => {
      const { getByTestId } = render(<Scene />);
      expect(getByTestId("orbit-controls")).toBeInTheDocument();
    });
  });

  describe("Conditional Path Rendering", () => {
    it("does not render path when showPath is false", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: false,
          transitionPath: mockTransitionPath as any,
        });
      });

      const { queryByTestId } = render(<Scene />);
      expect(queryByTestId("transition-path-renderer")).not.toBeInTheDocument();
    });

    it("does not render path when transitionPath is null", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: null,
        });
      });

      const { queryByTestId } = render(<Scene />);
      expect(queryByTestId("transition-path-renderer")).not.toBeInTheDocument();
    });

    it("renders path when showPath is true and path exists", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });

      const { getByTestId } = render(<Scene />);
      expect(getByTestId("transition-path-renderer")).toBeInTheDocument();
    });

    it("passes path and journey to TransitionPathRenderer", () => {
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
          activeJourney: mockJourney,
        });
      });

      const { getByTestId } = render(<Scene />);
      const renderer = getByTestId("transition-path-renderer");
      expect(renderer).toBeInTheDocument();
    });
  });

  describe("Store Integration", () => {
    it("updates when store changes", () => {
      const { queryByTestId, rerender } = render(<Scene />);

      // Initially no path
      expect(queryByTestId("transition-path-renderer")).not.toBeInTheDocument();

      // Add path
      act(() => {
        useExperienceStore.setState({
          showPath: true,
          transitionPath: mockTransitionPath as any,
        });
      });

      rerender(<Scene />);
      expect(queryByTestId("transition-path-renderer")).toBeInTheDocument();
    });
  });
});
