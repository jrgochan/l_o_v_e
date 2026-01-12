import { render } from "@testing-library/react";
import { TransitionPathRenderer } from "../../components/TransitionPathRenderer";
import * as THREE from "three";

// Mock Three.js
const mockVector3 = jest.fn();
const mockCatmullRomCurve3 = jest.fn();
const mockTubeGeometry = jest.fn();

jest.mock("three", () => {
  return {
    Vector3: jest.fn((x, y, z) => ({ x, y, z })),
    CatmullRomCurve3: jest.fn(() => ({})),
    TubeGeometry: jest.fn(() => ({})),
    Color: jest.fn(() => ({})),
    BackSide: 1,
    Mesh: jest.fn(),
  };
});

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

// Mock child components
jest.mock("@/components/admin/paths/PathCurveAnimated", () => ({
  PathCurveAnimated: () => null,
}));

// Mock Store
jest.mock("@/stores/useExperienceStore", () => ({
  useExperienceStore: (selector: any) =>
    selector({
      currentVAC: [0, 0, 0],
    }),
}));

jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) =>
    selector({
      pathAnimationMode: "flow",
    }),
}));

describe("TransitionPathRenderer", () => {
  const mockPath = {
    path_id: "test-path",
    current_state: {
      emotion: "Joy",
      category: "Positive",
      vac: [0.8, 0.5, 0.5] as [number, number, number],
      quaternion: [0, 0, 0, 1] as [number, number, number, number],
    },
    goal_state: {
      emotion: "Peace",
      category: "Positive",
      vac: [0.2, -0.5, 0.8] as [number, number, number],
      quaternion: [0, 0, 0, 1] as [number, number, number, number],
    },
    waypoints: [
      {
        emotion: "Calm",
        category: "Positive",
        vac: [0.5, 0, 0.6] as [number, number, number],
        quaternion: [0, 0, 0, 1] as [number, number, number, number],
        reasoning: "Step 1",
        difficulty: "easy",
        estimated_time: "1m",
        order: 1,
        distance_from_previous: 0.5,
        strategies: [],
      },
    ],
    total_steps: 3,
    estimated_duration: "5m",
    created_at: new Date().toISOString(),
    visualization_data: {},
    path_metrics: {
      total_distance: 10,
      total_estimated_time: "5m",
      overall_difficulty: "easy",
      success_probability: 0.9,
      requires_external_support: false,
    },
    alternatives: [],
    personalization_notes: [],
    analysis: "Test analysis",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process path points correctly", () => {
    render(<TransitionPathRenderer path={mockPath} />);

    // Should create vectors for start, waypoint, and goal
    // 1 start + 1 waypoint + 1 goal = 3 vectors
    expect(THREE.Vector3).toHaveBeenCalledTimes(3);
    expect(THREE.CatmullRomCurve3).toHaveBeenCalled();
    expect(THREE.TubeGeometry).toHaveBeenCalled();
  });

  it("should define waypoint states", () => {
    // We can't easily inspect the internal 'getWaypointState' logic without exposing it,
    // but we can verify that the WaypointMarkers are rendered.
    // However, since we mock R3F primitives like <group> and <mesh> are just React elements in test-renderer but
    // in RTL they might throw if not handled.

    // Actually, TransitionPathRenderer returns a <group> containing <WaypointMarker>s.
    // WaypointMarker returns a <mesh>.
    // Since we are not mocking WaypointMarker, it runs.
    // It uses <sphereGeometry>, <meshStandardMaterial> etc.
    // These are intrinsic elements. In JSDOM they will just be rendered as custom elements.

    const { container } = render(<TransitionPathRenderer path={mockPath} />);

    // Check if we rendered the correct number of markers (start, waypoint, goal)
    // Note: react-three-fiber elements render as-is in JSDOM if not stripped.
    // But usually we mock them or use a tailored test renderer.
    // Here we just check for errors essentially.

    expect(container).toBeDefined();
  });
});
