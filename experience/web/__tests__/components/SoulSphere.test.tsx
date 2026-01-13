import { render, screen, cleanup } from "@testing-library/react";
import { SoulSphere } from "../../components/SoulSphere";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// --- Mocks ---

// Mock Three.js
const mockShaderMaterialUniforms = {
  uTime: { value: 0 },
  uValence: { value: 0 },
  uArousal: { value: 0 },
  uConnection: { value: 0 },
  uCameraPosition: { value: { copy: jest.fn() } },
  uColorNeg: { value: {} },
  uColorPos: { value: {} }
};

jest.mock("three", () => {
  const originalThree = jest.requireActual("three");
  return {
    ...originalThree,
    Mesh: jest.fn(() => ({
      rotation: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0, z: 0 },
    })),
    ShaderMaterial: jest.fn(() => ({
      uniforms: mockShaderMaterialUniforms
    })),
    IcosahedronGeometry: jest.fn(),
    Color: jest.fn(),
    Vector3: jest.fn((x, y, z) => ({ x, y, z, copy: jest.fn() })),
    DoubleSide: 2
  };
});

// Mock R3F
const mockUseFrame = jest.fn();
jest.mock("@react-three/fiber", () => ({
  useFrame: (cb: any) => mockUseFrame(cb),
}));

// Mock Store with inline factory
const mockGetState = jest.fn();
jest.mock("@/stores/useExperienceStore", () => {
  return {
    useExperienceStore: Object.assign(
      (selector: any) => selector({}), // hook implementation
      { getState: () => mockGetState() } // static method
    )
  };
});

describe("SoulSphere", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    mockGetState.mockReturnValue({
      currentVAC: [0, 0, 0],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("should create geometry and material", () => {
    render(<SoulSphere />);
    expect(THREE.IcosahedronGeometry).toHaveBeenCalledWith(1.5, 20);
    expect(THREE.ShaderMaterial).toHaveBeenCalled();
  });

  it("should register animation loop", () => {
    render(<SoulSphere />);
    expect(mockUseFrame).toHaveBeenCalled();
  });

  it("should update uniforms on frame tick", () => {
    const { container } = render(<SoulSphere />);

    const shaderMaterial = container.querySelector("shaderMaterial");
    expect(shaderMaterial).toBeTruthy();

    // Setup mock uniforms on the DOM node
    const domUniforms = {
      uTime: { value: 0 },
      uValence: { value: 0 },
      uArousal: { value: 0 },
      uConnection: { value: 0 },
      uCameraPosition: { value: { copy: jest.fn() } }
    };

    (shaderMaterial as any).uniforms = domUniforms;

    // Setup Store State
    mockGetState.mockReturnValue({
      currentVAC: [0.8, 0.5, 0.2] // V, A, C
    });

    // Get callback
    const calls = mockUseFrame.mock.calls;
    const callback = calls[calls.length - 1][0];

    // Invoke callback
    const mockState = { camera: { position: { x: 0, y: 0, z: 5 } } };
    const delta = 0.1;
    callback(mockState, delta);

    expect(domUniforms.uTime.value).toBeCloseTo(0.1);
    expect(domUniforms.uValence.value).toBe(0.8);
    expect(domUniforms.uCameraPosition.value.copy).toHaveBeenCalledWith(mockState.camera.position);
  });

  it("should safely abort if material ref is missing (e.g. unmounted)", () => {
    const { unmount } = render(<SoulSphere />);

    // Capture callback
    const calls = mockUseFrame.mock.calls;
    const callback = calls[calls.length - 1][0];

    // Unmount component -> React sets ref.current to null
    unmount();

    // Execute callback. It should return early because ref is null.
    // If it proceeded, it would throw because we haven't patched the DOM node 
    // (and the DOM node is gone anyway).

    // We spy on getState to ensure it's NOT reached
    mockGetState.mockClear();

    callback({ camera: { position: { x: 0, y: 0, z: 0 } } }, 0.1);

    expect(mockGetState).not.toHaveBeenCalled();
  });
});
