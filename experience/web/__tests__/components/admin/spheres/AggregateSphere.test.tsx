
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
});
