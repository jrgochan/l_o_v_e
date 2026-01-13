import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { TransitionPathRenderer } from "../../components/TransitionPathRenderer";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import * as React from "react";

// --- Mocks ---

// Mock Three.js
const mockScaleSetScalar = jest.fn();
jest.mock("three", () => {
  return {
    Vector3: jest.fn((x, y, z) => ({ x, y, z })),
    CatmullRomCurve3: jest.fn(() => ({})),
    TubeGeometry: jest.fn(() => ({})),
    Color: jest.fn((r, g, b) => ({ r, g, b })),
    BackSide: 1,
    Mesh: jest.fn(),
    SphereGeometry: jest.fn(),
    MeshStandardMaterial: jest.fn(),
    MeshBasicMaterial: jest.fn(),
  };
});

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

// Mock child components
jest.mock("@/components/admin/paths/PathCurveAnimated", () => ({
  PathCurveAnimated: () => <div data-testid="path-curve-animated" />,
}));

// Mock Store
jest.mock("@/stores/useExperienceStore", () => ({
  useExperienceStore: (selector: any) =>
    selector({
      currentVAC: [0, 0, 0],
    }),
}));

const mockUseSettingsStore = jest.fn();
jest.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: (selector: any) => mockUseSettingsStore(selector),
}));

// --- Test Data ---

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
    {
      emotion: "Curious",
      category: "Cognitive",
      vac: [0.6, 0.2, 0.6] as [number, number, number],
      quaternion: [0, 0, 0, 1] as [number, number, number, number],
      reasoning: "Step 2",
      difficulty: "medium",
      estimated_time: "2m",
      order: 2,
      distance_from_previous: 0.5,
      strategies: [],
    }
  ],
  total_steps: 4,
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

describe("TransitionPathRenderer", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    mockUseSettingsStore.mockImplementation((selector: any) => selector({ pathAnimationMode: "flow" }));
  });

  afterEach(() => {
    cleanup();
  });

  it("should process path points correctly", () => {
    // 1 Start + 2 Waypoints + 1 Goal = 4 Points
    render(<TransitionPathRenderer path={mockPath} />);

    expect(THREE.Vector3).toHaveBeenCalledTimes(4);
    expect(THREE.CatmullRomCurve3).toHaveBeenCalled();
    expect(THREE.TubeGeometry).toHaveBeenCalled();
  });

  it("should render correct number of waypoint markers", () => {
    const { container } = render(<TransitionPathRenderer path={mockPath} />);
    const meshes = container.querySelectorAll("mesh");
    // Total markers = 1 (Start) + 2 (Waypoints) + 1 (Goal) = 4
    // Total meshes = 4 * 2 = 8
    expect(meshes.length).toBe(8);
  });

  it("should handle waypoint hover and click interactions", () => {
    const onWaypointClick = jest.fn();
    const onWaypointHover = jest.fn();

    const { container } = render(
      <TransitionPathRenderer
        path={mockPath}
        onWaypointClick={onWaypointClick}
        onWaypointHover={onWaypointHover}
      />
    );

    const meshes = container.querySelectorAll("mesh");
    const firstMarker = meshes[0]; // Start point

    // Click
    fireEvent.click(firstMarker);
    expect(onWaypointClick).toHaveBeenCalledWith(0);

    // Hover
    fireEvent.pointerOver(firstMarker);
    expect(onWaypointHover).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ state: "start", emotion: "Joy" }),
      expect.any(Object), // Position vector
      "start"
    );

    // Unhover
    fireEvent.pointerOut(firstMarker);
    expect(onWaypointHover).toHaveBeenCalledWith(null, null, null, "");
  });

  it("verifies waypoint states via hover callback", () => {
    const activeJourney = {
      current_waypoint: 1, // Waypoint[1] is 'Curious', so Waypoint[0] is 'reached' or 'passed'?
      waypoints_reached: [0], // Waypoint[0] is reached
      status: "active"
    };

    const onWaypointHover = jest.fn();
    const { container } = render(
      <TransitionPathRenderer
        path={mockPath}
        activeJourney={activeJourney}
        onWaypointHover={onWaypointHover}
      />
    );

    const meshes = container.querySelectorAll("mesh");

    // Hover Index 1 (First Waypoint) -> meshes[2]
    fireEvent.pointerOver(meshes[2]);
    expect(onWaypointHover).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ state: "reached" }),
      expect.any(Object),
      "reached"
    );

    // Hover Index 2 (Second Waypoint) -> meshes[4]
    fireEvent.pointerOver(meshes[4]);
    expect(onWaypointHover).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ state: "current" }),
      expect.any(Object),
      "current"
    );
  });

  it("verifies locked state", () => {
    const activeJourney = {
      current_waypoint: 0, // Waypoint 0 is current
      waypoints_reached: [],
      status: "active"
    };

    const onWaypointHover = jest.fn();
    const { container } = render(
      <TransitionPathRenderer
        path={mockPath}
        activeJourney={activeJourney}
        onWaypointHover={onWaypointHover}
      />
    );

    const meshes = container.querySelectorAll("mesh");
    // Hover Index 2 -> meshes[4]
    fireEvent.pointerOver(meshes[4]);
    expect(onWaypointHover).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ state: "locked" }),
      expect.any(Object),
      "locked"
    );
  });

  it("executes animation loop in useFrame for all markers", () => {
    const { container } = render(<TransitionPathRenderer path={mockPath} />);

    // Patch DOM
    const meshes = container.querySelectorAll("mesh");
    meshes.forEach((mesh: any) => {
      mesh.scale = { setScalar: mockScaleSetScalar };
    });

    // Get all registered callbacks
    const useFrameCalls = (useFrame as jest.Mock).mock.calls;
    expect(useFrameCalls.length).toBeGreaterThan(0);

    // Execute ALL callbacks to cover different marker states (Start, Waypoint, Goal)
    // This should cover the "waypoint" state branch (pulse only)
    useFrameCalls.forEach(call => {
      const callback = call[0];
      callback({ clock: { elapsedTime: 1 } });
    });

    expect(mockScaleSetScalar).toHaveBeenCalled();
  });

  it("handles animation logic for hovered and current states", () => {
    const activeJourney = {
      current_waypoint: 0,
      waypoints_reached: [],
      status: "active"
    };

    const { container } = render(
      <TransitionPathRenderer
        path={mockPath}
        activeJourney={activeJourney}
      />
    );

    // 1. Test "Current" state animation logic
    // Get callbacks
    const useFrameCalls = (useFrame as jest.Mock).mock.calls;
    // We assume order. Index 1 corresponds to Waypoint 1 (Index 0 in waypoints array) which matches current_waypoint 0.
    const currentCallback = useFrameCalls[1][0];

    // Patch DOM for Index 1 (meshes[2])
    const meshes = container.querySelectorAll("mesh");
    (meshes[2] as any).scale = { setScalar: mockScaleSetScalar };

    // Execute callback - should hit "current" state logic (pulse math)
    currentCallback({ clock: { elapsedTime: 1 } });
    expect(mockScaleSetScalar).toHaveBeenCalled();

    // 2. Test "Hovered" state animation logic
    jest.clearAllMocks();

    // Trigger hover on Index 1
    fireEvent.pointerOver(meshes[2]);

    // Iterate ALL updated calls to ensure we hit the hovered one
    const newCalls = (useFrame as jest.Mock).mock.calls;

    (meshes[2] as any).scale = { setScalar: mockScaleSetScalar };

    newCalls.forEach(call => {
      const cb = call[0];
      try {
        cb({ clock: { elapsedTime: 2 } });
      } catch (e) {
        // ignore if ref invalid on old callbacks
      }
    });

    expect(mockScaleSetScalar).toHaveBeenCalled();
  });

  it("renders with different animation modes and verifies logic", () => {
    const modes = ["subtle", "dynamic", "mystical", "default"];

    modes.forEach(mode => {
      mockUseSettingsStore.mockImplementation((selector: any) => selector({ pathAnimationMode: mode }));
      const { unmount, container } = render(<TransitionPathRenderer path={mockPath} />);

      const calls = (useFrame as jest.Mock).mock.calls;
      // WaypointMarkers register useFrame. We grab the last one.
      const lastCall = calls[calls.length - 1];
      const callback = lastCall[0];

      // Patch DOM
      const meshes = container.querySelectorAll("mesh");
      meshes.forEach((mesh: any) => {
        mesh.scale = { setScalar: mockScaleSetScalar };
      });

      // Run it
      callback({ clock: { elapsedTime: 1 } });
      expect(mockScaleSetScalar).toHaveBeenCalled();

      unmount();
    });
  });

  it("handles skipped/unknown waypoint state", () => {
    const activeJourney = {
      current_waypoint: 5, // Way advanced
      waypoints_reached: [], // None reached?
      status: "active"
    };

    const onWaypointHover = jest.fn();
    const { container } = render(
      <TransitionPathRenderer
        path={mockPath}
        activeJourney={activeJourney}
        onWaypointHover={onWaypointHover}
      />
    );

    const meshes = container.querySelectorAll("mesh");
    // Waypoint 0 (Index 1) -> meshes[2]
    fireEvent.pointerOver(meshes[2]);

    expect(onWaypointHover).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ state: "waypoint" }),
      expect.any(Object),
      "waypoint"
    );
  });
});
