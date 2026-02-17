import { render, cleanup, screen } from "@testing-library/react";
import React, { useRef } from "react";
import { CrystallineEmotionNode } from "@/components/admin/emotions/CrystallineEmotionNode";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";

// Mock resize observer
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

// Mock R3F
jest.mock("@react-three/fiber", () => ({
  ...jest.requireActual("@react-three/fiber"),
  Canvas: ({ children }: any) => <div>{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock("react", () => {
  const original = jest.requireActual("react");
  return {
    ...original,
    useRef: jest.fn().mockImplementation(original.useRef),
  };
});

import { useFrame } from "@react-three/fiber";

// Polyfill HTMLElement to support Three.js properties accessed via refs in JSDOM
function mockThreeObject(element: any) {
  if (!element.rotation) {
    element.rotation = { x: 0, y: 0, z: 0, copy: jest.fn() };
  }
  if (!element.scale) {
    element.scale = {
      setScalar: jest.fn(),
      set: jest.fn(),
      copy: jest.fn(),
      x: 1,
      y: 1,
      z: 1,
    };
  }
  if (!element.position) {
    element.position = {
      set: jest.fn(),
      copy: jest.fn(),
      x: 0,
      y: 0,
      z: 0,
    };
  }
  // For materials
  if (!element.opacity) {
    // Define setter/getter or just property
    element.opacity = 1;
    element.emissiveIntensity = 1;
    element.sheenColor = { setHSL: jest.fn() };
  }
}

// We can intercept the creation of elements or just prototype patch
Object.defineProperty(window.HTMLElement.prototype, "rotation", {
  get() {
    if (!this._rotation) this._rotation = { x: 0, y: 0, z: 0, copy: jest.fn() };
    return this._rotation;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "scale", {
  get() {
    if (!this._scale)
      this._scale = { setScalar: jest.fn(), set: jest.fn(), copy: jest.fn(), x: 1, y: 1, z: 1 };
    return this._scale;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "position", {
  get() {
    if (!this._position) this._position = { set: jest.fn(), copy: jest.fn(), x: 0, y: 0, z: 0 };
    return this._position;
  },
  configurable: true,
});
// Material properties might need to be on the specific element or generic
Object.defineProperty(window.HTMLElement.prototype, "opacity", {
  get() {
    return this._opacity ?? 1;
  },
  set(v) {
    this._opacity = v;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "emissiveIntensity", {
  get() {
    return this._emissiveIntensity ?? 1;
  },
  set(v) {
    this._emissiveIntensity = v;
  },
  configurable: true,
});
Object.defineProperty(window.HTMLElement.prototype, "sheenColor", {
  get() {
    if (!this._sheenColor) this._sheenColor = { setHSL: jest.fn() };
    return this._sheenColor;
  },
  set(v) {
    this._sheenColor = v;
  },
  configurable: true,
});

describe("CrystallineEmotionNode", () => {
  // ... setup ...
  const mockEmotion = {
    id: "joy",
    name: "Joy",
    description: "Happiness",
    vac: [0.8, 0.6, 0.9] as [number, number, number],
    category: "positive",
    definition: "Def",
    quaternion: { _x: 0, _y: 0, _z: 0, _w: 1 },
  } as any;
  // Fix Ref types in component if needed, but here we just pass props.

  const mockColor = new THREE.Color("#FFD700");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const runFrameLoopTest = (props: any) => {
    // Capture the frame callback
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    render(<CrystallineEmotionNode {...props} />);

    // Use test IDs to verify rendering and imply refs are attached
    expect(screen.getByTestId("crystal-group")).toBeInTheDocument();
    expect(screen.getByTestId("crystal-body")).toBeInTheDocument();
    expect(screen.getByTestId("crystal-core")).toBeInTheDocument();
    expect(screen.getByTestId("crystal-edges")).toBeInTheDocument();

    // Expect useFrame to have been called
    expect(useFrame).toHaveBeenCalled();

    // Simulate a frame
    const stateMock = {
      clock: { elapsedTime: 1.0 },
    };

    // Execute callback if captured
    if (frameCallback) {
      // Execute frame logic
      frameCallback(stateMock);

      // Execute again for any time-dependent logic checks
      stateMock.clock.elapsedTime = 2.0;
      frameCallback(stateMock);
    }
  };

  it("executes frame loop logic (selected=true, hovered=false)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: true,
      isHovered: false,
    });
  });

  it("executes frame loop logic (selected=false, hovered=true)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: false,
      isHovered: true,
    });
  });

  it("executes frame loop logic (selected=false, hovered=false)", () => {
    runFrameLoopTest({
      emotion: mockEmotion,
      color: mockColor,
      size: 1,
      isSelected: false,
      isHovered: false,
    });
  });

  it("renders selected state", () => {
    render(
      <Canvas>
        <CrystallineEmotionNode
          emotion={mockEmotion}
          color={mockColor}
          size={1}
          isSelected={true}
          isHovered={false}
        />
      </Canvas>
    );
  });

  it("renders hovered state", () => {
    render(
      <Canvas>
        <CrystallineEmotionNode
          emotion={mockEmotion}
          color={mockColor}
          size={1}
          isSelected={false}
          isHovered={true}
        />
      </Canvas>
    );
  });
  it("handles null main crystal ref in frame loop", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    // Mock useRef to return a ref that stays null for the main crystalRef failure case
    const nullRef = { current: null };
    (useRef as jest.Mock).mockReturnValue(nullRef);

    render(
      <CrystallineEmotionNode
        emotion={mockEmotion}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );

    // frameCallback should be captured
    expect(frameCallback).toBeDefined();

    // React populates refs during render, so nullRef.current is likely defined now.
    // We must manually clear it to simulate the unmounted/null situation during the frame loop.
    nullRef.current = null;

    // Run it - crystalRef.current is null
    // Should return early and NOT throw
    const stateMock = { clock: { elapsedTime: 1 } };
    expect(() => frameCallback(stateMock)).not.toThrow();

    // Restore
    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });

  it("handles missing optional refs in frame loop", () => {
    let frameCallback: any;
    (useFrame as jest.Mock).mockImplementation((cb) => {
      frameCallback = cb;
    });

    const mainRef = {
      current: {
        rotation: { x: 0, y: 0 },
        scale: { setScalar: jest.fn(), copy: jest.fn() },
        position: { set: jest.fn(), copy: jest.fn() },
      },
    };

    // distinct refs for others to avoid shared state
    const coreRef = { current: null };
    const edgesRef = { current: null };
    const matRef = { current: null };
    const fallbackRef = { current: null };

    // Order: crystalRef, coreRef, edgesRef, crystalMatRef
    (useRef as jest.Mock)
      .mockReturnValueOnce(mainRef) // crystalRef
      .mockReturnValueOnce(coreRef) // coreRef
      .mockReturnValueOnce(edgesRef) // edgesRef
      .mockReturnValueOnce(matRef) // crystalMatRef
      .mockReturnValue(fallbackRef); // fallback for any others

    render(
      <CrystallineEmotionNode
        emotion={mockEmotion}
        color={mockColor}
        size={1}
        isSelected={false}
        isHovered={false}
      />
    );

    // Manually clear optional refs to simulate them being null/missing
    coreRef.current = null;
    edgesRef.current = null;
    matRef.current = null;

    const stateMock = { clock: { elapsedTime: 1 } };
    expect(() => frameCallback(stateMock)).not.toThrow();

    // Verify main ref was rotated (main logic ran, confirming we passed the first check)
    expect(mainRef.current.rotation.y).toBeGreaterThan(0);

    (useRef as jest.Mock).mockImplementation(jest.requireActual("react").useRef);
  });
});
