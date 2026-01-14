
import { render, cleanup, act } from "@testing-library/react";
import React from "react";
import * as THREE from "three";
import { EmotionParticles, BurstParticles } from "@/components/admin/particles/EmotionParticles";
import { useFrame } from "@react-three/fiber";

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

describe("EmotionParticles", () => {
  // Patch Element prototype for 3D properties
  beforeAll(() => {
    Object.defineProperties(window.Element.prototype, {
      position: {
        get() {
          if (!this._position) this._position = new THREE.Vector3();
          return this._position;
        },
        configurable: true,
      },
      rotation: {
        get() {
          if (!this._rotation) this._rotation = new THREE.Euler();
          return this._rotation;
        },
        configurable: true,
      },
      geometry: {
        get() {
          if (!this._geometry) {
            this._geometry = {
              attributes: {
                position: {
                  array: new Float32Array(3000), // Max mock size
                  needsUpdate: false,
                },
              },
            };
          }
          return this._geometry;
        },
        configurable: true,
      },
    });
  });

  const mockEmotion = {
    id: "joy",
    name: "Joy",
    vac: [0.8, 0.6, 0.7],
    category: "joy",
    description: "Happy"
  };

  const defaultConfig = {
    enabled: true,
    density: 10,
    speedMultiplier: 1,
    particleSize: 0.1,
    maxDistance: 2,
    opacity: 1,
    enableAuras: true,
  };

  const defaultProps = {
    emotion: mockEmotion,
    color: new THREE.Color("yellow"),
    config: defaultConfig,
    isSelected: false,
    isHovered: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders particles when enabled", async () => {
    const { container } = render(<EmotionParticles {...defaultProps} />);

    await act(async () => {
      jest.runAllTimers();
    });

    expect(container.querySelector("points")).toBeInTheDocument();
  });

  it("animates particles", async () => {
    const { container } = render(<EmotionParticles {...defaultProps} />);

    // Initial render: particleData is null -> returns null. useFrame called once.
    expect(useFrame).toHaveBeenCalledTimes(1);

    // Advance timers to trigger setParticleData
    await act(async () => {
      jest.runAllTimers();
    });

    // Re-render: particleData set -> returns <points>. useFrame called again.
    expect(useFrame).toHaveBeenCalledTimes(2);

    const points = container.querySelector("points") as any;
    expect(points).toBeInTheDocument();

    // Grab the LAST call 
    const frameCallback = (useFrame as jest.Mock).mock.lastCall[0];

    // Run loop manually with sufficient delta
    act(() => {
      frameCallback({ clock: { elapsedTime: 0.1 } }, 1.0); // Delta 1.0 to ensure movement
    });

    // Debug output if fails
    if (points.rotation.y === 0) {
      console.error("Rotation check failed. Config:", defaultConfig.enableAuras);
    }

    // Check rotation first to verify loop execution (auras logic)
    expect(points.rotation.y).not.toBe(0);
    // Check needsUpdate
    expect(points.geometry.attributes.position.needsUpdate).toBe(true);
  });

  it("does not render when disabled", () => {
    const { container } = render(<EmotionParticles {...defaultProps} config={{ ...defaultConfig, enabled: false }} />);
    expect(container.querySelector("points")).not.toBeInTheDocument();
  });

  it("renders burst particles", async () => {
    const { container } = render(
      <BurstParticles position={new THREE.Vector3()} color={new THREE.Color("red")} trigger={true} />
    );

    await act(async () => {
      jest.runAllTimers();
    });

    expect(container.querySelector("points")).toBeInTheDocument();

    const points = container.querySelector("points") as any;

    const frameCallback = (useFrame as jest.Mock).mock.lastCall[0];
    act(() => {
      frameCallback({ clock: { elapsedTime: 0.1 } }, 0.1);
    });

    expect(points.geometry.attributes.position.needsUpdate).toBe(true);
  });
});
