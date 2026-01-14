
import { render, act } from "@testing-library/react";
import { AggregateSphere } from "@/components/admin/spheres/AggregateSphere";
import * as THREE from "three";

// Aggressive Three.js Mock
const mockAdd = jest.fn();
const mockRender = jest.fn();
const mockSetSize = jest.fn();
const mockSetClearColor = jest.fn();
const mockDispose = jest.fn();
const mockPointsMaterialDispose = jest.fn();
const mockGeometryDispose = jest.fn();
const mockMeshMaterialDispose = jest.fn();

// Mock requestAnimationFrame
let frameId = 0;
const mockRequestAnimationFrame = jest.fn((callback) => {
  frameId++;
  // Verify callback is a function before calling (it is in our component)
  // We don't auto-call effectively to prevent infinite loops in tests unless controlled
  return frameId;
});
const mockCancelAnimationFrame = jest.fn();
window.requestAnimationFrame = mockRequestAnimationFrame;
window.cancelAnimationFrame = mockCancelAnimationFrame;

jest.mock("three", () => {
  return {
    Scene: jest.fn(() => ({
      add: mockAdd,
      remove: jest.fn(),
      dispose: mockDispose,
    })),
    PerspectiveCamera: jest.fn(() => ({
      position: { z: 0, set: jest.fn() },
    })),
    WebGLRenderer: jest.fn(() => ({
      setSize: mockSetSize,
      setClearColor: mockSetClearColor,
      render: mockRender,
      dispose: mockDispose,
      domElement: document.createElement("canvas"),
    })),
    AmbientLight: jest.fn(),
    DirectionalLight: jest.fn(() => ({
      position: { set: jest.fn() },
    })),
    SphereGeometry: jest.fn(() => ({
      dispose: mockGeometryDispose,
    })),
    MeshPhongMaterial: jest.fn(() => ({
      dispose: mockMeshMaterialDispose,
    })),
    Mesh: jest.fn(() => ({
      rotation: { y: 0 },
    })),
    BufferGeometry: jest.fn(() => ({
      setAttribute: jest.fn(),
      attributes: {
        position: {
          count: 10,
          array: new Float32Array(30),
          needsUpdate: false,
        },
      },
      dispose: mockGeometryDispose,
    })),
    Float32Array: Float32Array,
    BufferAttribute: jest.fn(),
    PointsMaterial: jest.fn(() => ({
      dispose: mockPointsMaterialDispose,
    })),
    Points: jest.fn(() => ({
      geometry: {
        attributes: {
          position: {
            count: 10,
            array: new Float32Array(30),
            needsUpdate: false,
          },
        },
      },
    })),
    Color: jest.fn(() => ({
      getHex: jest.fn(() => 0xffffff),
    })),
    AdditiveBlending: 2,
  };
});

// Mock BaseSphere helpers
jest.mock("@/components/admin/spheres/BaseSphere", () => ({
  blendColors: jest.fn(() => ({ getHex: () => 0xffffff })),
  getColorFromValence: jest.fn(),
}));

describe("AggregateSphere", () => {
  const mockEmotions = [
    { id: "1", name: "Joy", vac: { valence: 0.8, arousal: 0.5, connection: 0.5 }, confidence: 0.9 },
  ];
  const mockAggregate = {
    vac: { valence: 0.6, arousal: 0.4, connection: 0.5 },
    top_emotions: mockEmotions,
    complexity_score: 0.3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render and initialize THREE resources", () => {
    render(<AggregateSphere emotions={mockEmotions as any} aggregate={mockAggregate as any} />);
    expect(THREE.WebGLRenderer).toHaveBeenCalled();
    expect(mockSetSize).toHaveBeenCalledWith(300, 300);
    expect(mockAdd).toHaveBeenCalled(); // Scene add
  });

  it("should clean up resources on unmount", () => {
    const { unmount } = render(
      <AggregateSphere emotions={mockEmotions as any} aggregate={mockAggregate as any} />
    );
    unmount();
    expect(mockDispose).toHaveBeenCalled();
    expect(mockGeometryDispose).toHaveBeenCalled();
    expect(mockMeshMaterialDispose).toHaveBeenCalled();
    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  it("should handle resize", () => {
    render(
      <AggregateSphere emotions={mockEmotions as any} aggregate={mockAggregate as any} width={500} height={500} />
    );
    expect(mockSetSize).toHaveBeenCalledWith(500, 500);
  });

  it("should constrain particles within bounds during animation", () => {
    render(
      <AggregateSphere emotions={mockEmotions as any} aggregate={mockAggregate as any} />
    );

    // Get particles from mockAdd calls
    // mockAdd called ~4 times: AmbientLight, DirectionalLight, Sphere, Particles
    const addCalls = mockAdd.mock.calls;
    // Find the one that has geometry.attributes.position (our Particles mock)
    const particles = addCalls.find(call =>
      call[0].geometry &&
      call[0].geometry.attributes &&
      call[0].geometry.attributes.position
    )?.[0];

    expect(particles).toBeDefined();

    // Access the array in the mock structure
    // Mock definition: attributes.position.array is Float32Array(30)
    const positions = particles.geometry.attributes.position.array;

    // Set a particle out of bounds
    positions[0] = 10;
    positions[1] = 0;
    positions[2] = 0;

    // Trigger animation frame
    const calls = (window.requestAnimationFrame as jest.Mock).mock.calls;
    // The last call is the most recent request for next frame.
    // But animate() calls requestAnimationFrame immediately.
    // And useEffect calls animate() once.
    // So there should be at least one call.
    const animateCallback = calls[calls.length - 1][0];

    act(() => {
      animateCallback();
    });

    // Verify reduction
    expect(positions[0]).toBeLessThan(10);
  });

  it("should use different params for mode and arousal", () => {
    // High arousal (swirl multiplier) + High Valence (swirl direction)
    render(
      <AggregateSphere
        emotions={mockEmotions as any}
        aggregate={{ ...mockAggregate, vac: { ...mockAggregate.vac, arousal: 0.8, valence: 0.8 } } as any}
        mode="dynamic"
      />
    );
    // Just verify render doesn't crash and sizing logic runs
    expect(THREE.WebGLRenderer).toHaveBeenCalled();

    // Low arousal, Negative Valence
    render(
      <AggregateSphere
        emotions={mockEmotions as any}
        aggregate={{ ...mockAggregate, vac: { ...mockAggregate.vac, arousal: -0.5, valence: -0.5 } } as any}
        mode="mystical"
      />
    );
  });
});
